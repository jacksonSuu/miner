import { Sequelize } from 'sequelize';
import databaseManager from '../config/database.config';

// 获取sequelize实例
const sequelize = databaseManager.getSequelize();

// 导入所有模型
import { User, UserModel } from './User.model';
import { PlayerData, PlayerDataModel } from './PlayerData.model';
import { Scene, SceneModel } from './Scene.model';
import { MiningRecord, MiningRecordModel } from './MiningRecord.model';
import { ShopItem, ShopItemModel } from './ShopItem.model';
import { Tool, ToolModel } from './Tool.model';
import { OfflineMiningSession, OfflineMiningSessionModel } from './OfflineMiningSession.model';

// 初始化所有模型
UserModel(sequelize);
PlayerDataModel(sequelize);
SceneModel(sequelize);
MiningRecordModel(sequelize);
ShopItemModel(sequelize);
ToolModel(sequelize);
OfflineMiningSessionModel(sequelize);

// 定义模型关联关系
// User 与 PlayerData 一对一关系
User.hasOne(PlayerData, {
  foreignKey: 'user_id',
  as: 'playerData'
});
PlayerData.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// PlayerData 与 MiningRecord 一对多关系
PlayerData.hasMany(MiningRecord, {
  foreignKey: 'player_id',
  as: 'miningRecords'
});
MiningRecord.belongsTo(PlayerData, {
  foreignKey: 'player_id',
  as: 'player'
});

// PlayerData 与 OfflineMiningSession 一对多关系
PlayerData.hasMany(OfflineMiningSession, {
  foreignKey: 'player_id',
  as: 'offlineSessions'
});
OfflineMiningSession.belongsTo(PlayerData, {
  foreignKey: 'player_id',
  as: 'player'
});

// PlayerData 与 Tool 一对多关系（玩家可以拥有多个工具）
PlayerData.hasMany(Tool, {
  foreignKey: 'player_id',
  as: 'tools'
});
Tool.belongsTo(PlayerData, {
  foreignKey: 'player_id',
  as: 'player'
});

// Scene 与 MiningRecord 一对多关系
Scene.hasMany(MiningRecord, {
  foreignKey: 'scene_id',
  as: 'miningRecords'
});
MiningRecord.belongsTo(Scene, {
  foreignKey: 'scene_id',
  as: 'scene'
});

// Scene 与 OfflineMiningSession 一对多关系
Scene.hasMany(OfflineMiningSession, {
  foreignKey: 'scene_id',
  as: 'offlineSessions'
});
OfflineMiningSession.belongsTo(Scene, {
  foreignKey: 'scene_id',
  as: 'scene'
});

// ShopItem 与 Tool 一对多关系
ShopItem.hasMany(Tool, {
  foreignKey: 'shop_item_id',
  as: 'tools'
});
Tool.belongsTo(ShopItem, {
  foreignKey: 'shop_item_id',
  as: 'shopItem'
});

const setupAssociations = () => {
  console.log('✅ 数据库模型关联关系设置完成');
};

// 数据库同步函数
export const syncDatabase = async (force: boolean = false): Promise<void> => {
  try {
    console.log('🔄 开始同步数据库...');
    
    // 设置关联关系
    setupAssociations();
    
    // 同步数据库
    await sequelize.sync({ force, alter: !force });
    
    console.log('✅ 数据库同步完成');
  } catch (error) {
    console.error('❌ 数据库同步失败:', error);
    throw error;
  }
};

// 测试数据库连接
export const testDatabaseConnection = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接测试成功');
  } catch (error) {
    console.error('❌ 数据库连接测试失败:', error);
    throw error;
  }
};

// 关闭数据库连接
export const closeDatabaseConnection = async (): Promise<void> => {
  try {
    await sequelize.close();
    console.log('✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 关闭数据库连接失败:', error);
    throw error;
  }
};

// 导出模型和sequelize实例
export {
  sequelize,
  User,
  PlayerData,
  Scene,
  MiningRecord,
  ShopItem,
  Tool,
  OfflineMiningSession
};

// 默认导出
export default {
  sequelize,
  User,
  PlayerData,
  Scene,
  MiningRecord,
  ShopItem,
  Tool,
  OfflineMiningSession,
  syncDatabase,
  testDatabaseConnection,
  closeDatabaseConnection
};