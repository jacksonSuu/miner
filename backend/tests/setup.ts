import dotenv from 'dotenv';

// 加载测试环境变量
dotenv.config({ path: '.env.test' });

// 设置测试环境
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key';
process.env.DB_NAME = 'miner_game_test';
process.env.REDIS_DB = '1'; // 使用不同的Redis数据库

// 全局测试配置
global.console = {
  ...console,
  // 在测试中静默某些日志
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// 设置测试超时
jest.setTimeout(30000);

// 测试前的全局设置
beforeAll(async () => {
  // 这里可以添加全局测试前的设置
  console.log('开始运行测试套件');
});

// 测试后的全局清理
afterAll(async () => {
  // 这里可以添加全局测试后的清理
  console.log('测试套件运行完成');
});

// 每个测试前的设置
beforeEach(() => {
  // 清除所有模拟
  jest.clearAllMocks();
});

// 每个测试后的清理
afterEach(() => {
  // 这里可以添加每个测试后的清理
});

// 导出测试工具函数
export const createMockUser = () => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  password_hash: 'hashed_password',
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
});

export const createMockPlayerData = () => ({
  id: 1,
  user_id: 1,
  level: 1,
  experience: 0,
  coins: 100,
  energy: 50,
  max_energy: 100,
  last_energy_recovery: new Date(),
  mining_power: 1,
  luck: 1,
  efficiency: 1,
  current_scene_id: 1,
  total_mining_count: 0,
  total_coins_earned: 0,
  created_at: new Date(),
  updated_at: new Date(),
});

export const createMockScene = () => ({
  id: 1,
  name: '测试矿洞',
  description: '用于测试的矿洞',
  required_level: 1,
  energy_cost: 1,
  base_reward: 10,
  bonus_multiplier: 1.0,
  unlock_cost: 0,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
});

export const createMockShopItem = () => ({
  id: 1,
  name: '测试工具',
  description: '用于测试的工具',
  category: 'tool',
  price: 100,
  required_level: 1,
  effect_type: 'mining_power',
  effect_value: 2,
  durability: 100,
  rarity: 'common',
  is_available: true,
  created_at: new Date(),
  updated_at: new Date(),
});

// 模拟JWT令牌
export const createMockJWT = () => 'mock.jwt.token';

// 模拟请求对象
export const createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: createMockUser(),
  ...overrides,
});

// 模拟响应对象
export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

// 模拟下一个中间件函数
export const createMockNext = () => jest.fn();