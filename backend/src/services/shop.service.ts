import { PlayerData, ShopItem, Tool } from '../models';
import { GAME_CONFIG } from '../config/game.config';
import { RedisClient } from '../config/redis.config';
import { Op } from 'sequelize';

// 商店服务接口
export interface ShopItemInfo {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  rarity: string;
  color: string;
  effects: {
    experienceBonus?: number;
    coinsBonus?: number;
    efficiencyBonus?: number;
    energyRestore?: number;
    maxEnergyIncrease?: number;
  };
  requirements: {
    level: number;
    coins: number;
  };
  canPurchase: boolean;
  stock?: number;
  isLimited: boolean;
}

export interface PurchaseResult {
  success: boolean;
  message: string;
  data?: {
    item: {
      id: number;
      name: string;
      category: string;
      rarity: string;
    };
    tool?: {
      id: number;
      durability: number;
      isEquipped: boolean;
    };
    playerCoins: number;
    totalSpent: number;
  };
}

export interface ToolInfo {
  id: number;
  name: string;
  category: string;
  rarity: string;
  color: string;
  durability: {
    current: number;
    max: number;
    percentage: number;
  };
  effects: {
    experienceBonus: number;
    coinsBonus: number;
    efficiencyBonus: number;
  };
  isEquipped: boolean;
  canEquip: boolean;
  canRepair: boolean;
  repairCost: number;
  purchasePrice: number;
  createdAt: string;
}

export interface ToolManagementResult {
  success: boolean;
  message: string;
  data?: {
    toolId: number;
    newState?: {
      isEquipped?: boolean;
      durability?: number;
    };
    playerCoins?: number;
  };
}

// 商店服务类
export class ShopService {
  private static readonly SHOP_CACHE_KEY = 'shop_items:';
  private static readonly DAILY_DEALS_KEY = 'daily_deals:';
  private static readonly PURCHASE_COOLDOWN_KEY = 'purchase_cooldown:';

  /**
   * 获取商店物品列表
   */
  public static async getShopItems(data: {
    playerId: number;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: ShopItemInfo[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    categories: string[];
  }> {
    try {
      const { playerId, category, search, page = 1, limit = 20 } = data;
      
      // 获取玩家数据
      const player = await PlayerData.findByPk(playerId);
      if (!player) {
        return {
          items: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
          categories: []
        };
      }

      // 构建查询条件
      const whereConditions: any = {
        is_available: true
      };

      if (category && category !== 'all') {
        whereConditions.category = category;
      }

      if (search) {
        whereConditions[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      // 获取商店物品
      const { rows: shopItems, count: total } = await ShopItem.findAndCountAll({
        where: whereConditions,
        order: [['category', 'ASC'], ['price', 'ASC']],
        limit,
        offset: (page - 1) * limit
      });

      // 格式化商店物品
      const formattedItems: ShopItemInfo[] = shopItems.map(item => {
        const canPurchase = item.canPlayerPurchase(player);
        const effects = item.getEffects();
        const rarityColor = item.getRarityColor();

        return {
          id: item.id,
          name: item.name,
          description: item.description,
          category: item.category,
          price: item.price,
          rarity: item.rarity,
          color: rarityColor,
          effects,
          requirements: {
            level: item.required_level,
            coins: item.price
          },
          canPurchase,
          stock: item.stock || undefined,
          isLimited: item.stock !== null && item.stock > 0
        };
      });

      // 获取所有可用分类
      const categories = await ShopItem.findAll({
        attributes: ['category'],
        where: { is_available: true },
        group: ['category'],
        raw: true
      }).then(results => results.map(r => r.category));

      return {
        items: formattedItems,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        categories
      };
    } catch (error) {
      console.error('获取商店物品失败:', error);
      return {
        items: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        categories: []
      };
    }
  }

  /**
   * 购买商店物品
   */
  public static async purchaseItem(data: {
    playerId: number;
    itemId: number;
    quantity?: number;
  }): Promise<PurchaseResult> {
    try {
      const { playerId, itemId, quantity = 1 } = data;

      // 检查购买冷却
      const cooldownKey = `${this.PURCHASE_COOLDOWN_KEY}${playerId}`;
      const lastPurchaseTime = await RedisClient.get(cooldownKey);
      if (lastPurchaseTime) {
        const timeSinceLastPurchase = Date.now() - parseInt(lastPurchaseTime);
        if (timeSinceLastPurchase < 1000) { // 1秒冷却
          return {
            success: false,
            message: '购买操作过于频繁，请稍后再试'
          };
        }
      }

      // 获取玩家数据
      const player = await PlayerData.findByPk(playerId);
      if (!player) {
        return {
          success: false,
          message: '玩家数据不存在'
        };
      }

      // 获取商店物品
      const shopItem = await ShopItem.findByPk(itemId);
      if (!shopItem || !shopItem.is_available) {
        return {
          success: false,
          message: '商品不存在或已下架'
        };
      }

      // 检查购买条件
      if (!shopItem.canPlayerPurchase(player)) {
        if (player.level < shopItem.required_level) {
          return {
            success: false,
            message: `需要等级 ${shopItem.required_level} 才能购买此物品`
          };
        }
        if (player.coins < shopItem.price * quantity) {
          return {
            success: false,
            message: '金币不足'
          };
        }
      }

      // 检查库存
      if (shopItem.stock !== null && shopItem.stock < quantity) {
        return {
          success: false,
          message: '库存不足'
        };
      }

      const totalCost = shopItem.price * quantity;

      // 执行购买逻辑
      let purchaseResult: any = {};
      
      if (shopItem.category === 'tool') {
        // 购买工具
        const tool = await Tool.createForPlayer({
          playerId,
          name: shopItem.name,
          category: shopItem.category,
          rarity: shopItem.rarity,
          experienceBonus: shopItem.experience_bonus || 0,
          coinsBonus: shopItem.coins_bonus || 0,
          efficiencyBonus: shopItem.efficiency_bonus || 0,
          maxDurability: GAME_CONFIG.TOOLS.BASE_DURABILITY,
          purchasePrice: shopItem.price
        });

        purchaseResult.tool = {
          id: tool.id,
          durability: tool.current_durability,
          isEquipped: tool.is_equipped
        };
      } else if (shopItem.category === 'consumable') {
        // 使用消耗品
        if (shopItem.energy_restore && shopItem.energy_restore > 0) {
          // 恢复精力
          const energyRestored = Math.min(
            shopItem.energy_restore,
            player.max_energy - player.current_energy
          );
          await player.recoverEnergy(energyRestored);
        }

        if (shopItem.max_energy_increase && shopItem.max_energy_increase > 0) {
          // 增加最大精力
          await player.update({
            max_energy: player.max_energy + shopItem.max_energy_increase
          });
        }
      }

      // 扣除金币
      await player.spendCoins(totalCost);

      // 更新库存
      if (shopItem.stock !== null) {
        await shopItem.update({
          stock: shopItem.stock - quantity
        });
      }

      // 设置购买冷却
      await RedisClient.set(cooldownKey, Date.now().toString(), 2);

      // 重新加载玩家数据
      await player.reload();

      return {
        success: true,
        message: `成功购买 ${shopItem.name}${quantity > 1 ? ` x${quantity}` : ''}`,
        data: {
          item: {
            id: shopItem.id,
            name: shopItem.name,
            category: shopItem.category,
            rarity: shopItem.rarity
          },
          tool: purchaseResult.tool,
          playerCoins: player.coins,
          totalSpent: totalCost
        }
      };
    } catch (error) {
      console.error('购买物品失败:', error);
      return {
        success: false,
        message: '购买失败，请稍后重试'
      };
    }
  }

  /**
   * 获取玩家工具列表
   */
  public static async getPlayerTools(playerId: number): Promise<ToolInfo[]> {
    try {
      const tools = await Tool.getPlayerTools(playerId);
      
      return tools.map(tool => {
        const durabilityPercentage = (tool.current_durability / tool.max_durability) * 100;
        const repairCost = Math.ceil(tool.purchase_price * 0.1 * (1 - durabilityPercentage / 100));
        
        return {
          id: tool.id,
          name: tool.name,
          category: tool.category,
          rarity: tool.rarity,
          color: GAME_CONFIG.ITEM_RARITY[tool.rarity as keyof typeof GAME_CONFIG.ITEM_RARITY]?.color || '#ffffff',
          durability: {
            current: tool.current_durability,
            max: tool.max_durability,
            percentage: Math.round(durabilityPercentage)
          },
          effects: {
            experienceBonus: tool.experience_bonus,
            coinsBonus: tool.coins_bonus,
            efficiencyBonus: tool.efficiency_bonus
          },
          isEquipped: tool.is_equipped,
          canEquip: tool.canUse(),
          canRepair: tool.current_durability < tool.max_durability,
          repairCost,
          purchasePrice: tool.purchase_price,
          createdAt: tool.created_at.toISOString()
        };
      });
    } catch (error) {
      console.error('获取玩家工具失败:', error);
      return [];
    }
  }

  /**
   * 装备/卸下工具
   */
  public static async toggleToolEquip(data: {
    playerId: number;
    toolId: number;
  }): Promise<ToolManagementResult> {
    try {
      const { playerId, toolId } = data;

      const tool = await Tool.findOne({
        where: {
          id: toolId,
          player_id: playerId
        }
      });

      if (!tool) {
        return {
          success: false,
          message: '工具不存在'
        };
      }

      if (tool.is_equipped) {
        // 卸下工具
        await tool.unequip();
        return {
          success: true,
          message: `已卸下 ${tool.name}`,
          data: {
            toolId: tool.id,
            newState: {
              isEquipped: false
            }
          }
        };
      } else {
        // 装备工具
        if (!tool.canUse()) {
          return {
            success: false,
            message: '工具已损坏，无法装备'
          };
        }

        await tool.equip();
        return {
          success: true,
          message: `已装备 ${tool.name}`,
          data: {
            toolId: tool.id,
            newState: {
              isEquipped: true
            }
          }
        };
      }
    } catch (error) {
      console.error('切换工具装备状态失败:', error);
      return {
        success: false,
        message: '操作失败，请稍后重试'
      };
    }
  }

  /**
   * 修理工具
   */
  public static async repairTool(data: {
    playerId: number;
    toolId: number;
  }): Promise<ToolManagementResult> {
    try {
      const { playerId, toolId } = data;

      const player = await PlayerData.findByPk(playerId);
      if (!player) {
        return {
          success: false,
          message: '玩家数据不存在'
        };
      }

      const tool = await Tool.findOne({
        where: {
          id: toolId,
          player_id: playerId
        }
      });

      if (!tool) {
        return {
          success: false,
          message: '工具不存在'
        };
      }

      if (tool.current_durability >= tool.max_durability) {
        return {
          success: false,
          message: '工具无需修理'
        };
      }

      // 计算修理费用
      const durabilityPercentage = (tool.current_durability / tool.max_durability) * 100;
      const repairCost = Math.ceil(tool.purchase_price * 0.1 * (1 - durabilityPercentage / 100));

      if (player.coins < repairCost) {
        return {
          success: false,
          message: '金币不足，无法修理'
        };
      }

      // 执行修理
      await player.spendCoins(repairCost);
      await tool.repair();
      await player.reload();

      return {
        success: true,
        message: `${tool.name} 修理完成`,
        data: {
          toolId: tool.id,
          newState: {
            durability: tool.current_durability
          },
          playerCoins: player.coins
        }
      };
    } catch (error) {
      console.error('修理工具失败:', error);
      return {
        success: false,
        message: '修理失败，请稍后重试'
      };
    }
  }

  /**
   * 出售工具
   */
  public static async sellTool(data: {
    playerId: number;
    toolId: number;
  }): Promise<ToolManagementResult> {
    try {
      const { playerId, toolId } = data;

      const player = await PlayerData.findByPk(playerId);
      if (!player) {
        return {
          success: false,
          message: '玩家数据不存在'
        };
      }

      const tool = await Tool.findOne({
        where: {
          id: toolId,
          player_id: playerId
        }
      });

      if (!tool) {
        return {
          success: false,
          message: '工具不存在'
        };
      }

      // 计算出售价格（购买价格的50%，根据耐久度调整）
      const durabilityPercentage = tool.current_durability / tool.max_durability;
      const sellPrice = Math.floor(tool.purchase_price * 0.5 * durabilityPercentage);

      // 如果工具已装备，先卸下
      if (tool.is_equipped) {
        await tool.unequip();
      }

      // 删除工具并给予金币
      await tool.destroy();
      await player.addCoins(sellPrice);
      await player.reload();

      return {
        success: true,
        message: `已出售 ${tool.name}，获得 ${sellPrice} 金币`,
        data: {
          toolId: tool.id,
          playerCoins: player.coins
        }
      };
    } catch (error) {
      console.error('出售工具失败:', error);
      return {
        success: false,
        message: '出售失败，请稍后重试'
      };
    }
  }

  /**
   * 获取每日特惠商品
   */
  public static async getDailyDeals(playerId: number): Promise<ShopItemInfo[]> {
    try {
      const cacheKey = `${this.DAILY_DEALS_KEY}${new Date().toDateString()}`;
      let dealIds = await RedisClient.get(cacheKey);
      
      if (!dealIds) {
        // 生成今日特惠商品
        const allItems = await ShopItem.findAll({
          where: {
            is_available: true,
            category: { [Op.in]: ['tool', 'consumable'] }
          }
        });

        // 随机选择3-5个商品作为特惠
        const shuffled = allItems.sort(() => 0.5 - Math.random());
        const selectedItems = shuffled.slice(0, Math.floor(Math.random() * 3) + 3);
        dealIds = JSON.stringify(selectedItems.map(item => item.id));
        
        // 缓存到明天
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const ttl = Math.floor((tomorrow.getTime() - Date.now()) / 1000);
        
        await RedisClient.set(cacheKey, dealIds, ttl);
      }

      const itemIds = JSON.parse(dealIds);
      const player = await PlayerData.findByPk(playerId);
      
      if (!player) {
        return [];
      }

      const dealItems = await ShopItem.findAll({
        where: {
          id: { [Op.in]: itemIds },
          is_available: true
        }
      });

      return dealItems.map(item => {
        const canPurchase = item.canPlayerPurchase(player);
        const effects = item.getEffects();
        const rarityColor = item.getRarityColor();
        
        // 特惠价格（原价的80%）
        const discountPrice = Math.floor(item.price * 0.8);

        return {
          id: item.id,
          name: item.name,
          description: item.description,
          category: item.category,
          price: discountPrice,
          rarity: item.rarity,
          color: rarityColor,
          effects,
          requirements: {
            level: item.required_level,
            coins: discountPrice
          },
          canPurchase: player.level >= item.required_level && player.coins >= discountPrice,
          stock: item.stock || undefined,
          isLimited: true
        };
      });
    } catch (error) {
      console.error('获取每日特惠失败:', error);
      return [];
    }
  }

  /**
   * 获取推荐商品
   */
  public static async getRecommendedItems(playerId: number): Promise<ShopItemInfo[]> {
    try {
      const player = await PlayerData.findByPk(playerId);
      if (!player) {
        return [];
      }

      const recommendedItems = await ShopItem.getRecommendedItems(player.level, player.coins);
      
      return recommendedItems.map(item => {
        const canPurchase = item.canPlayerPurchase(player);
        const effects = item.getEffects();
        const rarityColor = item.getRarityColor();

        return {
          id: item.id,
          name: item.name,
          description: item.description,
          category: item.category,
          price: item.price,
          rarity: item.rarity,
          color: rarityColor,
          effects,
          requirements: {
            level: item.required_level,
            coins: item.price
          },
          canPurchase,
          stock: item.stock || undefined,
          isLimited: item.stock !== null && item.stock > 0
        };
      });
    } catch (error) {
      console.error('获取推荐商品失败:', error);
      return [];
    }
  }
}

export default ShopService;