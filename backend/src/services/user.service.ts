import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { PlayerData } from '../models/PlayerData';
import redisConfig from '../config/redis.config';
import { AuthenticationError, BusinessError, NotFoundError } from '../middleware/error.middleware';
import { Op } from 'sequelize';

export interface LoginResult {
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
    created_at: Date;
  };
  token: string;
  refreshToken: string;
  player?: {
    id: number;
    level: number;
    experience: number;
    coins: number;
    energy: number;
    max_energy: number;
  };
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
}

class UserService {
  private static instance: UserService;
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
  private readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * 用户注册
   */
  public async register(userData: RegisterData): Promise<LoginResult> {
    const { username, email, password } = userData;

    // 检查用户名是否已存在
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new BusinessError('用户名已存在');
      }
      if (existingUser.email === email) {
        throw new BusinessError('邮箱已被注册');
      }
    }

    // 密码加密
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: 'player'
    });

    // 创建玩家数据
    const playerData = await PlayerData.create({
      user_id: user.id,
      level: 1,
      experience: 0,
      coins: 100, // 初始金币
      energy: 100,
      max_energy: 100,
      current_scene_id: 1 // 默认场景
    });

    // 生成令牌
    const { token, refreshToken } = this.generateTokens(user.id, user.role);

    // 存储刷新令牌到Redis
    await this.storeRefreshToken(user.id, refreshToken);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      },
      token,
      refreshToken,
      player: {
        id: playerData.id,
        level: playerData.level,
        experience: playerData.experience,
        coins: playerData.coins,
        energy: playerData.energy,
        max_energy: playerData.max_energy
      }
    };
  }

  /**
   * 用户登录
   */
  public async login(loginData: LoginData): Promise<LoginResult> {
    const { username, password } = loginData;

    // 查找用户
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email: username }
        ]
      },
      include: [{
        model: PlayerData,
        as: 'playerData'
      }]
    });

    if (!user) {
      throw new AuthenticationError('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError('用户名或密码错误');
    }

    // 检查账户状态
    if (user.status === 'banned') {
      throw new AuthenticationError('账户已被封禁');
    }

    if (user.status === 'inactive') {
      throw new AuthenticationError('账户未激活');
    }

    // 更新最后登录时间
    await user.update({ last_login_at: new Date() });

    // 生成令牌
    const { token, refreshToken } = this.generateTokens(user.id, user.role);

    // 存储刷新令牌到Redis
    await this.storeRefreshToken(user.id, refreshToken);

    // 记录在线状态
    await this.setUserOnline(user.id);

    const result: LoginResult = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      },
      token,
      refreshToken
    };

    // 如果有玩家数据，添加到结果中
    if (user.playerData) {
      result.player = {
        id: user.playerData.id,
        level: user.playerData.level,
        experience: user.playerData.experience,
        coins: user.playerData.coins,
        energy: user.playerData.energy,
        max_energy: user.playerData.max_energy
      };
    }

    return result;
  }

  /**
   * 用户登出
   */
  public async logout(userId: number, refreshToken?: string): Promise<void> {
    // 从Redis中删除刷新令牌
    if (refreshToken) {
      await redisConfig.del(`refresh_token:${userId}`);
    }

    // 移除在线状态
    await this.setUserOffline(userId);
  }

  /**
   * 刷新令牌
   */
  public async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      // 验证刷新令牌
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as any;
      const userId = decoded.userId;

      // 检查Redis中的刷新令牌
      const storedToken = await redisConfig.get(`refresh_token:${userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new AuthenticationError('刷新令牌无效');
      }

      // 获取用户信息
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('用户不存在');
      }

      // 生成新的令牌
      const tokens = this.generateTokens(user.id, user.role);

      // 更新Redis中的刷新令牌
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch (error) {
      throw new AuthenticationError('刷新令牌无效');
    }
  }

  /**
   * 修改密码
   */
  public async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    // 验证旧密码
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new AuthenticationError('原密码错误');
    }

    // 加密新密码
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    await user.update({ password: hashedNewPassword });

    // 清除所有刷新令牌，强制重新登录
    await redisConfig.del(`refresh_token:${userId}`);
  }

  /**
   * 获取用户资料
   */
  public async getProfile(userId: number): Promise<any> {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [{
        model: PlayerData,
        as: 'playerData'
      }]
    });

    if (!user) {
      throw new NotFoundError('用户不存在');
    }

    return user;
  }

  /**
   * 验证令牌
   */
  public async verifyToken(token: string): Promise<{ userId: number; role: string }> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      return {
        userId: decoded.userId,
        role: decoded.role
      };
    } catch (error) {
      throw new AuthenticationError('令牌无效');
    }
  }

  /**
   * 获取在线用户统计
   */
  public async getOnlineStats(): Promise<{ total: number; players: number; admins: number }> {
    const onlineUsers = await redisConfig.getClient().sMembers('online_users');
    let players = 0;
    let admins = 0;

    for (const userId of onlineUsers) {
      const userRole = await redisConfig.get(`user_role:${userId}`);
      if (userRole === 'admin') {
        admins++;
      } else {
        players++;
      }
    }

    return {
      total: onlineUsers.length,
      players,
      admins
    };
  }

  /**
   * 生成JWT令牌
   */
  private generateTokens(userId: number, role: string): { token: string; refreshToken: string } {
    const payload = { userId, role };

    const token = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN
    });

    const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN
    });

    return { token, refreshToken };
  }

  /**
   * 存储刷新令牌到Redis
   */
  private async storeRefreshToken(userId: number, refreshToken: string): Promise<void> {
    const ttl = 7 * 24 * 60 * 60; // 7天
    await redisConfig.set(`refresh_token:${userId}`, refreshToken, ttl);
  }

  /**
   * 设置用户在线状态
   */
  private async setUserOnline(userId: number): Promise<void> {
    await redisConfig.getClient().sAdd('online_users', userId.toString());
    await redisConfig.set(`user_last_seen:${userId}`, Date.now().toString());
  }

  /**
   * 设置用户离线状态
   */
  private async setUserOffline(userId: number): Promise<void> {
    await redisConfig.getClient().sRem('online_users', userId.toString());
    await redisConfig.del(`user_last_seen:${userId}`);
  }
}

export default UserService.getInstance();