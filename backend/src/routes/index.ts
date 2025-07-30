import { Router } from 'express';
import authRoutes from './auth.routes';
import gameRoutes from './game.routes';
import shopRoutes from './shop.routes';
import { notFoundHandler } from '../middleware/error.middleware';

const router = Router();

/**
 * @swagger
 * info:
 *   title: 挖矿游戏 API
 *   version: 1.0.0
 *   description: 一个基于 Node.js 和 TypeScript 的挖矿游戏后端 API
 *   contact:
 *     name: API Support
 *     email: support@example.com
 *   license:
 *     name: MIT
 *     url: https://opensource.org/licenses/MIT
 * 
 * servers:
 *   - url: http://localhost:3000
 *     description: 开发服务器
 *   - url: https://api.example.com
 *     description: 生产服务器
 * 
 * paths:
 *   /health:
 *     get:
 *       tags: [系统]
 *       summary: 健康检查
 *       description: 检查服务器状态和数据库连接
 *       responses:
 *         200:
 *           description: 服务器正常运行
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                     example: 'ok'
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     example: '2024-01-01T12:00:00Z'
 *                   uptime:
 *                     type: number
 *                     description: 服务器运行时间（秒）
 *                     example: 3600
 *                   database:
 *                     type: object
 *                     properties:
 *                       status:
 *                         type: string
 *                         example: 'connected'
 *                       latency:
 *                         type: number
 *                         description: 数据库延迟（毫秒）
 *                         example: 15
 *                   redis:
 *                     type: object
 *                     properties:
 *                       status:
 *                         type: string
 *                         example: 'connected'
 *                       latency:
 *                         type: number
 *                         description: Redis延迟（毫秒）
 *                         example: 5
 *                   memory:
 *                     type: object
 *                     properties:
 *                       used:
 *                         type: number
 *                         description: 已使用内存（MB）
 *                         example: 128
 *                       total:
 *                         type: number
 *                         description: 总内存（MB）
 *                         example: 512
 *                       percentage:
 *                         type: number
 *                         description: 内存使用率
 *                         example: 25
 *         503:
 *           description: 服务不可用
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                     example: 'error'
 *                   message:
 *                     type: string
 *                     example: '数据库连接失败'
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     example: '2024-01-01T12:00:00Z'
 */

// 健康检查端点
router.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // 检查数据库连接
    const { sequelize } = await import('../models');
    await sequelize.authenticate();
    const dbLatency = Date.now() - startTime;
    
    // 检查Redis连接
    const redisStartTime = Date.now();
    const { redisClient } = await import('../config/redis.config');
    await redisClient.ping();
    const redisLatency = Date.now() - redisStartTime;
    
    // 获取内存使用情况
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const memoryTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const memoryPercentage = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        status: 'connected',
        latency: dbLatency
      },
      redis: {
        status: 'connected',
        latency: redisLatency
      },
      memory: {
        used: memoryUsedMB,
        total: memoryTotalMB,
        percentage: memoryPercentage
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      message: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    });
  }
});

// API 路由
router.use('/auth', authRoutes);
router.use('/game', gameRoutes);
router.use('/shop', shopRoutes);

// API 根路径信息
router.get('/', (req, res) => {
  res.json({
    name: '挖矿游戏 API',
    version: '1.0.0',
    description: '一个基于 Node.js 和 TypeScript 的挖矿游戏后端 API',
    endpoints: {
      auth: '/api/auth',
      game: '/api/game',
      shop: '/api/shop',
      health: '/api/health',
      docs: '/api-docs'
    },
    timestamp: new Date().toISOString()
  });
});

// 404 处理
router.use('*', notFoundHandler);

export default router;