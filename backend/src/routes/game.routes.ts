import { Router } from 'express';
import { GameController } from '../controllers/game.controller';
import { 
  requireAuth, 
  gameApiRateLimit,
  miningRateLimit,
  checkEnergy,
  checkLevel,
  requestLogger
} from '../middleware/auth.middleware';
import { 
  validateBody, 
  validateQuery,
  validateParams 
} from '../middleware/error.middleware';

const router = Router();

// 应用请求日志中间件
router.use(requestLogger);

// 应用游戏API速率限制
router.use(gameApiRateLimit);

// 所有游戏路由都需要认证
router.use(requireAuth);

/**
 * @swagger
 * tags:
 *   name: 游戏
 *   description: 游戏核心功能接口
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PlayerStats:
 *       type: object
 *       properties:
 *         playerId:
 *           type: integer
 *           description: 玩家ID
 *           example: 123
 *         level:
 *           type: integer
 *           description: 玩家等级
 *           example: 5
 *         experience:
 *           type: integer
 *           description: 当前经验值
 *           example: 250
 *         experienceToNext:
 *           type: integer
 *           description: 升级所需经验
 *           example: 50
 *         totalExperience:
 *           type: integer
 *           description: 总经验值
 *           example: 750
 *         coins:
 *           type: integer
 *           description: 金币数量
 *           example: 500
 *         energy:
 *           type: integer
 *           description: 当前精力
 *           example: 85
 *         maxEnergy:
 *           type: integer
 *           description: 最大精力
 *           example: 100
 *         energyRecoveryRate:
 *           type: integer
 *           description: 精力恢复速率（分钟/点）
 *           example: 5
 *         nextEnergyRecovery:
 *           type: string
 *           format: date-time
 *           description: 下次精力恢复时间
 *           example: '2024-01-01T12:05:00Z'
 *         miningStats:
 *           type: object
 *           properties:
 *             totalMines:
 *               type: integer
 *               description: 总挖矿次数
 *               example: 50
 *             totalValue:
 *               type: integer
 *               description: 总挖矿价值
 *               example: 1000
 *             averageEfficiency:
 *               type: number
 *               description: 平均挖矿效率
 *               example: 1.25
 *             bestItem:
 *               type: object
 *               nullable: true
 *               description: 最佳物品
 *               properties:
 *                 name:
 *                   type: string
 *                   example: '钻石'
 *                 rarity:
 *                   type: string
 *                   example: 'legendary'
 *                 value:
 *                   type: integer
 *                   example: 100
 *         toolStats:
 *           type: object
 *           properties:
 *             totalTools:
 *               type: integer
 *               description: 拥有工具总数
 *               example: 3
 *             equippedTools:
 *               type: integer
 *               description: 已装备工具数
 *               example: 2
 *             totalBonus:
 *               type: object
 *               description: 总加成效果
 *               properties:
 *                 experienceBonus:
 *                   type: number
 *                   example: 0.25
 *                 coinBonus:
 *                   type: number
 *                   example: 0.15
 *                 energyEfficiency:
 *                   type: number
 *                   example: 0.3
 *     
 *     Scene:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 场景ID
 *           example: 1
 *         name:
 *           type: string
 *           description: 场景名称
 *           example: '新手矿洞'
 *         description:
 *           type: string
 *           description: 场景描述
 *           example: '适合新手的简单矿洞'
 *         requiredLevel:
 *           type: integer
 *           description: 所需等级
 *           example: 1
 *         energyCost:
 *           type: integer
 *           description: 精力消耗
 *           example: 10
 *         baseExperience:
 *           type: integer
 *           description: 基础经验奖励
 *           example: 20
 *         baseCoins:
 *           type: integer
 *           description: 基础金币奖励
 *           example: 10
 *         difficulty:
 *           type: string
 *           enum: [easy, normal, hard, expert]
 *           description: 难度等级
 *           example: 'easy'
 *         isUnlocked:
 *           type: boolean
 *           description: 是否已解锁
 *           example: true
 *         canAccess:
 *           type: boolean
 *           description: 是否可以进入
 *           example: true
 *         itemDropRates:
 *           type: object
 *           description: 物品掉落率
 *           properties:
 *             common:
 *               type: number
 *               example: 0.6
 *             uncommon:
 *               type: number
 *               example: 0.25
 *             rare:
 *               type: number
 *               example: 0.1
 *             epic:
 *               type: number
 *               example: 0.04
 *             legendary:
 *               type: number
 *               example: 0.01
 *     
 *     MiningRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 记录ID
 *           example: 456
 *         playerId:
 *           type: integer
 *           description: 玩家ID
 *           example: 123
 *         sceneId:
 *           type: integer
 *           description: 场景ID
 *           example: 1
 *         sceneName:
 *           type: string
 *           description: 场景名称
 *           example: '新手矿洞'
 *         experience:
 *           type: integer
 *           description: 获得经验
 *           example: 25
 *         coins:
 *           type: integer
 *           description: 获得金币
 *           example: 15
 *         energyCost:
 *           type: integer
 *           description: 消耗精力
 *           example: 10
 *         items:
 *           type: array
 *           description: 获得物品
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: '铁矿石'
 *               rarity:
 *                 type: string
 *                 example: 'common'
 *               value:
 *                 type: integer
 *                 example: 5
 *               color:
 *                 type: string
 *                 example: '#ffffff'
 *         totalValue:
 *           type: integer
 *           description: 总价值
 *           example: 20
 *         efficiency:
 *           type: number
 *           description: 挖矿效率
 *           example: 1.25
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 挖矿时间
 *           example: '2024-01-01T12:00:00Z'
 */

// 执行挖矿
router.post('/mine', 
  miningRateLimit,
  validateBody({
    sceneId: { type: 'integer', required: true, minimum: 1 }
  }),
  checkEnergy(10), // 最少需要10点精力
  GameController.performMining
);

// 获取玩家统计
router.get('/stats', 
  GameController.getPlayerStats
);

// 获取可用场景
router.get('/scenes', 
  GameController.getScenes
);

// 开始离线挖矿
router.post('/offline-mining/start', 
  validateBody({
    sceneId: { type: 'integer', required: true, minimum: 1 }
  }),
  checkLevel(5), // 需要5级才能离线挖矿
  checkEnergy(50), // 需要50点精力开始离线挖矿
  GameController.startOfflineMining
);

// 停止离线挖矿
router.post('/offline-mining/stop', 
  GameController.stopOfflineMining
);

// 获取离线挖矿信息
router.get('/offline-mining/info', 
  GameController.getOfflineMiningInfo
);

// 手动恢复精力
router.post('/energy/recover', 
  GameController.recoverEnergy
);

// 获取挖矿排行榜
router.get('/leaderboard', 
  validateQuery({
    limit: { type: 'integer', required: false, minimum: 1, maximum: 100 }
  }),
  GameController.getLeaderboard
);

// 获取挖矿历史
router.get('/mining-history', 
  validateQuery({
    page: { type: 'integer', required: false, minimum: 1 },
    limit: { type: 'integer', required: false, minimum: 1, maximum: 50 }
  }),
  GameController.getMiningHistory
);

export default router;