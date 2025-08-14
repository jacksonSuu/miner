import { DataTypes, Model, Sequelize, Optional } from 'sequelize';
import { GAME_CONFIG } from '../config/game.config';

// 商店物品属性接口
export interface ShopItemAttributes {
  id: number;
  name: string;
  description: string;
  category: 'tool' | 'potion' | 'upgrade' | 'decoration';
  price: number;
  effect_type: 'mining_speed' | 'energy_recovery' | 'coin_bonus' | 'exp_bonus' | 'energy_max' | 'permanent' | 'temporary';
  effect_value: number; // 效果数值
  effect_duration: number; // 效果持续时间（分钟，0表示永久）
  required_level: number;
  max_quantity: number; // 最大购买数量（0表示无限制）
  is_active: boolean;
  icon_url?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

// 创建商店物品时的可选属性
export interface ShopItemCreationAttributes extends Optional<ShopItemAttributes, 
  'id' | 'effect_duration' | 'required_level' | 'max_quantity' | 'is_active' | 'icon_url' | 'rarity' | 'sort_order' | 'created_at' | 'updated_at'
> {}

// 商店物品模型类
export class ShopItem extends Model<ShopItemAttributes, ShopItemCreationAttributes> implements ShopItemAttributes {
  public id!: number;
  public name!: string;
  public description!: string;
  public category!: 'tool' | 'potion' | 'upgrade' | 'decoration';
  public price!: number;
  public effect_type!: 'mining_speed' | 'energy_recovery' | 'coin_bonus' | 'exp_bonus' | 'energy_max' | 'permanent' | 'temporary';
  public effect_value!: number;
  public effect_duration!: number;
  public required_level!: number;
  public max_quantity!: number;
  public is_active!: boolean;
  public icon_url?: string;
  public rarity!: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  public sort_order!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // 实例方法：检查玩家是否可以购买
  public canPlayerPurchase(playerLevel: number, playerCoins: number): {
    canPurchase: boolean;
    reason?: string;
  } {
    if (!this.is_active) {
      return { canPurchase: false, reason: '商品暂时不可用' };
    }

    if (playerLevel < this.required_level) {
      return { canPurchase: false, reason: `需要等级 ${this.required_level}` };
    }

    if (playerCoins < this.price) {
      return { canPurchase: false, reason: '金币不足' };
    }

    return { canPurchase: true };
  }

  // 实例方法：获取效果描述
  public getEffectDescription(): string {
    const effectDescriptions: { [key: string]: string } = {
      'mining_speed': `挖矿速度提升 ${this.effect_value}%`,
      'energy_recovery': `精力恢复速度提升 ${this.effect_value}%`,
      'coin_bonus': `金币获得量提升 ${this.effect_value}%`,
      'exp_bonus': `经验获得量提升 ${this.effect_value}%`,
      'energy_max': `最大精力值增加 ${this.effect_value}`,
      'permanent': '永久效果',
      'temporary': '临时效果'
    };

    let description = effectDescriptions[this.effect_type] || '未知效果';
    
    if (this.effect_duration > 0) {
      description += ` (持续 ${this.effect_duration} 分钟)`;
    } else if (this.effect_type !== 'permanent') {
      description += ' (永久)';
    }

    return description;
  }

  // 实例方法：获取稀有度颜色
  public getRarityColor(): string {
    const rarityColors: { [key: string]: string } = {
      'common': '#9CA3AF',
      'uncommon': '#10B981',
      'rare': '#3B82F6',
      'epic': '#8B5CF6',
      'legendary': '#F59E0B'
    };

    return rarityColors[this.rarity] || rarityColors['common'];
  }

  // 实例方法：获取格式化的商店物品信息
  public getFormattedInfo(): object {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      price: this.price,
      effect: {
        type: this.effect_type,
        value: this.effect_value,
        duration: this.effect_duration,
        description: this.getEffectDescription()
      },
      requirements: {
        level: this.required_level
      },
      purchase: {
        maxQuantity: this.max_quantity,
        isUnlimited: this.max_quantity === 0
      },
      display: {
        rarity: this.rarity,
        rarityColor: this.getRarityColor(),
        iconUrl: this.icon_url,
        sortOrder: this.sort_order
      },
      isActive: this.is_active
    };
  }

  // 静态方法：获取玩家可购买的商店物品
  public static async getAvailableItems(playerLevel: number): Promise<ShopItem[]> {
    try {
      return await ShopItem.findAll({
        where: {
          is_active: true,
          required_level: {
            [require('sequelize').Op.lte]: playerLevel
          }
        },
        order: [['sort_order', 'ASC'], ['required_level', 'ASC']]
      });
    } catch (error) {
      console.error('获取可购买商店物品失败:', error);
      throw error;
    }
  }

  // 静态方法：按分类获取商店物品
  public static async getItemsByCategory(
    category: 'tool' | 'potion' | 'upgrade' | 'decoration',
    playerLevel: number
  ): Promise<ShopItem[]> {
    try {
      return await ShopItem.findAll({
        where: {
          category,
          is_active: true,
          required_level: {
            [require('sequelize').Op.lte]: playerLevel
          }
        },
        order: [['sort_order', 'ASC'], ['price', 'ASC']]
      });
    } catch (error) {
      console.error('按分类获取商店物品失败:', error);
      throw error;
    }
  }

  // 静态方法：获取推荐商品
  public static async getRecommendedItems(playerLevel: number, playerCoins: number): Promise<ShopItem[]> {
    try {
      const items = await ShopItem.findAll({
        where: {
          is_active: true,
          required_level: {
            [require('sequelize').Op.lte]: playerLevel
          },
          price: {
            [require('sequelize').Op.lte]: playerCoins * 2 // 推荐价格不超过玩家金币的2倍
          }
        },
        order: [['rarity', 'DESC'], ['price', 'ASC']],
        limit: 6
      });

      return items;
    } catch (error) {
      console.error('获取推荐商品失败:', error);
      throw error;
    }
  }

  // 静态方法：创建默认商店物品
  public static async createDefaultItems(): Promise<void> {
    try {
      const defaultItems = [
        // 工具类
        {
          name: '铁镐',
          description: '坚固的铁制镐子，提升挖矿效率',
          category: 'tool' as const,
          price: 100,
          effect_type: 'mining_speed' as const,
          effect_value: 10,
          effect_duration: 0,
          required_level: 1,
          max_quantity: 1,
          rarity: 'common' as const,
          sort_order: 1
        },
        {
          name: '钢镐',
          description: '精钢打造的镐子，大幅提升挖矿效率',
          category: 'tool' as const,
          price: 500,
          effect_type: 'mining_speed' as const,
          effect_value: 25,
          effect_duration: 0,
          required_level: 5,
          max_quantity: 1,
          rarity: 'uncommon' as const,
          sort_order: 2
        },
        {
          name: '秘银镐',
          description: '传说中的秘银打造，极大提升挖矿效率',
          category: 'tool' as const,
          price: 2000,
          effect_type: 'mining_speed' as const,
          effect_value: 50,
          effect_duration: 0,
          required_level: 15,
          max_quantity: 1,
          rarity: 'rare' as const,
          sort_order: 3
        },
        
        // 药水类
        {
          name: '小型精力药水',
          description: '恢复50点精力值',
          category: 'potion' as const,
          price: 50,
          effect_type: 'energy_recovery' as const,
          effect_value: 50,
          effect_duration: 0,
          required_level: 1,
          max_quantity: 0,
          rarity: 'common' as const,
          sort_order: 10
        },
        {
          name: '中型精力药水',
          description: '恢复100点精力值',
          category: 'potion' as const,
          price: 90,
          effect_type: 'energy_recovery' as const,
          effect_value: 100,
          effect_duration: 0,
          required_level: 5,
          max_quantity: 0,
          rarity: 'uncommon' as const,
          sort_order: 11
        },
        {
          name: '大型精力药水',
          description: '恢复200点精力值',
          category: 'potion' as const,
          price: 160,
          effect_type: 'energy_recovery' as const,
          effect_value: 200,
          effect_duration: 0,
          required_level: 10,
          max_quantity: 0,
          rarity: 'rare' as const,
          sort_order: 12
        },
        {
          name: '幸运药水',
          description: '30分钟内金币获得量提升50%',
          category: 'potion' as const,
          price: 200,
          effect_type: 'coin_bonus' as const,
          effect_value: 50,
          effect_duration: 30,
          required_level: 8,
          max_quantity: 0,
          rarity: 'uncommon' as const,
          sort_order: 13
        },
        {
          name: '经验药水',
          description: '30分钟内经验获得量提升50%',
          category: 'potion' as const,
          price: 200,
          effect_type: 'exp_bonus' as const,
          effect_value: 50,
          effect_duration: 30,
          required_level: 8,
          max_quantity: 0,
          rarity: 'uncommon' as const,
          sort_order: 14
        },
        
        // 升级类
        {
          name: '精力扩容器I',
          description: '永久增加50点最大精力值',
          category: 'upgrade' as const,
          price: 1000,
          effect_type: 'energy_max' as const,
          effect_value: 50,
          effect_duration: 0,
          required_level: 10,
          max_quantity: 3,
          rarity: 'rare' as const,
          sort_order: 20
        },
        {
          name: '精力扩容器II',
          description: '永久增加100点最大精力值',
          category: 'upgrade' as const,
          price: 3000,
          effect_type: 'energy_max' as const,
          effect_value: 100,
          effect_duration: 0,
          required_level: 20,
          max_quantity: 2,
          rarity: 'epic' as const,
          sort_order: 21
        },
        {
          name: '精力扩容器III',
          description: '永久增加200点最大精力值',
          category: 'upgrade' as const,
          price: 8000,
          effect_type: 'energy_max' as const,
          effect_value: 200,
          effect_duration: 0,
          required_level: 35,
          max_quantity: 1,
          rarity: 'legendary' as const,
          sort_order: 22
        }
      ];

      for (const itemData of defaultItems) {
        const existingItem = await ShopItem.findOne({ where: { name: itemData.name } });
        if (!existingItem) {
          await ShopItem.create(itemData);
          console.log(`✅ 创建默认商店物品: ${itemData.name}`);
        }
      }
    } catch (error) {
      console.error('创建默认商店物品失败:', error);
      throw error;
    }
  }

  // 静态方法：搜索商店物品
  public static async searchItems(
    keyword: string,
    playerLevel: number,
    options: {
      category?: 'tool' | 'potion' | 'upgrade' | 'decoration';
      maxPrice?: number;
      rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    } = {}
  ): Promise<ShopItem[]> {
    try {
      const whereClause: any = {
        is_active: true,
        required_level: {
          [require('sequelize').Op.lte]: playerLevel
        },
        [require('sequelize').Op.or]: [
          {
            name: {
              [require('sequelize').Op.like]: `%${keyword}%`
            }
          },
          {
            description: {
              [require('sequelize').Op.like]: `%${keyword}%`
            }
          }
        ]
      };

      if (options.category) {
        whereClause.category = options.category;
      }

      if (options.maxPrice) {
        whereClause.price = {
          [require('sequelize').Op.lte]: options.maxPrice
        };
      }

      if (options.rarity) {
        whereClause.rarity = options.rarity;
      }

      return await ShopItem.findAll({
        where: whereClause,
        order: [['sort_order', 'ASC'], ['price', 'ASC']]
      });
    } catch (error) {
      console.error('搜索商店物品失败:', error);
      throw error;
    }
  }
}

// 模型定义函数
export const ShopItemModel = (sequelize: Sequelize) => {
  ShopItem.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '商店物品ID'
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          len: [1, 100]
        },
        comment: '物品名称'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true
        },
        comment: '物品描述'
      },
      category: {
        type: DataTypes.ENUM('tool', 'potion', 'upgrade', 'decoration'),
        allowNull: false,
        comment: '物品分类'
      },
      price: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1
        },
        comment: '价格（金币）'
      },
      effect_type: {
        type: DataTypes.ENUM('mining_speed', 'energy_recovery', 'coin_bonus', 'exp_bonus', 'energy_max', 'permanent', 'temporary'),
        allowNull: false,
        comment: '效果类型'
      },
      effect_value: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0
        },
        comment: '效果数值'
      },
      effect_duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: '效果持续时间（分钟，0表示永久）'
      },
      required_level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: 1,
          max: GAME_CONFIG.PLAYER.MAX_LEVEL
        },
        comment: '所需等级'
      },
      max_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: '最大购买数量（0表示无限制）'
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: '是否激活'
      },
      icon_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '图标URL'
      },
      rarity: {
        type: DataTypes.ENUM('common', 'uncommon', 'rare', 'epic', 'legendary'),
        allowNull: false,
        defaultValue: 'common',
        comment: '稀有度'
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 999,
        validate: {
          min: 0
        },
        comment: '排序顺序'
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
      modelName: 'ShopItem',
      tableName: 'shop_items',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['name']
        },
        {
          fields: ['category']
        },
        {
          fields: ['required_level']
        },
        {
          fields: ['price']
        },
        {
          fields: ['is_active']
        },
        {
          fields: ['rarity']
        },
        {
          fields: ['sort_order']
        },
        {
          fields: ['category', 'sort_order']
        }
      ],
      hooks: {
        beforeUpdate: (item: ShopItem) => {
          item.setDataValue('updated_at', new Date());
        },
        
        afterCreate: async (item: ShopItem) => {
          console.log(`✅ 商店物品创建成功: ${item.name}`);
        }
      },
      comment: '商店物品表'
    }
  );

  return ShopItem;
};

export default ShopItemModel;