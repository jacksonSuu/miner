import { DataTypes, Model, Sequelize, Optional } from 'sequelize';
import { GAME_CONFIG } from '../config/game.config';

// 工具属性接口
export interface ToolAttributes {
  id: number;
  player_id: number;
  shop_item_id: number;
  name: string;
  effect_type: 'mining_speed' | 'energy_recovery' | 'coin_bonus' | 'exp_bonus' | 'energy_max';
  effect_value: number;
  is_active: boolean;
  is_equipped: boolean;
  durability: number; // 耐久度（0-100）
  max_durability: number;
  purchase_date: Date;
  last_used: Date;
  usage_count: number;
  created_at: Date;
  updated_at: Date;
}

// 创建工具时的可选属性
export interface ToolCreationAttributes extends Optional<ToolAttributes, 
  'id' | 'is_active' | 'is_equipped' | 'durability' | 'max_durability' | 'last_used' | 'usage_count' | 'created_at' | 'updated_at'
> {}

// 工具模型类
export class Tool extends Model<ToolAttributes, ToolCreationAttributes> implements ToolAttributes {
  public id!: number;
  public player_id!: number;
  public shop_item_id!: number;
  public name!: string;
  public effect_type!: 'mining_speed' | 'energy_recovery' | 'coin_bonus' | 'exp_bonus' | 'energy_max';
  public effect_value!: number;
  public is_active!: boolean;
  public is_equipped!: boolean;
  public durability!: number;
  public max_durability!: number;
  public purchase_date!: Date;
  public last_used!: Date;
  public usage_count!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // 关联属性
  public player?: any;
  public shopItem?: any;

  // 实例方法：检查工具是否可用
  public isUsable(): boolean {
    return this.is_active && this.durability > 0;
  }

  // 实例方法：使用工具（消耗耐久度）
  public async useTool(): Promise<boolean> {
    if (!this.isUsable()) {
      return false;
    }

    try {
      const durabilityLoss = Math.floor(Math.random() * 3) + 1; // 随机消耗1-3点耐久度
      const newDurability = Math.max(0, this.durability - durabilityLoss);
      
      await this.update({
        durability: newDurability,
        last_used: new Date(),
        usage_count: this.usage_count + 1
      });

      // 如果耐久度为0，自动取消装备
      if (newDurability === 0 && this.is_equipped) {
        await this.unequip();
      }

      return true;
    } catch (error) {
      console.error('使用工具失败:', error);
      throw error;
    }
  }

  // 实例方法：修理工具
  public async repairTool(repairAmount: number = 100): Promise<void> {
    try {
      const newDurability = Math.min(this.max_durability, this.durability + repairAmount);
      await this.update({ durability: newDurability });
    } catch (error) {
      console.error('修理工具失败:', error);
      throw error;
    }
  }

  // 实例方法：装备工具
  public async equip(): Promise<boolean> {
    if (!this.isUsable()) {
      return false;
    }

    try {
      // 先取消同类型的其他工具装备
      await Tool.update(
        { is_equipped: false },
        {
          where: {
            player_id: this.player_id,
            effect_type: this.effect_type,
            is_equipped: true,
            id: { [require('sequelize').Op.ne]: this.id }
          }
        }
      );

      // 装备当前工具
      await this.update({ is_equipped: true });
      return true;
    } catch (error) {
      console.error('装备工具失败:', error);
      throw error;
    }
  }

  // 实例方法：取消装备
  public async unequip(): Promise<void> {
    try {
      await this.update({ is_equipped: false });
    } catch (error) {
      console.error('取消装备失败:', error);
      throw error;
    }
  }

  // 实例方法：获取工具状态
  public getToolStatus(): object {
    const durabilityPercentage = Math.round((this.durability / this.max_durability) * 100);
    
    let condition = 'excellent';
    if (durabilityPercentage <= 0) {
      condition = 'broken';
    } else if (durabilityPercentage <= 25) {
      condition = 'poor';
    } else if (durabilityPercentage <= 50) {
      condition = 'fair';
    } else if (durabilityPercentage <= 75) {
      condition = 'good';
    }

    return {
      id: this.id,
      name: this.name,
      effect: {
        type: this.effect_type,
        value: this.effect_value
      },
      status: {
        isActive: this.is_active,
        isEquipped: this.is_equipped,
        isUsable: this.isUsable(),
        condition
      },
      durability: {
        current: this.durability,
        max: this.max_durability,
        percentage: durabilityPercentage
      },
      usage: {
        count: this.usage_count,
        lastUsed: this.last_used,
        purchaseDate: this.purchase_date
      }
    };
  }

  // 静态方法：为玩家创建工具
  public static async createPlayerTool(data: {
    playerId: number;
    shopItemId: number;
    name: string;
    effectType: 'mining_speed' | 'energy_recovery' | 'coin_bonus' | 'exp_bonus' | 'energy_max';
    effectValue: number;
    maxDurability?: number;
  }): Promise<Tool> {
    try {
      return await Tool.create({
        player_id: data.playerId,
        shop_item_id: data.shopItemId,
        name: data.name,
        effect_type: data.effectType,
        effect_value: data.effectValue,
        durability: data.maxDurability || 100,
        max_durability: data.maxDurability || 100,
        purchase_date: new Date(),
        last_used: new Date(),
        usage_count: 0
      });
    } catch (error) {
      console.error('创建玩家工具失败:', error);
      throw error;
    }
  }

  // 静态方法：获取玩家的所有工具
  public static async getPlayerTools(playerId: number): Promise<Tool[]> {
    try {
      return await Tool.findAll({
        where: { player_id: playerId },
        include: [{
          association: 'shopItem',
          attributes: ['name', 'description', 'rarity', 'icon_url']
        }],
        order: [['is_equipped', 'DESC'], ['created_at', 'DESC']]
      });
    } catch (error) {
      console.error('获取玩家工具失败:', error);
      throw error;
    }
  }

  // 静态方法：获取玩家已装备的工具
  public static async getEquippedTools(playerId: number): Promise<Tool[]> {
    try {
      return await Tool.findAll({
        where: {
          player_id: playerId,
          is_equipped: true,
          is_active: true
        },
        include: [{
          association: 'shopItem',
          attributes: ['name', 'description', 'rarity', 'icon_url']
        }]
      });
    } catch (error) {
      console.error('获取已装备工具失败:', error);
      throw error;
    }
  }

  // 静态方法：计算玩家的总加成效果
  public static async calculatePlayerBonus(playerId: number): Promise<{
    miningSpeed: number;
    energyRecovery: number;
    coinBonus: number;
    expBonus: number;
    energyMax: number;
  }> {
    try {
      const equippedTools = await Tool.getEquippedTools(playerId);
      
      const bonus = {
        miningSpeed: 0,
        energyRecovery: 0,
        coinBonus: 0,
        expBonus: 0,
        energyMax: 0
      };

      for (const tool of equippedTools) {
        if (!tool.isUsable()) continue;

        switch (tool.effect_type) {
          case 'mining_speed':
            bonus.miningSpeed += tool.effect_value;
            break;
          case 'energy_recovery':
            bonus.energyRecovery += tool.effect_value;
            break;
          case 'coin_bonus':
            bonus.coinBonus += tool.effect_value;
            break;
          case 'exp_bonus':
            bonus.expBonus += tool.effect_value;
            break;
          case 'energy_max':
            bonus.energyMax += tool.effect_value;
            break;
        }
      }

      return bonus;
    } catch (error) {
      console.error('计算玩家加成失败:', error);
      throw error;
    }
  }

  // 静态方法：批量使用装备的工具
  public static async useEquippedTools(playerId: number): Promise<void> {
    try {
      const equippedTools = await Tool.getEquippedTools(playerId);
      
      for (const tool of equippedTools) {
        await tool.useTool();
      }
    } catch (error) {
      console.error('批量使用工具失败:', error);
      throw error;
    }
  }

  // 静态方法：获取需要修理的工具
  public static async getToolsNeedingRepair(playerId: number, threshold: number = 25): Promise<Tool[]> {
    try {
      const tools = await Tool.getPlayerTools(playerId);
      return tools.filter(tool => {
        const durabilityPercentage = (tool.durability / tool.max_durability) * 100;
        return durabilityPercentage <= threshold && durabilityPercentage > 0;
      });
    } catch (error) {
      console.error('获取需要修理的工具失败:', error);
      throw error;
    }
  }

  // 静态方法：清理损坏的工具
  public static async cleanupBrokenTools(playerId: number): Promise<number> {
    try {
      const deletedCount = await Tool.destroy({
        where: {
          player_id: playerId,
          durability: 0,
          is_equipped: false
        }
      });

      console.log(`🧹 清理了 ${deletedCount} 个损坏的工具`);
      return deletedCount;
    } catch (error) {
      console.error('清理损坏工具失败:', error);
      throw error;
    }
  }
}

// 模型定义函数
export const ToolModel = (sequelize: Sequelize) => {
  Tool.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '工具ID'
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
      shop_item_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'shop_items',
          key: 'id'
        },
        comment: '商店物品ID'
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 100]
        },
        comment: '工具名称'
      },
      effect_type: {
        type: DataTypes.ENUM('mining_speed', 'energy_recovery', 'coin_bonus', 'exp_bonus', 'energy_max'),
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
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: '是否激活'
      },
      is_equipped: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否已装备'
      },
      durability: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100,
        validate: {
          min: 0,
          max: 100
        },
        comment: '当前耐久度'
      },
      max_durability: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100,
        validate: {
          min: 1,
          max: 100
        },
        comment: '最大耐久度'
      },
      purchase_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: '购买日期'
      },
      last_used: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: '最后使用时间'
      },
      usage_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: '使用次数'
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
      modelName: 'Tool',
      tableName: 'tools',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ['player_id']
        },
        {
          fields: ['shop_item_id']
        },
        {
          fields: ['effect_type']
        },
        {
          fields: ['is_equipped']
        },
        {
          fields: ['is_active']
        },
        {
          fields: ['durability']
        },
        {
          fields: ['player_id', 'effect_type', 'is_equipped']
        },
        {
          fields: ['player_id', 'is_active']
        }
      ],
      hooks: {
        beforeUpdate: (tool: Tool) => {
          tool.setDataValue('updated_at', new Date());
          
          // 确保耐久度不超过最大值
          if (tool.durability > tool.max_durability) {
            tool.durability = tool.max_durability;
          }
        },
        
        beforeCreate: (tool: Tool) => {
          // 确保初始耐久度不超过最大值
          if (tool.durability > tool.max_durability) {
            tool.durability = tool.max_durability;
          }
        },
        
        afterCreate: async (tool: Tool) => {
          console.log(`✅ 工具创建成功: 玩家${tool.player_id} 获得 ${tool.name}`);
        },
        
        afterUpdate: async (tool: Tool) => {
          // 如果工具损坏且已装备，自动取消装备
          if (tool.durability === 0 && tool.is_equipped) {
            await tool.update({ is_equipped: false });
            console.log(`⚠️ 工具 ${tool.name} 已损坏，自动取消装备`);
          }
        }
      },
      comment: '玩家工具表'
    }
  );

  return Tool;
};

export default ToolModel;