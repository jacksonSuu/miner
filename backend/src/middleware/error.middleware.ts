import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'sequelize';
import { GAME_CONFIG } from '../config/game.config';

// 错误类型接口
export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

// 自定义错误类
export class CustomError extends Error implements ApiError {
  public statusCode: number;
  public code: string;
  public details?: any;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any
  ) {
    super(message);
    this.name = 'CustomError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 业务逻辑错误类
export class BusinessError extends CustomError {
  constructor(message: string, code: string = 'BUSINESS_ERROR', details?: any) {
    super(message, 400, code, details);
    this.name = 'BusinessError';
  }
}

// 验证错误类
export class ValidationErrorCustom extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

// 认证错误类
export class AuthenticationError extends CustomError {
  constructor(message: string = '认证失败') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

// 授权错误类
export class AuthorizationError extends CustomError {
  constructor(message: string = '权限不足') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

// 资源未找到错误类
export class NotFoundError extends CustomError {
  constructor(message: string = '资源未找到') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

// 速率限制错误类
export class RateLimitError extends CustomError {
  constructor(message: string = '请求过于频繁', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
    this.name = 'RateLimitError';
  }
}

// 游戏逻辑错误类
export class GameError extends CustomError {
  constructor(message: string, code: string, details?: any) {
    super(message, 400, code, details);
    this.name = 'GameError';
  }
}

/**
 * 处理Sequelize验证错误
 */
function handleSequelizeValidationError(error: ValidationError): {
  message: string;
  code: string;
  details: any;
} {
  const errors = error.errors.map(err => ({
    field: err.path,
    message: err.message,
    value: err.value
  }));

  return {
    message: '数据验证失败',
    code: 'VALIDATION_ERROR',
    details: { errors }
  };
}

/**
 * 处理Sequelize数据库错误
 */
function handleSequelizeError(error: any): {
  message: string;
  code: string;
  statusCode: number;
  details?: any;
} {
  // 唯一约束违反
  if (error.name === 'SequelizeUniqueConstraintError') {
    const field = error.errors[0]?.path || 'unknown';
    return {
      message: `${field} 已存在`,
      code: 'DUPLICATE_ENTRY',
      statusCode: 409,
      details: { field, value: error.errors[0]?.value }
    };
  }

  // 外键约束违反
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return {
      message: '关联数据不存在',
      code: 'FOREIGN_KEY_CONSTRAINT',
      statusCode: 400,
      details: { table: error.table, field: error.fields }
    };
  }

  // 连接错误
  if (error.name === 'SequelizeConnectionError') {
    return {
      message: '数据库连接失败',
      code: 'DATABASE_CONNECTION_ERROR',
      statusCode: 503
    };
  }

  // 超时错误
  if (error.name === 'SequelizeTimeoutError') {
    return {
      message: '数据库操作超时',
      code: 'DATABASE_TIMEOUT',
      statusCode: 504
    };
  }

  // 其他数据库错误
  return {
    message: '数据库操作失败',
    code: 'DATABASE_ERROR',
    statusCode: 500,
    details: process.env.NODE_ENV === 'development' ? { originalError: error.message } : undefined
  };
}

/**
 * 处理JWT错误
 */
function handleJWTError(error: any): {
  message: string;
  code: string;
  statusCode: number;
} {
  if (error.name === 'JsonWebTokenError') {
    return {
      message: '无效的访问令牌',
      code: 'INVALID_TOKEN',
      statusCode: 401
    };
  }

  if (error.name === 'TokenExpiredError') {
    return {
      message: '访问令牌已过期',
      code: 'TOKEN_EXPIRED',
      statusCode: 401
    };
  }

  if (error.name === 'NotBeforeError') {
    return {
      message: '访问令牌尚未生效',
      code: 'TOKEN_NOT_ACTIVE',
      statusCode: 401
    };
  }

  return {
    message: '令牌验证失败',
    code: 'TOKEN_ERROR',
    statusCode: 401
  };
}

/**
 * 错误处理中间件
 */
export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  let statusCode = 500;
  let message = '服务器内部错误';
  let code = 'INTERNAL_ERROR';
  let details: any = undefined;

  // 记录错误日志
  console.error('错误详情:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId,
    timestamp: new Date().toISOString()
  });

  // 处理自定义错误
  if (error instanceof CustomError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
    details = error.details;
  }
  // 处理Sequelize验证错误
  else if (error instanceof ValidationError) {
    const validationResult = handleSequelizeValidationError(error);
    statusCode = 400;
    message = validationResult.message;
    code = validationResult.code;
    details = validationResult.details;
  }
  // 处理其他Sequelize错误
  else if (error.name && error.name.startsWith('Sequelize')) {
    const sequelizeResult = handleSequelizeError(error);
    statusCode = sequelizeResult.statusCode;
    message = sequelizeResult.message;
    code = sequelizeResult.code;
    details = sequelizeResult.details;
  }
  // 处理JWT错误
  else if (error.name && (error.name.includes('JsonWebToken') || error.name.includes('Token'))) {
    const jwtResult = handleJWTError(error);
    statusCode = jwtResult.statusCode;
    message = jwtResult.message;
    code = jwtResult.code;
  }
  // 处理语法错误
  else if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    message = '请求数据格式错误';
    code = 'INVALID_JSON';
  }
  // 处理类型错误
  else if (error instanceof TypeError) {
    statusCode = 400;
    message = '请求参数类型错误';
    code = 'TYPE_ERROR';
    details = process.env.NODE_ENV === 'development' ? { originalError: error.message } : undefined;
  }
  // 处理范围错误
  else if (error instanceof RangeError) {
    statusCode = 400;
    message = '请求参数超出有效范围';
    code = 'RANGE_ERROR';
  }
  // 处理其他已知错误类型
  else if (error.statusCode && error.message) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code || 'UNKNOWN_ERROR';
  }

  // 在开发环境中提供更多错误信息
  if (process.env.NODE_ENV === 'development' && !details) {
    details = {
      stack: error.stack,
      originalError: error.message
    };
  }

  // 构建错误响应
  const errorResponse: any = {
    success: false,
    message,
    code,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  // 只在有详细信息时添加details字段
  if (details) {
    errorResponse.details = details;
  }

  // 添加请求ID（如果存在）
  if (req.headers['x-request-id']) {
    errorResponse.requestId = req.headers['x-request-id'];
  }

  // 发送错误响应
  res.status(statusCode).json(errorResponse);
};

/**
 * 404错误处理中间件
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`路由 ${req.method} ${req.path} 不存在`);
  next(error);
};

/**
 * 异步错误包装器
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 验证请求体中间件
 */
export const validateRequestBody = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingFields = requiredFields.filter(field => {
      return req.body[field] === undefined || req.body[field] === null || req.body[field] === '';
    });

    if (missingFields.length > 0) {
      throw new ValidationErrorCustom('缺少必需的字段', {
        missingFields,
        receivedFields: Object.keys(req.body)
      });
    }

    next();
  };
};

/**
 * 验证查询参数中间件
 */
export const validateQueryParams = (requiredParams: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingParams = requiredParams.filter(param => {
      return req.query[param] === undefined || req.query[param] === null || req.query[param] === '';
    });

    if (missingParams.length > 0) {
      throw new ValidationErrorCustom('缺少必需的查询参数', {
        missingParams,
        receivedParams: Object.keys(req.query)
      });
    }

    next();
  };
};

/**
 * 验证路径参数中间件
 */
export const validatePathParams = (requiredParams: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingParams = requiredParams.filter(param => {
      return req.params[param] === undefined || req.params[param] === null || req.params[param] === '';
    });

    if (missingParams.length > 0) {
      throw new ValidationErrorCustom('缺少必需的路径参数', {
        missingParams,
        receivedParams: Object.keys(req.params)
      });
    }

    next();
  };
};

/**
 * 数值验证中间件
 */
export const validateNumericParams = (params: { [key: string]: { min?: number; max?: number; integer?: boolean } }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: any[] = [];

    Object.entries(params).forEach(([paramName, rules]) => {
      const value = req.body[paramName] || req.query[paramName] || req.params[paramName];
      
      if (value !== undefined && value !== null && value !== '') {
        const numValue = Number(value);
        
        if (isNaN(numValue)) {
          errors.push({
            field: paramName,
            message: `${paramName} 必须是数字`,
            value
          });
          return;
        }
        
        if (rules.integer && !Number.isInteger(numValue)) {
          errors.push({
            field: paramName,
            message: `${paramName} 必须是整数`,
            value
          });
        }
        
        if (rules.min !== undefined && numValue < rules.min) {
          errors.push({
            field: paramName,
            message: `${paramName} 不能小于 ${rules.min}`,
            value
          });
        }
        
        if (rules.max !== undefined && numValue > rules.max) {
          errors.push({
            field: paramName,
            message: `${paramName} 不能大于 ${rules.max}`,
            value
          });
        }
      }
    });

    if (errors.length > 0) {
      throw new ValidationErrorCustom('数值验证失败', { errors });
    }

    next();
  };
};

/**
 * 游戏状态验证中间件
 */
export const validateGameState = (req: Request, res: Response, next: NextFunction) => {
  // 这里可以添加游戏状态验证逻辑
  // 例如检查游戏是否在维护中、服务器是否过载等
  next();
};

export default {
  CustomError,
  BusinessError,
  ValidationErrorCustom,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  GameError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validateRequestBody,
  validateQueryParams,
  validatePathParams,
  validateNumericParams,
  validateGameState
};