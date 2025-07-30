import { DataTypes, Model, Sequelize, Optional } from 'sequelize';
import { GAME_CONFIG } from '../config/game.config';

// 离线挖矿会话属性接口
export interface OfflineMiningSessionAttributes {
  id: number;
  player_id: number;
  scene_id: number;
  start_time: Date;
  end_time?: Date;
  is_active: boolean;
  total_duration: number; // 总持续时间（毫秒）
  energy_consumed: number;
  coins_earned: number;
  experience_gained: number;
  mining_cycles: number; // 挖矿周期数
  items_found: string; // JSON字符串存储物品列表
  bonus_applied: boolean;
  last_calculation: Date;
  created_at: Date;
  updated_at: Date;
}

// 创建离线挖矿会话时的可选属性
export interface OfflineMiningSessionCreationAttributes extends Optional<OfflineMiningSessionAttributes, 
  'id' | 'end_time' | 'total_duration' | 'energy_consumed' | 'coins_earned' | 'experience_gained' | 
  'mining_cycles' | 'items_found' | 'bonus_applied' | 'last_calculation' | 'created_at' | 'updated_at'
> {}

// 挖矿物品接口
export interface MiningItem {
  name: string;
  rarity: string;
  value: number;
  quantity?: number;
}

// 离线挖矿会话模型类
export class OfflineMiningSession extends Model<OfflineMiningSessionAttributes, OfflineMiningSessionCreationAttributes> implements OfflineMiningSessionAttributes {
  public id!: number;
  public player_id!: number;
  public scene_id!: number;
  public start_time!: Date;
  public end_time?: Date;
  public is_active!: boolean;
  public total_duration!: number;
  public energy_consumed!: number;
  public coins_earned!: number;
  public experience_gained!: number;
  public mining_cycles!: number;
  public items_found!: string;
  public bonus_applied!: boolean;
  public last_calculation!: Date;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // 关联属性
  public player?: any;
  public scene?: any;

  // 实例方法：获取物品列表
  public getItemsFound(): MiningItem[] {
    try {
      return this.items_found ? JSON.parse(this.items_found) : [];
    } catch (error) {
      console.error('解析物品数据失败:', error);
      return [];
    }
  }

  // 实例方法：设置物品列表
  public setItemsFound(items: MiningItem[]): void {
    try {
      this.items_found = JSON.stringify(items);
    } catch (error) {
      console.error('序列化物品数据失败:', error);
      this.items_found = '[]';
    }
  }

  // 实例方法：计算会话持续时间
  public getSessionDuration(): number {
    const endTime = this.end_time || new Date();
    return endTime.getTime() - this.start_time.getTime();
  }

  // 实例方法：计算挖矿效率
  public getMiningEfficiency(): number {
    if (this.total_duration <= 0) return 0;
    const totalValue = this.coins_earned + this.getItemsFound().reduce((sum, item) => sum + item.value, 0);
    const durationInHours = this.total_duration / (1000 * 60 * 60);
    return Math.round(totalValue / durationInHours);
  }

  // 实例方法：计算离线挖矿收益
  public async calculateOfflineRewards(): Promise<{
    cycles: number;
    coins: number;
    experience: number;
    energy: number;
    items: MiningItem[];
  }> {
    try {
      if (!this.scene) {
        throw new Error('场景信息未加载');
      }

      const now = new Date();
      const timeSinceLastCalculation = now.getTime() - this.last_calculation.getTime();
      
      // 计算可以进行的挖矿周期数
      const cycleInterval = GAME_CONFIG.AUTO_MINING.MINING_INTERVAL;
      const possibleCycles = Math.floor(timeSinceLastCalculation / cycleInterval);
      
      if (possibleCycles <= 0) {
        return {
          cycles: 0,
          coins: 0,
          experience: 0,
          energy: 0,
          items: []
        };
      }

      // 获取玩家当前精力
      const player = this.player;
      if (!player) {
        throw new Error('玩家信息未加载');
      }

      // 计算实际可以进行的周期数（受精力限制）
      const energyPerCycle = this.scene.energy_cost;
      const maxCyclesByEnergy = Math.floor(player.current_energy / energyPerCycle);
      const actualCycles = Math.min(possibleCycles, maxCyclesByEnergy);
      
      if (actualCycles <= 0) {
        return {
          cycles: 0,
          coins: 0,
          experience: 0,
          energy: 0,
          items: []
        };
      }

      // 计算总收益
      let totalCoins = 0;
      let totalExperience = 0;
      let totalEnergy = actualCycles * energyPerCycle;
      const allItems: MiningItem[] = [];

      for (let i = 0; i < actualCycles; i++) {
        const reward = this.scene.calculateMiningReward(player.level, this.bonus_applied);
        totalCoins += reward.coins;
        totalExperience += reward.experience;
        
        if (reward.items) {
          allItems.push(...reward.items);
        }
      }

      return {
        cycles: actualCycles,
        coins: totalCoins,
        experience: totalExperience,
        energy: totalEnergy,
        items: allItems
      };
    } catch (error) {
      console.error('计算离线挖矿收益失败:', error);
      throw error;
    }
  }

  // 实例方法：应用离线挖矿收益
  public async applyOfflineRewards(): Promise<{
    cycles: number;
    coins: number;
    experience: number;
    energy: number;
    items: MiningItem[];
    levelUp?: { newLevel: number; coinsReward: number };
  }> {
    try {
      const rewards = await this.calculateOfflineRewards();
      
      if (rewards.cycles <= 0) {
        return rewards;
      }

      // 更新会话数据
      const existingItems = this.getItemsFound();
      const newItems = [...existingItems, ...rewards.items];
      
      await this.update({
        mining_cycles: this.mining_cycles + rewards.cycles,
        coins_earned: this.coins_earned + rewards.coins,
        experience_gained: this.experience_gained + rewards.experience,
        energy_consumed: this.energy_consumed + rewards.energy,
        items_found: JSON.stringify(newItems),
        last_calculation: new Date()
      });

      // 更新玩家数据
      const player = this.player;
      await player.consumeEnergy(rewards.energy);
      await player.addCoins(rewards.coins);
      const levelUpResult = await player.addExperience(rewards.experience);
      await player.incrementMiningCount();

      return {
        ...rewards,
        levelUp: levelUpResult.leveledUp ? {
          newLevel: levelUpResult.newLevel!,
          coinsReward: levelUpResult.coinsReward!
        } : undefined
      };
    } catch (error) {
      console.error('应用离线挖矿收益失败:', error);
      throw error;
    }
  }

  // 实例方法：停止离线挖矿
  public async stopSession(): Promise<void> {
    try {
      const now = new Date();
      await this.update({
        is_active: false,
        end_time: now,
        total_duration: this.getSessionDuration()
      });
    } catch (error) {
      console.error('停止离线挖矿会话失败:', error);
      throw error;
    }
  }

  // 实例方法：获取会话摘要
  public getSessionSummary(): object {
    const items = this.getItemsFound();
    const duration = this.getSessionDuration();
    const durationInHours = Math.round(duration / (1000 * 60 * 60) * 100) / 100;
    
    return {
      id: this.id,
      playerId: this.player_id,
      sceneId: this.scene_id,
      sceneName: this.scene?.name || '未知场景',
      status: {
        isActive: this.is_active,
        startTime: this.start_time,
        endTime: this.end_time,
        duration: {
          milliseconds: duration,
          hours: durationInHours
        }
      },
      progress: {
        cycles: this.mining_cycles,
        lastCalculation: this.last_calculation
      },
      rewards: {
        coins: this.coins_earned,
        experience: this.experience_gained,
        items: items,
        totalItems: items.length
      },
      costs: {
        energy: this.energy_consumed
      },
      efficiency: {
        coinsPerHour: durationInHours > 0 ? Math.round(this.coins_earned / durationInHours) : 0,
        expPerHour: durationInHours > 0 ? Math.round(this.experience_gained / durationInHours) : 0
      },
      bonusApplied: this.bonus_applied
    };
  }

  // 静态方法：开始新的离线挖矿会话
  public static async startSession(data: {
    playerId: number;
    sceneId: number;
    bonusApplied?: boolean;
  }): Promise<OfflineMiningSession> {
    try {
      // 检查是否已有活跃会话
      const existingSession = await OfflineMiningSession.findOne({
        where: {
          player_id: data.playerId,
          is_active: true
        }
      });

      if (existingSession) {
        throw new Error('已有活跃的离线挖矿会话');
      }

      const session = await OfflineMiningSession.create({
        player_id: data.playerId,
        scene_id: data.sceneId,
        start_time: new Date(),
        is_active: true,
        bonus_applied: data.bonusApplied || false,
        last_calculation: new Date()
      });

      return session;
    } catch (error) {
      console.error('开始离线挖矿会话失败:', error);
      throw error;
    }
  }

  // 静态方法：获取玩家的活跃会话
  public static async getActiveSession(playerId: number): Promise<OfflineMiningSession | null> {
    try {
      return await OfflineMiningSession.findOne({
        where: {
          player_id: playerId,
          is_active: true
        },
        include: [
          {
            association: 'player',
            attributes: ['id', 'level', 'current_energy']
          },
          {
            association: 'scene',
            attributes: ['id', 'name', 'energy_cost']
          }
        ]
      });
    } catch (error) {
      console.error('获取活跃会话失败:', error);
      throw error;
    }
  }

  // 静态方法：获取玩家的历史会话
  public static async getPlayerSessions(
    playerId: number,
    options: {
      limit?: number;
      offset?: number;
      includeActive?: boolean;
    } = {}
  ): Promise<{ sessions: OfflineMiningSession[]; total: number }> {
    try {
      const whereClause: any = { player_id: playerId };
      
      if (!options.includeActive) {
        whereClause.is_active = false;
      }

      const { count, rows } = await OfflineMiningSession.findAndCountAll({
        where: whereClause,
        include: [{
          association: 'scene',
          attributes: ['id', 'name', 'description']
        }],
        order: [['created_at', 'DESC']],
        limit: options.limit || 20,
        offset: options.offset || 0
      });

      return {
        sessions: rows,
        total: count
      };
    } catch (error) {
      console.error('获取玩家会话历史失败:', error);
      throw error;
    }
  }

  // 静态方法：处理所有活跃会话的收益计算
  public static async processAllActiveSessions(): Promise<number> {
    try {
      const activeSessions = await OfflineMiningSession.findAll({
        where: { is_active: true },
        include: [
          {
            association: 'player',
            attributes: ['id', 'level', 'current_energy']
          },
          {
            association: 'scene',
            attributes: ['id', 'name', 'energy_cost']
          }
        ]
      });

      let processedCount = 0;
      
      for (const session of activeSessions) {
        try {
          await session.applyOfflineRewards();
          processedCount++;
        } catch (error) {
          console.error(`处理会话 ${session.id} 失败:`, error);
        }
      }

      console.log(`✅ 处理了 ${processedCount} 个活跃的离线挖矿会话`);
      return processedCount;
    } catch (error) {
      console.error('批量处理活跃会话失败:', error);
      throw error;
    }
  }

  // 静态方法：清理旧的会话记录
  public static async cleanupOldSessions(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deletedCount = await OfflineMiningSession.destroy({
        where: {
          is_active: false,
          created_at: {
            [require('sequelize').Op.lt]: cutoffDate
          }
        }
      });

      console.log(`🧹 清理了 ${deletedCount} 条旧的离线挖矿会话`);
      return deletedCount;
    } catch (error) {
      console.error('清理旧会话失败:', error);
      throw error;
    }
  }
}

// 模型定义函数
export const OfflineMiningSessionModel = (sequelize: Sequelize) => {
  OfflineMiningSession.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '离线挖矿会话ID'
      },
      player_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'player_data',
          key: 'id'
        },
        comment: '玩家ID'
      },
      scene_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'scenes',
          key: 'id'
        },
        comment: '场景ID'
      },
      start_time: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '开始时间'
      },
      end_time: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '结束时间'
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: '是否活跃'
      },
      total_duration: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: '总持续时间（毫秒）'
      },
      energy_consumed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: '消耗的精力'
      },
      coins_earned: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: '获得的金币'
      },
      experience_gained: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: '获得的经验'
      },
      mining_cycles: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: '挖矿周期数'
      },
      items_found: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '[]',
        comment: '发现的物品（JSON格式）'
      },
      bonus_applied: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否应用了加成'
      },
      last_calculation: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: '最后计算时间'
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
      modelName: 'OfflineMiningSession',
      tableName: 'offline_mining_sessions',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ['player_id']
        },
        {
          fields: ['scene_id']
        },
        {
          fields: ['is_active']
        },
        {
          fields: ['start_time']
        },
        {
          fields: ['end_time']
        },
        {
          fields: ['last_calculation']
        },
        {
          fields: ['player_id', 'is_active']
        },
        {
          unique: true,
          fields: ['player_id'],
          where: {
            is_active: true
          },
          name: 'unique_active_session_per_player'
        }
      ],
      hooks: {
        beforeCreate: (session: OfflineMiningSession) => {
          // 确保物品数据是有效的JSON
          if (!session.items_found) {
            session.items_found = '[]';
          }
        },
        
        beforeUpdate: (session: OfflineMiningSession) => {
          session.updated_at = new Date();
          
          // 如果会话结束，计算总持续时间
          if (!session.is_active && !session.end_time) {
            session.end_time = new Date();
          }
          
          if (session.end_time) {
            session.total_duration = session.end_time.getTime() - session.start_time.getTime();
          }
        },
        
        afterCreate: async (session: OfflineMiningSession) => {
          console.log(`🚀 离线挖矿会话开始: 玩家${session.player_id} 在场景${session.scene_id}`);
        },
        
        afterUpdate: async (session: OfflineMiningSession) => {
          if (!session.is_active && session.changed('is_active')) {
            const durationInMinutes = Math.round(session.total_duration / (1000 * 60));
            console.log(`⏹️ 离线挖矿会话结束: 玩家${session.player_id} 持续${durationInMinutes}分钟，获得${session.coins_earned}金币`);
          }
        }
      },
      comment: '离线挖矿会话表'
    }
  );

  return OfflineMiningSession;
};

export default OfflineMiningSessionModel;