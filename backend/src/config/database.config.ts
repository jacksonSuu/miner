import { Sequelize, Options } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

interface DatabaseConfig {
  development: Options;
  test: Options;
  production: Options;
}

class DatabaseManager {
  private static instance: DatabaseManager;
  private sequelize: Sequelize;

  private constructor() {
    const env = (process.env.NODE_ENV || 'development') as keyof DatabaseConfig;
    this.sequelize = new Sequelize(config[env]);
    this.setupEventListeners();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private setupEventListeners(): void {
    this.sequelize.addHook('beforeConnect', () => {
      console.log('🔗 数据库正在连接...');
    });

    this.sequelize.addHook('afterConnect', () => {
      console.log('✅ 数据库连接成功');
    });

    this.sequelize.addHook('beforeDisconnect', () => {
      console.log('🔌 数据库正在断开连接...');
    });

    this.sequelize.addHook('afterDisconnect', () => {
      console.log('❌ 数据库连接已断开');
    });
  }

  public getSequelize(): Sequelize {
    return this.sequelize;
  }

  public async connect(): Promise<void> {
    try {
      await this.sequelize.authenticate();
      console.log('数据库连接验证成功');
    } catch (error) {
      console.error('数据库连接失败:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.sequelize.close();
      console.log('数据库连接已关闭');
    } catch (error) {
      console.error('数据库断开连接失败:', error);
      throw error;
    }
  }

  public async sync(options?: { force?: boolean; alter?: boolean }): Promise<void> {
    try {
      await this.sequelize.sync(options);
      console.log('数据库同步完成');
    } catch (error) {
      console.error('数据库同步失败:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<{ status: string; message: string; details?: any }> {
    try {
      await this.sequelize.authenticate();
      return {
        status: 'healthy',
        message: '数据库连接正常'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: '数据库连接异常',
        details: error
      };
    }
  }

  public getPoolStatus(): any {
    try {
      const connectionManager = this.sequelize.connectionManager as any;
      const pool = connectionManager.pool;
      return {
        size: pool?.size || 0,
        available: pool?.available || 0,
        using: pool?.using || 0,
        waiting: pool?.waiting || 0
      };
    } catch (error) {
      return {
        size: 0,
        available: 0,
        using: 0,
        waiting: 0
      };
    }
  }

  public async transaction(callback: (t: any) => Promise<any>): Promise<any> {
    return await this.sequelize.transaction(callback);
  }
}

const config: DatabaseConfig = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'miner_game',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    dialect: 'mysql',
    logging: console.log,
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '5'),
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      acquire: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
      idle: parseInt(process.env.DB_IDLE_TIMEOUT || '10000')
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    },
    timezone: '+08:00'
  },
  test: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME + '_test' || 'miner_game_test',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    dialect: 'mysql',
    logging: false,
    pool: {
      min: 1,
      max: 5,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  },
  production: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME || 'miner_game',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    dialect: 'mysql',
    logging: false,
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '10'),
      max: parseInt(process.env.DB_POOL_MAX || '30'),
      acquire: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
      idle: parseInt(process.env.DB_IDLE_TIMEOUT || '10000')
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    },
    timezone: '+08:00'
  }
};

// 创建数据库管理器实例
const databaseManager = DatabaseManager.getInstance();
const sequelize = databaseManager.getSequelize();

// 测试数据库连接
export const testConnection = async (): Promise<void> => {
  try {
    await databaseManager.connect();
    console.log('✅ 数据库连接成功');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
};

export { sequelize, config, databaseManager };
export default databaseManager;