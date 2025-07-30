module.exports = {
  apps: [
    {
      name: 'miner-game-backend',
      script: 'dist/server.js',
      instances: 'max', // 使用所有CPU核心
      exec_mode: 'cluster',
      
      // 环境变量
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001,
      },
      
      // 日志配置
      log_file: 'logs/combined.log',
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // 进程管理
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      
      // 监听文件变化（仅开发环境）
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        'dist',
        '.git',
      ],
      
      // 自动重启配置
      autorestart: true,
      
      // 优雅关闭
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // 健康检查
      health_check_grace_period: 3000,
      
      // 源码映射支持
      source_map_support: true,
      
      // 合并日志
      merge_logs: true,
      
      // 时间戳
      time: true,
    },
  ],
  
  // 部署配置
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/miner-game-backend.git',
      path: '/var/www/miner-game-backend',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt install git -y',
    },
    
    staging: {
      user: 'deploy',
      host: ['staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/miner-game-backend.git',
      path: '/var/www/miner-game-backend-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
    },
  },
};