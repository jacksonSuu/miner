import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { GAME_CONFIG, GAME_CONSTANTS } from '../config/game.config';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * 认证控制器类
 */
export class AuthController {
  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     tags: [认证]
   *     summary: 用户注册
   *     description: 创建新用户账户和玩家数据
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - username
   *               - email
   *               - password
   *             properties:
   *               username:
   *                 type: string
   *                 minLength: 3
   *                 maxLength: 20
   *                 pattern: '^[a-zA-Z0-9_]+$'
   *                 description: 用户名（3-20个字符，只能包含字母、数字和下划线）
   *                 example: 'player123'
   *               email:
   *                 type: string
   *                 format: email
   *                 description: 邮箱地址
   *                 example: 'player@example.com'
   *               password:
   *                 type: string
   *                 minLength: 6
   *                 maxLength: 50
   *                 description: 密码（至少6个字符，必须包含字母和数字）
   *                 example: 'password123'
   *     responses:
   *       201:
   *         description: 注册成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: '注册成功'
   *                 data:
   *                   type: object
   *                   properties:
   *                     userId:
   *                       type: integer
   *                       example: 1
   *                     playerId:
   *                       type: integer
   *                       example: 1
   *                     username:
   *                       type: string
   *                       example: 'player123'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       409:
   *         description: 用户名或邮箱已存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  public static register = asyncHandler(async (req: Request, res: Response) => {
    const { username, email, password } = req.body;

    // 基本输入验证
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名、邮箱和密码都是必需的',
        code: GAME_CONSTANTS.ERROR_CODES.INVALID_INPUT
      });
    }

    const result = await AuthService.register({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password
    });

    if (result.success) {
      return res.status(201).json(result);
    } else {
      const statusCode = result.message.includes('已存在') || result.message.includes('已被注册') ? 409 : 400;
      return res.status(statusCode).json({
        ...result,
        code: statusCode === 409 ? GAME_CONSTANTS.ERROR_CODES.DUPLICATE_ENTRY : GAME_CONSTANTS.ERROR_CODES.INVALID_INPUT
      });
    }
  });

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     tags: [认证]
   *     summary: 用户登录
   *     description: 使用用户名/邮箱和密码登录
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - usernameOrEmail
   *               - password
   *             properties:
   *               usernameOrEmail:
   *                 type: string
   *                 description: 用户名或邮箱
   *                 example: 'player123'
   *               password:
   *                 type: string
   *                 description: 密码
   *                 example: 'password123'
   *               rememberMe:
   *                 type: boolean
   *                 description: 是否记住登录状态（延长令牌有效期）
   *                 example: false
   *     responses:
   *       200:
   *         description: 登录成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: '登录成功'
   *                 data:
   *                   type: object
   *                   properties:
   *                     user:
   *                       $ref: '#/components/schemas/User'
   *                     player:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: integer
   *                           example: 1
   *                         level:
   *                           type: integer
   *                           example: 5
   *                         coins:
   *                           type: integer
   *                           example: 1000
   *                         energy:
   *                           type: object
   *                           properties:
   *                             current:
   *                               type: integer
   *                               example: 80
   *                             max:
   *                               type: integer
   *                               example: 100
   *                     token:
   *                       type: string
   *                       description: JWT访问令牌
   *                       example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   *                     expiresIn:
   *                       type: string
   *                       description: 令牌有效期
   *                       example: '7d'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         description: 认证失败
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  public static login = asyncHandler(async (req: Request, res: Response) => {
    const { usernameOrEmail, password, rememberMe = false } = req.body;

    // 基本输入验证
    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名/邮箱和密码都是必需的',
        code: GAME_CONSTANTS.ERROR_CODES.INVALID_INPUT
      });
    }

    const result = await AuthService.login({
      usernameOrEmail: usernameOrEmail.trim(),
      password,
      rememberMe
    });

    if (result.success) {
      return res.status(200).json(result);
    } else {
      const statusCode = result.message.includes('不存在') || result.message.includes('密码错误') ? 401 : 400;
      return res.status(statusCode).json({
        ...result,
        code: statusCode === 401 ? GAME_CONSTANTS.ERROR_CODES.UNAUTHORIZED : GAME_CONSTANTS.ERROR_CODES.INVALID_INPUT
      });
    }
  });

  /**
   * @swagger
   * /api/auth/logout:
   *   post:
   *     tags: [认证]
   *     summary: 用户登出
   *     description: 登出当前用户并使令牌失效
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 登出成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: '登出成功'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  public static logout = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;

    const result = await AuthService.logout(userId);

    return res.status(200).json(result);
  });

  /**
   * @swagger
   * /api/auth/refresh:
   *   post:
   *     tags: [认证]
   *     summary: 刷新访问令牌
   *     description: 使用当前令牌获取新的访问令牌
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 令牌刷新成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: '令牌刷新成功'
   *                 token:
   *                   type: string
   *                   description: 新的JWT访问令牌
   *                   example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  public static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问令牌缺失',
        code: GAME_CONSTANTS.ERROR_CODES.UNAUTHORIZED
      });
    }

    const result = await AuthService.refreshToken(token);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(401).json({
        ...result,
        code: GAME_CONFIG.ERROR_CODES.UNAUTHORIZED
      });
    }
  });

  /**
   * @swagger
   * /api/auth/change-password:
   *   post:
   *     tags: [认证]
   *     summary: 修改密码
   *     description: 修改当前用户的密码
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - oldPassword
   *               - newPassword
   *             properties:
   *               oldPassword:
   *                 type: string
   *                 description: 当前密码
   *                 example: 'oldpassword123'
   *               newPassword:
   *                 type: string
   *                 minLength: 6
   *                 maxLength: 50
   *                 description: 新密码（至少6个字符，必须包含字母和数字）
   *                 example: 'newpassword123'
   *     responses:
   *       200:
   *         description: 密码修改成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: '密码修改成功，请重新登录'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  public static changePassword = asyncHandler(async (req: Request, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.userId!;

    // 基本输入验证
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '原密码和新密码都是必需的',
        code: GAME_CONSTANTS.ERROR_CODES.INVALID_INPUT
      });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: '新密码不能与原密码相同',
        code: GAME_CONSTANTS.ERROR_CODES.INVALID_INPUT
      });
    }

    const result = await AuthService.changePassword({
      userId,
      oldPassword,
      newPassword
    });

    if (result.success) {
      return res.status(200).json(result);
    } else {
      const statusCode = result.message.includes('原密码错误') ? 401 : 400;
      return res.status(statusCode).json({
        ...result,
        code: statusCode === 401 ? GAME_CONSTANTS.ERROR_CODES.UNAUTHORIZED : GAME_CONSTANTS.ERROR_CODES.INVALID_INPUT
      });
    }
  });

  /**
   * @swagger
   * /api/auth/profile:
   *   get:
   *     tags: [认证]
   *     summary: 获取用户资料
   *     description: 获取当前登录用户的基本信息
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 获取成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: '获取用户资料成功'
   *                 data:
   *                   type: object
   *                   properties:
   *                     user:
   *                       $ref: '#/components/schemas/User'
   *                     player:
   *                       $ref: '#/components/schemas/PlayerData'
   *                     stats:
   *                       type: object
   *                       properties:
   *                         totalPlayTime:
   *                           type: integer
   *                           description: 总游戏时间（分钟）
   *                           example: 1440
   *                         lastLoginTime:
   *                           type: string
   *                           format: date-time
   *                           example: '2024-01-01T12:00:00Z'
   *                         registrationDate:
   *                           type: string
   *                           format: date-time
   *                           example: '2023-12-01T10:00:00Z'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       404:
   *         description: 用户或玩家数据不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  public static getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const playerId = req.playerId!;

    const { User, PlayerData } = require('../models');

    // 获取用户信息
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'role', 'is_active', 'last_login_at', 'created_at']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        code: GAME_CONSTANTS.ERROR_CODES.USER_NOT_FOUND
      });
    }

    // 获取玩家数据
    const player = await PlayerData.findByPk(playerId);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: '玩家数据不存在',
        code: GAME_CONSTANTS.ERROR_CODES.PLAYER_NOT_FOUND
      });
    }

    // 自动恢复精力
    await player.autoRecoverEnergy();

    // 计算统计信息
    const totalPlayTime = Math.floor((Date.now() - user.created_at.getTime()) / (1000 * 60)); // 分钟

    return res.status(200).json({
      success: true,
      message: '获取用户资料成功',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.is_active,
          lastLoginAt: user.last_login_at,
          createdAt: user.created_at
        },
        player: {
          id: player.id,
          level: player.level,
          experience: player.experience,
          experienceToNext: player.getExperienceToNextLevel(),
          coins: player.coins,
          energy: {
            current: player.current_energy,
            max: player.max_energy
          },
          miningCount: player.mining_count,
          totalCoinsEarned: player.total_coins_earned,
          createdAt: player.created_at,
          updatedAt: player.updated_at
        },
        stats: {
          totalPlayTime,
          lastLoginTime: user.last_login_at,
          registrationDate: user.created_at
        }
      }
    });
  });

  /**
   * @swagger
   * /api/auth/verify:
   *   get:
   *     tags: [认证]
   *     summary: 验证访问令牌
   *     description: 验证当前访问令牌是否有效
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 令牌有效
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: '令牌有效'
   *                 data:
   *                   type: object
   *                   properties:
   *                     userId:
   *                       type: integer
   *                       example: 1
   *                     playerId:
   *                       type: integer
   *                       example: 1
   *                     username:
   *                       type: string
   *                       example: 'player123'
   *                     expiresAt:
   *                       type: string
   *                       format: date-time
   *                       example: '2024-01-08T12:00:00Z'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  public static verifyToken = asyncHandler(async (req: Request, res: Response) => {
    // 如果到达这里，说明令牌已经通过中间件验证
    const user = req.user!;

    return res.status(200).json({
      success: true,
      message: '令牌有效',
      data: {
        userId: user.userId,
        playerId: user.playerId,
        username: user.username,
        expiresAt: user.exp ? new Date(user.exp * 1000).toISOString() : null
      }
    });
  });

  /**
   * @swagger
   * /api/auth/stats:
   *   get:
   *     tags: [认证]
   *     summary: 获取在线用户统计
   *     description: 获取当前在线用户数量等统计信息（管理员权限）
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 获取成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: '获取统计信息成功'
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalOnline:
   *                       type: integer
   *                       description: 当前在线用户总数
   *                       example: 150
   *                     activeInLast5Min:
   *                       type: integer
   *                       description: 最近5分钟活跃用户数
   *                       example: 45
   *                     activeInLastHour:
   *                       type: integer
   *                       description: 最近1小时活跃用户数
   *                       example: 120
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   */
  public static getOnlineStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await AuthService.getOnlineUserStats();

    return res.status(200).json({
      success: true,
      message: '获取统计信息成功',
      data: stats
    });
  });
}

export default AuthController;