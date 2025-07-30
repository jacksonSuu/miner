-- Miner游戏数据库初始化脚本
-- 创建数据库
CREATE DATABASE IF NOT EXISTS miner_game CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE miner_game;

-- 用户表
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- 玩家数据表
CREATE TABLE player_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    level INT DEFAULT 1,
    experience INT DEFAULT 0,
    gold INT DEFAULT 100,
    current_scene_id INT DEFAULT 1,
    current_tool_id INT DEFAULT 1,
    backpack_capacity INT DEFAULT 20,
    total_mining_count INT DEFAULT 0,
    total_play_time INT DEFAULT 0, -- 总游戏时间(秒)
    current_energy INT DEFAULT 100, -- 当前精力值
    max_energy INT DEFAULT 100, -- 最大精力值
    last_energy_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 上次精力更新时间
    auto_mining_enabled BOOLEAN DEFAULT FALSE, -- 是否开启自动挖矿
    auto_mining_start_time TIMESTAMP NULL, -- 自动挖矿开始时间
    offline_mining_unlocked BOOLEAN DEFAULT FALSE, -- 是否解锁离线挖矿
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_level (level),
    INDEX idx_user_id (user_id),
    INDEX idx_auto_mining (auto_mining_enabled, auto_mining_start_time)
);

-- 场景表
CREATE TABLE scenes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    unlock_level INT NOT NULL,
    background_image VARCHAR(255),
    grid_size_x INT DEFAULT 4,
    grid_size_y INT DEFAULT 4,
    refresh_time INT DEFAULT 30, -- 刷新时间(秒)
    difficulty_multiplier DECIMAL(3,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE
);

-- 资源类型表
CREATE TABLE resource_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    rarity ENUM('common', 'rare', 'epic', 'legendary') NOT NULL,
    base_value INT NOT NULL,
    icon VARCHAR(255),
    description TEXT,
    color_code VARCHAR(7), -- 十六进制颜色代码
    is_active BOOLEAN DEFAULT TRUE
);

-- 场景资源配置表
CREATE TABLE scene_resources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    scene_id INT NOT NULL,
    resource_type_id INT NOT NULL,
    drop_rate DECIMAL(5,4) NOT NULL, -- 掉落概率 0.0000-1.0000
    min_quantity INT DEFAULT 1,
    max_quantity INT DEFAULT 1,
    experience_reward INT DEFAULT 10,
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
    FOREIGN KEY (resource_type_id) REFERENCES resource_types(id) ON DELETE CASCADE,
    UNIQUE KEY unique_scene_resource (scene_id, resource_type_id)
);

-- 玩家背包表
CREATE TABLE player_inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    resource_type_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resource_type_id) REFERENCES resource_types(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_resource (user_id, resource_type_id),
    INDEX idx_user_id (user_id)
);

-- 工具表
CREATE TABLE tools (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    level INT NOT NULL,
    price INT NOT NULL,
    mining_speed_bonus DECIMAL(3,2) DEFAULT 0.00, -- 挖矿速度加成
    rare_chance_bonus DECIMAL(3,2) DEFAULT 0.00, -- 稀有物品概率加成
    quantity_bonus INT DEFAULT 0, -- 数量加成
    unlock_level INT NOT NULL,
    icon VARCHAR(255),
    description TEXT,
    durability INT DEFAULT 100, -- 耐久度
    is_active BOOLEAN DEFAULT TRUE
);

-- 玩家工具表
CREATE TABLE player_tools (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    tool_id INT NOT NULL,
    is_equipped BOOLEAN DEFAULT FALSE,
    current_durability INT DEFAULT 100,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_equipped (user_id, is_equipped)
);

-- 挖矿记录表
CREATE TABLE mining_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    scene_id INT NOT NULL,
    resource_type_id INT,
    quantity INT DEFAULT 0,
    experience_gained INT DEFAULT 0,
    gold_earned INT DEFAULT 0,
    tool_used_id INT,
    mining_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    grid_position_x INT,
    grid_position_y INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
    FOREIGN KEY (resource_type_id) REFERENCES resource_types(id) ON DELETE SET NULL,
    FOREIGN KEY (tool_used_id) REFERENCES tools(id) ON DELETE SET NULL,
    INDEX idx_user_time (user_id, mining_time),
    INDEX idx_scene_time (scene_id, mining_time)
);

-- 商店物品表
CREATE TABLE shop_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    type ENUM('tool', 'consumable', 'upgrade', 'backpack') NOT NULL,
    price INT NOT NULL,
    description TEXT,
    icon VARCHAR(255),
    effect_value INT DEFAULT 0, -- 效果数值
    effect_duration INT DEFAULT 0, -- 效果持续时间(秒)
    unlock_level INT DEFAULT 1,
    is_available BOOLEAN DEFAULT TRUE,
    stock_limit INT DEFAULT -1 -- -1表示无限制
);

-- 玩家购买记录表
CREATE TABLE player_purchases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    shop_item_id INT NOT NULL,
    quantity INT DEFAULT 1,
    total_cost INT NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shop_item_id) REFERENCES shop_items(id) ON DELETE CASCADE,
    INDEX idx_user_purchase (user_id, purchased_at)
);

-- 玩家成就表
CREATE TABLE achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type ENUM('mining', 'collection', 'upgrade', 'exploration', 'special') NOT NULL,
    requirement_value INT NOT NULL,
    reward_gold INT DEFAULT 0,
    reward_experience INT DEFAULT 0,
    icon VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE
);

-- 玩家成就进度表
CREATE TABLE player_achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    current_progress INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_achievement (user_id, achievement_id),
    INDEX idx_user_completed (user_id, is_completed)
);

-- 游戏配置表
CREATE TABLE game_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(50) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 插入初始场景数据
INSERT INTO scenes (name, description, unlock_level, grid_size_x, grid_size_y, refresh_time, difficulty_multiplier) VALUES
('新手矿洞', '适合新手的浅层矿洞，蕴含基础矿物资源', 1, 3, 3, 30, 1.00),
('深层矿井', '更深的矿井，蕴含更多珍贵宝藏', 10, 4, 4, 45, 1.20),
('古老遗迹', '神秘的古代遗迹，传说中的宝藏之地', 25, 4, 4, 60, 1.50),
('龙之巢穴', '传说中的龙族宝库，最珍贵的资源聚集地', 50, 5, 5, 90, 2.00),
('水晶洞穴', '闪闪发光的水晶洞穴，魔法矿物的源泉', 75, 4, 5, 120, 2.50);

-- 插入资源类型数据
INSERT INTO resource_types (name, rarity, base_value, icon, description, color_code) VALUES
('石头', 'common', 1, '🪨', '最常见的矿物，建筑的基础材料', '#808080'),
('煤炭', 'common', 3, '⚫', '黑色的燃料，工业的重要资源', '#2F2F2F'),
('铁矿', 'rare', 10, '🔩', '坚硬的金属矿物，制造工具的材料', '#B87333'),
('铜矿', 'rare', 15, '🟤', '红棕色的金属，导电性能优良', '#CD7F32'),
('银矿', 'epic', 50, '⚪', '珍贵的白色金属，价值不菲', '#C0C0C0'),
('金矿', 'epic', 100, '🟡', '闪闪发光的黄金，财富的象征', '#FFD700'),
('钻石', 'legendary', 500, '💎', '最坚硬的宝石，极其珍贵', '#B9F2FF'),
('翡翠', 'legendary', 1000, '💚', '神秘的绿色宝石，传说中的珍宝', '#50C878'),
('红宝石', 'legendary', 800, '❤️', '火红色的珍贵宝石', '#E0115F'),
('蓝宝石', 'legendary', 750, '💙', '深蓝色的稀有宝石', '#0F52BA'),
('水晶', 'epic', 200, '🔮', '透明的魔法水晶，蕴含神秘力量', '#E6E6FA'),
('秘银', 'legendary', 1500, '✨', '传说中的魔法金属', '#E5E4E2');

-- 插入场景资源配置
-- 新手矿洞
INSERT INTO scene_resources (scene_id, resource_type_id, drop_rate, min_quantity, max_quantity, experience_reward) VALUES
(1, 1, 0.5000, 1, 3, 5),   -- 石头 50%
(1, 2, 0.3000, 1, 2, 8),   -- 煤炭 30%
(1, 3, 0.1500, 1, 1, 15),  -- 铁矿 15%
(1, 4, 0.0400, 1, 1, 20),  -- 铜矿 4%
(1, 5, 0.0100, 1, 1, 50);  -- 银矿 1%

-- 深层矿井
INSERT INTO scene_resources (scene_id, resource_type_id, drop_rate, min_quantity, max_quantity, experience_reward) VALUES
(2, 1, 0.3000, 1, 2, 5),   -- 石头 30%
(2, 2, 0.2500, 1, 3, 8),   -- 煤炭 25%
(2, 3, 0.2000, 1, 2, 15),  -- 铁矿 20%
(2, 4, 0.1500, 1, 2, 20),  -- 铜矿 15%
(2, 5, 0.0700, 1, 1, 50),  -- 银矿 7%
(2, 6, 0.0250, 1, 1, 100), -- 金矿 2.5%
(2, 11, 0.0050, 1, 1, 80); -- 水晶 0.5%

-- 古老遗迹
INSERT INTO scene_resources (scene_id, resource_type_id, drop_rate, min_quantity, max_quantity, experience_reward) VALUES
(3, 3, 0.2000, 1, 2, 15),  -- 铁矿 20%
(3, 4, 0.1800, 1, 2, 20),  -- 铜矿 18%
(3, 5, 0.1500, 1, 2, 50),  -- 银矿 15%
(3, 6, 0.1200, 1, 1, 100), -- 金矿 12%
(3, 7, 0.0300, 1, 1, 200), -- 钻石 3%
(3, 8, 0.0150, 1, 1, 300), -- 翡翠 1.5%
(3, 11, 0.0200, 1, 1, 80), -- 水晶 2%
(3, 9, 0.0100, 1, 1, 250); -- 红宝石 1%

-- 龙之巢穴
INSERT INTO scene_resources (scene_id, resource_type_id, drop_rate, min_quantity, max_quantity, experience_reward) VALUES
(4, 5, 0.2000, 1, 3, 50),  -- 银矿 20%
(4, 6, 0.1800, 1, 2, 100), -- 金矿 18%
(4, 7, 0.1500, 1, 1, 200), -- 钻石 15%
(4, 8, 0.1200, 1, 1, 300), -- 翡翠 12%
(4, 9, 0.0800, 1, 1, 250), -- 红宝石 8%
(4, 10, 0.0700, 1, 1, 280), -- 蓝宝石 7%
(4, 11, 0.1000, 1, 2, 80), -- 水晶 10%
(4, 12, 0.0200, 1, 1, 500); -- 秘银 2%

-- 水晶洞穴
INSERT INTO scene_resources (scene_id, resource_type_id, drop_rate, min_quantity, max_quantity, experience_reward) VALUES
(5, 6, 0.1500, 1, 2, 100), -- 金矿 15%
(5, 7, 0.2000, 1, 1, 200), -- 钻石 20%
(5, 8, 0.1800, 1, 1, 300), -- 翡翠 18%
(5, 9, 0.1200, 1, 1, 250), -- 红宝石 12%
(5, 10, 0.1300, 1, 1, 280), -- 蓝宝石 13%
(5, 11, 0.3000, 1, 3, 80), -- 水晶 30%
(5, 12, 0.0500, 1, 1, 500); -- 秘银 5%

-- 插入工具数据
INSERT INTO tools (name, level, price, mining_speed_bonus, rare_chance_bonus, quantity_bonus, unlock_level, icon, description, durability) VALUES
('木镐', 1, 0, 0.00, 0.00, 0, 1, '⛏️', '最基础的挖矿工具，适合新手使用', 50),
('石镐', 2, 100, 0.20, 0.05, 0, 5, '⛏️', '用石头制作的镐子，比木镐更耐用，精力消耗-5%', 80),
('铁镐', 3, 500, 0.40, 0.10, 1, 10, '⛏️', '铁制镐子，挖矿效率显著提升，精力消耗-10%', 120),
('钢镐', 4, 2000, 0.60, 0.15, 1, 20, '⛏️', '钢制镐子，专业矿工的选择，精力消耗-15%', 200),
('钻石镐', 5, 8000, 0.80, 0.20, 2, 35, '⛏️', '钻石打造的顶级镐子，精力消耗-20%', 500),
('神器镐', 6, 20000, 1.00, 0.25, 3, 50, '⛏️', '传说中的神器，挖矿效率极高，精力消耗-25%', 1000),
('秘银镐', 7, 50000, 1.50, 0.30, 4, 75, '⛏️', '秘银打造的终极工具，精力消耗-30%', 2000);

-- 插入商店物品数据
INSERT INTO shop_items (name, type, price, description, icon, effect_value, effect_duration, unlock_level) VALUES
('炸药', 'consumable', 50, '一次性清空3x3区域的所有矿物', '💣', 9, 0, 1),
('幸运药水', 'consumable', 100, '30分钟内稀有资源掉落概率翻倍', '🧪', 100, 1800, 5),
('经验药水', 'consumable', 80, '30分钟内获得经验值翻倍', '🍶', 100, 1800, 3),
('背包扩容+10', 'backpack', 200, '永久增加10个背包槽位', '🎒', 10, 0, 1),
('背包扩容+20', 'backpack', 500, '永久增加20个背包槽位', '🎒', 20, 0, 10),
('背包扩容+50', 'backpack', 1500, '永久增加50个背包槽位', '🎒', 50, 0, 25),
('超级炸药', 'consumable', 200, '一次性清空5x5区域的所有矿物', '💥', 25, 0, 20),
('神速药水', 'consumable', 150, '30分钟内挖矿速度提升50%', '⚡', 50, 1800, 15),
('万能钥匙', 'consumable', 500, '立即刷新当前场景的所有矿物', '🗝️', 1, 0, 30),
('精力药水', 'consumable', 30, '立即恢复50点精力', '🧴', 50, 0, 1),
('大精力药水', 'consumable', 80, '立即恢复150点精力', '🍼', 150, 0, 10),
('自动挖矿许可证', 'upgrade', 500, '解锁离线挂机功能，永久有效', '📜', 1, 0, 5);

-- 插入成就数据
INSERT INTO achievements (name, description, type, requirement_value, reward_gold, reward_experience, icon) VALUES
('初出茅庐', '完成第一次挖矿', 'mining', 1, 50, 20, '🏆'),
('勤劳矿工', '累计挖矿100次', 'mining', 100, 200, 100, '⛏️'),
('挖矿大师', '累计挖矿1000次', 'mining', 1000, 1000, 500, '👑'),
('收藏家', '收集10种不同的矿物', 'collection', 10, 300, 150, '📦'),
('宝石猎人', '收集100颗钻石', 'collection', 100, 5000, 1000, '💎'),
('装备精良', '拥有钻石镐', 'upgrade', 1, 500, 200, '⛏️'),
('探险家', '解锁所有场景', 'exploration', 5, 2000, 800, '🗺️'),
('百万富翁', '拥有100万金币', 'collection', 1000000, 0, 2000, '💰'),
('传奇矿工', '达到100级', 'special', 100, 10000, 0, '⭐'),
('速度之王', '单日挖矿500次', 'mining', 500, 800, 300, '🏃');

-- 插入游戏配置数据
INSERT INTO game_config (config_key, config_value, description) VALUES
('base_mining_time', '2', '基础挖矿时间(秒)'),
('max_level', '100', '最大等级'),
('level_exp_multiplier', '1.2', '等级经验倍数'),
('daily_login_bonus', '50', '每日登录奖励金币'),
('max_backpack_capacity', '500', '背包最大容量'),
('tool_durability_loss', '1', '每次挖矿工具耐久度损失'),
('auto_save_interval', '30', '自动保存间隔(秒)'),
('rare_bonus_base', '0.05', '稀有物品基础概率加成'),
('scene_refresh_cost', '10', '手动刷新场景消耗金币'),
('max_daily_purchases', '50', '每日最大购买次数'),
('base_energy', '100', '基础精力值'),
('energy_per_level', '10', '每级增加的精力上限'),
('energy_recovery_rate', '20', '每小时精力恢复量'),
('energy_per_mining', '1', '每次挖矿消耗精力'),
('auto_mining_interval', '3', '自动挖矿间隔(秒)'),
('offline_mining_max_hours', '24', '离线挖矿最大小时数');

-- 离线挖矿记录表
CREATE TABLE offline_mining_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NULL,
    start_energy INT NOT NULL,
    end_energy INT NOT NULL,
    total_mining_count INT DEFAULT 0,
    total_resources_gained JSON, -- 存储获得的资源统计
    total_experience_gained INT DEFAULT 0,
    total_gold_earned INT DEFAULT 0,
    scene_id INT NOT NULL,
    tool_id INT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (scene_id) REFERENCES scenes(id),
    FOREIGN KEY (tool_id) REFERENCES tools(id),
    INDEX idx_user_time (user_id, start_time),
    INDEX idx_active_sessions (user_id, is_completed)
);

-- 创建视图：玩家统计信息
CREATE VIEW player_stats AS
SELECT 
    u.id as user_id,
    u.username,
    pd.level,
    pd.experience,
    pd.gold,
    pd.current_energy,
    pd.max_energy,
    pd.auto_mining_enabled,
    pd.offline_mining_unlocked,
    pd.total_mining_count,
    pd.total_play_time,
    COUNT(DISTINCT pi.resource_type_id) as unique_resources_collected,
    SUM(pi.quantity) as total_resources_count,
    (SELECT COUNT(*) FROM player_achievements pa WHERE pa.user_id = u.id AND pa.is_completed = TRUE) as achievements_completed,
    (SELECT COUNT(*) FROM offline_mining_sessions oms WHERE oms.user_id = u.id AND oms.is_completed = TRUE) as offline_sessions_completed
FROM users u
LEFT JOIN player_data pd ON u.id = pd.user_id
LEFT JOIN player_inventory pi ON u.id = pi.user_id
GROUP BY u.id, u.username, pd.level, pd.experience, pd.gold, pd.current_energy, pd.max_energy, pd.auto_mining_enabled, pd.offline_mining_unlocked, pd.total_mining_count, pd.total_play_time;

-- 创建索引优化查询性能
CREATE INDEX idx_mining_logs_user_date ON mining_logs(user_id, DATE(mining_time));
CREATE INDEX idx_player_inventory_quantity ON player_inventory(user_id, quantity DESC);
CREATE INDEX idx_scene_resources_rate ON scene_resources(scene_id, drop_rate DESC);

COMMIT;

-- 数据库初始化完成
SELECT 'Miner游戏数据库初始化完成！' as status;