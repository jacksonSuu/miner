import { Router } from 'express';
import { ShopController } from '../controllers/shop.controller';
import { 
  requireAuth, 
  shopRateLimit,
  requestLogger
} from '../middleware/auth.middleware';
import { 
  validateRequestBody,
  validateQueryParams,
  validatePathParams 
} from '../middleware/error.middleware';

const router = Router();

// 应用请求日志中间件
router.use(requestLogger);

// 应用商店API速率限制
router.use(shopRateLimit);

// 所有商店路由都需要认证
router.use(requireAuth);

/**
 * @swagger
 * tags:
 *   name: 商店
 *   description: 商店和工具管理接口
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ShopItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 商店物品ID
 *           example: 1
 *         name:
 *           type: string
 *           description: 物品名称
 *           example: '铁镐'
 *         description:
 *           type: string
 *           description: 物品描述
 *           example: '一把坚固的铁制镐子，提高挖矿效率'
 *         category:
 *           type: string
 *           enum: [tool, consumable, upgrade]
 *           description: 物品分类
 *           example: 'tool'
 *         type:
 *           type: string
 *           description: 物品类型
 *           example: 'pickaxe'
 *         rarity:
 *           type: string
 *           enum: [common, uncommon, rare, epic, legendary]
 *           description: 稀有度
 *           example: 'common'
 *         price:
 *           type: integer
 *           description: 价格
 *           example: 100
 *         requiredLevel:
 *           type: integer
 *           description: 所需等级
 *           example: 3
 *         maxStock:
 *           type: integer
 *           nullable: true
 *           description: 最大库存（null表示无限）
 *           example: 10
 *         currentStock:
 *           type: integer
 *           nullable: true
 *           description: 当前库存
 *           example: 8
 *         purchaseCooldown:
 *           type: integer
 *           description: 购买冷却时间（秒）
 *           example: 300
 *         effects:
 *           type: object
 *           description: 物品效果
 *           properties:
 *             experienceBonus:
 *               type: number
 *               description: 经验加成
 *               example: 0.1
 *             coinBonus:
 *               type: number
 *               description: 金币加成
 *               example: 0.05
 *             energyEfficiency:
 *               type: number
 *               description: 精力效率
 *               example: 0.15
 *             energyRestore:
 *               type: integer
 *               description: 恢复精力
 *               example: 50
 *             maxEnergyIncrease:
 *               type: integer
 *               description: 增加最大精力
 *               example: 10
 *         durability:
 *           type: integer
 *           nullable: true
 *           description: 耐久度（工具类物品）
 *           example: 100
 *         canPurchase:
 *           type: boolean
 *           description: 是否可以购买
 *           example: true
 *         purchaseRestrictions:
 *           type: array
 *           description: 购买限制原因
 *           items:
 *             type: string
 *           example: ['等级不足', '库存不足']
 *         isActive:
 *           type: boolean
 *           description: 是否激活
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *           example: '2024-01-01T10:00:00Z'
 *     
 *     Tool:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 工具ID
 *           example: 123
 *         playerId:
 *           type: integer
 *           description: 玩家ID
 *           example: 456
 *         shopItemId:
 *           type: integer
 *           description: 商店物品ID
 *           example: 1
 *         name:
 *           type: string
 *           description: 工具名称
 *           example: '铁镐'
 *         type:
 *           type: string
 *           description: 工具类型
 *           example: 'pickaxe'
 *         rarity:
 *           type: string
 *           enum: [common, uncommon, rare, epic, legendary]
 *           description: 稀有度
 *           example: 'common'
 *         durability:
 *           type: integer
 *           description: 当前耐久度
 *           example: 85
 *         maxDurability:
 *           type: integer
 *           description: 最大耐久度
 *           example: 100
 *         isEquipped:
 *           type: boolean
 *           description: 是否已装备
 *           example: true
 *         effects:
 *           type: object
 *           description: 工具效果
 *           properties:
 *             experienceBonus:
 *               type: number
 *               example: 0.1
 *             coinBonus:
 *               type: number
 *               example: 0.05
 *             energyEfficiency:
 *               type: number
 *               example: 0.15
 *         purchasePrice:
 *           type: integer
 *           description: 购买价格
 *           example: 100
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *           example: '2024-01-01T10:00:00Z'
 */

// 获取商店物品列表
router.get('/items', 
  validateQueryParams([]),
  ShopController.getShopItems
);

// 购买商店物品
router.post('/purchase', 
  validateRequestBody(['itemId', 'quantity']),
  ShopController.purchaseItem
);

// 获取玩家工具列表
router.get('/tools', 
  ShopController.getPlayerTools
);

// 装备工具
router.post('/tools/:toolId/equip', 
  validatePathParams(['toolId']),
  ShopController.equipTool
);

// 卸下工具
router.post('/tools/:toolId/unequip', 
  validatePathParams(['toolId']),
  ShopController.unequipTool
);

// 修理工具
router.post('/tools/:toolId/repair', 
  validatePathParams(['toolId']),
  ShopController.repairTool
);

// 出售工具
router.post('/tools/:toolId/sell', 
  validatePathParams(['toolId']),
  ShopController.sellTool
);

// 获取每日特惠
router.get('/daily-deals', 
  ShopController.getDailyDeals
);

// 获取推荐商品
router.get('/recommendations', 
  ShopController.getRecommendations
);

export default router;