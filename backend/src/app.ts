import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { setupSwagger } from './config/swagger.config';
import databaseManager from './config/database.config';
import redisConfig from './config/redis.config';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/auth.middleware';
import { GAME_CONFIG, GAME_CONSTANTS } from './config/game.config';

/**
 * 创建Express应用
 */
const app = express();

/**
 * 安全中间件
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

/**
 * CORS配置
 */
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
}));

/**
 * 压缩中间件
 */
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024
}));

/**
 * 全局速率限制
 */
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000, // 生产环境更严格
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
    code: GAME_CONSTANTS.ERROR_CODES.RATE_LIMIT_EXCEEDED
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // 跳过健康检查和静态资源
    return req.path === '/api/health' || req.path.startsWith('/api-docs');
  }
});

app.use(globalRateLimit);

/**
 * 解析中间件
 */
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      // 在verify回调中，我们只能抛出错误，不能直接发送响应
      throw new Error('Invalid JSON');
    }
  }
}));

// 添加JSON解析错误处理中间件
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: '无效的JSON格式',
      code: GAME_CONSTANTS.ERROR_CODES.INVALID_INPUT
    });
  }
  return next(err);
});

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

/**
 * 静态文件服务
 */
app.use('/static', express.static('public', {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
  etag: true,
  lastModified: true
}));

/**
 * 请求日志中间件（仅用于API路由）
 */
app.use('/api', requestLogger);

/**
 * 设置Swagger文档
 */
setupSwagger(app);

/**
 * API路由
 */
app.use('/api', routes);

/**
 * 根路径
 */
app.get('/', (req, res) => {
  res.json({
    name: '挖矿游戏后端API',
    version: '1.0.0',
    description: '一个基于Node.js和TypeScript的挖矿游戏后端服务',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      api: '/api',
      docs: '/api-docs',
      health: '/api/health'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * 健康检查（在API路由之外，避免重复）
 */
app.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // 检查数据库连接
    const { sequelize } = await import('./models');
    await sequelize.authenticate();
    const dbLatency = Date.now() - startTime;
    
    // 检查Redis连接
    const redisStartTime = Date.now();
    const { redisClient } = await import('./config/redis.config');
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
      },
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
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

/**
 * 404处理
 */
app.use('*', notFoundHandler);

/**
 * 全局错误处理
 */
app.use(errorHandler);

/**
 * 优雅关闭处理
 */
process.on('SIGTERM', async () => {
  console.log('🔄 收到SIGTERM信号，开始优雅关闭...');
  
  try {
    // 关闭数据库连接
    const { sequelize } = await import('./models');
    await sequelize.close();
    console.log('✅ 数据库连接已关闭');
    
    // 关闭Redis连接
    const { redisClient } = await import('./config/redis.config');
    await redisClient.quit();
    console.log('✅ Redis连接已关闭');
    
    console.log('✅ 服务器已优雅关闭');
    process.exit(0);
  } catch (error) {
    console.error('❌ 优雅关闭失败:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('\n🔄 收到SIGINT信号，开始优雅关闭...');
  
  try {
    // 关闭数据库连接
    const { sequelize } = await import('./models');
    await sequelize.close();
    console.log('✅ 数据库连接已关闭');
    
    // 关闭Redis连接
    const { redisClient } = await import('./config/redis.config');
    await redisClient.quit();
    console.log('✅ Redis连接已关闭');
    
    console.log('✅ 服务器已优雅关闭');
    process.exit(0);
  } catch (error) {
    console.error('❌ 优雅关闭失败:', error);
    process.exit(1);
  }
});

/**
 * 未捕获异常处理
 */
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

/**
 * 初始化应用
 */
export async function initializeApp(): Promise<express.Application> {
  try {
    console.log('🚀 正在初始化应用...');
    
    // 连接数据库
    console.log('📊 正在连接数据库...');
    await databaseManager.connect();
    console.log('✅ 数据库连接成功');
    
    // 连接Redis
    console.log('🔴 正在连接Redis...');
    await redisConfig.connect();
    console.log('✅ Redis连接成功');
    
    console.log('✅ 应用初始化完成');
    return app;
  } catch (error) {
    console.error('❌ 应用初始化失败:', error);
    throw error;
  }
}

export default app;