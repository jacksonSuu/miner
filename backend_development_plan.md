# 后端开发实施方案

## 技术栈确认

根据最新需求，后端采用以下技术栈：

- **运行环境**: Node.js 18+
- **Web框架**: Express (成熟稳定，生态丰富)
- **数据库**: MySQL 8.0+ (主数据库) + Redis (缓存)
- **ORM**: Sequelize (成熟的MySQL ORM)
- **语言**: TypeScript (类型安全)
- **认证**: JWT + bcrypt
- **实时通信**: Socket.IO
- **API文档**: Swagger/OpenAPI
- **数据库连接池**: mysql2
- **中间件**: cors, helmet, morgan, express-rate-limit

## 项目目录结构

```
backend/
├── src/
│   ├── controllers/          # 控制器层
│   │   ├── auth.controller.ts
│   │   ├── player.controller.ts
│   │   ├── mining.controller.ts
│   │   ├── shop.controller.ts
│   │   └── auto-mining.controller.ts
│   ├── services/             # 业务逻辑层
│   │   ├── auth.service.ts
│   │   ├── player.service.ts
│   │   ├── mining.service.ts
│   │   ├── shop.service.ts
│   │   ├── auto-mining.service.ts
│   │   └── energy.service.ts
│   ├── models/               # Sequelize数据模型
│   │   ├── index.ts          # 模型入口文件
│   │   ├── User.model.ts
│   │   ├── PlayerData.model.ts
│   │   ├── MiningRecord.model.ts
│   │   ├── ShopItem.model.ts
│   │   ├── Tool.model.ts
│   │   ├── Scene.model.ts
│   │   └── OfflineMiningSession.model.ts
│   ├── middleware/           # 中间件
│   │   ├── auth.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── error.middleware.ts
│   ├── utils/                # 工具函数
│   │   ├── crypto.util.ts
│   │   ├── time.util.ts
│   │   ├── validation.util.ts
│   │   └── response.util.ts
│   ├── config/               # 配置文件
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── game.config.ts
│   │   └── socket.config.ts
│   ├── routes/               # 路由定义
│   │   ├── index.ts          # 路由入口
│   │   ├── auth.routes.ts
│   │   ├── player.routes.ts
│   │   ├── mining.routes.ts
│   │   ├── shop.routes.ts
│   │   └── auto-mining.routes.ts
│   ├── socket/               # Socket.IO处理
│   │   ├── socket.handler.ts
│   │   ├── events.ts
│   │   └── namespaces.ts
│   ├── jobs/                 # 定时任务
│   │   ├── scheduler.ts      # 任务调度器
│   │   ├── energy-recovery.job.ts
│   │   └── auto-mining.job.ts
│   ├── database/             # 数据库相关
│   │   ├── connection.ts     # 数据库连接
│   │   ├── migrations/       # 数据库迁移
│   │   └── seeders/          # 数据填充
│   └── app.ts                # 应用入口
├── tests/                    # 测试文件
├── docs/                     # API文档
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 开发阶段规划

### 第一阶段：基础架构搭建 (1-2周)

#### 1.1 项目初始化
- 创建Node.js项目，配置TypeScript
- 安装核心依赖：Fastify、Prisma、Redis客户端
- 配置开发环境：ESLint、Prettier、Nodemon
- 设置环境变量管理

#### 1.2 数据库设置
- 配置MySQL连接和连接池
- 将现有的PostgreSQL SQL脚本转换为MySQL格式
- 配置Sequelize ORM，定义数据模型
- 设置Redis连接和基础配置
- 创建数据库迁移和种子文件

#### 1.3 基础框架
- 搭建Express应用框架
- 配置中间件：CORS、Helmet、Morgan、body-parser
- 实现基础中间件（认证、限流、验证、错误处理）
- 设置API路由结构和Socket.IO

### 第二阶段：核心功能开发 (2-3周)

#### 2.1 用户认证系统
```typescript
// auth.service.ts 核心功能
- 用户注册/登录（使用Sequelize User模型）
- JWT token生成和验证
- 密码加密和验证（bcrypt）
- 用户会话管理（Redis存储）
```

#### 2.2 玩家数据管理
```typescript
// player.service.ts 核心功能
- 玩家信息CRUD（Sequelize PlayerData模型）
- 等级经验计算和更新
- 金币管理和事务处理
- 玩家统计数据聚合查询
```

#### 2.3 基础挖矿系统
```typescript
// mining.service.ts 核心功能
- 挖矿场景管理（Scene模型）
- 挖矿逻辑实现（MySQL事务）
- 资源掉落计算（概率算法）
- 挖矿记录管理（MiningRecord模型）
```

### 第三阶段：高级功能开发 (2-3周)

#### 3.1 精力系统
```typescript
// energy.service.ts 核心功能
- 精力值计算和更新（MySQL原子操作）
- 精力恢复定时任务（node-cron）
- 精力消耗验证（数据库约束）
- 精力药水使用（事务处理）
```

#### 3.2 挂机挖矿系统
```typescript
// auto-mining.service.ts 核心功能
- 自动挖矿开启/停止（OfflineMiningSession模型）
- 离线挖矿计算（时间差算法）
- 挂机状态管理（Redis缓存）
- 离线收益结算（批量数据库操作）
```

#### 3.3 商店系统
```typescript
// shop.service.ts 核心功能
- 商品管理（ShopItem模型）
- 购买逻辑（MySQL事务）
- 库存管理（乐观锁）
- 价格计算（动态定价算法）
```

### 第四阶段：优化和扩展 (1-2周)

#### 4.1 性能优化
- MySQL查询优化（索引、查询计划）
- Redis缓存策略（热点数据缓存）
- Express中间件优化
- 连接池配置优化
- 内存使用监控和优化

#### 4.2 实时功能
- Socket.IO连接管理和房间机制
- 实时数据推送（挖矿结果、精力更新）
- 在线状态管理（Redis存储）
- 实时通知系统（事件驱动）

## 核心模块详细设计

### 1. 挖矿系统核心逻辑

```typescript
// mining.service.ts 关键方法
import { Transaction } from 'sequelize';
import { PlayerData, MiningRecord, Scene } from '../models';

class MiningService {
  // 执行挖矿
  async performMining(playerId: string, sceneId: string): Promise<MiningResult> {
    const transaction: Transaction = await sequelize.transaction();
    try {
      // 1. 验证玩家状态（等级、精力）- 使用行锁
      const player = await PlayerData.findByPk(playerId, { 
        lock: true, transaction 
      });
      // 2. 验证场景解锁状态
      const scene = await Scene.findByPk(sceneId);
      // 3. 消耗精力（原子操作）
      await player.decrement('current_energy', { by: scene.energy_cost, transaction });
      // 4. 计算掉落物品
      const drops = await this.calculateDrops(sceneId, player.level);
      // 5. 更新玩家数据（金币、经验）
      await player.increment({ coins: drops.totalCoins, experience: drops.experience }, { transaction });
      // 6. 记录挖矿日志
      await MiningRecord.create({ player_id: playerId, scene_id: sceneId, ...drops }, { transaction });
      await transaction.commit();
      // 7. 返回挖矿结果
      return drops;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // 计算掉落物品
  private async calculateDrops(sceneId: string, playerLevel: number): Promise<DropResult[]> {
    // 基于场景配置和玩家等级计算掉落（使用MySQL随机函数）
    const scene = await Scene.findByPk(sceneId, { include: ['dropRates'] });
    // 实现概率计算逻辑
  }

  // 获取挖矿记录
  async getMiningRecords(playerId: string, limit: number = 10): Promise<MiningRecord[]> {
    return await MiningRecord.findAll({
      where: { player_id: playerId },
      order: [['created_at', 'DESC']],
      limit,
      include: ['scene', 'items']
    });
  }
}
```

### 2. 自动挖矿系统

```typescript
// auto-mining.service.ts 关键方法
import { OfflineMiningSession, PlayerData } from '../models';
import { redisClient } from '../config/redis.config';

class AutoMiningService {
  // 开始自动挖矿
  async startAutoMining(playerId: string, sceneId: string): Promise<void> {
    const transaction = await sequelize.transaction();
    try {
      // 1. 验证开启条件（等级、精力、场景解锁）
      const player = await PlayerData.findByPk(playerId, { transaction });
      // 2. 创建挂机会话
      const session = await OfflineMiningSession.create({
        player_id: playerId,
        scene_id: sceneId,
        start_time: new Date(),
        status: 'active'
      }, { transaction });
      // 3. 启动定时任务（Redis存储任务信息）
      await redisClient.set(`auto_mining:${playerId}`, JSON.stringify({
        sessionId: session.id,
        sceneId,
        lastMining: Date.now()
      }));
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // 执行自动挖矿
  async performAutoMining(sessionId: string): Promise<void> {
    const session = await OfflineMiningSession.findByPk(sessionId);
    if (!session || session.status !== 'active') return;
    
    // 1. 检查精力是否足够
    const player = await PlayerData.findByPk(session.player_id);
    if (player.current_energy < session.scene.energy_cost) {
      await this.pauseAutoMining(sessionId);
      return;
    }
    
    // 2. 执行挖矿逻辑（复用mining.service的逻辑）
    await this.miningService.performMining(session.player_id, session.scene_id);
    
    // 3. 更新会话数据
    await session.increment('mining_count');
    await session.update({ last_mining_time: new Date() });
  }

  // 计算离线收益
  async calculateOfflineRewards(playerId: string): Promise<OfflineRewards> {
    // 1. 获取离线时间
    const session = await OfflineMiningSession.findOne({
      where: { player_id: playerId, status: 'active' },
      include: ['scene']
    });
    
    if (!session) return { totalCoins: 0, totalExperience: 0, items: [] };
    
    const offlineTime = Date.now() - session.last_mining_time.getTime();
    const miningInterval = session.scene.mining_interval * 1000; // 转换为毫秒
    
    // 2. 计算可挖矿次数
    const possibleMiningCount = Math.floor(offlineTime / miningInterval);
    const player = await PlayerData.findByPk(playerId);
    const maxMiningCount = Math.floor(player.current_energy / session.scene.energy_cost);
    const actualMiningCount = Math.min(possibleMiningCount, maxMiningCount);
    
    // 3. 模拟挖矿过程（批量计算）
    const rewards = await this.simulateMining(session.scene_id, player.level, actualMiningCount);
    
    // 4. 返回收益统计
    return rewards;
  }
}
```

### 3. 精力系统

```typescript
// energy.service.ts 关键方法
import { PlayerData, ShopItem } from '../models';
import { Op } from 'sequelize';

class EnergyService {
  // 消耗精力
  async consumeEnergy(playerId: string, amount: number): Promise<boolean> {
    const transaction = await sequelize.transaction();
    try {
      // 1. 检查当前精力值（使用行锁防止并发问题）
      const player = await PlayerData.findByPk(playerId, { 
        lock: true, 
        transaction 
      });
      
      // 2. 验证是否足够
      if (player.current_energy < amount) {
        await transaction.rollback();
        return false;
      }
      
      // 3. 扣除精力（原子操作）
      await player.decrement('current_energy', { by: amount, transaction });
      
      // 4. 更新最后精力更新时间
      await player.update({ last_energy_update: new Date() }, { transaction });
      
      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // 恢复精力
  async recoverEnergy(playerId: string): Promise<void> {
    const player = await PlayerData.findByPk(playerId);
    if (!player) return;
    
    // 1. 计算恢复时间
    const now = new Date();
    const lastUpdate = new Date(player.last_energy_update);
    const timeDiff = now.getTime() - lastUpdate.getTime();
    const recoveryInterval = 5 * 60 * 1000; // 5分钟恢复1点
    
    // 2. 计算恢复数量
    const recoveryAmount = Math.floor(timeDiff / recoveryInterval);
    if (recoveryAmount <= 0) return;
    
    // 3. 更新精力值（不超过最大值）
    const newEnergy = Math.min(player.current_energy + recoveryAmount, player.max_energy);
    await player.update({
      current_energy: newEnergy,
      last_energy_update: now
    });
  }

  // 使用精力药水
  async useEnergyPotion(playerId: string, potionId: string): Promise<void> {
    const transaction = await sequelize.transaction();
    try {
      // 1. 验证道具
      const potion = await ShopItem.findByPk(potionId);
      if (!potion || potion.category !== 'energy_potion') {
        throw new Error('Invalid energy potion');
      }
      
      // 2. 检查玩家是否拥有该道具
      const playerItem = await PlayerItem.findOne({
        where: { player_id: playerId, item_id: potionId, quantity: { [Op.gt]: 0 } },
        transaction
      });
      
      if (!playerItem) {
        throw new Error('Player does not have this potion');
      }
      
      // 3. 恢复精力
      const player = await PlayerData.findByPk(playerId, { transaction });
      const newEnergy = Math.min(player.current_energy + potion.effect_value, player.max_energy);
      await player.update({ current_energy: newEnergy }, { transaction });
      
      // 4. 消耗道具
      await playerItem.decrement('quantity', { by: 1, transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
```

## 数据库优化策略

### 1. 索引优化
```sql
-- 玩家查询优化
CREATE INDEX idx_player_data_user_id ON player_data(user_id);
CREATE INDEX idx_player_data_level ON player_data(level);
CREATE INDEX idx_player_data_energy ON player_data(current_energy, last_energy_update);

-- 挖矿记录优化
CREATE INDEX idx_mining_records_player_time ON mining_records(player_id, created_at DESC);
CREATE INDEX idx_mining_records_scene ON mining_records(scene_id, created_at);

-- 自动挖矿优化
CREATE INDEX idx_auto_mining_player_status ON offline_mining_sessions(player_id, status);
CREATE INDEX idx_auto_mining_active ON offline_mining_sessions(status, last_mining_time);

-- 用户认证优化
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE UNIQUE INDEX idx_users_email ON users(email);
```

### 2. 缓存策略
```typescript
// Redis缓存设计
- 玩家基础信息: player:{playerId} (TTL: 30分钟)
- 玩家精力状态: energy:{playerId} (TTL: 5分钟)
- 挖矿场景配置: scene:{sceneId} (TTL: 1小时)
- 商店物品配置: shop:items (TTL: 1小时)
- 游戏配置: game:config (TTL: 1小时)
- 用户会话: session:{token} (TTL: 7天)
- 自动挖矿状态: auto_mining:{playerId} (TTL: 24小时)
- 排行榜数据: leaderboard:coins (TTL: 10分钟)

// 缓存更新策略
- 写入时更新缓存 (Write-Through)
- 定时刷新热点数据
- 缓存穿透保护
```

## API接口设计

### 1. RESTful API规范
```
# 认证相关
POST   /api/auth/register     # 用户注册
POST   /api/auth/login        # 用户登录
POST   /api/auth/logout       # 用户登出
POST   /api/auth/refresh      # 刷新token

# 玩家相关
GET    /api/player/profile    # 获取玩家信息
PUT    /api/player/profile    # 更新玩家信息
GET    /api/player/stats      # 获取玩家统计

# 挖矿相关
GET    /api/mining/scenes     # 获取挖矿场景列表
POST   /api/mining/perform    # 执行挖矿
GET    /api/mining/records    # 获取挖矿记录

# 自动挖矿相关
POST   /api/auto-mining/start # 开始自动挖矿
POST   /api/auto-mining/stop  # 停止自动挖矿
GET    /api/auto-mining/status # 获取挂机状态
GET    /api/auto-mining/offline-rewards # 获取离线收益
POST   /api/auto-mining/claim-rewards   # 领取离线收益

# 精力相关
GET    /api/energy/status     # 获取精力状态
POST   /api/energy/recover    # 手动恢复精力
POST   /api/energy/use-potion # 使用精力药水

# 商店相关
GET    /api/shop/items        # 获取商店物品
POST   /api/shop/buy          # 购买物品
GET    /api/shop/inventory    # 获取玩家背包
```

### 2. Socket.IO事件
```typescript
// 客户端 -> 服务端
'join:game'        // 加入游戏房间
'mining:start'     // 开始挖矿
'auto-mining:toggle' // 切换自动挖矿
'energy:check'     // 检查精力状态
'player:heartbeat' // 玩家心跳

// 服务端 -> 客户端
'mining:result'    // 挖矿结果
'energy:update'    // 精力更新
'auto-mining:status' // 挂机状态更新
'player:level-up'  // 玩家升级
'system:notification' // 系统通知
'leaderboard:update' // 排行榜更新

// 房间管理
- 玩家加入游戏时自动加入个人房间
- 支持广播消息到所有在线玩家
- 支持私人消息推送
```

## 安全性设计

### 1. 数据验证
- 所有输入参数严格验证
- 防止SQL注入和XSS攻击
- 限制请求频率和大小

### 2. 业务安全
- 服务端验证所有游戏逻辑
- 防止客户端数据篡改
- 实现反作弊机制

### 3. 认证授权
- JWT token过期管理
- 接口权限控制
- 敏感操作二次验证

## 监控和日志

### 1. 应用监控
- API响应时间监控
- 错误率统计
- 数据库性能监控
- Redis缓存命中率

### 2. 业务监控
- 玩家活跃度统计
- 挖矿频率分析
- 收益分布监控
- 异常行为检测

### 3. 日志管理
- 结构化日志记录
- 错误日志收集
- 操作审计日志
- 性能分析日志

## 部署和运维

### 1. 容器化部署
```dockerfile
# Dockerfile示例
FROM node:18-alpine

# 安装必要的系统依赖
RUN apk add --no-cache mysql-client

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制构建后的代码
COPY dist ./dist
COPY database ./database

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/app.js"]
```

### 2. 环境配置
```env
# .env配置示例
NODE_ENV=production
PORT=3000

# MySQL数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=miner_game
DB_USER=miner_user
DB_PASSWORD=secure_password
DB_POOL_MIN=5
DB_POOL_MAX=20

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
REDIS_DB=0

# JWT配置
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# 游戏配置
ENERGY_RECOVERY_INTERVAL=300000  # 5分钟
AUTO_MINING_INTERVAL=10000       # 10秒
MAX_OFFLINE_HOURS=24             # 最大离线时间

# 安全配置
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=900000         # 15分钟
RATE_LIMIT_MAX=100               # 最大请求数

# 日志配置
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### 3. CI/CD流程
- 代码提交触发自动构建
- 运行单元测试和集成测试
- 构建Docker镜像
- 自动部署到测试环境
- 手动部署到生产环境

## 开发工具和规范

### 1. 代码规范
- ESLint + Prettier代码格式化
- TypeScript严格模式
- Git提交规范
- 代码审查流程

### 2. 测试策略
- 单元测试：Jest + Supertest
- 集成测试：数据库和API测试
- 性能测试：压力测试和负载测试
- 端到端测试：关键业务流程

### 3. 文档管理
- API文档自动生成
- 代码注释规范
- 架构设计文档
- 部署运维文档

## 总结

这个后端开发方案基于现有的设计文档，采用现代化的技术栈和最佳实践。开发过程分为4个阶段，从基础架构到高级功能，循序渐进。重点关注代码质量、性能优化、安全性和可维护性。

整个开发周期预计6-10周，可以根据团队规模和具体需求调整。建议采用敏捷开发模式，每个阶段都有可交付的功能模块，便于测试和反馈。