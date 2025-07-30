# Miner游戏技术架构设计

## 技术栈选择

### 前端技术栈

#### 核心框架
- **游戏引擎**: Phaser 3.70+
  - 理由: 轻量级、性能优秀、适合2D像素游戏
  - 优势: 丰富的动画系统、音效支持、跨平台

- **开发语言**: TypeScript 5.0+
  - 理由: 类型安全、更好的开发体验
  - 配置: 严格模式、ES2022目标

- **构建工具**: Vite 4.0+
  - 理由: 快速热重载、现代化构建
  - 插件: TypeScript、资源优化

#### UI框架
- **界面库**: 原生Phaser UI + 自定义组件
- **状态管理**: Zustand (轻量级状态管理)
- **样式方案**: CSS-in-JS (emotion)

#### 开发工具
- **代码规范**: ESLint + Prettier
- **版本控制**: Git + GitHub
- **包管理**: pnpm (性能更好)

### 后端技术栈

#### 服务端框架
- **运行时**: Node.js 18+ LTS
- **框架**: Fastify 4.0+
  - 理由: 高性能、低开销、TypeScript友好
  - 插件: 认证、CORS、速率限制

- **API设计**: RESTful API + WebSocket
  - REST: 基础CRUD操作
  - WebSocket: 实时数据同步

#### 数据库方案
- **主数据库**: PostgreSQL 15+
  - 理由: 可靠性高、功能丰富、JSON支持
  - 特性: 事务支持、复杂查询、扩展性

- **缓存层**: Redis 7.0+
  - 用途: 会话存储、排行榜、临时数据
  - 特性: 持久化、集群支持

- **ORM**: Prisma 5.0+
  - 理由: 类型安全、迁移管理、查询优化
  - 特性: 自动生成类型、数据库迁移

#### 部署方案
- **容器化**: Docker + Docker Compose
- **云平台**: AWS / 阿里云 / 腾讯云
- **CDN**: CloudFlare (静态资源加速)
- **监控**: Prometheus + Grafana

## 系统架构设计

### 整体架构图
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   客户端 (Web)   │    │   负载均衡器     │    │   CDN (静态资源) │
│   Phaser 3      │◄──►│   Nginx/ALB     │◄──►│   CloudFlare    │
│   TypeScript    │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         │              │   API网关       │
         │              │   Fastify       │
         │              └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         │              │   业务服务层     │
         │              │   - 用户服务     │
         │              │   - 游戏服务     │
         │              │   - 数据服务     │
         │              └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐    ┌─────────────────┐
         │              │   数据库层       │    │   缓存层        │
         └──────────────►│   PostgreSQL    │◄──►│   Redis         │
                        │                 │    │                 │
                        └─────────────────┘    └─────────────────┘
```

### 前端架构设计

#### 目录结构
```
src/
├── assets/              # 静态资源
│   ├── images/          # 图片资源
│   ├── sounds/          # 音效资源
│   └── fonts/           # 字体资源
├── components/          # UI组件
│   ├── common/          # 通用组件
│   ├── game/            # 游戏组件
│   └── ui/              # 界面组件
├── scenes/              # 游戏场景
│   ├── MainScene.ts     # 主游戏场景
│   ├── MenuScene.ts     # 菜单场景
│   └── LoadingScene.ts  # 加载场景
├── systems/             # 游戏系统
│   ├── MiningSystem.ts  # 挖矿系统
│   ├── InventorySystem.ts # 背包系统
│   └── UpgradeSystem.ts # 升级系统
├── stores/              # 状态管理
│   ├── gameStore.ts     # 游戏状态
│   ├── userStore.ts     # 用户状态
│   └── uiStore.ts       # UI状态
├── services/            # 服务层
│   ├── api.ts           # API调用
│   ├── storage.ts       # 本地存储
│   └── websocket.ts     # WebSocket
├── utils/               # 工具函数
│   ├── constants.ts     # 常量定义
│   ├── helpers.ts       # 辅助函数
│   └── types.ts         # 类型定义
└── main.ts              # 入口文件
```

#### 核心系统设计

**游戏状态管理**
```typescript
interface GameState {
  player: {
    id: string;
    level: number;
    experience: number;
    gold: number;
    currentScene: number;
    currentTool: number;
  };
  inventory: {
    resources: Record<number, number>;
    capacity: number;
  };
  mining: {
    isActive: boolean;
    currentGrid: number[][];
    lastRefresh: number;
  };
  ui: {
    activePanel: string | null;
    notifications: Notification[];
  };
}
```

**挖矿系统核心逻辑**
```typescript
class MiningSystem {
  private scene: Phaser.Scene;
  private grid: MiningGrid;
  private tools: ToolManager;
  private autoMiningTimer: NodeJS.Timeout | null = null;
  
  async mine(x: number, y: number): Promise<MiningResult> {
    // 1. 验证挖矿条件
    if (!this.canMine(x, y)) {
      throw new Error('无法在此位置挖矿');
    }
    
    // 2. 检查精力值
    if (this.playerData.currentEnergy <= 0) {
      throw new Error('精力不足');
    }
    
    // 3. 计算挖矿时间
    const miningTime = this.calculateMiningTime();
    
    // 4. 播放挖矿动画
    await this.playMiningAnimation(x, y, miningTime);
    
    // 5. 计算掉落物品
    const drops = await this.calculateDrops(x, y);
    
    // 6. 消耗精力
    await this.consumeEnergy();
    
    // 7. 更新游戏状态
    this.updateGameState(drops);
    
    // 8. 播放掉落动画
    await this.playDropAnimation(drops);
    
    return {
      resources: drops,
      experience: this.calculateExperience(drops),
      gold: this.calculateGold(drops)
    };
  }
  
  // 开启自动挖矿
  async startAutoMining(): Promise<void> {
    if (!this.playerData.offlineMiningUnlocked) {
      throw new Error('未解锁挂机挖矿功能');
    }

    if (this.playerData.currentEnergy <= 0) {
      throw new Error('精力不足，无法开始挂机挖矿');
    }

    // 记录开始时间
    await this.updateAutoMiningStatus(true);
    
    // 开始自动挖矿循环
    this.autoMiningTimer = setInterval(() => {
      this.performAutoMining();
    }, 3000); // 每3秒挖矿一次
  }

  // 停止自动挖矿
  async stopAutoMining(): Promise<void> {
    if (this.autoMiningTimer) {
      clearInterval(this.autoMiningTimer);
      this.autoMiningTimer = null;
    }
    await this.updateAutoMiningStatus(false);
  }

  // 执行自动挖矿
  private async performAutoMining(): Promise<void> {
    if (this.playerData.currentEnergy <= 0) {
      await this.stopAutoMining();
      return;
    }

    // 随机选择挖矿位置
    const position = this.getRandomMiningPosition();
    
    try {
      await this.mine(position.x, position.y);
    } catch (error) {
      console.log('自动挖矿失败:', error);
    }
  }

  // 计算离线挖矿收益
  async calculateOfflineRewards(offlineTime: number): Promise<OfflineReward> {
    const maxOfflineHours = 24;
    const effectiveHours = Math.min(offlineTime / 3600, maxOfflineHours);
    
    // 计算可挖矿次数（每3秒一次）
    const maxMiningCount = Math.floor(effectiveHours * 1200);
    const actualMiningCount = Math.min(maxMiningCount, this.playerData.currentEnergy);
    
    let totalRewards = {
      resources: new Map<string, number>(),
      experience: 0,
      gold: 0
    };

    // 模拟挖矿过程
    for (let i = 0; i < actualMiningCount; i++) {
      const position = this.getRandomMiningPosition();
      const drops = await this.calculateDrops(position.x, position.y);
      
      // 累计奖励
      drops.forEach(drop => {
        const currentAmount = totalRewards.resources.get(drop.type) || 0;
        totalRewards.resources.set(drop.type, currentAmount + drop.quantity);
      });
      totalRewards.experience += this.calculateExperience(drops);
      totalRewards.gold += this.calculateGold(drops);
    }

    return {
      miningCount: actualMiningCount,
      offlineHours: effectiveHours,
      energyConsumed: actualMiningCount,
      ...totalRewards
    };
  }

  private async consumeEnergy(): Promise<void> {
    const energyCost = this.calculateEnergyCost();
    this.playerData.currentEnergy = Math.max(0, this.playerData.currentEnergy - energyCost);
    await this.savePlayerData();
  }

  private calculateEnergyCost(): number {
    const baseCost = 1;
    const toolEfficiency = this.tools.getCurrentTool().energyEfficiency || 0;
    return Math.max(1, baseCost * (1 - toolEfficiency));
  }
}
```

### 后端架构设计

#### 目录结构
```
src/
├── controllers/         # 控制器层
│   ├── auth.controller.ts
│   ├── game.controller.ts
│   ├── user.controller.ts
│   └── mining.controller.ts
├── services/            # 业务逻辑层
│   ├── auth.service.ts
│   ├── game.service.ts
│   ├── user.service.ts
│   └── mining.service.ts
├── repositories/        # 数据访问层
│   ├── user.repository.ts
│   ├── game.repository.ts
│   └── mining.repository.ts
├── models/              # 数据模型
│   ├── user.model.ts
│   ├── game.model.ts
│   └── mining.model.ts
├── middleware/          # 中间件
│   ├── auth.middleware.ts
│   ├── validation.middleware.ts
│   └── rateLimit.middleware.ts
├── utils/               # 工具函数
│   ├── crypto.ts
│   ├── validation.ts
│   └── constants.ts
├── config/              # 配置文件
│   ├── database.ts
│   ├── redis.ts
│   └── app.ts
└── app.ts               # 应用入口
```

#### API设计规范

**RESTful API端点**
```
# 用户相关
POST   /api/auth/register     # 用户注册
POST   /api/auth/login        # 用户登录
POST   /api/auth/logout       # 用户登出
GET    /api/user/profile      # 获取用户信息
PUT    /api/user/profile      # 更新用户信息

# 游戏数据
GET    /api/game/player       # 获取玩家数据
PUT    /api/game/player       # 更新玩家数据
GET    /api/game/inventory    # 获取背包数据
PUT    /api/game/inventory    # 更新背包数据

# 挖矿相关
POST   /api/mining/mine       # 执行挖矿
GET    /api/mining/scene/:id  # 获取场景数据
POST   /api/mining/refresh    # 刷新场景

# 挂机挖矿
POST   /api/mining/start-auto # 开始挂机挖矿
POST   /api/mining/stop-auto  # 停止挂机挖矿
GET    /api/mining/auto-status # 获取挂机状态
GET    /api/mining/offline-rewards # 获取离线收益
POST   /api/mining/claim-offline-rewards # 领取离线收益

# 精力系统
GET    /api/energy/status     # 获取精力状态
POST   /api/energy/recover    # 恢复精力
GET    /api/energy/recovery-time # 获取恢复时间

# 商店相关
GET    /api/shop/items        # 获取商店物品
POST   /api/shop/purchase     # 购买物品

# 排行榜
GET    /api/leaderboard/:type # 获取排行榜
```

**WebSocket事件**
```typescript
// 客户端 -> 服务端
interface ClientEvents {
  'mining:start': { x: number; y: number };
  'mining:complete': { sessionId: string };
  'inventory:update': { items: InventoryItem[] };
  'heartbeat': { timestamp: number };
}

// 服务端 -> 客户端
interface ServerEvents {
  'mining:result': MiningResult;
  'player:levelUp': { newLevel: number; rewards: Reward[] };
  'inventory:full': { message: string };
  'system:maintenance': { message: string; duration: number };
}
```

## 数据库设计优化

### 索引策略
```sql
-- 用户查询优化
CREATE INDEX CONCURRENTLY idx_users_username_active 
ON users(username) WHERE is_active = true;

-- 挖矿记录查询优化
CREATE INDEX CONCURRENTLY idx_mining_logs_user_time 
ON mining_logs(user_id, mining_time DESC);

-- 背包查询优化
CREATE INDEX CONCURRENTLY idx_inventory_user_quantity 
ON player_inventory(user_id, quantity DESC) 
WHERE quantity > 0;

-- 排行榜查询优化
CREATE INDEX CONCURRENTLY idx_player_data_level 
ON player_data(level DESC, experience DESC);

CREATE INDEX CONCURRENTLY idx_player_data_gold 
ON player_data(gold DESC);
```

### 分区策略
```sql
-- 挖矿记录按月分区
CREATE TABLE mining_logs_partitioned (
    LIKE mining_logs INCLUDING ALL
) PARTITION BY RANGE (mining_time);

-- 创建月度分区
CREATE TABLE mining_logs_2024_01 
PARTITION OF mining_logs_partitioned
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### 缓存策略

#### Redis缓存设计
```typescript
// 缓存键命名规范
const CACHE_KEYS = {
  USER_SESSION: (userId: string) => `session:${userId}`,
  PLAYER_DATA: (userId: string) => `player:${userId}`,
  SCENE_DATA: (sceneId: number) => `scene:${sceneId}`,
  LEADERBOARD: (type: string) => `leaderboard:${type}`,
  MINING_COOLDOWN: (userId: string) => `cooldown:mining:${userId}`,
} as const;

// 缓存过期时间
const CACHE_TTL = {
  USER_SESSION: 24 * 60 * 60, // 24小时
  PLAYER_DATA: 5 * 60,        // 5分钟
  SCENE_DATA: 30 * 60,        // 30分钟
  LEADERBOARD: 10 * 60,       // 10分钟
  MINING_COOLDOWN: 60,        // 1分钟
} as const;
```

## 性能优化策略

### 前端性能优化

#### 资源加载优化
```typescript
// 资源预加载策略
class AssetLoader {
  private loadingQueue: AssetLoadTask[] = [];
  private loadedAssets: Map<string, any> = new Map();
  
  // 分批加载资源
  async loadAssetsBatch(assets: string[], batchSize = 5): Promise<void> {
    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize);
      await Promise.all(batch.map(asset => this.loadAsset(asset)));
      
      // 更新加载进度
      this.updateLoadingProgress((i + batchSize) / assets.length);
    }
  }
  
  // 懒加载非关键资源
  async loadAssetLazy(assetKey: string): Promise<any> {
    if (this.loadedAssets.has(assetKey)) {
      return this.loadedAssets.get(assetKey);
    }
    
    const asset = await this.loadAsset(assetKey);
    this.loadedAssets.set(assetKey, asset);
    return asset;
  }
}
```

#### 渲染性能优化
```typescript
// 对象池管理
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  
  constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    
    // 预创建对象
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }
  
  get(): T {
    return this.pool.pop() || this.createFn();
  }
  
  release(obj: T): void {
    this.resetFn(obj);
    this.pool.push(obj);
  }
}

// 使用对象池管理粒子效果
const particlePool = new ObjectPool(
  () => new ParticleEffect(),
  (particle) => particle.reset(),
  50
);
```

### 后端性能优化

#### 数据库查询优化
```typescript
// 批量操作优化
class MiningService {
  // 批量更新背包
  async updateInventoryBatch(userId: string, updates: InventoryUpdate[]): Promise<void> {
    const query = `
      INSERT INTO player_inventory (user_id, resource_type_id, quantity)
      VALUES ${updates.map(() => '(?, ?, ?)').join(', ')}
      ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)
    `;
    
    const params = updates.flatMap(update => [userId, update.resourceId, update.quantity]);
    await this.db.query(query, params);
  }
  
  // 使用读写分离
  async getPlayerData(userId: string): Promise<PlayerData> {
    // 从只读副本查询
    return this.readOnlyDb.query(
      'SELECT * FROM player_data WHERE user_id = ?',
      [userId]
    );
  }
}
```

#### 缓存预热策略
```typescript
// 缓存预热任务
class CacheWarmupService {
  async warmupLeaderboards(): Promise<void> {
    const types = ['level', 'gold', 'mining_count'];
    
    await Promise.all(
      types.map(async (type) => {
        const data = await this.calculateLeaderboard(type);
        await this.redis.setex(
          CACHE_KEYS.LEADERBOARD(type),
          CACHE_TTL.LEADERBOARD,
          JSON.stringify(data)
        );
      })
    );
  }
  
  async warmupSceneData(): Promise<void> {
    const scenes = await this.db.query('SELECT id FROM scenes WHERE is_active = true');
    
    await Promise.all(
      scenes.map(async (scene) => {
        const data = await this.getSceneData(scene.id);
        await this.redis.setex(
          CACHE_KEYS.SCENE_DATA(scene.id),
          CACHE_TTL.SCENE_DATA,
          JSON.stringify(data)
        );
      })
    );
  }
}
```

## 安全性设计

### 客户端安全
```typescript
// 数据验证
class SecurityValidator {
  // 验证挖矿请求
  validateMiningRequest(request: MiningRequest): boolean {
    // 检查坐标范围
    if (request.x < 0 || request.x >= MAX_GRID_SIZE) return false;
    if (request.y < 0 || request.y >= MAX_GRID_SIZE) return false;
    
    // 检查时间间隔
    const lastMining = this.getLastMiningTime(request.userId);
    if (Date.now() - lastMining < MIN_MINING_INTERVAL) return false;
    
    // 检查工具有效性
    if (!this.isValidTool(request.toolId, request.userId)) return false;
    
    return true;
  }
  
  // 防止数据篡改
  generateChecksum(data: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data) + SECRET_KEY)
      .digest('hex');
  }
}
```

### 服务端安全
```typescript
// 速率限制
const rateLimitConfig = {
  mining: {
    max: 100,        // 每分钟最多100次挖矿
    windowMs: 60000, // 1分钟窗口
  },
  api: {
    max: 1000,       // 每分钟最多1000次API调用
    windowMs: 60000,
  },
};

// JWT认证
class AuthService {
  generateToken(userId: string): string {
    return jwt.sign(
      { userId, iat: Date.now() },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }
  
  verifyToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return null;
    }
  }
}
```

## 监控与日志

### 应用监控
```typescript
// 性能监控
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // 保持最近1000个数据点
    if (values.length > 1000) {
      values.shift();
    }
  }
  
  getAverageMetric(name: string): number {
    const values = this.metrics.get(name) || [];
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
}

// 错误监控
class ErrorTracker {
  async logError(error: Error, context: any): Promise<void> {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userId: context.userId,
    };
    
    // 发送到监控服务
    await this.sendToMonitoring(errorData);
    
    // 记录到数据库
    await this.saveToDatabase(errorData);
  }
}
```

### 日志系统
```typescript
// 结构化日志
const logger = {
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      meta,
      timestamp: new Date().toISOString(),
    }));
  },
  
  error: (message: string, error?: Error, meta?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      meta,
      timestamp: new Date().toISOString(),
    }));
  },
};
```

## 部署与运维

### Docker配置
```dockerfile
# 前端Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```dockerfile
# 后端Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/app.js"]
```

### CI/CD流程
```yaml
# GitHub Actions
name: Deploy Miner Game

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run lint
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          docker build -t miner-game .
          docker push ${{ secrets.DOCKER_REGISTRY }}/miner-game
          kubectl apply -f k8s/
```

---

*本文档详细描述了Miner游戏的技术架构设计，包括前后端技术选型、系统架构、性能优化、安全性设计等各个方面的技术实现方案。*