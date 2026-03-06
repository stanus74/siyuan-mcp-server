/**
 * Base service class
 * Provides common functionality and interface specifications for all services
 */

import logger from '../logger.js';
import { cacheManager } from '../utils/cache.js';
import { performanceOptimizer } from '../utils/performanceOptimizer.js';
import { securityValidator, ValidationResult, RequestContext } from './SecurityValidator.js';
import { retryManager } from '../utils/retry.js';
import { 
  BaseConfig, 
  OperationResult, 
  PerformanceMetrics, 
  HealthCheckResult,
  ModuleStatus 
} from '../interfaces/index.js';

interface SecureOperationOptions {
  useCache?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  timeout?: number;
  skipValidation?: boolean;
  skipPermissionCheck?: boolean;
  context?: RequestContext;
  retryOptions?: {
    maxRetries: number;
    baseDelay: number;
  };
}

interface ServiceSecurityConfig {
  enableInputValidation: boolean;
  enablePermissionCheck: boolean;
  enableRateLimit: boolean;
  enableAuditLog: boolean;
  maxOperationsPerMinute: number;
  sensitiveOperations: string[];
}

/**
 * Base service abstract class
 */
export abstract class BaseService {
  protected config: BaseConfig;
  protected serviceName: string;
  protected version: string;
  protected isInitialized: boolean = false;
  protected errorCount: number = 0;
  protected totalRequests: number = 0;
  protected successfulRequests: number = 0;
  protected lastActivity: Date = new Date();

  constructor(serviceName: string, version: string, config: BaseConfig) {
    this.serviceName = serviceName;
    this.version = version;
    this.config = config;
  }

  /**
   * Initialize service
   */
  async initialize(): Promise<void> {
    try {
      logger.info(`Initializing service: ${this.serviceName} v${this.version}`);
      
      await this.onInitialize();
      
      this.isInitialized = true;
      logger.info(`Service initialization completed: ${this.serviceName}`);
    } catch (error: any) {
      logger.error(`Service initialization failed: ${this.serviceName}`, error);
      throw error;
    }
  }

  /**
   * Initialization logic that subclasses must implement
   */
  protected abstract onInitialize(): Promise<void>;

  /**
   * Execute operations with performance monitoring and error handling
   */
  protected async executeOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    options: {
      useCache?: boolean;
      cacheKey?: string;
      cacheTTL?: number;
      timeout?: number;
    } = {}
  ): Promise<OperationResult<T>> {
    const startTime = Date.now();
    const { useCache = false, cacheKey, cacheTTL = 300000, timeout = 30000 } = options;

    this.totalRequests++;
    this.lastActivity = new Date();

    try {
      // Check cache
      if (useCache && cacheKey) {
        const cache = cacheManager.getCache(this.serviceName);
        const cachedResult = cache.get(cacheKey);
        if (cachedResult) {
          logger.debug(`Cache hit: ${operationName} - ${cacheKey}`);
          return this.createSuccessResult(cachedResult, startTime, true);
        }
      }

      // Execute operation with timeout control
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out: ${operationName}`)), timeout);
      });

      const result = await Promise.race([
        performanceOptimizer.optimizeOperation(operation),
        timeoutPromise
      ]);

      // Cache result
      if (useCache && cacheKey) {
        const cache = cacheManager.getCache(this.serviceName);
        cache.set(cacheKey, result, cacheTTL);
      }

      this.successfulRequests++;
      return this.createSuccessResult(result, startTime);

    } catch (error: any) {
      this.errorCount++;
      logger.error(`Operation failed: ${operationName}`, {
        serviceName: this.serviceName,
        error: error.message,
        stack: error.stack
      });

      return this.createErrorResult(error.message, startTime);
    }
  }

  /**
   * Create success result
   */
  private createSuccessResult<T>(
    data: T, 
    startTime: number, 
    fromCache: boolean = false
  ): OperationResult<T> {
    const executionTime = Date.now() - startTime;
    
    return {
      success: true,
      data,
      message: fromCache ? 'Operation successful (from cache)' : 'Operation successful',
      timestamp: new Date().toISOString(),
      performance: {
        executionTime,
        memoryUsage: {
          before: 0,
          after: 0,
          peak: 0
        },
        apiCalls: fromCache ? 0 : 1,
        cacheHits: fromCache ? 1 : 0
      }
    };
  }

  /**
   * Create error result
   */
  private createErrorResult<T = null>(error: string, startTime: number): OperationResult<T> {
    const executionTime = Date.now() - startTime;
    
    return {
      success: false,
      data: null,
      error,
      message: 'Operation failed',
      timestamp: new Date().toISOString(),
      performance: {
        executionTime,
        memoryUsage: {
          before: 0,
          after: 0,
          peak: 0
        },
        apiCalls: 1
      }
    } as OperationResult<T>;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const memoryUsage = performanceOptimizer.getMemoryUsage();
      const isHealthy = this.isInitialized && this.errorCount < 10;
      
      return {
        status: isHealthy ? 'healthy' : 'degraded',
        details: {
          api: this.isInitialized,
          database: true, // Simplified implementation
          cache: true,
          memory: {
            used: memoryUsage.heapUsed,
            total: memoryUsage.heapTotal,
            percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
          }
        },
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        details: {
          api: false,
          database: false,
          cache: false,
          memory: { used: 0, total: 0, percentage: 0 }
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get module status
   */
  getModuleStatus(): ModuleStatus {
    const successRate = this.totalRequests > 0 
      ? (this.successfulRequests / this.totalRequests) * 100 
      : 0;

    return {
      name: this.serviceName,
      version: this.version,
      status: this.isInitialized ? 'active' : 'inactive',
      lastActivity: this.lastActivity.toISOString(),
      errorCount: this.errorCount,
      performance: {
        averageResponseTime: 0, // Simplified implementation
        successRate: Math.round(successRate * 100) / 100,
        totalRequests: this.totalRequests
      }
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.errorCount = 0;
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.lastActivity = new Date();
    logger.info(`服务统计信息已重置: ${this.serviceName}`);
  }

  /**
   * 销毁服务
   */
  async destroy(): Promise<void> {
    try {
      logger.info(`正在销毁服务: ${this.serviceName}`);
      
      await this.onDestroy();
      
      this.isInitialized = false;
      logger.info(`服务销毁完成: ${this.serviceName}`);
    } catch (error: any) {
      logger.error(`服务销毁失败: ${this.serviceName}`, error);
      throw error;
    }
  }

  /**
   * 子类实现的销毁逻辑
   */
  protected abstract onDestroy(): Promise<void>;

  /**
   * 获取配置
   */
  getConfig(): BaseConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<BaseConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info(`服务配置已更新: ${this.serviceName}`);
  }

  /**
   * 检查服务是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
