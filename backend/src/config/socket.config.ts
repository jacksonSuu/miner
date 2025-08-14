import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { GAME_CONSTANTS } from './game.config';

dotenv.config();

interface AuthenticatedSocket extends Socket {
  userId?: number;
  playerId?: number;
}

export class SocketConfig {
  private io: SocketIOServer;
  private connectedUsers: Map<number, string> = new Map(); // userId -> socketId

  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT || '60000'),
      pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL || '25000'),
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    // JWT认证中间件
    this.io.use((socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('认证失败：缺少token'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        socket.userId = decoded.userId;
        socket.playerId = decoded.playerId;
        
        console.log(`🔗 用户 ${decoded.userId} 尝试连接Socket.IO`);
        next();
      } catch (error) {
        console.error('Socket.IO认证失败:', error);
        next(new Error('认证失败：无效token'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`✅ 用户 ${socket.userId} 已连接 Socket.IO (${socket.id})`);
      
      // 记录用户连接
      if (socket.userId) {
        this.connectedUsers.set(socket.userId, socket.id);
        
        // 加入个人房间
        socket.join(`user_${socket.userId}`);
        socket.join(`player_${socket.playerId}`);
      }

      // 处理加入游戏房间
      socket.on('join:game', () => {
        socket.join('game_room');
        socket.emit('system:notification', {
          type: 'success',
          message: '欢迎进入挖矿游戏！',
          timestamp: new Date().toISOString()
        });
      });

      // 处理挖矿开始事件
      socket.on('mining:start', (data) => {
        console.log(`⛏️ 用户 ${socket.userId} 开始挖矿:`, data);
        // 这里可以触发挖矿逻辑，然后通过API返回结果
        // 实际的挖矿逻辑应该在API中处理，这里只是事件通知
      });

      // 处理自动挖矿切换
      socket.on('auto-mining:toggle', (data) => {
        console.log(`🤖 用户 ${socket.userId} 切换自动挖矿:`, data);
        // 通知其他相关用户（如果需要）
      });

      // 处理精力检查
      socket.on('energy:check', () => {
        console.log(`⚡ 用户 ${socket.userId} 检查精力状态`);
        // 可以触发精力状态更新
      });

      // 处理玩家心跳
      socket.on('player:heartbeat', () => {
        // 更新玩家在线状态
        socket.emit('player:heartbeat:ack', {
          timestamp: new Date().toISOString()
        });
      });

      // 处理断开连接
      socket.on('disconnect', (reason) => {
        console.log(`❌ 用户 ${socket.userId} 断开连接: ${reason}`);
        
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
        }
      });

      // 处理连接错误
      socket.on('error', (error) => {
        console.error(`Socket.IO错误 (用户 ${socket.userId}):`, error);
      });
    });
  }

  // 向特定用户发送消息
  public emitToUser(userId: number, event: string, data: any): void {
    this.io.to(`user_${userId}`).emit(event, data);
  }

  // 向特定玩家发送消息
  public emitToPlayer(playerId: number, event: string, data: any): void {
    this.io.to(`player_${playerId}`).emit(event, data);
  }

  // 向所有在线用户广播消息
  public broadcast(event: string, data: any): void {
    this.io.to('game_room').emit(event, data);
  }

  // 发送挖矿结果
  public emitMiningResult(playerId: number, result: any): void {
    this.emitToPlayer(playerId, GAME_CONSTANTS.EVENTS.MINING_RESULT, {
      ...result,
      timestamp: new Date().toISOString()
    });
  }

  // 发送精力更新
  public emitEnergyUpdate(playerId: number, energyData: any): void {
    this.emitToPlayer(playerId, GAME_CONSTANTS.EVENTS.ENERGY_UPDATE, {
      ...energyData,
      timestamp: new Date().toISOString()
    });
  }

  // 发送自动挖矿状态更新
  public emitAutoMiningStatus(playerId: number, status: any): void {
    this.emitToPlayer(playerId, GAME_CONSTANTS.EVENTS.AUTO_MINING_STATUS, {
      ...status,
      timestamp: new Date().toISOString()
    });
  }

  // 发送玩家升级通知
  public emitLevelUp(playerId: number, levelData: any): void {
    this.emitToPlayer(playerId, GAME_CONSTANTS.EVENTS.PLAYER_LEVEL_UP, {
      ...levelData,
      timestamp: new Date().toISOString()
    });
  }

  // 发送系统通知
  public emitSystemNotification(playerId: number, notification: any): void {
    this.emitToPlayer(playerId, GAME_CONSTANTS.EVENTS.SYSTEM_NOTIFICATION, {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // 更新排行榜
  public emitLeaderboardUpdate(leaderboardData: any): void {
    this.broadcast(GAME_CONSTANTS.EVENTS.LEADERBOARD_UPDATE, {
      ...leaderboardData,
      timestamp: new Date().toISOString()
    });
  }

  // 获取在线用户数量
  public getOnlineUserCount(): number {
    return this.connectedUsers.size;
  }

  // 获取Socket.IO实例
  public getIO(): SocketIOServer {
    return this.io;
  }

  // 检查用户是否在线
  public isUserOnline(userId: number): boolean {
    return this.connectedUsers.has(userId);
  }

  // 获取用户的Socket ID
  public getUserSocketId(userId: number): string | undefined {
    return this.connectedUsers.get(userId);
  }
}

export default SocketConfig;