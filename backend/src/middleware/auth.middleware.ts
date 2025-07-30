import { Request, Response, NextFunction } from 'express';
import { AuthService, AuthTokenPayload } from '../services/auth.service';
import { GAME_CONFIG, GAME_CONSTANTS } from '../config/game.config';
import { RedisClient } from '../config/redis.config';

// 扩展Request接口以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
      playerId?: number;
      userId?: number;
    }
  }
}

// 认证中间件接口
export interface AuthMiddlewareOptions {
  required?: boolean;
  roles?: string[];
  checkPlayerData?: boolean;
}

// 速率限制接口
export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}

/**
 * JWT认证中间件
 */
export const authenticateToken = (options: AuthMiddlewareOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { required = true, checkPlayerData = true } = options;
      
      // 从请求头获取token
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : null;

      // 如果没有token且不是必需的，继续执行
      if (!token && !required) {
        return next();
      }

      // 如果没有token但是必需的，返回错误
      if (!token) {
        return res.status(401).json({
          success: false,
          message: '访问令牌缺失',
          code: GAME_CONSTANTS.ERROR_CODES.UNAUTHORIZED
        });
      }

      // 验证token
      const verification = await AuthService.verifyToken(token);
      
      if (!verification.isValid || !verification.payload) {
        return res.status(401).json({
          success: false,
          message: verification.message || '无效的访问令牌',
          code: GAME_CONFIG.ERROR_CODES.UNAUTHORIZED
        });
      }

      // 将用户信息添加到请求对象
      req.user = verification.payload;
      req.userId = verification.payload.userId;
      req.playerId = verification.payload.playerId;

      // 如果需要检查玩家数据
      if (checkPlayerData && req.playerId) {
        const { PlayerData } = require('../models');
        const playerData = await PlayerData.findByPk(req.playerId);
        
        if (!playerData) {
          return res.status(404).json({
            success: false,
            message: '玩家数据不存在',
            code: GAME_CONSTANTS.ERROR_CODES.PLAYER_NOT_FOUND
          });
        }
      }

      next();
    } catch (error) {
      console.error('认证中间件错误:', error);
      return res.status(500).json({
        success: false,
        message: '认证服务异常',
        code: GAME_CONSTANTS.ERROR_CODES.INTERNAL_ERROR
      });
    }
  };
};

/**
 * 可选认证中间件（不强制要求token）
 */
export const optionalAuth = authenticateToken({ required: false });

/**
 * 必需认证中间件（强制要求token）
 */
export const requireAuth = authenticateToken({ required: true });

/**
 * 管理员权限中间件
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '需要登录',
        code: GAME_CONFIG.ERROR_CODES.UNAUTHORIZED
      });
    }

    const { User } = require('../models');
    const user = await User.findByPk(req.user.userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限',
        code: GAME_CONSTANTS.ERROR_CODES.FORBIDDEN
      });
    }

    next();
  } catch (error) {
    console.error('管理员权限检查错误:', error);
    return res.status(500).json({
      success: false,
      message: '权限检查异常',
      code: GAME_CONFIG.ERROR_CODES.INTERNAL_ERROR
    });
  }
};

/**
 * 速率限制中间件
 */
export const rateLimit = (options: RateLimitOptions) => {
  const { windowMs, maxRequests, message = '请求过于频繁，请稍后再试', skipSuccessfulRequests = false } = options;
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 获取客户端标识（IP地址或用户ID）
      const identifier = req.user?.userId?.toString() || req.ip || 'anonymous';
      const key = `rate_limit:${identifier}:${req.route?.path || req.path}`;
      
      // 获取当前请求计数
      const current = await RedisClient.get(key);
      const requestCount = current ? parseInt(current) : 0;
      
      // 检查是否超过限制
      if (requestCount >= maxRequests) {
        return res.status(429).json({
          success: false,
          message,
          code: GAME_CONSTANTS.ERROR_CODES.RATE_LIMIT_EXCEEDED,
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
      
      // 增加请求计数
      const newCount = requestCount + 1;
      const ttl = requestCount === 0 ? Math.ceil(windowMs / 1000) : undefined;
      await RedisClient.set(key, newCount.toString(), ttl);
      
      // 设置响应头
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': Math.max(0, maxRequests - newCount).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString()
      });
      
      // 如果配置了跳过成功请求，在响应完成后检查状态码
      if (skipSuccessfulRequests) {
        const originalSend = res.send;
        res.send = function(data) {
          const result = originalSend.call(this, data);
          
          // 如果是成功响应，减少计数
          if (res.statusCode >= 200 && res.statusCode < 300) {
            RedisClient.set(key, Math.max(0, newCount - 1).toString(), ttl)
              .catch(err => console.error('减少速率限制计数失败:', err));
          }
          
          return result;
        };
      }
      
      next();
    } catch (error) {
      console.error('速率限制中间件错误:', error);
      // 如果Redis出错，不阻止请求继续
      next();
    }
  };
};

/**
 * 游戏API速率限制
 */
export const gameApiRateLimit = rateLimit({
  windowMs: GAME_CONFIG.RATE_LIMIT.GAME_API.WINDOW_MS,
  maxRequests: GAME_CONFIG.RATE_LIMIT.GAME_API.MAX_REQUESTS,
  message: '游戏操作过于频繁，请稍后再试'
});

/**
 * 认证API速率限制
 */
export const authApiRateLimit = rateLimit({
  windowMs: GAME_CONFIG.RATE_LIMIT.AUTH_API.WINDOW_MS,
  maxRequests: GAME_CONFIG.RATE_LIMIT.AUTH_API.MAX_REQUESTS,
  message: '登录尝试过于频繁，请稍后再试'
});

/**
 * 挖矿操作速率限制
 */
export const miningRateLimit = rateLimit({
  windowMs: 60000, // 1分钟
  maxRequests: 30, // 最多30次挖矿
  message: '挖矿操作过于频繁，请稍后再试',
  skipSuccessfulRequests: false
});

/**
 * 商店操作速率限制
 */
export const shopRateLimit = rateLimit({
  windowMs: 60000, // 1分钟
  maxRequests: 20, // 最多20次购买
  message: '购买操作过于频繁，请稍后再试'
});

/**
 * 验证玩家所有权中间件
 */
export const validatePlayerOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const playerId = req.params.playerId || req.body.playerId || req.query.playerId;
    
    if (!playerId) {
      return res.status(400).json({
        success: false,
        message: '缺少玩家ID参数',
        code: GAME_CONFIG.ERROR_CODES.INVALID_INPUT
      });
    }
    
    // 检查玩家ID是否属于当前用户
    if (req.playerId && parseInt(playerId) !== req.playerId) {
      return res.status(403).json({
        success: false,
        message: '无权访问其他玩家的数据',
        code: GAME_CONFIG.ERROR_CODES.FORBIDDEN
      });
    }
    
    next();
  } catch (error) {
    console.error('验证玩家所有权错误:', error);
    return res.status(500).json({
      success: false,
      message: '权限验证异常',
      code: GAME_CONFIG.ERROR_CODES.INTERNAL_ERROR
    });
  }
};

/**
 * 游戏状态检查中间件
 */
export const checkGameStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 检查游戏是否在维护中
    const maintenanceStatus = await RedisClient.get('game:maintenance');
    if (maintenanceStatus === 'true') {
      return res.status(503).json({
        success: false,
        message: '游戏正在维护中，请稍后再试',
        code: GAME_CONFIG.ERROR_CODES.MAINTENANCE
      });
    }
    
    // 检查服务器负载
    const serverLoad = await RedisClient.get('game:server_load');
    if (serverLoad && parseInt(serverLoad) > 90) {
      return res.status(503).json({
        success: false,
        message: '服务器负载过高，请稍后再试',
        code: GAME_CONFIG.ERROR_CODES.SERVER_OVERLOAD
      });
    }
    
    next();
  } catch (error) {
    console.error('游戏状态检查错误:', error);
    // 如果检查失败，不阻止请求继续
    next();
  }
};

/**
 * 精力检查中间件
 */
export const checkEnergy = (requiredEnergy: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.playerId) {
        return res.status(401).json({
          success: false,
          message: '需要登录',
          code: GAME_CONFIG.ERROR_CODES.UNAUTHORIZED
        });
      }
      
      const { PlayerData } = require('../models');
      const player = await PlayerData.findByPk(req.playerId);
      
      if (!player) {
        return res.status(404).json({
          success: false,
          message: '玩家数据不存在',
          code: GAME_CONFIG.ERROR_CODES.PLAYER_NOT_FOUND
        });
      }
      
      // 自动恢复精力
      await player.autoRecoverEnergy();
      
      // 检查精力是否足够
      if (!player.hasEnoughEnergy(requiredEnergy)) {
        return res.status(400).json({
          success: false,
          message: `精力不足，需要 ${requiredEnergy} 点精力`,
          code: GAME_CONFIG.ERROR_CODES.INSUFFICIENT_ENERGY,
          data: {
            required: requiredEnergy,
            current: player.current_energy,
            max: player.max_energy
          }
        });
      }
      
      next();
    } catch (error) {
      console.error('精力检查错误:', error);
      return res.status(500).json({
        success: false,
        message: '精力检查异常',
        code: GAME_CONFIG.ERROR_CODES.INTERNAL_ERROR
      });
    }
  };
};

/**
 * 等级检查中间件
 */
export const checkLevel = (requiredLevel: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.playerId) {
        return res.status(401).json({
          success: false,
          message: '需要登录',
          code: GAME_CONFIG.ERROR_CODES.UNAUTHORIZED
        });
      }
      
      const { PlayerData } = require('../models');
      const player = await PlayerData.findByPk(req.playerId);
      
      if (!player) {
        return res.status(404).json({
          success: false,
          message: '玩家数据不存在',
          code: GAME_CONFIG.ERROR_CODES.PLAYER_NOT_FOUND
        });
      }
      
      if (player.level < requiredLevel) {
        return res.status(400).json({
          success: false,
          message: `需要等级 ${requiredLevel} 才能执行此操作`,
          code: GAME_CONFIG.ERROR_CODES.INSUFFICIENT_LEVEL,
          data: {
            required: requiredLevel,
            current: player.level
          }
        });
      }
      
      next();
    } catch (error) {
      console.error('等级检查错误:', error);
      return res.status(500).json({
        success: false,
        message: '等级检查异常',
        code: GAME_CONFIG.ERROR_CODES.INTERNAL_ERROR
      });
    }
  };
};

/**
 * 请求日志中间件
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url, ip } = req;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const userId = req.user?.userId || 'Anonymous';
  
  // 记录请求开始
  console.log(`[${new Date().toISOString()}] ${method} ${url} - User: ${userId} - IP: ${ip}`);
  
  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    console.log(`[${new Date().toISOString()}] ${method} ${url} - ${statusCode} - ${duration}ms - User: ${userId}`);
    
    // 记录慢请求
    if (duration > 1000) {
      console.warn(`慢请求警告: ${method} ${url} - ${duration}ms - User: ${userId}`);
    }
  });
  
  next();
};

export default {
  authenticateToken,
  optionalAuth,
  requireAuth,
  requireAdmin,
  rateLimit,
  gameApiRateLimit,
  authApiRateLimit,
  miningRateLimit,
  shopRateLimit,
  validatePlayerOwnership,
  checkGameStatus,
  checkEnergy,
  checkLevel,
  requestLogger
};