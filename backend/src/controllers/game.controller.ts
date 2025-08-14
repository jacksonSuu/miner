import { Request, Response } from 'express';
import { GameService } from '../services/game.service';
import { GAME_CONFIG, GAME_CONSTANTS } from '../config/game.config';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * 游戏控制器类
 */
export class GameController {
  /**
   * @swagger
   * /api/game/mine:
   *   post:
   *     tags: [游戏]
   *     summary: 执行挖矿操作
   *     description: 在指定场景进行挖矿，消耗精力获得经验、金币和物品
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - sceneId
   *             properties:
   *               sceneId:
   *                 type: integer
   *                 description: 挖矿场景ID
   *                 example: 1
   *     responses:
   *       200:
   *         description: 挖矿成功
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
   *                   example: '挖矿成功'
   *                 data:
   *                   type: object
   *                   properties:
   *                     experience:
   *                       type: integer
   *                       description: 获得的经验值
   *                       example: 25
   *                     coins:
   *                       type: integer
   *                       description: 获得的金币
   *                       example: 15
   *                     items:
   *                       type: array
   *                       description: 获得的物品列表
   *                       items:
   *                         type: object
   *                         properties:
   *                           name:
   *                             type: string
   *                             example: '铁矿石'
   *                           rarity:
   *                             type: string
   *                             example: 'common'
   *                           value:
   *                             type: integer
   *                             example: 5
   *                           color:
   *                             type: string
   *                             example: '#ffffff'
   *                     energyCost:
   *                       type: integer
   *                       description: 消耗的精力
   *                       example: 10
   *                     remainingEnergy:
   *                       type: integer
   *                       description: 剩余精力
   *                       example: 90
   *                     levelUp:
   *                       type: object
   *                       nullable: true
   *                       description: 升级信息（如果升级了）
   *                       properties:
   *                         newLevel:
   *                           type: integer
   *                           example: 6
   *                         newMaxEnergy:
   *                           type: integer
   *                           example: 110
   *                     record:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: integer
   *                           example: 123
   *                         totalValue:
   *                           type: integer
   *                           example: 20
   *                         efficiency:
   *                           type: number
   *                           example: 1.25
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   */
  public static performMining = asyncHandler(async (req: Request, res: Response) => {
    const { sceneId } = req.body;
    const playerId = req.playerId!;

    // 验证输入
    if (!sceneId || !Number.isInteger(Number(sceneId))) {
      return res.status(400).json({
        success: false,
        message: '场景ID必须是有效的整数',
        code: GAME_CONSTANTS.ERROR_CODES.INVALID_INPUT
      });
    }

    const result = await GameService.performMining({
      playerId,
      sceneId: Number(sceneId)
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
   * /api/game/stats:
   *   get:
   *     tags: [游戏]
   *     summary: 获取玩家统计信息
   *     description: 获取当前玩家的详细统计数据
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
   *                   example: '获取玩家统计成功'
   *                 data:
   *                   $ref: '#/components/schemas/PlayerStats'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       404:
   *         description: 玩家数据不存在
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  public static getPlayerStats = asyncHandler(async (req: Request, res: Response) => {
    const playerId = req.playerId!;

    const stats = await GameService.getPlayerStats(playerId);

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: '玩家数据不存在',
        code: GAME_CONSTANTS.ERROR_CODES.PLAYER_NOT_FOUND
      });
    }

    return res.status(200).json({
      success: true,
      message: '获取玩家统计成功',
      data: stats
    });
  });

  /**
   * @swagger
   * /api/game/scenes:
   *   get:
   *     tags: [游戏]
   *     summary: 获取可用场景列表
   *     description: 获取所有挖矿场景及其解锁状态
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
   *                   example: '获取场景列表成功'
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Scene'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  public static getScenes = asyncHandler(async (req: Request, res: Response) => {
    const playerId = req.playerId!;

    const scenes = await GameService.getAvailableScenes(playerId);

    return res.status(200).json({
      success: true,
      message: '获取场景列表成功',
      data: scenes
    });
  });

  /**
   * @swagger
   * /api/game/offline-mining/start:
   *   post:
   *     tags: [游戏]
   *     summary: 开始离线挖矿
   *     description: 在指定场景开始离线挖矿
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - sceneId
   *             properties:
   *               sceneId:
   *                 type: integer
   *                 description: 挖矿场景ID
   *                 example: 1
   *     responses:
   *       200:
   *         description: 离线挖矿开始成功
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
   *                   example: '离线挖矿已开始'
   *                 sessionId:
   *                   type: integer
   *                   description: 离线挖矿会话ID
   *                   example: 456
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  public static startOfflineMining = asyncHandler(async (req: Request, res: Response) => {
    const { sceneId } = req.body;
    const playerId = req.playerId!;

    // 验证输入
    if (!sceneId || !Number.isInteger(Number(sceneId))) {
      return res.status(400).json({
        success: false,
        message: '场景ID必须是有效的整数',
        code: GAME_CONSTANTS.ERROR_CODES.INVALID_INPUT
      });
    }

    const result = await GameService.startOfflineMining({
      playerId,
      sceneId: Number(sceneId)
    });

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json({
        ...result,
        code: GAME_CONSTANTS.ERROR_CODES.INVALID_INPUT
      });
    }
  });

  /**
   * @swagger
   * /api/game/offline-mining/stop:
   *   post:
   *     tags: [游戏]
   *     summary: 停止离线挖矿
   *     description: 停止当前的离线挖矿并收取奖励
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 离线挖矿停止成功
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
   *                   example: '离线挖矿奖励已收取'
   *                 rewards:
   *                   type: object
   *                   properties:
   *                     experience:
   *                       type: integer
   *                       example: 150
   *                     coins:
   *                       type: integer
   *                       example: 90
   *                     items:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           name:
   *                             type: string
   *                             example: '铁矿石'
   *                           rarity:
   *                             type: string
   *                             example: 'common'
   *                           value:
   *                             type: integer
   *                             example: 5
   *                           color:
   *                             type: string
   *                             example: '#ffffff'
   *                     duration:
   *                       type: integer
   *                       description: 离线挖矿持续时间（分钟）
   *                       example: 120
   *                     efficiency:
   *                       type: number
   *                       description: 挖矿效率
   *                       example: 1.5
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  public static stopOfflineMining = asyncHandler(async (req: Request, res: Response) => {
    const playerId = req.playerId!;

    const result = await GameService.stopOfflineMining(playerId);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json({
        ...result,
        code: GAME_CONSTANTS.ERROR_CODES.INVALID_INPUT
      });
    }
  });

  /**
   * @swagger
   * /api/game/offline-mining/info:
   *   get:
   *     tags: [游戏]
   *     summary: 获取离线挖矿信息
   *     description: 获取当前离线挖矿状态和信息
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
   *                   example: '获取离线挖矿信息成功'
   *                 data:
   *                   type: object
   *                   properties:
   *                     isActive:
   *                       type: boolean
   *                       description: 是否有活跃的离线挖矿
   *                       example: true
   *                     session:
   *                       type: object
   *                       nullable: true
   *                       description: 当前离线挖矿会话信息
   *                       properties:
   *                         id:
   *                           type: integer
   *                           example: 456
   *                         sceneId:
   *                           type: integer
   *                           example: 1
   *                         sceneName:
   *                           type: string
   *                           example: '新手矿洞'
   *                         startTime:
   *                           type: string
   *                           format: date-time
   *                           example: '2024-01-01T10:00:00Z'
   *                         duration:
   *                           type: integer
   *                           description: 已持续时间（分钟）
   *                           example: 60
   *                         estimatedRewards:
   *                           type: object
   *                           properties:
   *                             experience:
   *                               type: integer
   *                               example: 75
   *                             coins:
   *                               type: integer
   *                               example: 45
   *                             items:
   *                               type: integer
   *                               description: 预计物品数量
   *                               example: 3
   *                     canStart:
   *                       type: boolean
   *                       description: 是否可以开始离线挖矿
   *                       example: false
   *                     requirements:
   *                       type: object
   *                       nullable: true
   *                       description: 开始离线挖矿的要求
   *                       properties:
   *                         minLevel:
   *                           type: integer
   *                           example: 5
   *                         energyCost:
   *                           type: integer
   *                           example: 50
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  public static getOfflineMiningInfo = asyncHandler(async (req: Request, res: Response) => {
    const playerId = req.playerId!;

    const info = await GameService.getOfflineMiningInfo(playerId);

    return res.status(200).json({
      success: true,
      message: '获取离线挖矿信息成功',
      data: info
    });
  });

  /**
   * @swagger
   * /api/game/energy/recover:
   *   post:
   *     tags: [游戏]
   *     summary: 手动恢复精力
   *     description: 手动触发精力恢复计算
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: 精力恢复成功
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
   *                   example: '恢复了 5 点精力'
   *                 currentEnergy:
   *                   type: integer
   *                   description: 当前精力值
   *                   example: 85
   *                 maxEnergy:
   *                   type: integer
   *                   description: 最大精力值
   *                   example: 100
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  public static recoverEnergy = asyncHandler(async (req: Request, res: Response) => {
    const playerId = req.playerId!;

    const result = await GameService.recoverEnergy(playerId);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json({
        ...result,
        code: GAME_CONSTANTS.ERROR_CODES.INVALID_INPUT
      });
    }
  });

  /**
   * @swagger
   * /api/game/leaderboard:
   *   get:
   *     tags: [游戏]
   *     summary: 获取挖矿排行榜
   *     description: 获取全服挖矿排行榜
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: 返回的排行榜条目数量
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
   *                   example: '获取排行榜成功'
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       rank:
   *                         type: integer
   *                         description: 排名
   *                         example: 1
   *                       playerId:
   *                         type: integer
   *                         example: 123
   *                       username:
   *                         type: string
   *                         example: 'player123'
   *                       level:
   *                         type: integer
   *                         example: 15
   *                       totalValue:
   *                         type: integer
   *                         description: 总挖矿价值
   *                         example: 5000
   *                       totalMines:
   *                         type: integer
   *                         description: 总挖矿次数
   *                         example: 200
   *                       averageEfficiency:
   *                         type: number
   *                         description: 平均挖矿效率
   *                         example: 1.8
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  public static getLeaderboard = asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 100);

    const leaderboard = await GameService.getMiningLeaderboard(limit);

    return res.status(200).json({
      success: true,
      message: '获取排行榜成功',
      data: leaderboard
    });
  });

  /**
   * @swagger
   * /api/game/mining-history:
   *   get:
   *     tags: [游戏]
   *     summary: 获取挖矿历史记录
   *     description: 获取当前玩家的挖矿历史记录
   *     security:
   *       - bearerAuth: []
   *     parameters:
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
   *         description: 每页记录数
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
   *                   example: '获取挖矿历史成功'
   *                 data:
   *                   type: object
   *                   properties:
   *                     records:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/MiningRecord'
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
   *                           example: 150
   *                         totalPages:
   *                           type: integer
   *                           example: 8
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  public static getMiningHistory = asyncHandler(async (req: Request, res: Response) => {
    const playerId = req.playerId!;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 50);

    const history = await GameService.getPlayerMiningHistory(playerId, page, limit);

    return res.status(200).json({
      success: true,
      message: '获取挖矿历史成功',
      data: history
    });
  });
}

export default GameController;