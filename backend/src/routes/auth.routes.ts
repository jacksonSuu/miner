import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { 
  requireAuth, 
  optionalAuth, 
  rateLimit,
  authApiRateLimit,
  requestLogger
} from '../middleware/auth.middleware';
import { 
  validateRequestBody, 
  validateQueryParams 
} from '../middleware/error.middleware';

const router = Router();

// 应用请求日志中间件
router.use(requestLogger);

// 应用认证API速率限制
router.use(authApiRateLimit);

/**
 * @swagger
 * tags:
 *   name: 认证
 *   description: 用户认证相关接口
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 用户ID
 *           example: 1
 *         username:
 *           type: string
 *           description: 用户名
 *           example: 'player123'
 *         email:
 *           type: string
 *           format: email
 *           description: 邮箱地址
 *           example: 'player123@example.com'
 *         role:
 *           type: string
 *           enum: [player, admin]
 *           description: 用户角色
 *           example: 'player'
 *         isActive:
 *           type: boolean
 *           description: 账户是否激活
 *           example: true
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           description: 最后登录时间
 *           example: '2024-01-01T12:00:00Z'
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *           example: '2024-01-01T10:00:00Z'
 *     
 *     LoginRequest:
 *       type: object
 *       required:
 *         - username
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: 用户名或邮箱
 *           example: 'player123'
 *         password:
 *           type: string
 *           description: 密码
 *           example: 'password123'
 *     
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 20
 *           description: 用户名
 *           example: 'player123'
 *         email:
 *           type: string
 *           format: email
 *           description: 邮箱地址
 *           example: 'player123@example.com'
 *         password:
 *           type: string
 *           minLength: 6
 *           description: 密码
 *           example: 'password123'
 *     
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - oldPassword
 *         - newPassword
 *       properties:
 *         oldPassword:
 *           type: string
 *           description: 旧密码
 *           example: 'oldpassword123'
 *         newPassword:
 *           type: string
 *           minLength: 6
 *           description: 新密码
 *           example: 'newpassword123'
 *     
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: '登录成功'
 *         token:
 *           type: string
 *           description: JWT访问令牌
 *           example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 *         refreshToken:
 *           type: string
 *           description: 刷新令牌
 *           example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 *         user:
 *           $ref: '#/components/schemas/User'
 *   
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   
 *   responses:
 *     BadRequest:
 *       description: 请求参数错误
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Unauthorized:
 *       description: 未授权访问
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     TooManyRequests:
 *       description: 请求过于频繁
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: '错误信息'
 *         code:
 *           type: string
 *           example: 'ERROR_CODE'
 *         details:
 *           type: object
 *           description: 详细错误信息（开发环境）
 */

// 用户注册
router.post('/register', 
  validateRequestBody(['username', 'email', 'password']),
  AuthController.register
);

// 用户登录
router.post('/login', 
  validateRequestBody(['username', 'password']),
  AuthController.login
);

// 用户登出
router.post('/logout', 
  requireAuth,
  AuthController.logout
);

// 刷新令牌
router.post('/refresh', 
  validateRequestBody(['refreshToken']),
  AuthController.refreshToken
);

// 修改密码
router.post('/change-password', 
  requireAuth,
  validateRequestBody(['oldPassword', 'newPassword']),
  AuthController.changePassword
);

// 获取用户资料
router.get('/profile', 
  requireAuth,
  AuthController.getProfile
);

// 验证令牌
router.get('/verify', 
  optionalAuth,
  AuthController.verifyToken
);

// 获取在线用户统计（管理员）
router.get('/online-stats', 
  requireAuth,
  validateQueryParams([]),
  AuthController.getOnlineStats
);

export default router;