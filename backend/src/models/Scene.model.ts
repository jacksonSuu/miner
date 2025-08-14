import { DataTypes, Model, Sequelize, Optional } from 'sequelize';
import { GAME_CONFIG } from '../config/game.config';

// 场景属性接口
export interface SceneAttributes {
  id: number;
  name: string;
  description: string;
  required_level: number;
  energy_cost: number;
  base_coins_min: number;
  base_coins_max: number;
  base_experience: number;
  unlock_order: number;
  is_active: boolean;
  background_image?: string;
  icon_image?: string;
  created_at: Date;
  updated_at: Date;
}

// 创建场景时的可选属性
export interface SceneCreationAttributes extends Optional<SceneAttributes, 
  'id' | 'is_active' | 'background_image' | 'icon_image' | 'created_at' | 'updated_at'
> {}

// 场景模型类
export class Scene extends Model<SceneAttributes, SceneCreationAttributes> implements SceneAttributes {
  public id!: number;
  public name!: string;
  public description!: string;
  public required_level!: number;
  public energy_cost!: number;
  public base_coins_min!: number;
  public base_coins_max!: number;
  public base_experience!: number;
  public unlock_order!: number;
  public is_active!: boolean;
  public background_image?: string;
  public icon_image?: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // 实例方法：检查玩家是否可以访问此场景
  public isAccessibleByPlayer(playerLevel: number): boolean {
    return this.is_active && playerLevel >= this.required_level;
  }

  // 实例方法：计算挖矿奖励
  public calculateMiningReward(playerLevel: number, hasBonus: boolean = false): {
    coins: number;
    experience: number;
    items?: Array<{ name: string; rarity: string; value: number }>;
  } {
    // 基础金币奖励（随机范围）
    let coins = Math.floor(Math.random() * (this.base_coins_max - this.base_coins_min + 1)) + this.base_coins_min;
    
    // 基础经验奖励
    let experience = this.base_experience;
    
    // 等级加成（每级增加5%奖励）
    const levelBonus = 1 + (playerLevel - this.required_level) * 0.05;
    coins = Math.floor(coins * levelBonus);
    experience = Math.floor(experience * levelBonus);
    
    // 额外加成（如工具、药水等）
    if (hasBonus) {
      coins = Math.floor(coins * 1.2);
      experience = Math.floor(experience * 1.2);
    }
    
    // 物品掉落计算
    const items = this.calculateItemDrops();
    
    return {
      coins,
      experience,
      items
    };
  }

  // 实例方法：计算物品掉落
  private calculateItemDrops(): Array<{ name: string; rarity: string; value: number }> {
    const items: Array<{ name: string; rarity: string; value: number }> = [];
    
    // 遍历所有稀有度，计算掉落
    Object.entries(GAME_CONFIG.RARITY).forEach(([rarity, config]) => {
      const random = Math.random();
      if (random <= config.dropRate) {
        // 根据场景和稀有度生成物品
        const itemName = this.generateItemName(rarity);
        const itemValue = this.calculateItemValue(rarity);
        
        items.push({
          name: itemName,
          rarity: rarity.toLowerCase(),
          value: itemValue
        });
      }
    });
    
    return items;
  }

  // 实例方法：生成物品名称
  private generateItemName(rarity: string): string {
    const sceneItems: { [key: string]: string[] } = {
      '新手矿洞': ['铜矿石', '铁矿石', '煤炭', '石英'],
      '深层矿井': ['银矿石', '金矿石', '宝石', '水晶'],
      '古老遗迹': ['古代硬币', '神秘符文', '魔法水晶', '远古宝石'],
      '龙族宝库': ['龙鳞', '龙血石', '传说宝石', '神器碎片'],
      '时空裂缝': ['时间碎片', '空间宝石', '维度水晶', '永恒之石']
    };
    
    const rarityPrefixes: { [key: string]: string[] } = {
      'COMMON': ['普通的', '常见的', '基础的'],
      'UNCOMMON': ['优质的', '精良的', '改良的'],
      'RARE': ['稀有的', '珍贵的', '精制的'],
      'EPIC': ['史诗的', '传奇的', '完美的'],
      'LEGENDARY': ['传说的', '神话的', '至尊的']
    };
    
    const items = sceneItems[this.name] || sceneItems['新手矿洞'];
    const prefixes = rarityPrefixes[rarity] || rarityPrefixes['COMMON'];
    
    const randomItem = items[Math.floor(Math.random() * items.length)];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    
    return `${randomPrefix}${randomItem}`;
  }

  // 实例方法：计算物品价值
  private calculateItemValue(rarity: string): number {
    const baseValue = this.base_coins_min;
    const rarityMultipliers: { [key: string]: number } = {
      'COMMON': 1,
      'UNCOMMON': 2,
      'RARE': 5,
      'EPIC': 10,
      'LEGENDARY': 25
    };
    
    const multiplier = rarityMultipliers[rarity] || 1;
    return Math.floor(baseValue * multiplier * (0.8 + Math.random() * 0.4));
  }

  // 实例方法：获取场景信息
  public getSceneInfo(): object {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      requiredLevel: this.required_level,
      energyCost: this.energy_cost,
      rewards: {
        coinsRange: `${this.base_coins_min}-${this.base_coins_max}`,
        experience: this.base_experience
      },
      unlockOrder: this.unlock_order,
      isActive: this.is_active,
      images: {
        background: this.background_image,
        icon: this.icon_image
      }
    };
  }

  // 静态方法：获取玩家可访问的场景列表
  public static async getAccessibleScenes(playerLevel: number): Promise<Scene[]> {
    try {
      return await Scene.findAll({
        where: {
          is_active: true,
          required_level: {
            [require('sequelize').Op.lte]: playerLevel
          }
        },
        order: [['unlock_order', 'ASC']]
      });
    } catch (error) {
      console.error('获取可访问场景失败:', error);
      throw error;
    }
  }

  // 静态方法：获取所有场景（包括未解锁的）
  public static async getAllScenesWithLockStatus(playerLevel: number): Promise<Array<Scene & { isUnlocked: boolean }>> {
    try {
      const scenes = await Scene.findAll({
        where: { is_active: true },
        order: [['unlock_order', 'ASC']]
      });
      
      return scenes.map(scene => ({
        ...scene.toJSON(),
        isUnlocked: scene.isAccessibleByPlayer(playerLevel)
      })) as Array<Scene & { isUnlocked: boolean }>;
    } catch (error) {
      console.error('获取场景列表失败:', error);
      throw error;
    }
  }

  // 静态方法：根据ID获取场景
  public static async getSceneById(sceneId: number): Promise<Scene | null> {
    try {
      return await Scene.findByPk(sceneId);
    } catch (error) {
      console.error('获取场景失败:', error);
      throw error;
    }
  }

  // 静态方法：创建默认场景数据
  public static async createDefaultScenes(): Promise<void> {
    try {
      const defaultScenes = [
        {
          name: '新手矿洞',
          description: '适合新手的简单矿洞，蕴含着基础的矿物资源。',
          required_level: 1,
          energy_cost: 10,
          base_coins_min: 5,
          base_coins_max: 15,
          base_experience: 10,
          unlock_order: 1
        },
        {
          name: '深层矿井',
          description: '更深层的矿井，需要一定的挖矿经验才能安全探索。',
          required_level: 5,
          energy_cost: 15,
          base_coins_min: 12,
          base_coins_max: 25,
          base_experience: 20,
          unlock_order: 2
        },
        {
          name: '古老遗迹',
          description: '神秘的古老遗迹，隐藏着珍贵的宝藏和古代文物。',
          required_level: 10,
          energy_cost: 20,
          base_coins_min: 20,
          base_coins_max: 40,
          base_experience: 35,
          unlock_order: 3
        },
        {
          name: '龙族宝库',
          description: '传说中的龙族宝库，只有真正的勇者才能进入。',
          required_level: 20,
          energy_cost: 30,
          base_coins_min: 40,
          base_coins_max: 80,
          base_experience: 60,
          unlock_order: 4
        },
        {
          name: '时空裂缝',
          description: '时空的裂缝中蕴含着无尽的可能和最珍贵的资源。',
          required_level: 35,
          energy_cost: 50,
          base_coins_min: 80,
          base_coins_max: 150,
          base_experience: 100,
          unlock_order: 5
        }
      ];

      for (const sceneData of defaultScenes) {
        const existingScene = await Scene.findOne({ where: { name: sceneData.name } });
        if (!existingScene) {
          await Scene.create(sceneData);
          console.log(`✅ 创建默认场景: ${sceneData.name}`);
        }
      }
    } catch (error) {
      console.error('创建默认场景失败:', error);
      throw error;
    }
  }
}

// 模型定义函数
export const SceneModel = (sequelize: Sequelize) => {
  Scene.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '场景ID'
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          len: [1, 100]
        },
        comment: '场景名称'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true
        },
        comment: '场景描述'
      },
      required_level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: GAME_CONFIG.PLAYER.MAX_LEVEL
        },
        comment: '解锁所需等级'
      },
      energy_cost: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: GAME_CONFIG.ENERGY.MAX_ENERGY
        },
        comment: '挖矿消耗精力'
      },
      base_coins_min: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        },
        comment: '基础金币奖励最小值'
      },
      base_coins_max: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        },
        comment: '基础金币奖励最大值'
      },
      base_experience: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        },
        comment: '基础经验奖励'
      },
      unlock_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        validate: {
          min: 1
        },
        comment: '解锁顺序'
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: '是否激活'
      },
      background_image: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '背景图片URL'
      },
      icon_image: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '图标URL'
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
      modelName: 'Scene',
      tableName: 'scenes',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['name']
        },
        {
          unique: true,
          fields: ['unlock_order']
        },
        {
          fields: ['required_level']
        },
        {
          fields: ['is_active']
        },
        {
          fields: ['energy_cost']
        }
      ],
      hooks: {
        beforeValidate: (scene: Scene) => {
          // 确保最大金币不小于最小金币
          if (scene.base_coins_max < scene.base_coins_min) {
            scene.base_coins_max = scene.base_coins_min;
          }
        },
        
        beforeUpdate: (scene: Scene) => {
          scene.setDataValue('updated_at', new Date());
        },
        
        afterCreate: async (scene: Scene) => {
          console.log(`✅ 场景创建成功: ${scene.name}`);
        }
      },
      comment: '挖矿场景表'
    }
  );

  return Scene;
};

export default SceneModel;