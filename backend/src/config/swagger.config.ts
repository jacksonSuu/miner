import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: process.env.SWAGGER_TITLE || '挖矿游戏API文档',
      version: process.env.SWAGGER_VERSION || '1.0.0',
      description: process.env.SWAGGER_DESCRIPTION || '挖矿游戏后端API接口文档',
      contact: {
        name: 'API支持',
        email: 'support@minergame.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.SWAGGER_BASE_URL || '/api',
        description: '开发环境服务器'
      },
      {
        url: '/api',
        description: '生产环境服务器'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT认证令牌'
        }
      },
      schemas: {
        // 通用响应结构
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: '请求是否成功'
            },
            message: {
              type: 'string',
              description: '响应消息'
            },
            data: {
              type: 'object',
              description: '响应数据'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: '响应时间戳'
            }
          }
        },
        
        // 错误响应结构
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: '错误消息'
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: '错误代码'
                },
                details: {
                  type: 'string',
                  description: '错误详情'
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },

        // 用户相关
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '用户ID'
            },
            username: {
              type: 'string',
              description: '用户名'
            },
            email: {
              type: 'string',
              format: 'email',
              description: '邮箱地址'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: '创建时间'
            }
          }
        },

        // 玩家数据
        PlayerData: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '玩家数据ID'
            },
            user_id: {
              type: 'integer',
              description: '用户ID'
            },
            level: {
              type: 'integer',
              description: '玩家等级'
            },
            experience: {
              type: 'integer',
              description: '经验值'
            },
            coins: {
              type: 'integer',
              description: '金币数量'
            },
            current_energy: {
              type: 'integer',
              description: '当前精力值'
            },
            max_energy: {
              type: 'integer',
              description: '最大精力值'
            },
            last_energy_update: {
              type: 'string',
              format: 'date-time',
              description: '最后精力更新时间'
            }
          }
        },

        // 挖矿记录
        MiningRecord: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '记录ID'
            },
            player_id: {
              type: 'integer',
              description: '玩家ID'
            },
            scene_id: {
              type: 'integer',
              description: '场景ID'
            },
            items_found: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  rarity: { type: 'string' },
                  value: { type: 'integer' }
                }
              },
              description: '发现的物品'
            },
            coins_earned: {
              type: 'integer',
              description: '获得的金币'
            },
            experience_gained: {
              type: 'integer',
              description: '获得的经验'
            },
            energy_consumed: {
              type: 'integer',
              description: '消耗的精力'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: '挖矿时间'
            }
          }
        },

        // 挖矿场景
        Scene: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '场景ID'
            },
            name: {
              type: 'string',
              description: '场景名称'
            },
            description: {
              type: 'string',
              description: '场景描述'
            },
            required_level: {
              type: 'integer',
              description: '解锁等级要求'
            },
            energy_cost: {
              type: 'integer',
              description: '精力消耗'
            },
            base_coins: {
              type: 'integer',
              description: '基础金币收益'
            },
            base_experience: {
              type: 'integer',
              description: '基础经验收益'
            }
          }
        },

        // 商店物品
        ShopItem: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '物品ID'
            },
            name: {
              type: 'string',
              description: '物品名称'
            },
            description: {
              type: 'string',
              description: '物品描述'
            },
            category: {
              type: 'string',
              enum: ['tool', 'energy_potion', 'upgrade'],
              description: '物品类别'
            },
            price: {
              type: 'integer',
              description: '价格'
            },
            effect_value: {
              type: 'integer',
              description: '效果数值'
            },
            required_level: {
              type: 'integer',
              description: '购买等级要求'
            }
          }
        },

        // 自动挖矿会话
        AutoMiningSession: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: '会话ID'
            },
            player_id: {
              type: 'integer',
              description: '玩家ID'
            },
            scene_id: {
              type: 'integer',
              description: '场景ID'
            },
            status: {
              type: 'string',
              enum: ['active', 'paused', 'stopped'],
              description: '会话状态'
            },
            start_time: {
              type: 'string',
              format: 'date-time',
              description: '开始时间'
            },
            last_mining_time: {
              type: 'string',
              format: 'date-time',
              description: '最后挖矿时间'
            },
            mining_count: {
              type: 'integer',
              description: '挖矿次数'
            },
            total_coins_earned: {
              type: 'integer',
              description: '总获得金币'
            },
            total_experience_gained: {
              type: 'integer',
              description: '总获得经验'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: '认证',
        description: '用户认证相关接口'
      },
      {
        name: '玩家',
        description: '玩家信息管理接口'
      },
      {
        name: '挖矿',
        description: '挖矿相关接口'
      },
      {
        name: '自动挖矿',
        description: '自动挖矿相关接口'
      },
      {
        name: '精力',
        description: '精力系统接口'
      },
      {
        name: '商店',
        description: '商店相关接口'
      }
    ]
  },
  apis: [
    // 扫描路由文件中的注释
    path.join(__dirname, '../routes/*.ts'),
    path.join(__dirname, '../controllers/*.ts'),
    // 如果是编译后的JS文件
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../controllers/*.js')
  ]
};

/**
 * 生成Swagger规范
 */
export const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Swagger UI配置选项
 */
const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #3b82f6; }
    .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; }
    .swagger-ui .info .description { line-height: 1.6; }
    .swagger-ui .opblock.opblock-post { border-color: #10b981; }
    .swagger-ui .opblock.opblock-get { border-color: #3b82f6; }
    .swagger-ui .opblock.opblock-put { border-color: #f59e0b; }
    .swagger-ui .opblock.opblock-delete { border-color: #ef4444; }
  `,
  customSiteTitle: '挖矿游戏 API 文档',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  }
};

/**
 * 设置Swagger文档
 * @param app Express应用实例
 */
export function setupSwagger(app: Express): void {
  // 提供Swagger JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // 设置Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  console.log('📚 Swagger文档已设置:');
  console.log('   - Swagger UI: http://localhost:3000/api-docs');
  console.log('   - Swagger JSON: http://localhost:3000/api-docs.json');
}

export default {
  swaggerSpec,
  setupSwagger
};