import { createMockUser, createMockPlayerData, createMockScene } from './setup';

describe('示例测试', () => {
  describe('测试工具函数', () => {
    it('应该创建模拟用户', () => {
      const mockUser = createMockUser();
      
      expect(mockUser).toHaveProperty('id');
      expect(mockUser).toHaveProperty('username');
      expect(mockUser).toHaveProperty('email');
      expect(mockUser.username).toBe('testuser');
      expect(mockUser.email).toBe('test@example.com');
      expect(mockUser.is_active).toBe(true);
    });

    it('应该创建模拟玩家数据', () => {
      const mockPlayerData = createMockPlayerData();
      
      expect(mockPlayerData).toHaveProperty('id');
      expect(mockPlayerData).toHaveProperty('user_id');
      expect(mockPlayerData).toHaveProperty('level');
      expect(mockPlayerData).toHaveProperty('experience');
      expect(mockPlayerData).toHaveProperty('coins');
      expect(mockPlayerData.level).toBe(1);
      expect(mockPlayerData.coins).toBe(100);
      expect(mockPlayerData.energy).toBe(50);
    });

    it('应该创建模拟场景', () => {
      const mockScene = createMockScene();
      
      expect(mockScene).toHaveProperty('id');
      expect(mockScene).toHaveProperty('name');
      expect(mockScene).toHaveProperty('description');
      expect(mockScene.name).toBe('测试矿洞');
      expect(mockScene.required_level).toBe(1);
      expect(mockScene.is_active).toBe(true);
    });
  });

  describe('环境变量测试', () => {
    it('应该设置正确的测试环境', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.JWT_SECRET).toBe('test_super_secret_jwt_key_for_testing_only');
      expect(process.env.DB_NAME).toBe('miner_game_test');
      expect(process.env.REDIS_DB).toBe('1');
    });
  });

  describe('基础功能测试', () => {
    it('应该能够执行基本的数学运算', () => {
      expect(1 + 1).toBe(2);
      expect(2 * 3).toBe(6);
      expect(10 / 2).toBe(5);
    });

    it('应该能够处理字符串', () => {
      const testString = 'Hello World';
      expect(testString.toLowerCase()).toBe('hello world');
      expect(testString.includes('World')).toBe(true);
      expect(testString.split(' ')).toEqual(['Hello', 'World']);
    });

    it('应该能够处理数组', () => {
      const testArray = [1, 2, 3, 4, 5];
      expect(testArray.length).toBe(5);
      expect(testArray.includes(3)).toBe(true);
      expect(testArray.filter(x => x > 3)).toEqual([4, 5]);
    });

    it('应该能够处理对象', () => {
      const testObject = {
        name: '测试对象',
        value: 42,
        active: true,
      };
      
      expect(testObject.name).toBe('测试对象');
      expect(testObject.value).toBe(42);
      expect(testObject.active).toBe(true);
      expect(Object.keys(testObject)).toEqual(['name', 'value', 'active']);
    });
  });

  describe('异步操作测试', () => {
    it('应该能够处理Promise', async () => {
      const promise = Promise.resolve('测试成功');
      const result = await promise;
      expect(result).toBe('测试成功');
    });

    it('应该能够处理延时操作', async () => {
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      const start = Date.now();
      await delay(100);
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(90); // 允许一些误差
    });

    it('应该能够处理错误', async () => {
      const errorPromise = Promise.reject(new Error('测试错误'));
      
      await expect(errorPromise).rejects.toThrow('测试错误');
    });
  });

  describe('模拟函数测试', () => {
    it('应该能够创建和使用模拟函数', () => {
      const mockFn = jest.fn();
      mockFn('test');
      
      expect(mockFn).toHaveBeenCalled();
      expect(mockFn).toHaveBeenCalledWith('test');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('应该能够模拟返回值', () => {
      const mockFn = jest.fn().mockReturnValue('模拟返回值');
      const result = mockFn();
      
      expect(result).toBe('模拟返回值');
      expect(mockFn).toHaveBeenCalled();
    });

    it('应该能够模拟异步返回值', async () => {
      const mockFn = jest.fn().mockResolvedValue('异步模拟返回值');
      const result = await mockFn();
      
      expect(result).toBe('异步模拟返回值');
      expect(mockFn).toHaveBeenCalled();
    });
  });
});