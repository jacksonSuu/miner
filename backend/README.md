# 挖矿游戏后端 API

一个基于 Node.js + Express + TypeScript + MySQL + Redis 的挖矿游戏后端服务。

## 🚀 功能特性

- **用户系统**：注册、登录、JWT认证
- **游戏系统**：挖矿、升级、精力管理
- **场景系统**：多个挖矿场景，不同难度和奖励
- **商店系统**：工具购买、装备管理
- **离线挖矿**：支持离线自动挖矿
- **排行榜**：多维度排行榜系统
- **实时通信**：WebSocket支持
- **API文档**：Swagger自动生成文档

## 📋 技术栈

- **运行时**：Node.js 18+
- **框架**：Express.js
- **语言**：TypeScript
- **数据库**：MySQL 8.0+
- **缓存**：Redis 6.0+
- **ORM**：Sequelize
- **认证**：JWT
- **文档**：Swagger
- **测试**：Jest

## 🛠️ 安装和运行

### 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- MySQL >= 8.0
- Redis >= 6.0

### 1. 克隆项目

```bash
git clone <repository-url>
cd miner-game-backend
```

### 2. 安装依赖

```bash
npm install
```

### 3. 环境配置

复制环境变量模板并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库和Redis连接信息：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=miner_game
DB_USER=root
DB_PASSWORD=your_password

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT密钥（生产环境请使用强密钥）
JWT_SECRET=your_super_secret_jwt_key_here
```

### 4. 数据库设置

创建数据库：

```sql
CREATE DATABASE miner_game CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. 启动服务

开发模式：

```bash
npm run dev
```

生产模式：

```bash
npm run build
npm start
```

## 📚 API 文档

启动服务后，访问以下地址查看API文档：

- **Swagger UI**: http://localhost:3000/api-docs
- **健康检查**: http://localhost:3000/health

## 🎮 API 端点

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `POST /api/auth/refresh` - 刷新令牌
- `PUT /api/auth/password` - 修改密码
- `GET /api/auth/profile` - 获取用户资料

### 游戏相关

- `POST /api/game/mining` - 执行挖矿
- `GET /api/game/stats` - 获取玩家统计
- `GET /api/game/scenes` - 获取场景列表
- `POST /api/game/offline-mining/start` - 开始离线挖矿
- `POST /api/game/offline-mining/stop` - 停止离线挖矿
- `GET /api/game/offline-mining` - 获取离线挖矿信息
- `POST /api/game/energy/recover` - 恢复精力
- `GET /api/game/leaderboard` - 获取排行榜
- `GET /api/game/history` - 获取挖矿历史

### 商店相关

- `GET /api/shop/items` - 获取商店物品
- `POST /api/shop/purchase` - 购买物品
- `GET /api/shop/tools` - 获取玩家工具
- `PUT /api/shop/tools/:id/equip` - 装备工具
- `PUT /api/shop/tools/:id/repair` - 修理工具
- `DELETE /api/shop/tools/:id` - 出售工具

## 🗂️ 项目结构

```
src/
├── app.ts              # Express应用配置
├── server.ts           # 服务器入口文件
├── config/             # 配置文件
│   ├── database.config.ts
│   ├── redis.config.ts
│   ├── swagger.config.ts
│   └── game.config.ts
├── controllers/        # 控制器
│   ├── auth.controller.ts
│   ├── game.controller.ts
│   └── shop.controller.ts
├── middleware/         # 中间件
│   ├── auth.middleware.ts
│   └── error.middleware.ts
├── models/            # 数据模型
│   ├── User.ts
│   ├── PlayerData.ts
│   ├── Scene.ts
│   ├── MiningRecord.ts
│   ├── ShopItem.ts
│   ├── Tool.ts
│   ├── AutoMiningSession.ts
│   └── index.ts
├── routes/            # 路由
│   ├── auth.routes.ts
│   ├── game.routes.ts
│   ├── shop.routes.ts
│   └── index.ts
└── services/          # 业务逻辑
    ├── auth.service.ts
    ├── user.service.ts
    ├── game.service.ts
    └── shop.service.ts
```

## 🧪 测试

运行测试：

```bash
npm test
```

监听模式：

```bash
npm run test:watch
```

## 📝 开发脚本

```bash
# 开发模式（热重载）
npm run dev

# 构建项目
npm run build

# 启动生产服务
npm start

# 代码检查
npm run lint

# 自动修复代码风格
npm run lint:fix

# 清理构建文件
npm run clean
```

## 🔧 配置说明

### 游戏配置

主要游戏参数在 `src/config/game.config.ts` 中配置：

- 玩家初始属性
- 等级系统参数
- 精力恢复速率
- 挖矿奖励计算
- 商店物品配置
- 速率限制设置

### 数据库配置

支持开发、测试、生产三种环境的数据库配置，自动根据 `NODE_ENV` 选择。

### Redis配置

用于缓存、会话管理、速率限制等功能。

## 🚀 部署

### Docker 部署

```bash
# 构建镜像
docker build -t miner-game-backend .

# 运行容器
docker run -p 3000:3000 --env-file .env miner-game-backend
```

### PM2 部署

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start dist/server.js --name "miner-game"

# 查看状态
pm2 status

# 查看日志
pm2 logs miner-game
```

## 🔒 安全考虑

- JWT令牌认证
- 密码bcrypt加密
- 请求速率限制
- CORS配置
- Helmet安全头
- 输入验证和清理
- SQL注入防护（Sequelize ORM）

## 📊 监控和日志

- 请求日志记录
- 错误日志追踪
- 性能监控
- 健康检查端点
- 数据库连接池监控

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查MySQL服务是否启动
   - 验证数据库配置信息
   - 确认数据库用户权限

2. **Redis连接失败**
   - 检查Redis服务是否启动
   - 验证Redis配置信息
   - 检查防火墙设置

3. **端口占用**
   - 更改 `.env` 文件中的 `PORT` 配置
   - 或者停止占用端口的进程

4. **依赖安装失败**
   - 清理npm缓存：`npm cache clean --force`
   - 删除node_modules重新安装：`rm -rf node_modules && npm install`

### 日志查看

开发环境下，日志会输出到控制台。生产环境建议配置文件日志。

```bash
# 查看实时日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log
```

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件
- 项目讨论区

---

**Happy Mining! ⛏️💎**