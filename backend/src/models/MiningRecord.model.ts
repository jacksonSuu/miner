import { DataTypes, Model, Sequelize, Optional } from 'sequelize';
import { GAME_CONFIG } from '../config/game.config';

// 挖矿记录属性接口
export interface MiningRecordAttributes {
  id: number;
  player_id: number;
  scene_id: number;
  coins_earned: number;
  experience_gained: number;
  energy_consumed: number;
  items_found: string; // JSON字符串存储物品列表
  mining_duration: number; // 挖矿持续时间（毫秒）
  is_auto_mining: boolean;
  bonus_applied: boolean; // 是否应用了加成
  created_at: Date;
  updated_at: Date;
}

// 创建挖矿记录时的可选属性
export interface MiningRecordCreationAttributes extends Optional<MiningRecordAttributes, 
  'id' | 'mining_duration' | 'is_auto_mining' | 'bonus_applied' | 'created_at' | 'updated_at'
> {}

// 物品接口
export interface MiningItem {
  name: string;
  rarity: string;
  value: number;
  quantity?: number;
}

// 挖矿记录模型类
export class MiningRecord extends Model<MiningRecordAttributes, MiningRecordCreationAttributes> implements MiningRecordAttributes {
  public id!: number;
  public player_id!: number;
  public scene_id!: number;
  public coins_earned!: number;
  public experience_gained!: number;
  public energy_consumed!: number;
  public items_found!: string;
  public mining_duration!: number;
  public is_auto_mining!: boolean;
  public bonus_applied!: boolean;
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

  // 实例方法：计算总价值
  public getTotalValue(): number {
    const items = this.getItemsFound();
    const itemsValue = items.reduce((total, item) => total + (item.value * (item.quantity || 1)), 0);
    return this.coins_earned + itemsValue;
  }

  // 实例方法：获取最稀有的物品
  public getRarestItem(): MiningItem | null {
    const items = this.getItemsFound();
    if (items.length === 0) return null;

    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    let rarestItem = items[0];
    let highestRarityIndex = rarityOrder.indexOf(rarestItem.rarity.toLowerCase());

    for (const item of items) {
      const rarityIndex = rarityOrder.indexOf(item.rarity.toLowerCase());
      if (rarityIndex > highestRarityIndex) {
        highestRarityIndex = rarityIndex;
        rarestItem = item;
      }
    }

    return rarestItem;
  }

  // 实例方法：获取挖矿效率（每分钟收益）
  public getMiningEfficiency(): number {
    if (this.mining_duration <= 0) return 0;
    const totalValue = this.getTotalValue();
    const durationInMinutes = this.mining_duration / (1000 * 60);
    return Math.round(totalValue / durationInMinutes);
  }

  // 实例方法：获取格式化的挖矿记录
  public getFormattedRecord(): object {
    const items = this.getItemsFound();
    const rarestItem = this.getRarestItem();
    
    return {
      id: this.id,
      playerId: this.player_id,
      sceneId: this.scene_id,
      sceneName: this.scene?.name || '未知场景',
      rewards: {
        coins: this.coins_earned,
        experience: this.experience_gained,
        items: items,
        totalValue: this.getTotalValue()
      },
      costs: {
        energy: this.energy_consumed
      },
      details: {
        duration: this.mining_duration,
        isAutoMining: this.is_auto_mining,
        bonusApplied: this.bonus_applied,
        efficiency: this.getMiningEfficiency(),
        rarestItem: rarestItem
      },
      timestamp: this.created_at
    };
  }

  // 静态方法：创建挖矿记录
  public static async createMiningRecord(data: {
    playerId: number;
    sceneId: number;
    coinsEarned: number;
    experienceGained: number;
    energyConsumed: number;
    itemsFound: MiningItem[];
    miningDuration?: number;
    isAutoMining?: boolean;
    bonusApplied?: boolean;
  }): Promise<MiningRecord> {
    try {
      const record = await MiningRecord.create({
        player_id: data.playerId,
        scene_id: data.sceneId,
        coins_earned: data.coinsEarned,
        experience_gained: data.experienceGained,
        energy_consumed: data.energyConsumed,
        items_found: JSON.stringify(data.itemsFound),
        mining_duration: data.miningDuration || 0,
        is_auto_mining: data.isAutoMining || false,
        bonus_applied: data.bonusApplied || false
      });

      return record;
    } catch (error) {
      console.error('创建挖矿记录失败:', error);
      throw error;
    }
  }

  // 静态方法：获取玩家的挖矿记录
  public static async getPlayerMiningRecords(
    playerId: number, 
    options: {
      limit?: number;
      offset?: number;
      sceneId?: number;
      isAutoMining?: boolean;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ records: MiningRecord[]; total: number }> {
    try {
      const whereClause: any = { player_id: playerId };
      
      if (options.sceneId) {
        whereClause.scene_id = options.sceneId;
      }
      
      if (options.isAutoMining !== undefined) {
        whereClause.is_auto_mining = options.isAutoMining;
      }
      
      if (options.startDate || options.endDate) {
        whereClause.created_at = {};
        if (options.startDate) {
          whereClause.created_at[require('sequelize').Op.gte] = options.startDate;
        }
        if (options.endDate) {
          whereClause.created_at[require('sequelize').Op.lte] = options.endDate;
        }
      }

      const { count, rows } = await MiningRecord.findAndCountAll({
        where: whereClause,
        include: [{
          association: 'scene',
          attributes: ['id', 'name', 'description']
        }],
        order: [['created_at', 'DESC']],
        limit: options.limit || 50,
        offset: options.offset || 0
      });

      return {
        records: rows,
        total: count
      };
    } catch (error) {
      console.error('获取玩家挖矿记录失败:', error);
      throw error;
    }
  }

  // 静态方法：获取玩家挖矿统计
  public static async getPlayerMiningStats(playerId: number, days: number = 7): Promise<object> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const records = await MiningRecord.findAll({
        where: {
          player_id: playerId,
          created_at: {
            [require('sequelize').Op.gte]: startDate
          }
        },
        include: [{
          association: 'scene',
          attributes: ['name']
        }]
      });

      // 计算统计数据
      const stats = {
        totalMining: records.length,
        totalCoins: records.reduce((sum, record) => sum + record.coins_earned, 0),
        totalExperience: records.reduce((sum, record) => sum + record.experience_gained, 0),
        totalEnergyUsed: records.reduce((sum, record) => sum + record.energy_consumed, 0),
        autoMiningCount: records.filter(record => record.is_auto_mining).length,
        manualMiningCount: records.filter(record => !record.is_auto_mining).length,
        averageCoinsPerMining: 0,
        averageExperiencePerMining: 0,
        mostUsedScene: '',
        totalItemsFound: 0,
        rarityDistribution: {
          common: 0,
          uncommon: 0,
          rare: 0,
          epic: 0,
          legendary: 0
        },
        dailyStats: [] as any[]
      };

      if (records.length > 0) {
        stats.averageCoinsPerMining = Math.round(stats.totalCoins / records.length);
        stats.averageExperiencePerMining = Math.round(stats.totalExperience / records.length);

        // 统计最常用场景
        const sceneUsage: { [key: string]: number } = {};
        records.forEach(record => {
          const sceneName = record.scene?.name || '未知场景';
          sceneUsage[sceneName] = (sceneUsage[sceneName] || 0) + 1;
        });
        stats.mostUsedScene = Object.keys(sceneUsage).reduce((a, b) => 
          sceneUsage[a] > sceneUsage[b] ? a : b
        );

        // 统计物品和稀有度分布
        records.forEach(record => {
          const items = record.getItemsFound();
          stats.totalItemsFound += items.length;
          
          items.forEach(item => {
            const rarity = item.rarity.toLowerCase();
            if (stats.rarityDistribution.hasOwnProperty(rarity)) {
              stats.rarityDistribution[rarity as keyof typeof stats.rarityDistribution]++;
            }
          });
        });

        // 按日期分组统计
        const dailyGroups: { [key: string]: any } = {};
        records.forEach(record => {
          const date = record.created_at.toISOString().split('T')[0];
          if (!dailyGroups[date]) {
            dailyGroups[date] = {
              date,
              miningCount: 0,
              coins: 0,
              experience: 0,
              energy: 0
            };
          }
          dailyGroups[date].miningCount++;
          dailyGroups[date].coins += record.coins_earned;
          dailyGroups[date].experience += record.experience_gained;
          dailyGroups[date].energy += record.energy_consumed;
        });
        
        stats.dailyStats = Object.values(dailyGroups).sort((a: any, b: any) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      }

      return stats;
    } catch (error) {
      console.error('获取玩家挖矿统计失败:', error);
      throw error;
    }
  }

  // 静态方法：获取全服挖矿排行榜
  public static async getGlobalMiningLeaderboard(
    type: 'coins' | 'experience' | 'count' = 'coins',
    timeRange: 'daily' | 'weekly' | 'monthly' | 'all' = 'weekly',
    limit: number = 10
  ): Promise<any[]> {
    try {
      let startDate: Date | undefined;
      
      if (timeRange !== 'all') {
        startDate = new Date();
        switch (timeRange) {
          case 'daily':
            startDate.setDate(startDate.getDate() - 1);
            break;
          case 'weekly':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case 'monthly':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        }
      }

      const whereClause: any = {};
      if (startDate) {
        whereClause.created_at = {
          [require('sequelize').Op.gte]: startDate
        };
      }

      const groupField = type === 'coins' ? 'coins_earned' : 
                        type === 'experience' ? 'experience_gained' : 'id';
      const aggregateFunction = type === 'count' ? 'COUNT' : 'SUM';

      const results = await MiningRecord.findAll({
        attributes: [
          'player_id',
          [require('sequelize').fn(aggregateFunction, require('sequelize').col(groupField)), 'total']
        ],
        where: whereClause,
        group: ['player_id'],
        order: [[require('sequelize').literal('total'), 'DESC']],
        limit,
        include: [{
          association: 'player',
          include: [{
            association: 'user',
            attributes: ['username']
          }]
        }]
      });

      return results.map((result: any, index: number) => ({
        rank: index + 1,
        playerId: result.player_id,
        username: result.player?.user?.username || '未知用户',
        total: parseInt(result.getDataValue('total')),
        type
      }));
    } catch (error) {
      console.error('获取挖矿排行榜失败:', error);
      throw error;
    }
  }

  // 静态方法：清理旧记录
  public static async cleanupOldRecords(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deletedCount = await MiningRecord.destroy({
        where: {
          created_at: {
            [require('sequelize').Op.lt]: cutoffDate
          }
        }
      });

      console.log(`🧹 清理了 ${deletedCount} 条旧挖矿记录`);
      return deletedCount;
    } catch (error) {
      console.error('清理旧记录失败:', error);
      throw error;
    }
  }
}

// 模型定义函数
export const MiningRecordModel = (sequelize: Sequelize) => {
  MiningRecord.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '挖矿记录ID'
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
      coins_earned: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0
        },
        comment: '获得金币数'
      },
      experience_gained: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0
        },
        comment: '获得经验值'
      },
      energy_consumed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        },
        comment: '消耗精力值'
      },
      items_found: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '[]',
        comment: '发现的物品（JSON格式）'
      },
      mining_duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: '挖矿持续时间（毫秒）'
      },
      is_auto_mining: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否为自动挖矿'
      },
      bonus_applied: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否应用了加成'
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
      modelName: 'MiningRecord',
      tableName: 'mining_records',
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
          fields: ['created_at']
        },
        {
          fields: ['is_auto_mining']
        },
        {
          fields: ['player_id', 'created_at']
        },
        {
          fields: ['coins_earned']
        },
        {
          fields: ['experience_gained']
        }
      ],
      hooks: {
        beforeCreate: (record: MiningRecord) => {
          // 确保物品数据是有效的JSON
          if (!record.items_found) {
            record.items_found = '[]';
          } else {
            try {
              JSON.parse(record.items_found);
            } catch (error) {
              console.warn('无效的物品JSON数据，重置为空数组');
              record.items_found = '[]';
            }
          }
        },
        
        beforeUpdate: (record: MiningRecord) => {
          record.updated_at = new Date();
        },
        
        afterCreate: async (record: MiningRecord) => {
          console.log(`📝 挖矿记录创建成功: 玩家${record.player_id} 在场景${record.scene_id} 获得${record.coins_earned}金币`);
        }
      },
      comment: '挖矿记录表'
    }
  );

  return MiningRecord;
};

export default MiningRecordModel;