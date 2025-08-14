import dotenv from 'dotenv';

dotenv.config();

// 游戏基础配置
export const GAME_CONFIG = {
  // 精力系统配置
  ENERGY: {
    MAX_ENERGY: parseInt(process.env.MAX_ENERGY || '100'),
    INITIAL_ENERGY: parseInt(process.env.INITIAL_ENERGY || '50'),
    RECOVERY_INTERVAL: parseInt(process.env.ENERGY_RECOVERY_INTERVAL || '300000'), // 5分钟
    RECOVERY_AMOUNT: 1, // 每次恢复1点精力
    MIN_ENERGY_FOR_MINING: 1 // 挖矿最少需要的精力
  },

  // 自动挖矿配置
  AUTO_MINING: {
    INTERVAL: parseInt(process.env.AUTO_MINING_INTERVAL || '10000'), // 10秒
    MAX_OFFLINE_HOURS: parseInt(process.env.MAX_OFFLINE_HOURS || '24'), // 24小时
    MIN_LEVEL_REQUIRED: 5 // 5级解锁自动挖矿
  },

  // 玩家初始配置
  PLAYER: {
    INITIAL_LEVEL: 1,
    INITIAL_COINS: parseInt(process.env.INITIAL_COINS || '100'),
    INITIAL_EXPERIENCE: 0,
    MAX_LEVEL: 100
  },

  // 等级经验配置
  LEVEL: {
    BASE_EXP: 100, // 1级到2级需要的经验
    EXP_MULTIPLIER: 1.5, // 每级经验倍数
    // 计算升级所需经验的公式: BASE_EXP * (EXP_MULTIPLIER ^ (level - 1))
    getRequiredExp: (level: number): number => {
      return Math.floor(GAME_CONFIG.LEVEL.BASE_EXP * Math.pow(GAME_CONFIG.LEVEL.EXP_MULTIPLIER, level - 1));
    }
  },

  // 挖矿场景配置
  SCENES: {
    // 场景解锁等级要求
    UNLOCK_LEVELS: {
      COPPER_MINE: 1,    // 铜矿
      IRON_MINE: 5,      // 铁矿
      SILVER_MINE: 10,   // 银矿
      GOLD_MINE: 20,     // 金矿
      DIAMOND_MINE: 35,  // 钻石矿
      CRYSTAL_MINE: 50   // 水晶矿
    },
    
    // 场景精力消耗
    ENERGY_COSTS: {
      COPPER_MINE: 1,
      IRON_MINE: 2,
      SILVER_MINE: 3,
      GOLD_MINE: 5,
      DIAMOND_MINE: 8,
      CRYSTAL_MINE: 12
    }
  },

  // 物品稀有度配置
  RARITY: {
    COMMON: {
      name: '普通',
      color: '#808080',
      dropRate: 0.6 // 60%
    },
    UNCOMMON: {
      name: '稀有',
      color: '#00ff00',
      dropRate: 0.25 // 25%
    },
    RARE: {
      name: '史诗',
      color: '#0080ff',
      dropRate: 0.12 // 12%
    },
    EPIC: {
      name: '传说',
      color: '#8000ff',
      dropRate: 0.025 // 2.5%
    },
    LEGENDARY: {
      name: '神话',
      color: '#ff8000',
      dropRate: 0.005 // 0.5%
    }
  },

  // 商店配置
  SHOP: {
    // 工具价格倍数
    TOOL_PRICE_MULTIPLIER: {
      COPPER_PICKAXE: 1,
      IRON_PICKAXE: 5,
      SILVER_PICKAXE: 25,
      GOLD_PICKAXE: 125,
      DIAMOND_PICKAXE: 625
    },
    
    // 精力药水配置
    ENERGY_POTIONS: {
      SMALL: { recovery: 10, price: 50 },
      MEDIUM: { recovery: 25, price: 100 },
      LARGE: { recovery: 50, price: 180 },
      FULL: { recovery: 100, price: 300 }
    }
  },

  // 缓存TTL配置（秒）
  CACHE_TTL: {
    PLAYER_INFO: 30 * 60,      // 30分钟
    ENERGY_STATUS: 5 * 60,     // 5分钟
    SCENE_CONFIG: 60 * 60,     // 1小时
    SHOP_ITEMS: 60 * 60,       // 1小时
    GAME_CONFIG: 60 * 60,      // 1小时
    USER_SESSION: 7 * 24 * 60 * 60, // 7天
    AUTO_MINING: 24 * 60 * 60, // 24小时
    LEADERBOARD: 10 * 60       // 10分钟
  },

  // API限流配置
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15分钟
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    MINING_WINDOW_MS: 60000, // 挖矿接口1分钟
    MINING_MAX_REQUESTS: 20  // 挖矿接口最多20次/分钟
  },

  // 安全配置
  SECURITY: {
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  }
};

// 游戏常量
export const GAME_CONSTANTS = {
  // 事件类型
  EVENTS: {
    MINING_RESULT: 'mining:result',
    ENERGY_UPDATE: 'energy:update',
    AUTO_MINING_STATUS: 'auto-mining:status',
    PLAYER_LEVEL_UP: 'player:level-up',
    SYSTEM_NOTIFICATION: 'system:notification',
    LEADERBOARD_UPDATE: 'leaderboard:update'
  },

  // 错误代码
  ERROR_CODES: {
    INSUFFICIENT_ENERGY: 'INSUFFICIENT_ENERGY',
    INSUFFICIENT_LEVEL: 'INSUFFICIENT_LEVEL',
    SCENE_LOCKED: 'SCENE_LOCKED',
    INSUFFICIENT_COINS: 'INSUFFICIENT_COINS',
    ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
    AUTO_MINING_ALREADY_ACTIVE: 'AUTO_MINING_ALREADY_ACTIVE',
    AUTO_MINING_NOT_UNLOCKED: 'AUTO_MINING_NOT_UNLOCKED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    INVALID_INPUT: 'INVALID_INPUT',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
    TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
    MAINTENANCE: 'MAINTENANCE',
    SERVER_OVERLOAD: 'SERVER_OVERLOAD',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY'
  },

  // 成功消息
  SUCCESS_MESSAGES: {
    MINING_SUCCESS: '挖矿成功',
    PURCHASE_SUCCESS: '购买成功',
    AUTO_MINING_STARTED: '自动挖矿已开启',
    AUTO_MINING_STOPPED: '自动挖矿已停止',
    ENERGY_RECOVERED: '精力恢复成功',
    LEVEL_UP: '恭喜升级'
  }
};

export default GAME_CONFIG;