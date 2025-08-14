import { DataTypes, Model, Sequelize, Optional, Op } from 'sequelize';
import bcrypt from 'bcrypt';
import { GAME_CONFIG } from '../config/game.config';

// 用户属性接口
export interface UserAttributes {
  id: number;
  username: string;
  email: string;
  password: string;
  is_active: boolean;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
}

// 创建用户时的可选属性
export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'is_active' | 'last_login' | 'created_at' | 'updated_at'> {}

// 用户模型类
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public username!: string;
  public email!: string;
  public password!: string;
  public is_active!: boolean;
  public last_login!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // 实例方法：验证密码
  public async validatePassword(password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, this.password);
    } catch (error) {
      console.error('密码验证失败:', error);
      return false;
    }
  }

  // 实例方法：更新最后登录时间
  public async updateLastLogin(): Promise<void> {
    try {
      this.last_login = new Date();
      await this.save();
    } catch (error) {
      console.error('更新最后登录时间失败:', error);
      throw error;
    }
  }

  // 实例方法：获取用户安全信息（不包含密码）
  public getSafeUserInfo(): Omit<UserAttributes, 'password'> {
    const { password, ...safeInfo } = this.toJSON();
    return safeInfo;
  }

  // 静态方法：根据用户名或邮箱查找用户
  public static async findByUsernameOrEmail(identifier: string): Promise<User | null> {
    try {
      return await User.findOne({
        where: {
          [Op.or]: [
            { username: identifier },
            { email: identifier }
          ]
        }
      });
    } catch (error) {
      console.error('查找用户失败:', error);
      throw error;
    }
  }

  // 静态方法：创建用户并加密密码
  public static async createUser(userData: UserCreationAttributes): Promise<User> {
    try {
      // 加密密码
      const hashedPassword = await bcrypt.hash(userData.password, GAME_CONFIG.SECURITY.BCRYPT_ROUNDS);
      
      return await User.create({
        ...userData,
        password: hashedPassword,
        is_active: true
      });
    } catch (error) {
      console.error('创建用户失败:', error);
      throw error;
    }
  }

  // 静态方法：检查用户名是否存在
  public static async isUsernameExists(username: string): Promise<boolean> {
    try {
      const user = await User.findOne({ where: { username } });
      return !!user;
    } catch (error) {
      console.error('检查用户名失败:', error);
      throw error;
    }
  }

  // 静态方法：检查邮箱是否存在
  public static async isEmailExists(email: string): Promise<boolean> {
    try {
      const user = await User.findOne({ where: { email } });
      return !!user;
    } catch (error) {
      console.error('检查邮箱失败:', error);
      throw error;
    }
  }
}

// 模型定义函数
export const UserModel = (sequelize: Sequelize) => {
  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '用户ID'
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          len: [3, 50],
          isAlphanumeric: {
            msg: '用户名只能包含字母和数字'
          }
        },
        comment: '用户名'
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: {
            msg: '请输入有效的邮箱地址'
          }
        },
        comment: '邮箱地址'
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          len: {
            args: [6, 255],
            msg: '密码长度必须在6-255个字符之间'
          }
        },
        comment: '密码（加密后）'
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: '账户是否激活'
      },
      last_login: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '最后登录时间'
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: '创建时间'
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: '更新时间'
      }
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['username']
        },
        {
          unique: true,
          fields: ['email']
        },
        {
          fields: ['is_active']
        },
        {
          fields: ['created_at']
        }
      ],
      hooks: {
        // 更新时自动更新 updated_at
        beforeUpdate: (user: User) => {
          user.setDataValue('updated_at', new Date());
        },
        
        // 创建后的钩子（可以用于创建关联的玩家数据）
        afterCreate: async (user: User) => {
          console.log(`✅ 用户创建成功: ${user.username} (ID: ${user.id})`);
        }
      },
      comment: '用户表'
    }
  );

  return User;
};

export default UserModel;