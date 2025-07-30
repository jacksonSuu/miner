import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

class RedisConfig {
  private static instance: RedisConfig;
  private client: RedisClientType;

  private constructor() {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000')
      },
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB || '0')
    });

    this.setupEventListeners();
  }

  public static getInstance(): RedisConfig {
    if (!RedisConfig.instance) {
      RedisConfig.instance = new RedisConfig();
    }
    return RedisConfig.instance;
  }

  private setupEventListeners(): void {
    this.client.on('connect', () => {
      console.log('🔗 Redis客户端正在连接...');
    });

    this.client.on('ready', () => {
      console.log('✅ Redis连接成功');
    });

    this.client.on('error', (error) => {
      console.error('❌ Redis连接错误:', error);
    });

    this.client.on('end', () => {
      console.log('🔌 Redis连接已断开');
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis正在重连...');
    });
  }

  public async connect(): Promise<void> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
    } catch (error) {
      console.error('Redis连接失败:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.client.isOpen) {
        await this.client.disconnect();
      }
    } catch (error) {
      console.error('Redis断开连接失败:', error);
      throw error;
    }
  }

  public getClient(): RedisClientType {
    return this.client;
  }

  // 缓存操作封装
  public async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.error(`Redis SET操作失败 - Key: ${key}`, error);
      throw error;
    }
  }

  public async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error(`Redis GET操作失败 - Key: ${key}`, error);
      throw error;
    }
  }

  public async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      console.error(`Redis DEL操作失败 - Key: ${key}`, error);
      throw error;
    }
  }

  public async exists(key: string): Promise<number> {
    try {
      return await this.client.exists(key);
    } catch (error) {
      console.error(`Redis EXISTS操作失败 - Key: ${key}`, error);
      throw error;
    }
  }

  public async expire(key: string, seconds: number): Promise<boolean> {
    try {
      return await this.client.expire(key, seconds);
    } catch (error) {
      console.error(`Redis EXPIRE操作失败 - Key: ${key}`, error);
      throw error;
    }
  }

  public async hSet(key: string, field: string, value: string): Promise<number> {
    try {
      return await this.client.hSet(key, field, value);
    } catch (error) {
      console.error(`Redis HSET操作失败 - Key: ${key}, Field: ${field}`, error);
      throw error;
    }
  }

  public async hGet(key: string, field: string): Promise<string | undefined> {
    try {
      return await this.client.hGet(key, field);
    } catch (error) {
      console.error(`Redis HGET操作失败 - Key: ${key}, Field: ${field}`, error);
      throw error;
    }
  }

  public async hGetAll(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hGetAll(key);
    } catch (error) {
      console.error(`Redis HGETALL操作失败 - Key: ${key}`, error);
      throw error;
    }
  }
}

// 导出单例实例
const redisConfig = RedisConfig.getInstance();
export const redisClient = redisConfig.getClient();
export default redisConfig;