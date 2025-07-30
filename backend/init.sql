-- 挖矿游戏数据库初始化脚本

-- 设置字符集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `miner_game` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `miner_game`;

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL UNIQUE,
  `email` varchar(100) NOT NULL UNIQUE,
  `password_hash` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 玩家数据表
CREATE TABLE IF NOT EXISTS `player_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `level` int DEFAULT 1,
  `experience` bigint DEFAULT 0,
  `coins` bigint DEFAULT 100,
  `energy` int DEFAULT 50,
  `max_energy` int DEFAULT 100,
  `last_energy_recovery` datetime DEFAULT CURRENT_TIMESTAMP,
  `mining_power` int DEFAULT 1,
  `luck` int DEFAULT 1,
  `efficiency` int DEFAULT 1,
  `current_scene_id` int DEFAULT 1,
  `total_mining_count` bigint DEFAULT 0,
  `total_coins_earned` bigint DEFAULT 0,
  `last_mining_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  KEY `idx_level` (`level`),
  KEY `idx_coins` (`coins`),
  KEY `idx_experience` (`experience`),
  CONSTRAINT `fk_player_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 场景表
CREATE TABLE IF NOT EXISTS `scenes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `required_level` int DEFAULT 1,
  `energy_cost` int DEFAULT 1,
  `base_reward` int DEFAULT 10,
  `bonus_multiplier` decimal(3,2) DEFAULT 1.00,
  `unlock_cost` int DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_required_level` (`required_level`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 挖矿记录表
CREATE TABLE IF NOT EXISTS `mining_records` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `scene_id` int NOT NULL,
  `coins_earned` int NOT NULL,
  `experience_gained` int NOT NULL,
  `energy_consumed` int NOT NULL,
  `tool_id` int DEFAULT NULL,
  `bonus_multiplier` decimal(3,2) DEFAULT 1.00,
  `mining_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_scene_id` (`scene_id`),
  KEY `idx_mining_time` (`mining_time`),
  CONSTRAINT `fk_mining_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mining_scene` FOREIGN KEY (`scene_id`) REFERENCES `scenes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 商店物品表
CREATE TABLE IF NOT EXISTS `shop_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `category` varchar(50) NOT NULL,
  `price` int NOT NULL,
  `required_level` int DEFAULT 1,
  `effect_type` varchar(50) DEFAULT NULL,
  `effect_value` int DEFAULT 0,
  `durability` int DEFAULT 100,
  `rarity` varchar(20) DEFAULT 'common',
  `is_available` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_price` (`price`),
  KEY `idx_required_level` (`required_level`),
  KEY `idx_is_available` (`is_available`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 玩家工具表
CREATE TABLE IF NOT EXISTS `tools` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `shop_item_id` int NOT NULL,
  `current_durability` int NOT NULL,
  `is_equipped` tinyint(1) DEFAULT 0,
  `purchased_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_shop_item_id` (`shop_item_id`),
  KEY `idx_is_equipped` (`is_equipped`),
  CONSTRAINT `fk_tool_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tool_shop_item` FOREIGN KEY (`shop_item_id`) REFERENCES `shop_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 自动挖矿会话表
CREATE TABLE IF NOT EXISTS `auto_mining_sessions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `scene_id` int NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `total_coins_earned` bigint DEFAULT 0,
  `total_experience_gained` bigint DEFAULT 0,
  `mining_count` int DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_scene_id` (`scene_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_start_time` (`start_time`),
  CONSTRAINT `fk_auto_mining_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_auto_mining_scene` FOREIGN KEY (`scene_id`) REFERENCES `scenes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认场景数据
INSERT INTO `scenes` (`id`, `name`, `description`, `required_level`, `energy_cost`, `base_reward`, `bonus_multiplier`, `unlock_cost`) VALUES
(1, '新手矿洞', '适合新手的简单矿洞，矿物丰富但价值较低', 1, 1, 10, 1.00, 0),
(2, '铜矿洞', '蕴含丰富铜矿的洞穴，需要一定的挖矿经验', 5, 2, 25, 1.20, 500),
(3, '铁矿洞', '危险的铁矿洞，但回报丰厚', 10, 3, 50, 1.50, 2000),
(4, '银矿洞', '稀有的银矿洞，需要高级装备', 20, 5, 100, 2.00, 10000),
(5, '金矿洞', '传说中的金矿洞，只有顶级矿工才能进入', 35, 8, 200, 3.00, 50000),
(6, '钻石矿洞', '极其稀有的钻石矿洞，蕴含无尽财富', 50, 12, 500, 5.00, 200000);

-- 插入默认商店物品数据
INSERT INTO `shop_items` (`id`, `name`, `description`, `category`, `price`, `required_level`, `effect_type`, `effect_value`, `durability`, `rarity`) VALUES
-- 挖矿工具
(1, '木制镐子', '最基础的挖矿工具，适合新手使用', 'tool', 50, 1, 'mining_power', 1, 50, 'common'),
(2, '石制镐子', '比木制镐子更耐用的工具', 'tool', 150, 3, 'mining_power', 2, 80, 'common'),
(3, '铁制镐子', '坚固的铁制镐子，挖矿效率显著提升', 'tool', 500, 8, 'mining_power', 4, 120, 'uncommon'),
(4, '钢制镐子', '高级的钢制镐子，专业矿工的选择', 'tool', 1500, 15, 'mining_power', 8, 200, 'rare'),
(5, '钻石镐子', '顶级的钻石镐子，挖矿神器', 'tool', 10000, 30, 'mining_power', 20, 500, 'epic'),
(6, '传奇镐子', '传说中的神器，拥有无与伦比的挖矿能力', 'tool', 50000, 50, 'mining_power', 50, 1000, 'legendary'),

-- 幸运物品
(7, '幸运符', '增加挖矿时的幸运值', 'luck', 200, 5, 'luck', 2, 100, 'common'),
(8, '四叶草', '稀有的幸运物品，大幅提升幸运值', 'luck', 1000, 12, 'luck', 5, 150, 'uncommon'),
(9, '幸运硬币', '古老的幸运硬币，传说能带来好运', 'luck', 5000, 25, 'luck', 12, 300, 'rare'),
(10, '幸运之星', '神秘的幸运之星，极大提升幸运值', 'luck', 25000, 40, 'luck', 25, 500, 'epic'),

-- 效率物品
(11, '能量饮料', '恢复少量精力', 'consumable', 20, 1, 'energy', 10, 1, 'common'),
(12, '高级能量饮料', '恢复大量精力', 'consumable', 100, 10, 'energy', 30, 1, 'uncommon'),
(13, '精力药水', '完全恢复精力', 'consumable', 500, 20, 'energy', 100, 1, 'rare'),

-- 装备升级
(14, '工具强化石', '提升工具耐久度', 'upgrade', 300, 8, 'durability', 50, 1, 'common'),
(15, '高级强化石', '大幅提升工具耐久度', 'upgrade', 1000, 18, 'durability', 150, 1, 'uncommon'),
(16, '完美强化石', '完全修复工具耐久度', 'upgrade', 3000, 30, 'durability', 500, 1, 'rare');

-- 重置外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- 创建索引以优化查询性能
CREATE INDEX idx_mining_records_user_time ON mining_records(user_id, mining_time DESC);
CREATE INDEX idx_player_data_level_exp ON player_data(level DESC, experience DESC);
CREATE INDEX idx_tools_user_equipped ON tools(user_id, is_equipped);

-- 插入完成提示
SELECT '数据库初始化完成！' as message;