import { DataTypes, Model, Sequelize, Optional } from 'sequelize';
import { GAME_CONFIG } from '../config/game.config';

// 玩家数据属性接口
export interface PlayerDataAttributes {
  id: number;
  user_id: number;
  level: number;
  experience: number;
  coins: number;
  current_energy: number;
  max_energy: number;
  last_energy_update: Date;
  total_mining_count: number;
  total_coins_earned: number;
  total_experience_gained: number;
  highest_level_reached: number;
  created_at: Date;
  updated_at: Date;
}

// 创建玩家数据时的可选属性
export interface PlayerDataCreationAttributes extends Optional<PlayerDataAttributes, 
  'id' | 'level' | 'experience' | 'coins' | 'current_energy' | 'max_energy' | 'last_energy_update' | 
  'total_mining_count' | 'total_coins_earned' | 'total_experience_gained' | 'highest_level_reached' | 
  'created_at' | 'updated_at'
> {}

// 玩家数据模型类
export class PlayerData extends Model<PlayerDataAttributes, PlayerDataCreationAttributes> implements PlayerDataAttributes {
  public id!: number;
  public user_id!: number;
  public level!: number;
  public experience!: number;
  public coins!: number;
  public current_energy!: number;
  public max_energy!: number;
  public last_energy_update!: Date;
  public total_mining_count!: number;
  public total_coins_earned!: number;
  public total_experience_gained!: number;
  public highest_level_reached!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // 实例方法：检查是否有足够的精力
  public hasEnoughEnergy(requiredEnergy: number): boolean {
    return this.current_energy >= requiredEnergy;
  }

  // 实例方法：消耗精力
  public async consumeEnergy(amount: number): Promise<boolean> {
    if (!this.hasEnoughEnergy(amount)) {
      return false;
    }

    try {
      await this.decrement('current_energy', { by: amount });
      await this.update({ last_energy_update: new Date() });
      return true;
    } catch (error) {
      console.error('消耗精力失败:', error);
      throw error;
    }
  }

  // 实例方法：恢复精力
  public async recoverEnergy(amount: number): Promise<void> {
    try {
      const newEnergy = Math.min(this.current_energy + amount, this.max_energy);
      await this.update({
        current_energy: newEnergy,
        last_energy_update: new Date()
      });
    } catch (error) {
      console.error('恢复精力失败:', error);
      throw error;
    }
  }

  // 实例方法：计算应该恢复的精力
  public calculateEnergyRecovery(): number {
    const now = new Date();
    const lastUpdate = new Date(this.last_energy_update);
    const timeDiff = now.getTime() - lastUpdate.getTime();
    const recoveryIntervals = Math.floor(timeDiff / GAME_CONFIG.ENERGY.RECOVERY_INTERVAL);
    
    return recoveryIntervals * GAME_CONFIG.ENERGY.RECOVERY_AMOUNT;
  }

  // 实例方法：自动恢复精力
  public async autoRecoverEnergy(): Promise<number> {
    const recoveryAmount = this.calculateEnergyRecovery();
    
    if (recoveryAmount > 0 && this.current_energy < this.max_energy) {
      await this.recoverEnergy(recoveryAmount);
      return recoveryAmount;
    }
    
    return 0;
  }

  // 实例方法：增加经验并检查升级
  public async addExperience(amount: number): Promise<{ leveledUp: boolean; newLevel?: number; coinsReward?: number }> {
    try {
      const oldLevel = this.level;
      const newExperience = this.experience + amount;
      
      // 计算新等级
      let newLevel = oldLevel;
      let remainingExp = newExperience;
      
      while (remainingExp >= GAME_CONFIG.LEVEL.getRequiredExp(newLevel) && newLevel < GAME_CONFIG.PLAYER.MAX_LEVEL) {
        remainingExp -= GAME_CONFIG.LEVEL.getRequiredExp(newLevel);
        newLevel++;
      }
      
      // 更新数据
      const updateData: any = {
        experience: newExperience,
        total_experience_gained: this.total_experience_gained + amount
      };
      
      if (newLevel > oldLevel) {
        updateData.level = newLevel;
        updateData.highest_level_reached = Math.max(this.highest_level_reached, newLevel);
        
        // 升级奖励：每级奖励50金币
        const levelUpReward = (newLevel - oldLevel) * 50;
        updateData.coins = this.coins + levelUpReward;
        updateData.total_coins_earned = this.total_coins_earned + levelUpReward;
        
        await this.update(updateData);
        
        return {
          leveledUp: true,
          newLevel,
          coinsReward: levelUpReward
        };
      } else {
        await this.update(updateData);
        return { leveledUp: false };
      }
    } catch (error) {
      console.error('增加经验失败:', error);
      throw error;
    }
  }

  // 实例方法：增加金币
  public async addCoins(amount: number): Promise<void> {
    try {
      await this.increment('coins', { by: amount });
      await this.increment('total_coins_earned', { by: amount });
    } catch (error) {
      console.error('增加金币失败:', error);
      throw error;
    }
  }

  // 实例方法：消费金币
  public async spendCoins(amount: number): Promise<boolean> {
    if (this.coins < amount) {
      return false;
    }

    try {
      await this.decrement('coins', { by: amount });
      return true;
    } catch (error) {
      console.error('消费金币失败:', error);
      throw error;
    }
  }

  // 实例方法：增加挖矿次数
  public async incrementMiningCount(): Promise<void> {
    try {
      await this.increment('total_mining_count');
    } catch (error) {
      console.error('增加挖矿次数失败:', error);
      throw error;
    }
  }

  // 实例方法：检查场景是否解锁
  public isSceneUnlocked(requiredLevel: number): boolean {
    return this.level >= requiredLevel;
  }

  // 实例方法：检查自动挖矿是否解锁
  public isAutoMiningUnlocked(): boolean {
    return this.level >= GAME_CONFIG.AUTO_MINING.MIN_LEVEL_REQUIRED;
  }

  // 实例方法：获取玩家统计信息
  public getPlayerStats(): object {
    return {
      level: this.level,
      experience: this.experience,
      coins: this.coins,
      energy: {
        current: this.current_energy,
        max: this.max_energy,
        percentage: Math.round((this.current_energy / this.max_energy) * 100)
      },
      stats: {
        totalMiningCount: this.total_mining_count,
        totalCoinsEarned: this.total_coins_earned,
        totalExperienceGained: this.total_experience_gained,
        highestLevelReached: this.highest_level_reached
      },
      features: {
        autoMiningUnlocked: this.isAutoMiningUnlocked()
      }
    };
  }

  // 静态方法：创建新玩家数据
  public static async createPlayerData(userId: number): Promise<PlayerData> {
    try {
      return await PlayerData.create({
        user_id: userId,
        level: GAME_CONFIG.PLAYER.INITIAL_LEVEL,
        experience: GAME_CONFIG.PLAYER.INITIAL_EXPERIENCE,
        coins: GAME_CONFIG.PLAYER.INITIAL_COINS,
        current_energy: GAME_CONFIG.ENERGY.INITIAL_ENERGY,
        max_energy: GAME_CONFIG.ENERGY.MAX_ENERGY,
        last_energy_update: new Date(),
        total_mining_count: 0,
        total_coins_earned: 0,
        total_experience_gained: 0,
        highest_level_reached: GAME_CONFIG.PLAYER.INITIAL_LEVEL
      });
    } catch (error) {
      console.error('创建玩家数据失败:', error);
      throw error;
    }
  }

  // 静态方法：获取排行榜数据
  public static async getLeaderboard(type: 'level' | 'coins' | 'mining_count', limit: number = 10): Promise<PlayerData[]> {
    try {
      const orderField = type === 'level' ? 'level' : 
                        type === 'coins' ? 'coins' : 'total_mining_count';
      
      return await PlayerData.findAll({
        order: [[orderField, 'DESC']],
        limit,
        include: [{
          association: 'user',
          attributes: ['username']
        }]
      });
    } catch (error) {
      console.error('获取排行榜失败:', error);
      throw error;
    }
  }
}

// 模型定义函数
export const PlayerDataModel = (sequelize: Sequelize) => {
  PlayerData.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '玩家数据ID'
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        comment: '关联用户ID'
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: GAME_CONFIG.PLAYER.INITIAL_LEVEL,
        validate: {
          min: 1,
          max: GAME_CONFIG.PLAYER.MAX_LEVEL
        },
        comment: '玩家等级'
      },
      experience: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: GAME_CONFIG.PLAYER.INITIAL_EXPERIENCE,
        validate: {
          min: 0
        },
        comment: '经验值'
      },
      coins: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: GAME_CONFIG.PLAYER.INITIAL_COINS,
        validate: {
          min: 0
        },
        comment: '金币数量'
      },
      current_energy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: GAME_CONFIG.ENERGY.INITIAL_ENERGY,
        validate: {
          min: 0
        },
        comment: '当前精力值'
      },
      max_energy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: GAME_CONFIG.ENERGY.MAX_ENERGY,
        validate: {
          min: 1
        },
        comment: '最大精力值'
      },
      last_energy_update: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: '最后精力更新时间'
      },
      total_mining_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: '总挖矿次数'
      },
      total_coins_earned: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: '总获得金币数'
      },
      total_experience_gained: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: '总获得经验值'
      },
      highest_level_reached: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: GAME_CONFIG.PLAYER.INITIAL_LEVEL,
        validate: {
          min: 1
        },
        comment: '达到的最高等级'
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
      modelName: 'PlayerData',
      tableName: 'player_data',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['user_id']
        },
        {
          fields: ['level']
        },
        {
          fields: ['coins']
        },
        {
          fields: ['current_energy', 'last_energy_update']
        },
        {
          fields: ['total_mining_count']
        },
        {
          fields: ['created_at']
        }
      ],
      hooks: {
        beforeUpdate: (playerData: PlayerData) => {
          playerData.setDataValue('updated_at', new Date());
          
          // 确保精力不超过最大值
          if (playerData.current_energy > playerData.max_energy) {
            playerData.current_energy = playerData.max_energy;
          }
          
          // 确保等级不超过最大等级
          if (playerData.level > GAME_CONFIG.PLAYER.MAX_LEVEL) {
            playerData.level = GAME_CONFIG.PLAYER.MAX_LEVEL;
          }
        },
        
        afterCreate: async (playerData: PlayerData) => {
          console.log(`✅ 玩家数据创建成功: 用户ID ${playerData.user_id}`);
        }
      },
      comment: '玩家数据表'
    }
  );

  return PlayerData;
};

export default PlayerDataModel;