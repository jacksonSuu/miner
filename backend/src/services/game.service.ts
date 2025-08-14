import { PlayerData, Scene, MiningRecord, Tool, OfflineMiningSession } from '../models';
import { GAME_CONFIG } from '../config/game.config';
import { redisClient } from '../config/redis.config';
import { Op } from 'sequelize';

// 游戏服务接口
export interface MiningResult {
  success: boolean;
  message: string;
  data?: {
    experience: number;
    coins: number;
    items: Array<{
      name: string;
      rarity: string;
      value: number;
      color: string;
    }>;
    energyCost: number;
    remainingEnergy: number;
    levelUp?: {
      newLevel: number;
      newMaxEnergy: number;
    };
    record: {
      id: number;
      totalValue: number;
      efficiency: number;
    };
  };
}

export interface PlayerStats {
  level: number;
  experience: number;
  experienceToNext: number;
  coins: number;
  energy: {
    current: number;
    max: number;
    recoveryRate: number;
    timeToFull: number;
  };
  mining: {
    totalMines: number;
    totalValue: number;
    averageEfficiency: number;
    bestRecord: {
      value: number;
      items: number;
      date: string;
    } | null;
  };
  tools: {
    equipped: number;
    total: number;
    totalBonus: {
      experience: number;
      coins: number;
      efficiency: number;
    };
  };
}

export interface SceneInfo {
  id: number;
  name: string;
  description: string;
  unlockLevel: number;
  energyCost: number;
  isUnlocked: boolean;
  rewards: {
    baseExperience: number;
    baseCoins: number;
    itemDropRate: number;
  };
}

export interface OfflineMiningInfo {
  isActive: boolean;
  session?: {
    id: number;
    sceneId: number;
    sceneName: string;
    startTime: string;
    duration: number;
    estimatedRewards: {
      experience: number;
      coins: number;
      items: number;
    };
  };
  canStart: boolean;
  requirements?: {
    minLevel: number;
    energyCost: number;
  };
}

// 游戏服务类
export class GameService {
  private static readonly ENERGY_RECOVERY_CACHE_KEY = 'energy_recovery:';
  private static readonly MINING_COOLDOWN_KEY = 'mining_cooldown:';
  private static readonly OFFLINE_MINING_KEY = 'offline_mining:';

  /**
   * 执行挖矿操作
   */
  public static async performMining(data: {
    playerId: number;
    sceneId: number;
  }): Promise<MiningResult> {
    try {
      // 获取玩家数据
      const player = await PlayerData.findByPk(data.playerId);
      if (!player) {
        return {
          success: false,
          message: '玩家数据不存在'
        };
      }

      // 获取场景信息
      const scene = await Scene.findByPk(data.sceneId);
      if (!scene) {
        return {
          success: false,
          message: '挖矿场景不存在'
        };
      }

      // 检查场景是否解锁
      if (!scene.isAccessibleByPlayer(player.level)) {
        return {
          success: false,
          message: `需要等级 ${scene.required_level} 才能进入此场景`
        };
      }

      // 挖矿冷却功能已移除，允许连续挖矿

      // 自动恢复精力
      await player.autoRecoverEnergy();

      // 检查精力是否足够
      if (!player.hasEnoughEnergy(scene.energy_cost)) {
        return {
          success: false,
          message: `精力不足，需要 ${scene.energy_cost} 点精力`
        };
      }

      // 获取玩家装备的工具
      const equippedTools = await Tool.getEquippedTools(data.playerId);
      const toolBonus = await Tool.calculatePlayerBonus(data.playerId);

      // 计算挖矿奖励
      const miningRewards = scene.calculateMiningReward(player.level, true);

      // 消耗精力
      await player.consumeEnergy(scene.energy_cost);

      // 增加经验和金币
      const levelUpInfo = await player.addExperience(miningRewards.experience);
      await player.addCoins(miningRewards.coins);

      // 增加挖矿次数
      await player.incrementMiningCount();

      // 使用装备的工具（降低耐久度）
      await Tool.useEquippedTools(data.playerId);

      // 创建挖矿记录
      const miningRecord = await MiningRecord.createMiningRecord({
        playerId: data.playerId,
        sceneId: data.sceneId,
        experienceGained: miningRewards.experience,
        coinsEarned: miningRewards.coins,
        itemsFound: miningRewards.items || [],
        energyConsumed: scene.energy_cost
      });

      // 挖矿冷却功能已移除

      // 重新加载玩家数据以获取最新状态
      await player.reload();

      return {
        success: true,
        message: '挖矿成功',
        data: {
          experience: miningRewards.experience,
          coins: miningRewards.coins,
          items: [],
          energyCost: scene.energy_cost,
          remainingEnergy: player.current_energy,
          levelUp: levelUpInfo.leveledUp ? {
            newLevel: levelUpInfo.newLevel!,
            newMaxEnergy: player.max_energy
          } : undefined,
          record: {
            id: miningRecord.id,
            totalValue: miningRewards.coins,
            efficiency: Math.round((miningRewards.coins + miningRewards.experience) / scene.energy_cost)
          }
        }
      };
    } catch (error) {
      console.error('挖矿操作失败:', error);
      return {
        success: false,
        message: '挖矿失败，请稍后重试'
      };
    }
  }

  /**
   * 获取玩家统计信息
   */
  public static async getPlayerStats(playerId: number): Promise<PlayerStats | null> {
    try {
      const player = await PlayerData.findByPk(playerId);
      if (!player) {
        return null;
      }

      // 自动恢复精力
      await player.autoRecoverEnergy();

      // 获取挖矿统计
      const miningStats: any = await MiningRecord.getPlayerMiningStats(playerId);
      
      // 获取工具信息
      const allTools = await Tool.getPlayerTools(playerId);
      const equippedTools = allTools.filter(tool => tool.is_equipped);
      const toolBonus = await Tool.calculatePlayerBonus(playerId);

      // 计算精力恢复时间
      const energyToRecover = player.max_energy - player.current_energy;
      const timeToFull = energyToRecover * GAME_CONFIG.ENERGY.RECOVERY_INTERVAL;

      return {
        level: player.level,
        experience: player.experience,
        experienceToNext: GAME_CONFIG.LEVEL.getRequiredExp(player.level + 1) - player.experience,
        coins: player.coins,
        energy: {
          current: player.current_energy,
          max: player.max_energy,
          recoveryRate: GAME_CONFIG.ENERGY.RECOVERY_AMOUNT,
          timeToFull
        },
        mining: {
          totalMines: miningStats?.totalMines || 0,
          totalValue: miningStats?.totalValue || 0,
          averageEfficiency: miningStats?.averageEfficiency || 0,
          bestRecord: miningStats?.bestRecord || null
        },
        tools: {
          equipped: equippedTools.length,
          total: allTools.length,
          totalBonus: {
            experience: toolBonus.expBonus,
            coins: toolBonus.coinBonus,
            efficiency: toolBonus.miningSpeed
          }
        }
      };
    } catch (error) {
      console.error('获取玩家统计失败:', error);
      return null;
    }
  }

  /**
   * 获取可用场景列表
   */
  public static async getAvailableScenes(playerId: number): Promise<SceneInfo[]> {
    try {
      const player = await PlayerData.findByPk(playerId);
      if (!player) {
        return [];
      }

      const scenes = await Scene.getAllScenesWithLockStatus(player.level);
      
      return scenes.map((scene: any) => ({
        id: scene.id,
        name: scene.name,
        description: scene.description,
        unlockLevel: scene.required_level,
        energyCost: scene.energy_cost,
        isUnlocked: scene.isUnlocked,
        rewards: {
          baseExperience: scene.base_experience,
          baseCoins: (scene.base_coins_min + scene.base_coins_max) / 2,
          itemDropRate: 0.1
        }
      }));
    } catch (error) {
      console.error('获取场景列表失败:', error);
      return [];
    }
  }

  /**
   * 开始离线挖矿
   */
  public static async startOfflineMining(data: {
    playerId: number;
    sceneId: number;
  }): Promise<{ success: boolean; message: string; sessionId?: number }> {
    try {
      const player = await PlayerData.findByPk(data.playerId);
      if (!player) {
        return {
          success: false,
          message: '玩家数据不存在'
        };
      }

      // 检查是否已有活跃的离线挖矿会话
      const activeSession = await OfflineMiningSession.getActiveSession(data.playerId);
      if (activeSession) {
        return {
          success: false,
          message: '已有进行中的离线挖矿'
        };
      }

      // 检查离线挖矿解锁条件
      if (!player.isAutoMiningUnlocked()) {
        return {
          success: false,
          message: `需要等级 ${GAME_CONFIG.AUTO_MINING.MIN_LEVEL_REQUIRED} 才能使用离线挖矿`
        };
      }

      const scene = await Scene.findByPk(data.sceneId);
      if (!scene) {
        return {
          success: false,
          message: '挖矿场景不存在'
        };
      }

      if (!scene.isAccessibleByPlayer(player.level)) {
        return {
          success: false,
          message: `需要等级 ${scene.required_level} 才能在此场景离线挖矿`
        };
      }

      // 检查精力是否足够
      const energyCost = scene.energy_cost;
      if (!player.hasEnoughEnergy(energyCost)) {
        return {
          success: false,
          message: `精力不足，离线挖矿需要 ${energyCost} 点精力`
        };
      }

      // 消耗精力并开始离线挖矿
      await player.consumeEnergy(energyCost);
      const session = await OfflineMiningSession.startSession({ playerId: data.playerId, sceneId: data.sceneId });

      return {
        success: true,
        message: '离线挖矿已开始',
        sessionId: session.id
      };
    } catch (error) {
      console.error('开始离线挖矿失败:', error);
      return {
        success: false,
        message: '开始离线挖矿失败'
      };
    }
  }

  /**
   * 停止离线挖矿并收取奖励
   */
  public static async stopOfflineMining(playerId: number): Promise<{
    success: boolean;
    message: string;
    rewards?: {
      experience: number;
      coins: number;
      items: Array<{
        name: string;
        rarity: string;
        value: number;
        color: string;
      }>;
      duration: number;
      efficiency: number;
    };
  }> {
    try {
      const activeSession = await OfflineMiningSession.getActiveSession(playerId);
      if (!activeSession) {
        return {
          success: false,
          message: '没有进行中的离线挖矿'
        };
      }

      // 计算并应用奖励
      const rewards = await activeSession.applyOfflineRewards();
      
      // 停止会话
      await activeSession.stopSession();

      return {
        success: true,
        message: '离线挖矿奖励已收取',
        rewards: {
          experience: rewards.experience,
          coins: rewards.coins,
          items: rewards.items.map((item: any) => ({
            name: item.name,
            rarity: item.rarity,
            value: item.value,
            color: GAME_CONFIG.RARITY[item.rarity.toUpperCase() as keyof typeof GAME_CONFIG.RARITY]?.color || '#ffffff'
          })),
          duration: activeSession.getSessionDuration(),
          efficiency: activeSession.getMiningEfficiency()
        }
      };
    } catch (error) {
      console.error('停止离线挖矿失败:', error);
      return {
        success: false,
        message: '停止离线挖矿失败'
      };
    }
  }

  /**
   * 获取离线挖矿信息
   */
  public static async getOfflineMiningInfo(playerId: number): Promise<OfflineMiningInfo> {
    try {
      const player = await PlayerData.findByPk(playerId);
      if (!player) {
        return {
          isActive: false,
          canStart: false
        };
      }

      const activeSession = await OfflineMiningSession.getActiveSession(playerId);
      
      if (activeSession) {
        const scene = await Scene.findByPk(activeSession.scene_id);
        const duration = activeSession.getSessionDuration();
        const estimatedRewards = await activeSession.calculateOfflineRewards();

        return {
          isActive: true,
          session: {
            id: activeSession.id,
            sceneId: activeSession.scene_id,
            sceneName: scene?.name || '未知场景',
            startTime: activeSession.start_time.toISOString(),
            duration,
            estimatedRewards: {
              experience: estimatedRewards.experience,
              coins: estimatedRewards.coins,
              items: estimatedRewards.items.length
            }
          },
          canStart: false
        };
      }

      // 检查是否可以开始离线挖矿
      const canStart = player.isAutoMiningUnlocked() &&
                       player.hasEnoughEnergy(1);

      return {
        isActive: false,
        canStart,
        requirements: {
          minLevel: GAME_CONFIG.AUTO_MINING.MIN_LEVEL_REQUIRED,
          energyCost: 1
        }
      };
    } catch (error) {
      console.error('获取离线挖矿信息失败:', error);
      return {
        isActive: false,
        canStart: false
      };
    }
  }

  /**
   * 手动恢复精力
   */
  public static async recoverEnergy(playerId: number): Promise<{
    success: boolean;
    message: string;
    currentEnergy?: number;
    maxEnergy?: number;
  }> {
    try {
      const player = await PlayerData.findByPk(playerId);
      if (!player) {
        return {
          success: false,
          message: '玩家数据不存在'
        };
      }

      const recoveredAmount = await player.autoRecoverEnergy();
      
      return {
        success: true,
        message: recoveredAmount > 0 ? `恢复了 ${recoveredAmount} 点精力` : '精力已满',
        currentEnergy: player.current_energy,
        maxEnergy: player.max_energy
      };
    } catch (error) {
      console.error('恢复精力失败:', error);
      return {
        success: false,
        message: '恢复精力失败'
      };
    }
  }

  /**
   * 获取挖矿排行榜
   */
  public static async getMiningLeaderboard(limit: number = 10): Promise<Array<{
    rank: number;
    playerId: number;
    username: string;
    level: number;
    totalValue: number;
    totalMines: number;
    averageEfficiency: number;
  }>> {
    try {
      return await MiningRecord.getGlobalMiningLeaderboard('coins', 'weekly', limit);
    } catch (error) {
      console.error('获取挖矿排行榜失败:', error);
      return [];
    }
  }

  /**
   * 获取玩家挖矿历史
   */
  public static async getPlayerMiningHistory(playerId: number, page: number = 1, limit: number = 20): Promise<{
    records: Array<{
      id: number;
      sceneName: string;
      experience: number;
      coins: number;
      items: Array<{
        name: string;
        rarity: string;
        value: number;
      }>;
      totalValue: number;
      efficiency: number;
      timestamp: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const { records, total } = await MiningRecord.getPlayerMiningRecords(playerId, {
        limit,
        offset: (page - 1) * limit
      });
      
      const formattedRecords = records.map(record => ({
        id: record.id,
        sceneName: record.scene?.name || '未知场景',
        experience: record.experience_gained,
        coins: record.coins_earned,
        items: record.getItemsFound(),
        totalValue: record.getTotalValue(),
        efficiency: record.getMiningEfficiency(),
        timestamp: record.created_at.toISOString()
      }));

      return {
        records: formattedRecords,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('获取挖矿历史失败:', error);
      return {
        records: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        }
      };
    }
  }
}

export default GameService;