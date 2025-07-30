import dotenv from 'dotenv';
import { initializeApp } from './app';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';

// 加载环境变量
dotenv.config();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * 启动服务器
 */
async function startServer(): Promise<void> {
  try {
    console.log('🚀 正在启动挖矿游戏服务器...');
    console.log(`📦 环境: ${NODE_ENV}`);
    console.log(`🔌 端口: ${PORT}`);

    // 初始化数据库连接
    console.log('\n📊 初始化数据库连接...');
    await databaseConfig.connect();
    
    // 在开发环境下同步数据库模型
    if (NODE_ENV === 'development') {
      console.log('🔄 同步数据库模型...');
      await databaseConfig.sync({ alter: true });
    }

    // 初始化Redis连接
    console.log('\n🔴 初始化Redis连接...');
    await redisConfig.connect();

    // 初始化Express应用
    console.log('\n⚡ 初始化Express应用...');
    const app = await initializeApp();

    // 启动HTTP服务器
    const server = app.listen(PORT, () => {
      console.log('\n✅ 服务器启动成功!');
      console.log(`🌐 服务器地址: http://localhost:${PORT}`);
      console.log(`📚 API文档: http://localhost:${PORT}/api-docs`);
      console.log(`❤️  健康检查: http://localhost:${PORT}/health`);
      console.log('\n🎮 挖矿游戏服务器已就绪，等待玩家连接...');
    });

    // 设置服务器超时
    server.timeout = 30000; // 30秒
    server.keepAliveTimeout = 65000; // 65秒
    server.headersTimeout = 66000; // 66秒

    // 优雅关闭处理
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 收到 ${signal} 信号，开始优雅关闭服务器...`);
      
      // 停止接受新连接
      server.close(async () => {
        console.log('🔌 HTTP服务器已关闭');
        
        try {
          // 关闭数据库连接
          console.log('📊 关闭数据库连接...');
          await databaseConfig.disconnect();
          
          // 关闭Redis连接
          console.log('🔴 关闭Redis连接...');
          await redisConfig.disconnect();
          
          console.log('✅ 服务器已优雅关闭');
          process.exit(0);
        } catch (error) {
          console.error('❌ 关闭服务器时发生错误:', error);
          process.exit(1);
        }
      });
      
      // 强制关闭超时
      setTimeout(() => {
        console.error('⏰ 强制关闭服务器（超时）');
        process.exit(1);
      }, 10000);
    };

    // 监听进程信号
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // 监听未捕获的异常
    process.on('uncaughtException', (error) => {
      console.error('❌ 未捕获的异常:', error);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ 未处理的Promise拒绝:', reason);
      console.error('Promise:', promise);
      gracefulShutdown('unhandledRejection');
    });

    // 监听内存警告
    process.on('warning', (warning) => {
      console.warn('⚠️  进程警告:', warning.name, warning.message);
    });

  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    
    // 尝试清理资源
    try {
      await databaseConfig.disconnect();
      await redisConfig.disconnect();
    } catch (cleanupError) {
      console.error('❌ 清理资源失败:', cleanupError);
    }
    
    process.exit(1);
  }
}

/**
 * 健康检查函数
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: { status: string; message: string };
    redis: { status: string; message: string };
    memory: { usage: number; limit: number; percentage: number };
  };
}> {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();
  
  // 检查数据库
  const dbHealth = await databaseConfig.healthCheck();
  
  // 检查Redis
  let redisHealth;
  try {
    await redisConfig.get('health_check');
    redisHealth = { status: 'healthy', message: 'Redis连接正常' };
  } catch (error) {
    redisHealth = { status: 'unhealthy', message: 'Redis连接异常' };
  }
  
  // 检查内存使用
  const memUsage = process.memoryUsage();
  const memLimit = 512 * 1024 * 1024; // 512MB限制
  const memPercentage = (memUsage.heapUsed / memLimit) * 100;
  
  const overallStatus = (
    dbHealth.status === 'healthy' && 
    redisHealth.status === 'healthy' && 
    memPercentage < 90
  ) ? 'healthy' : 'unhealthy';
  
  return {
    status: overallStatus,
    timestamp,
    uptime,
    services: {
      database: dbHealth,
      redis: redisHealth,
      memory: {
        usage: memUsage.heapUsed,
        limit: memLimit,
        percentage: Math.round(memPercentage * 100) / 100
      }
    }
  };
}

// 如果直接运行此文件，启动服务器
if (require.main === module) {
  startServer();
}

export { startServer };