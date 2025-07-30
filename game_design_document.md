# Miner - 像素风挖矿游戏设计文档

## 游戏概述

### 核心理念
- **游戏类型**: 休闲挖矿模拟游戏
- **美术风格**: 像素风格
- **目标用户**: 喜欢休闲游戏的玩家，适合碎片时间游玩
- **核心体验**: 简单的点击挖矿，收集资源，升级装备

### 游戏特色
- 多样化的挖矿场景
- 丰富的矿物资源系统
- 简单易懂的升级机制
- 放置类游戏元素

## UI设计方案

### 主界面布局
```
┌─────────────────────────────────────────┐
│  金币: 1,250  │  经验: 125/200  │ Lv.5 │
├─────────────────────────────────────────┤
│                                         │
│           [挖矿场景区域]                │
│        ████████████████████             │
│        ██ ⛏️ ██ 💎 ██ 🪨 ██             │
│        ████████████████████             │
│                                         │
├─────────────────────────────────────────┤
│ [背包] [商店] [升级] [设置] [场景切换]   │
└─────────────────────────────────────────┘
```

### 界面组件详细设计

#### 1. 顶部状态栏
- **金币显示**: 当前拥有的金币数量
- **经验条**: 当前等级进度
- **等级显示**: 玩家当前等级

#### 2. 挖矿场景区域
- **场景背景**: 根据不同场景显示不同的像素背景
- **可挖掘区块**: 3x3或4x4的网格，每个格子可能包含不同矿物
- **挖矿动画**: 点击时显示挖掘效果
- **资源掉落**: 挖到资源时显示掉落动画

#### 3. 底部功能栏
- **背包按钮**: 查看已收集的资源
- **商店按钮**: 购买装备和道具
- **升级按钮**: 升级挖矿工具
- **设置按钮**: 游戏设置
- **场景切换**: 解锁新的挖矿场景

### 弹窗界面设计

#### 背包界面
```
┌─────────────────────────────┐
│         背包 (24/50)        │
├─────────────────────────────┤
│ [🪨] x15  [⚡] x8   [💎] x3  │
│ [🥉] x5   [🥈] x2   [🥇] x1  │
│ [⛽] x12  [🔧] x4   [📦] x6  │
├─────────────────────────────┤
│           [关闭]            │
└─────────────────────────────┘
```

#### 商店界面
```
┌─────────────────────────────┐
│            商店             │
├─────────────────────────────┤
│ 铁镐    [⛏️]    100金币     │
│ 钢镐    [⛏️]    500金币     │
│ 钻石镐  [⛏️]   2000金币     │
│ 炸药    [💣]     50金币     │
├─────────────────────────────┤
│           [关闭]            │
└─────────────────────────────┘
```

## 玩法策略设计

### 核心玩法循环
1. **挖矿** → 2. **收集资源** → 3. **出售/使用资源** → 4. **升级装备** → 5. **解锁新场景** → 6. **开启挂机挖矿** → 回到1

### 挂机挖矿系统

#### 精力系统详细设计
- **基础精力值**: 100点（1级玩家）
- **精力上限**: 随等级提升，每级+10点精力上限
- **精力消耗**: 每次挖矿消耗1点精力（高级工具可减少消耗）
- **精力恢复**: 每小时自动恢复20点精力，离线时也会恢复
- **精力药水**: 可通过商店购买快速恢复精力的道具

#### 自动挖矿机制
- **解锁条件**: 5级后可购买"自动挖矿许可证"(500金币)
- **操作方式**: 每日登录后点击一次"开始挖矿"按钮
- **挖矿间隔**: 每3秒自动挖矿一次
- **离线挖矿**: 退出游戏后继续挖矿，直到精力耗尽
- **最大时长**: 离线挖矿最多持续24小时

#### 离线收益结算
- **登录提醒**: 显示离线挖矿时长和总收益
- **收益统计**: 包括获得的资源、经验、金币数量
- **精力状态**: 显示当前精力值和恢复时间
- **继续挖矿**: 可选择立即继续或稍后开始

### 挖矿机制
- **点击挖矿**: 玩家点击可挖掘区块进行挖矿
- **离线挂机**: 玩家可开启自动挖矿，退出游戏后继续挖矿
- **精力系统**: 每次挖矿消耗1点精力，精力耗尽后停止挖矿
- **挖矿时间**: 每次挖矿需要1-3秒（根据工具等级）
- **资源掉落**: 每次挖矿有概率获得不同稀有度的资源
- **区块刷新**: 挖完的区块会在30秒后刷新
- **精力恢复**: 每小时自动恢复20点精力，最大精力值根据等级提升

### 资源系统

#### 资源稀有度等级
1. **普通** (70%概率): 石头、煤炭
2. **稀有** (20%概率): 铁矿、铜矿
3. **史诗** (8%概率): 银矿、金矿
4. **传说** (2%概率): 钻石、翡翠

#### 不同场景的资源分布

**新手矿洞** (等级1-10)
- 主要产出: 石头、煤炭、少量铁矿
- 解锁条件: 默认解锁

**深层矿井** (等级11-25)
- 主要产出: 铁矿、铜矿、少量银矿
- 解锁条件: 达到等级10

**古老遗迹** (等级26-50)
- 主要产出: 银矿、金矿、少量钻石
- 解锁条件: 达到等级25

**龙之巢穴** (等级51+)
- 主要产出: 钻石、翡翠、神秘宝石
- 解锁条件: 达到等级50

### 升级系统

#### 工具升级
- **木镐** → **石镐** → **铁镐** → **钢镐** → **钻石镐** → **神器镐**
- 每级工具提升:
  - 挖矿速度 +20%
  - 稀有资源概率 +5%
  - 一次挖矿获得资源数量 +1
  - 精力消耗减少 -5%

#### 玩家等级
- 通过挖矿获得经验值
- 每次成功挖矿获得10-50经验（根据资源稀有度）
- 升级奖励: 金币、新场景解锁、工具解锁、最大精力值+10

#### 精力系统
- **基础精力**: 100点（1级）
- **精力上限**: 每升1级增加10点精力上限
- **精力消耗**: 每次挖矿消耗1点精力（高级工具可减少消耗）
- **精力恢复**: 每小时自动恢复20点，离线时也会恢复
- **精力药水**: 可通过商店购买立即恢复精力的道具

### 经济系统

#### 资源价值
- 石头: 1金币
- 煤炭: 3金币
- 铁矿: 10金币
- 铜矿: 15金币
- 银矿: 50金币
- 金矿: 100金币
- 钻石: 500金币
- 翡翠: 1000金币

#### 消费项目
- 工具升级: 100-10000金币
- 背包扩容: 200-2000金币
- 炸药道具: 50金币（一次性清空3x3区域）
- 幸运药水: 100金币（30分钟内稀有资源概率翻倍）
- 精力药水: 30金币（立即恢复50点精力）
- 大精力药水: 80金币（立即恢复150点精力）
- 自动挖矿许可证: 500金币（解锁离线挂机功能，永久有效）

## 数据库结构设计

### 用户表 (users)
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

### 玩家数据表 (player_data)
```sql
CREATE TABLE player_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    level INT DEFAULT 1,
    experience INT DEFAULT 0,
    gold INT DEFAULT 100,
    current_scene_id INT DEFAULT 1,
    current_tool_id INT DEFAULT 1,
    backpack_capacity INT DEFAULT 20,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 场景表 (scenes)
```sql
CREATE TABLE scenes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    unlock_level INT NOT NULL,
    background_image VARCHAR(255),
    grid_size_x INT DEFAULT 4,
    grid_size_y INT DEFAULT 4,
    refresh_time INT DEFAULT 30
);
```

### 资源类型表 (resource_types)
```sql
CREATE TABLE resource_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    rarity ENUM('common', 'rare', 'epic', 'legendary') NOT NULL,
    base_value INT NOT NULL,
    icon VARCHAR(255),
    description TEXT
);
```

### 场景资源配置表 (scene_resources)
```sql
CREATE TABLE scene_resources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    scene_id INT NOT NULL,
    resource_type_id INT NOT NULL,
    drop_rate DECIMAL(5,4) NOT NULL,
    min_quantity INT DEFAULT 1,
    max_quantity INT DEFAULT 1,
    FOREIGN KEY (scene_id) REFERENCES scenes(id),
    FOREIGN KEY (resource_type_id) REFERENCES resource_types(id)
);
```

### 玩家背包表 (player_inventory)
```sql
CREATE TABLE player_inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    resource_type_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (resource_type_id) REFERENCES resource_types(id),
    UNIQUE KEY unique_user_resource (user_id, resource_type_id)
);
```

### 工具表 (tools)
```sql
CREATE TABLE tools (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    level INT NOT NULL,
    price INT NOT NULL,
    mining_speed_bonus DECIMAL(3,2) DEFAULT 0.00,
    rare_chance_bonus DECIMAL(3,2) DEFAULT 0.00,
    quantity_bonus INT DEFAULT 0,
    unlock_level INT NOT NULL,
    icon VARCHAR(255)
);
```

### 玩家工具表 (player_tools)
```sql
CREATE TABLE player_tools (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    tool_id INT NOT NULL,
    is_equipped BOOLEAN DEFAULT FALSE,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (tool_id) REFERENCES tools(id)
);
```

### 挖矿记录表 (mining_logs)
```sql
CREATE TABLE mining_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    scene_id INT NOT NULL,
    resource_type_id INT,
    quantity INT DEFAULT 0,
    experience_gained INT DEFAULT 0,
    mining_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (scene_id) REFERENCES scenes(id),
    FOREIGN KEY (resource_type_id) REFERENCES resource_types(id)
);
```

### 商店物品表 (shop_items)
```sql
CREATE TABLE shop_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    type ENUM('tool', 'consumable', 'upgrade') NOT NULL,
    price INT NOT NULL,
    description TEXT,
    icon VARCHAR(255),
    is_available BOOLEAN DEFAULT TRUE
);
```

## 初始数据配置

### 场景初始数据
```sql
INSERT INTO scenes (name, description, unlock_level, grid_size_x, grid_size_y) VALUES
('新手矿洞', '适合新手的浅层矿洞', 1, 3, 3),
('深层矿井', '更深的矿井，蕴含更多宝藏', 10, 4, 4),
('古老遗迹', '神秘的古代遗迹', 25, 4, 4),
('龙之巢穴', '传说中的龙族宝库', 50, 5, 5);
```

### 资源类型初始数据
```sql
INSERT INTO resource_types (name, rarity, base_value, icon) VALUES
('石头', 'common', 1, '🪨'),
('煤炭', 'common', 3, '⚫'),
('铁矿', 'rare', 10, '🔩'),
('铜矿', 'rare', 15, '🟤'),
('银矿', 'epic', 50, '⚪'),
('金矿', 'epic', 100, '🟡'),
('钻石', 'legendary', 500, '💎'),
('翡翠', 'legendary', 1000, '💚');
```

### 工具初始数据
```sql
INSERT INTO tools (name, level, price, mining_speed_bonus, rare_chance_bonus, quantity_bonus, unlock_level, icon) VALUES
('木镐', 1, 0, 0.00, 0.00, 0, 1, '⛏️'),
('石镐', 2, 100, 0.20, 0.05, 0, 5, '⛏️'),
('铁镐', 3, 500, 0.40, 0.10, 1, 10, '⛏️'),
('钢镐', 4, 2000, 0.60, 0.15, 1, 20, '⛏️'),
('钻石镐', 5, 8000, 0.80, 0.20, 2, 35, '⛏️'),
('神器镐', 6, 20000, 1.00, 0.25, 3, 50, '⛏️');
```

## 技术实现建议

### 前端技术栈
- **框架**: HTML5 Canvas 或 Phaser.js
- **样式**: CSS3 + 像素风格素材
- **状态管理**: LocalStorage + 服务器同步

### 后端技术栈
- **语言**: Node.js 或 Python
- **框架**: Express.js 或 FastAPI
- **数据库**: MySQL 或 PostgreSQL
- **缓存**: Redis (可选)

### 部署建议
- **前端**: 静态文件托管 (Netlify, Vercel)
- **后端**: 云服务器 (AWS, 阿里云)
- **数据库**: 云数据库服务

## 后续扩展计划

### 第一阶段 (MVP)
- 基础挖矿功能
- 2-3个场景
- 基础升级系统

### 第二阶段
- 成就系统
- 好友系统
- 排行榜

### 第三阶段
- 公会系统
- 特殊事件
- 更多场景和资源

---

*本设计文档为Miner像素风挖矿游戏的完整设计方案，包含了UI设计、玩法机制、数据库结构等核心内容。*