import { Request, Response } from 'express';
import { ShopService } from '../services/shop.service';
import { GAME_CONFIG, GAME_CONSTANTS } from '../config/game.config';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * 商店控制器类
 */
export class ShopController {
  /**
   * @swagger
   * /api/shop/items:
   *   get:
   *     tags: [商店]
   *     summary: 获取商店物品列表
   *     description: 获取商店中的物品，支持分类筛选和搜索
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: category
   *         schema:
   *           type: string
   *           enum: [tool, consumable, upgrade]
   *         description: 物品分类
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: 搜索关键词
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: 页码
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 50
   *           default: 20
   *         description: 每页物品数
   *     responses:
   *       200:
   *         description: 获取成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: '获取商店物品成功'
   *                 data:
   *                   type: object
   *                   properties:
   *                     items:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/ShopItem'
   *                     pagination:
   *                       type: object
   *                       properties:
   *                         page:
   *                           type: integer
   *                           example: 1
   *                         limit:
   *                           type: integer
   *                           example: 20
   *                         total:
   *                           type: integer
   *                           example: 45
   *                         totalPages:
   *                           type: integer
   *                           example: 3
   *                     categories:
   *                       type: array
   *                       items:
   *                         type: string
   *                       example: ['tool', 'consumable', 'upgrade']
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  public static getShopItems = asyncHandler(async (req: Request, res: Response) => {
    const playerId = req.playerId!;
    const category = req.query.category as string;
    const search = req.query.search as string;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 50);

    const result = await ShopService.getShopItems({
      playerId,
      category,
      search,
      page,
      limit
    });

    return res.status(200).json({
      success: true,
      message: '获取商店物品成功',
      data: result
    });
  });

  /**
   * @swagger
   * /api/shop/purchase:
   *   post:
   *     tags: [商店]
   *     summary: 购买商店物品
   *     description: 购买指定的商店物品
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - itemId
   *               - quantity
   *             properties:
   *               itemId:
   *                 type: integer
   *                 description: 商店物品ID
   *                 example: 1
   *               quantity:
   *                 type: integer
   *                 minimum: 1
   *                 description: 购买数量
   *                 example: 1
   *     responses:
   *       200:
   *         description: 购买成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: '购买成功'
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalCost:
   *                       type: integer
   *                       description: 总花费
   *                       example: 100
   *                     remainingCoins:
   *                       type: integer
   *                       description: 剩余金币
   *                       example: 900
   *                     purchasedItems:
   *                       type: array
   *                       description: 购买的物品
   *                       items:
   *                         type: object
   *                         properties:
   *                           name:
   *                             type: string
   *                             example: '铁镐'
   *                           quantity:
   *                             type: integer
   *                             example: 1
   *                           type:
   *                             type: string
   *                             example: 'tool'
   *                     effects:
   *                       type: array
   *                       description: 应用的效果（消耗品）
   *                       items:
   *                         type: string
   *                       example: ['恢复了 50 点精力']
   *                     tools:
   *                       type: array
   *                       description: 创建的工具（工具类物品）
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: integer
   *                             example: 123
   *                           name:
   *                             type: string
   *                             example: '铁镐'
   *                           durability:
   *                             type: integer
   *                             example: 100
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   */
  public static purchaseItem = asyncHandler(async (req: Request, res: Response) => {
    const { itemId, quantity } = req.body;
    const playerId = req.playerId!;

    // 验证输入
    if (!itemId || !Number.isInteger(Number(itemId))) {
      return res.status(400).json({
        success: false,
        message: '物品ID必须是有效的整数',
        code: GAME_CONSTANTS.ERROR_CODES.INVALID_INPUT
      });
    }

    if (!quantity || !Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
      return res.status(400).json({
        success: false,
        message: '购买数量必须是大于0的整数',
        code: GAME_CONFIG.ERROR_CODES.INVALID_INPUT
      });
    }

    const result = await ShopService.purchaseItem({
      playerId,
      itemId: Number(itemId),
      quantity: Number(quantity)
    });

    if (result.success) {
      return res.status(200).json(result);
    } else {
      const statusCode = result.message.includes('冷却') || result.message.includes('频繁') ? 429 : 400;
      return res.status(statusCode).json({
        ...result,
        code: statusCode === 429 ? GAME_CONSTANTS.ERROR_CODES.RATE_LIMIT_EXCEEDED : GAME_CONSTANTS.ERROR_CODES.INVALID_INPUT
      });
    }
  });

  /**
   * @swagger
   * /api/shop/tools:
   *   get:
   *     tags: [商店]
   *     summary: 获取玩家工具列表
   *     description: 获取玩家拥有的所有工具及其状态
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 获取成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: '获取工具列表成功'
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: integer
   *                         example: 123
   *                       name:
   *                         type: string
   *                         example: '铁镐'
   *                       type:
   *                         type: string
   *                         example: 'pickaxe'
   *                       rarity:
   *                         type: string
   *                         example: 'common'
   *                       durability:
   *                         type: integer
   *                         example: 85
   *                       maxDurability:
   *                         type: integer
   *                         example: 100
   *                       isEquipped:
   *                         type: boolean
   *                         example: true
   *                       effects:
   *                         type: object
   *                         properties:
   *                           experienceBonus:
   *                             type: number
   *                             example: 0.1
   *                           coinBonus:
   *                             type: number
   *                             example: 0.05
   *                           energyEfficiency:
   *                             type: number
   *                             example: 0.15
   *                       canEquip:
   *                         type: boolean
   *                         example: false
   *                       canRepair:
   *                         type: boolean
   *                         example: true
   *                       repairCost:
   *                         type: integer
   *                         example: 25
   *                       sellValue:
   *                         type: integer
   *                         example: 40
   *                       status:
   *                         type: string
   *                         enum: [good, damaged, broken]
   *                         example: 'good'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  public static getPlayerTools = asyncHandler(async (req: Request, res: Response) => {
    const playerId = req.playerId!;

    const tools = await ShopService.getPlayerTools(playerId);

    return res.status(200).json({
      success: true,
      message: '获取工具列表成功',
      data: tools
    });
  });

  /**
   * @swagger
   * /api/shop/tools/{toolId}/equip:
   *   post:
   *     tags: [商店]
   *     summary: 装备/卸下工具
   *     description: 切换工具的装备状态
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: toolId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 工具ID
   *     responses:
   *       200:
   *         description: 操作成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: '工具装备成功'
   *                 isEquipped:
   *                   type: boolean
   *                   description: 当前装备状态
   *                   example: true
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       404:
   *         description: 工具不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  public static equipTool = asyncHandler(async (req: Request, res: Response) => {
    const toolId = parseInt(req.params.toolId);
    const playerId = req.playerId!;

    // 验证输入
    if (!Number.isInteger(toolId)) {
      return res.status(400).json({
        success: false,
        message: '工具ID必须是有效的整数',
        code: GAME_CONFIG.ERROR_CODES.INVALID_INPUT
      });
    }

    const result = await ShopService.equipTool(playerId, toolId);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      const statusCode = result.message.includes('不存在') || result.message.includes('找不到') ? 404 : 400;
      return res.status(statusCode).json({
        ...result,
        code: statusCode === 404 ? GAME_CONSTANTS.ERROR_CODES.TOOL_NOT_FOUND : GAME_CONSTANTS.ERROR_CODES.INVALID_INPUT
      });
    }
  });

  /**
   * @swagger
   * /api/shop/tools/{toolId}/repair:
   *   post:
   *     tags: [商店]
   *     summary: 修理工具
   *     description: 花费金币修理工具，恢复耐久度
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: toolId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 工具ID
   *     responses:
   *       200:
   *         description: 修理成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: '工具修理成功'
   *                 repairCost:
   *                   type: integer
   *                   description: 修理花费
   *                   example: 25
   *                 newDurability:
   *                   type: integer
   *                   description: 修理后耐久度
   *                   example: 100
   *                 remainingCoins:
   *                   type: integer
   *                   description: 剩余金币
   *                   example: 875
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       404:
   *         description: 工具不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  public static repairTool = asyncHandler(async (req: Request, res: Response) => {
    const toolId = parseInt(req.params.toolId);
    const playerId = req.playerId!;

    // 验证输入
    if (!Number.isInteger(toolId)) {
      return res.status(400).json({
        success: false,
        message: '工具ID必须是有效的整数',
        code: GAME_CONFIG.ERROR_CODES.INVALID_INPUT
      });
    }

    const result = await ShopService.repairTool(playerId, toolId);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      const statusCode = result.message.includes('不存在') || result.message.includes('找不到') ? 404 : 400;
      return res.status(statusCode).json({
        ...result,
        code: statusCode === 404 ? GAME_CONFIG.ERROR_CODES.TOOL_NOT_FOUND : GAME_CONFIG.ERROR_CODES.INVALID_INPUT
      });
    }
  });

  /**
   * @swagger
   * /api/shop/tools/{toolId}/sell:
   *   post:
   *     tags: [商店]
   *     summary: 出售工具
   *     description: 出售工具获得金币
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: toolId
   *         required: true
   *         schema:
   *           type: integer
   *         description: 工具ID
   *     responses:
   *       200:
   *         description: 出售成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: '工具出售成功'
   *                 sellValue:
   *                   type: integer
   *                   description: 出售获得的金币
   *                   example: 40
   *                 newCoins:
   *                   type: integer
   *                   description: 出售后的金币总数
   *                   example: 940
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       404:
   *         description: 工具不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  public static sellTool = asyncHandler(async (req: Request, res: Response) => {
    const toolId = parseInt(req.params.toolId);
    const playerId = req.playerId!;

    // 验证输入
    if (!Number.isInteger(toolId)) {
      return res.status(400).json({
        success: false,
        message: '工具ID必须是有效的整数',
        code: GAME_CONFIG.ERROR_CODES.INVALID_INPUT
      });
    }

    const result = await ShopService.sellTool(playerId, toolId);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      const statusCode = result.message.includes('不存在') || result.message.includes('找不到') ? 404 : 400;
      return res.status(statusCode).json({
        ...result,
        code: statusCode === 404 ? GAME_CONFIG.ERROR_CODES.TOOL_NOT_FOUND : GAME_CONFIG.ERROR_CODES.INVALID_INPUT
      });
    }
  });

  /**
   * @swagger
   * /api/shop/daily-deals:
   *   get:
   *     tags: [商店]
   *     summary: 获取每日特惠商品
   *     description: 获取当日的特惠商品列表
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 获取成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: '获取每日特惠成功'
   *                 data:
   *                   type: array
   *                   items:
   *                     allOf:
   *                       - $ref: '#/components/schemas/ShopItem'
   *                       - type: object
   *                         properties:
   *                           originalPrice:
   *                             type: integer
   *                             description: 原价
   *                             example: 100
   *                           discountPrice:
   *                             type: integer
   *                             description: 折扣价
   *                             example: 80
   *                           discountPercent:
   *                             type: integer
   *                             description: 折扣百分比
   *                             example: 20
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  public static getDailyDeals = asyncHandler(async (req: Request, res: Response) => {
    const playerId = req.playerId!;

    const deals = await ShopService.getDailyDeals(playerId);

    return res.status(200).json({
      success: true,
      message: '获取每日特惠成功',
      data: deals
    });
  });

  /**
   * @swagger
   * /api/shop/recommendations:
   *   get:
   *     tags: [商店]
   *     summary: 获取推荐商品
   *     description: 根据玩家等级和金币获取推荐商品
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 获取成功
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: '获取推荐商品成功'
   *                 data:
   *                   type: array
   *                   items:
   *                     allOf:
   *                       - $ref: '#/components/schemas/ShopItem'
   *                       - type: object
   *                         properties:
   *                           recommendReason:
   *                             type: string
   *                             description: 推荐理由
   *                             example: '适合您当前等级的高效工具'
   *                           priority:
   *                             type: integer
   *                             description: 推荐优先级
   *                             example: 5
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  public static getRecommendations = asyncHandler(async (req: Request, res: Response) => {
    const playerId = req.playerId!;

    const recommendations = await ShopService.getRecommendations(playerId);

    return res.status(200).json({
      success: true,
      message: '获取推荐商品成功',
      data: recommendations
    });
  });
}

export default ShopController;