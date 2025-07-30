import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, PlayerData } from '../models';
import { GAME_CONFIG } from '../config/game.config';
import { RedisClient } from '../config/redis.config';

// 认证服务接口
export interface AuthTokenPayload {
  userId: number;
  playerId: number;
  username: string;
  iat?: number;
  exp?: number;
}

export interface LoginResult {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: number;
      username: string;
      email: string;
    };
    player: {
      id: number;
      level: number;
      coins: number;
      energy: {
        current: number;
        max: number;
      };
    };
    token: string;
    expiresIn: string;
  };
}

export interface RegisterResult {
  success: boolean;
  message: string;
  data?: {
    userId: number;
    playerId: number;
    username: string;
  };
}

// 认证服务类
export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  private static readonly BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
  private static readonly TOKEN_PREFIX = 'auth_token:';
  private static readonly REFRESH_TOKEN_PREFIX = 'refresh_token:';

  /**
   * 用户注册
   */
  public static async register(data: {
    username: string;
    email: string;
    password: string;
  }): Promise<RegisterResult> {
    try {
      // 验证输入数据
      const validation = this.validateRegistrationData(data);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message
        };
      }

      // 检查用户名和邮箱是否已存在
      const existingUser = await User.findOne({
        where: {
          [require('sequelize').Op.or]: [
            { username: data.username },
            { email: data.email }
          ]
        }
      });

      if (existingUser) {
        return {
          success: false,
          message: existingUser.username === data.username ? '用户名已存在' : '邮箱已被注册'
        };
      }

      // 创建用户
      const user = await User.createUser({
        username: data.username,
        email: data.email,
        password: data.password
      });

      // 创建玩家数据
      const playerData = await PlayerData.createPlayerData(user.id);

      return {
        success: true,
        message: '注册成功',
        data: {
          userId: user.id,
          playerId: playerData.id,
          username: user.username
        }
      };
    } catch (error) {
      console.error('用户注册失败:', error);
      return {
        success: false,
        message: '注册失败，请稍后重试'
      };
    }
  }

  /**
   * 用户登录
   */
  public static async login(data: {
    usernameOrEmail: string;
    password: string;
    rememberMe?: boolean;
  }): Promise<LoginResult> {
    try {
      // 查找用户
      const user = await User.findByUsernameOrEmail(data.usernameOrEmail);
      if (!user) {
        return {
          success: false,
          message: '用户不存在'
        };
      }

      // 验证密码
      const isPasswordValid = await user.validatePassword(data.password);
      if (!isPasswordValid) {
        return {
          success: false,
          message: '密码错误'
        };
      }

      // 检查用户状态
      if (!user.is_active) {
        return {
          success: false,
          message: '账户已被禁用'
        };
      }

      // 获取玩家数据
      const playerData = await PlayerData.findOne({
        where: { user_id: user.id }
      });

      if (!playerData) {
        return {
          success: false,
          message: '玩家数据不存在'
        };
      }

      // 自动恢复精力
      await playerData.autoRecoverEnergy();

      // 生成JWT令牌
      const tokenPayload: AuthTokenPayload = {
        userId: user.id,
        playerId: playerData.id,
        username: user.username
      };

      const expiresIn = data.rememberMe ? '30d' : this.JWT_EXPIRES_IN;
      const token = this.generateToken(tokenPayload, expiresIn);

      // 将令牌存储到Redis（用于令牌管理）
      const tokenKey = `${this.TOKEN_PREFIX}${user.id}`;
      await RedisClient.set(tokenKey, token, this.getExpirationSeconds(expiresIn));

      // 更新最后登录时间
      await user.updateLastLogin();

      return {
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          },
          player: {
            id: playerData.id,
            level: playerData.level,
            coins: playerData.coins,
            energy: {
              current: playerData.current_energy,
              max: playerData.max_energy
            }
          },
          token,
          expiresIn
        }
      };
    } catch (error) {
      console.error('用户登录失败:', error);
      return {
        success: false,
        message: '登录失败，请稍后重试'
      };
    }
  }

  /**
   * 用户登出
   */
  public static async logout(userId: number): Promise<{ success: boolean; message: string }> {
    try {
      // 从Redis中删除令牌
      const tokenKey = `${this.TOKEN_PREFIX}${userId}`;
      await RedisClient.del(tokenKey);

      return {
        success: true,
        message: '登出成功'
      };
    } catch (error) {
      console.error('用户登出失败:', error);
      return {
        success: false,
        message: '登出失败'
      };
    }
  }

  /**
   * 验证JWT令牌
   */
  public static async verifyToken(token: string): Promise<{
    isValid: boolean;
    payload?: AuthTokenPayload;
    message?: string;
  }> {
    try {
      // 验证JWT令牌
      const payload = jwt.verify(token, this.JWT_SECRET) as AuthTokenPayload;
      
      // 检查Redis中是否存在该令牌
      const tokenKey = `${this.TOKEN_PREFIX}${payload.userId}`;
      const storedToken = await RedisClient.get(tokenKey);
      
      if (!storedToken || storedToken !== token) {
        return {
          isValid: false,
          message: '令牌已失效'
        };
      }

      // 检查用户是否仍然存在且活跃
      const user = await User.findByPk(payload.userId);
      if (!user || !user.is_active) {
        return {
          isValid: false,
          message: '用户不存在或已被禁用'
        };
      }

      return {
        isValid: true,
        payload
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return {
          isValid: false,
          message: '无效的令牌'
        };
      }
      
      if (error instanceof jwt.TokenExpiredError) {
        return {
          isValid: false,
          message: '令牌已过期'
        };
      }

      console.error('令牌验证失败:', error);
      return {
        isValid: false,
        message: '令牌验证失败'
      };
    }
  }

  /**
   * 刷新令牌
   */
  public static async refreshToken(oldToken: string): Promise<{
    success: boolean;
    token?: string;
    message: string;
  }> {
    try {
      const verification = await this.verifyToken(oldToken);
      
      if (!verification.isValid || !verification.payload) {
        return {
          success: false,
          message: verification.message || '令牌无效'
        };
      }

      // 生成新令牌
      const newToken = this.generateToken(verification.payload);
      
      // 更新Redis中的令牌
      const tokenKey = `${this.TOKEN_PREFIX}${verification.payload.userId}`;
      await RedisClient.set(tokenKey, newToken, this.getExpirationSeconds(this.JWT_EXPIRES_IN));

      return {
        success: true,
        token: newToken,
        message: '令牌刷新成功'
      };
    } catch (error) {
      console.error('令牌刷新失败:', error);
      return {
        success: false,
        message: '令牌刷新失败'
      };
    }
  }

  /**
   * 修改密码
   */
  public static async changePassword(data: {
    userId: number;
    oldPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findByPk(data.userId);
      if (!user) {
        return {
          success: false,
          message: '用户不存在'
        };
      }

      // 验证旧密码
      const isOldPasswordValid = await user.validatePassword(data.oldPassword);
      if (!isOldPasswordValid) {
        return {
          success: false,
          message: '原密码错误'
        };
      }

      // 验证新密码
      const passwordValidation = this.validatePassword(data.newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.message
        };
      }

      // 加密新密码
      const hashedPassword = await bcrypt.hash(data.newPassword, this.BCRYPT_ROUNDS);
      
      // 更新密码
      await user.update({ password: hashedPassword });

      // 清除所有令牌（强制重新登录）
      const tokenKey = `${this.TOKEN_PREFIX}${data.userId}`;
      await RedisClient.del(tokenKey);

      return {
        success: true,
        message: '密码修改成功，请重新登录'
      };
    } catch (error) {
      console.error('修改密码失败:', error);
      return {
        success: false,
        message: '密码修改失败'
      };
    }
  }

  /**
   * 生成JWT令牌
   */
  private static generateToken(payload: AuthTokenPayload, expiresIn?: string): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: expiresIn || this.JWT_EXPIRES_IN
    });
  }

  /**
   * 获取过期时间（秒）
   */
  private static getExpirationSeconds(expiresIn: string): number {
    const timeUnit = expiresIn.slice(-1);
    const timeValue = parseInt(expiresIn.slice(0, -1));
    
    switch (timeUnit) {
      case 's': return timeValue;
      case 'm': return timeValue * 60;
      case 'h': return timeValue * 60 * 60;
      case 'd': return timeValue * 24 * 60 * 60;
      default: return 7 * 24 * 60 * 60; // 默认7天
    }
  }

  /**
   * 验证注册数据
   */
  private static validateRegistrationData(data: {
    username: string;
    email: string;
    password: string;
  }): { isValid: boolean; message: string } {
    // 验证用户名
    if (!data.username || data.username.length < 3 || data.username.length > 20) {
      return {
        isValid: false,
        message: '用户名长度必须在3-20个字符之间'
      };
    }

    if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
      return {
        isValid: false,
        message: '用户名只能包含字母、数字和下划线'
      };
    }

    // 验证邮箱
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
      return {
        isValid: false,
        message: '请输入有效的邮箱地址'
      };
    }

    // 验证密码
    const passwordValidation = this.validatePassword(data.password);
    if (!passwordValidation.isValid) {
      return passwordValidation;
    }

    return {
      isValid: true,
      message: '验证通过'
    };
  }

  /**
   * 验证密码强度
   */
  private static validatePassword(password: string): { isValid: boolean; message: string } {
    if (!password || password.length < 6) {
      return {
        isValid: false,
        message: '密码长度至少6个字符'
      };
    }

    if (password.length > 50) {
      return {
        isValid: false,
        message: '密码长度不能超过50个字符'
      };
    }

    // 检查密码复杂度（至少包含字母和数字）
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    if (!hasLetter || !hasNumber) {
      return {
        isValid: false,
        message: '密码必须包含至少一个字母和一个数字'
      };
    }

    return {
      isValid: true,
      message: '密码强度合格'
    };
  }

  /**
   * 获取在线用户统计
   */
  public static async getOnlineUserStats(): Promise<{
    totalOnline: number;
    activeInLast5Min: number;
    activeInLastHour: number;
  }> {
    try {
      // 这里可以通过Redis或其他方式统计在线用户
      // 暂时返回模拟数据
      return {
        totalOnline: 0,
        activeInLast5Min: 0,
        activeInLastHour: 0
      };
    } catch (error) {
      console.error('获取在线用户统计失败:', error);
      return {
        totalOnline: 0,
        activeInLast5Min: 0,
        activeInLastHour: 0
      };
    }
  }
}

export default AuthService;