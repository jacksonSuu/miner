# 挂机挖矿系统详细设计

## 系统概述

挂机挖矿系统是"Miner"游戏的核心特色功能，允许玩家在离线状态下继续获得挖矿收益，真正实现"放置类"游戏体验。用户每天只需登录一次，点击开始挖矿即可享受持续的游戏收益。

## 功能特点

### 🎯 设计目标
- **碎片时间利用**: 每日只需1-2分钟操作时间
- **持续收益**: 24小时离线挖矿收益
- **策略深度**: 工具和场景选择影响收益效率
- **平衡性**: 通过精力系统避免无限制挂机

### ⚡ 核心机制
- **一键开启**: 登录后点击一次即可开始挂机
- **自动执行**: 每3秒自动挖矿一次
- **离线继续**: 退出游戏后继续挖矿
- **精力限制**: 精力耗尽后自动停止

## 精力系统设计

### 精力值计算
```
基础精力 = 100点
等级加成 = 玩家等级 × 10点
最大精力 = 基础精力 + 等级加成
```

### 精力消耗
| 工具等级 | 基础消耗 | 效率加成 | 实际消耗 |
|----------|----------|----------|----------|
| 木镐(1级) | 1点 | 0% | 1点 |
| 石镐(2级) | 1点 | -5% | 0.95点 |
| 铁镐(3级) | 1点 | -10% | 0.9点 |
| 钢镐(4级) | 1点 | -15% | 0.85点 |
| 钻石镐(5级) | 1点 | -20% | 0.8点 |
| 神器镐(6级) | 1点 | -25% | 0.75点 |
| 秘银镐(7级) | 1点 | -30% | 0.7点 |

### 精力恢复
- **自动恢复**: 每小时恢复20点精力
- **离线恢复**: 离线时间也会恢复精力
- **药水恢复**: 
  - 精力药水: +50点精力 (30金币)
  - 大精力药水: +150点精力 (80金币)

## 挂机挖矿流程

### 开启条件
1. **等级要求**: 达到5级
2. **许可证**: 购买"自动挖矿许可证"(500金币)
3. **精力要求**: 当前精力 > 0

### 操作流程
```
1. 玩家登录游戏
2. 检查精力状态
3. 选择挖矿场景和工具
4. 点击"开始挂机挖矿"按钮
5. 系统开始自动挖矿循环
6. 玩家可以退出游戏
7. 离线挖矿继续进行
8. 精力耗尽后自动停止
```

### 自动挖矿逻辑
```typescript
// 自动挖矿循环
setInterval(() => {
  if (player.currentEnergy <= 0) {
    stopAutoMining();
    return;
  }
  
  // 随机选择挖矿位置
  const position = getRandomMiningPosition();
  
  // 执行挖矿
  const reward = performMining(position);
  
  // 消耗精力
  consumeEnergy();
  
  // 记录收益
  recordOfflineReward(reward);
  
}, 3000); // 每3秒执行一次
```

## 离线收益计算

### 计算公式
```
离线时长 = min(实际离线时长, 24小时)
可挖矿次数 = min(离线时长/3秒, 当前精力值)
总收益 = 可挖矿次数 × 单次挖矿期望收益
```

### 收益统计
- **挖矿次数**: 实际执行的挖矿次数
- **获得资源**: 各类资源的数量统计
- **获得经验**: 总经验值
- **获得金币**: 资源自动出售的金币
- **消耗精力**: 总精力消耗量

## 数据库设计

### 离线挖矿会话表
```sql
CREATE TABLE offline_mining_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NULL,
    start_energy INT NOT NULL,
    end_energy INT NOT NULL,
    total_mining_count INT DEFAULT 0,
    total_resources_gained JSON,
    total_experience_gained INT DEFAULT 0,
    total_gold_earned INT DEFAULT 0,
    scene_id INT NOT NULL,
    tool_id INT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 玩家数据扩展
```sql
-- 在player_data表中添加字段
ALTER TABLE player_data ADD COLUMN (
    current_energy INT DEFAULT 100,
    max_energy INT DEFAULT 100,
    last_energy_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    auto_mining_enabled BOOLEAN DEFAULT FALSE,
    auto_mining_start_time TIMESTAMP NULL,
    offline_mining_unlocked BOOLEAN DEFAULT FALSE
);
```

## API接口设计

### 挂机挖矿相关接口

#### 开始挂机挖矿
```http
POST /api/mining/start-auto
Content-Type: application/json

{
  "scene_id": 1,
  "tool_id": 3
}

Response:
{
  "success": true,
  "message": "挂机挖矿已开始",
  "session_id": 12345,
  "estimated_duration": 7200 // 预计可挖矿秒数
}
```

#### 停止挂机挖矿
```http
POST /api/mining/stop-auto

Response:
{
  "success": true,
  "message": "挂机挖矿已停止",
  "session_summary": {
    "duration": 3600,
    "mining_count": 1200,
    "energy_consumed": 1200,
    "rewards": {...}
  }
}
```

#### 获取离线收益
```http
GET /api/mining/offline-rewards

Response:
{
  "has_offline_rewards": true,
  "offline_duration": 28800, // 8小时
  "rewards": {
    "mining_count": 9600,
    "resources": {
      "iron_ore": 150,
      "coal": 200,
      "gold_ore": 50
    },
    "experience": 2400,
    "gold": 1800,
    "energy_consumed": 9600
  }
}
```

#### 领取离线收益
```http
POST /api/mining/claim-offline-rewards

Response:
{
  "success": true,
  "message": "离线收益已领取",
  "updated_player_data": {
    "level": 15,
    "experience": 12400,
    "gold": 5800,
    "current_energy": 0
  }
}
```

## 前端UI设计

### 挂机状态显示
- **精力条**: 显示当前精力/最大精力
- **挂机状态**: 显示是否正在挂机挖矿
- **预计时长**: 显示当前精力可挖矿的时长
- **收益预览**: 显示预计收益

### 离线收益弹窗
```
┌─────────────────────────────┐
│     🎉 离线挖矿收益 🎉      │
├─────────────────────────────┤
│ 离线时长: 8小时32分钟        │
│ 挖矿次数: 9,600次           │
│                             │
│ 📦 获得资源:                │
│   🪨 铁矿石 x150           │
│   ⚫ 煤炭 x200             │
│   🟡 金矿石 x50            │
│                             │
│ ⭐ 获得经验: +2,400         │
│ 💰 获得金币: +1,800         │
│                             │
│ ⚡ 消耗精力: 9,600/10,000   │
│                             │
│      [领取奖励] [继续挂机]    │
└─────────────────────────────┘
```

## 平衡性设计

### 收益平衡
- **离线收益 = 在线收益 × 0.8**: 鼓励在线游戏
- **最大离线时长**: 24小时，避免长期不登录
- **精力限制**: 防止无限制挂机

### 策略深度
- **工具选择**: 高级工具精力效率更高
- **场景选择**: 不同场景资源价值不同
- **时机选择**: 精力满时开始挂机效率最高

## 商业化设计

### 付费点设计
- **精力药水**: 快速恢复精力继续挂机
- **VIP会员**: 挂机效率+30%，精力上限+50%
- **高级许可证**: 延长离线挖矿时长至48小时
- **自动出售**: 离线挖矿资源自动出售换金币

### 广告变现
- **观看广告**: 获得2小时双倍挂机收益
- **精力恢复**: 观看广告恢复50点精力
- **收益加成**: 观看广告获得离线收益+50%

## 技术实现要点

### 服务端定时任务
```typescript
// 每分钟检查所有活跃的挂机会话
cron.schedule('* * * * *', async () => {
  const activeSessions = await getActiveMiningSessions();
  
  for (const session of activeSessions) {
    await processAutoMining(session);
  }
});
```

### 精力恢复定时器
```typescript
// 每小时恢复所有玩家精力
cron.schedule('0 * * * *', async () => {
  await recoverAllPlayersEnergy();
});
```

### 数据同步策略
- **实时同步**: 开始/停止挂机时立即同步
- **定期同步**: 每5分钟同步一次挂机进度
- **登录同步**: 玩家登录时计算离线收益

## 测试用例

### 功能测试
1. **开启挂机**: 验证各种条件下的开启逻辑
2. **离线计算**: 验证离线收益计算的准确性
3. **精力系统**: 验证精力消耗和恢复机制
4. **数据持久化**: 验证挂机数据的保存和读取

### 性能测试
1. **并发挂机**: 1000个玩家同时挂机的性能
2. **数据库压力**: 大量挂机记录的查询性能
3. **内存使用**: 长时间运行的内存泄漏检测

### 边界测试
1. **极限时长**: 24小时满精力挂机测试
2. **网络异常**: 网络中断时的数据一致性
3. **时间跳跃**: 系统时间变更的处理

## 运营策略

### 新手引导
1. **5级解锁提示**: 引导购买挂机许可证
2. **首次挂机**: 赠送精力药水体验挂机
3. **收益展示**: 突出显示挂机收益的价值

### 留存策略
1. **每日登录**: 精力满值提醒推送
2. **离线收益**: 丰厚的离线收益吸引回归
3. **挂机排行**: 挂机时长和收益排行榜

### 活动设计
1. **双倍挂机日**: 特定日期挂机收益翻倍
2. **精力狂欢**: 精力恢复速度临时提升
3. **挂机大师**: 连续挂机天数奖励

## 总结

挂机挖矿系统是"Miner"游戏的核心竞争力，通过精心设计的精力系统和离线机制，既满足了休闲玩家的需求，又保持了游戏的平衡性和商业价值。该系统将显著提升用户留存率和付费转化率，是游戏成功的关键功能。