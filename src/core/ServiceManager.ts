/**
 * Service manager
 * Unified management of all service lifecycles and states
 */

import logger from '../logger.js';
import { BaseService } from './BaseService.js';
import { HealthCheckResult, ModuleStatus } from '../interfaces/index.js';

/**
 * 服务管理器类
 */
export class ServiceManager {
  private services = new Map<string, BaseService>();
  private isInitialized: boolean = false;

  /**
   * Register services
   */
  register(service: BaseService): void {
    const serviceName = service.getModuleStatus().name;
    
    if (this.services.has(serviceName)) {
      logger.warn(`Service '${serviceName}' already exists and will be overwritten`);
    }

    this.services.set(serviceName, service);
    logger.info(`Service '${serviceName}' registered successfully`);
  }

  /**
   * Unregister services
   */
  async unregister(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);
    if (service) {
      await service.destroy();
      this.services.delete(serviceName);
      logger.info(`Service '${serviceName}' unregistered successfully`);
    } else {
      logger.warn(`Service '${serviceName}' does not exist and cannot be unregistered`);
    }
  }

  /**
   * 获取服务
   */
  getService<T extends BaseService>(serviceName: string): T | undefined {
    return this.services.get(serviceName) as T;
  }

  /**
   * Initialize all services
   */
  async initializeAll(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Service manager already initialized');
      return;
    }

    logger.info('Starting initialization of all services...');
    
    const initPromises = Array.from(this.services.entries()).map(async ([name, service]) => {
      try {
        await service.initialize();
        logger.info(`Service '${name}' initialized successfully`);
      } catch (error: any) {
        logger.error(`Service '${name}' initialization failed:`, error);
        throw new Error(`服务 '${name}' 初始化失败: ${error.message}`);
      }
    });

    await Promise.all(initPromises);
    
    this.isInitialized = true;
    logger.info('All services initialization completed');
  }

  /**
   * Destroy all services
   */
  async destroyAll(): Promise<void> {
    logger.info('Starting destruction of all services...');
    
    const destroyPromises = Array.from(this.services.entries()).map(async ([name, service]) => {
      try {
        await service.destroy();
        logger.info(`Service '${name}' destroyed successfully`);
      } catch (error: any) {
        logger.error(`Service '${name}' destruction failed:`, error);
      }
    });

    await Promise.all(destroyPromises);
    
    this.services.clear();
    this.isInitialized = false;
    logger.info('All services destruction completed');
  }

  /**
   * Get health status of all services
   */
  async getHealthStatus(): Promise<Record<string, HealthCheckResult>> {
    const healthResults: Record<string, HealthCheckResult> = {};
    
    const healthPromises = Array.from(this.services.entries()).map(async ([name, service]) => {
      try {
        healthResults[name] = await service.healthCheck();
      } catch (error: any) {
        logger.error(`Failed to get health status for service '${name}':`, error);
        healthResults[name] = {
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
    });

    await Promise.all(healthPromises);
    return healthResults;
  }

  /**
   * Get module status of all services
   */
  getAllModuleStatus(): Record<string, ModuleStatus> {
    const statusResults: Record<string, ModuleStatus> = {};
    
    for (const [name, service] of this.services.entries()) {
      try {
        statusResults[name] = service.getModuleStatus();
      } catch (error: any) {
        logger.error(`Failed to get module status for service '${name}':`, error);
        statusResults[name] = {
          name,
          version: 'unknown',
          status: 'error',
          lastActivity: new Date().toISOString(),
          errorCount: 999,
          performance: {
            averageResponseTime: 0,
            successRate: 0,
            totalRequests: 0
          }
        };
      }
    }

    return statusResults;
  }

  /**
   * Restart service
   */
  async restartService(serviceName: string): Promise<void> {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service '${serviceName}' does not exist`);
    }

    logger.info(`Restarting service: ${serviceName}`);
    
    try {
      await service.destroy();
      await service.initialize();
      logger.info(`Service '${serviceName}' restarted successfully`);
    } catch (error: any) {
      logger.error(`Service '${serviceName}' restart failed:`, error);
      throw error;
    }
  }

  /**
   * Restart all services
   */
  async restartAll(): Promise<void> {
    logger.info('Starting restart of all services...');
    
    await this.destroyAll();
    await this.initializeAll();
    
    logger.info('All services restart completed');
  }

  /**
   * 获取服务统计信息
   */
  getServiceStats(): {
    totalServices: number;
    activeServices: number;
    inactiveServices: number;
    errorServices: number;
    isManagerInitialized: boolean;
  } {
    const statuses = this.getAllModuleStatus();
    const statusValues = Object.values(statuses);
    
    return {
      totalServices: this.services.size,
      activeServices: statusValues.filter(s => s.status === 'active').length,
      inactiveServices: statusValues.filter(s => s.status === 'inactive').length,
      errorServices: statusValues.filter(s => s.status === 'error').length,
      isManagerInitialized: this.isInitialized
    };
  }

  /**
   * 列出所有服务名称
   */
  listServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * 检查服务是否存在
   */
  hasService(serviceName: string): boolean {
    return this.services.has(serviceName);
  }

  /**
   * 检查管理器是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Reset statistics for all services
   */
  resetAllStats(): void {
    for (const service of this.services.values()) {
      service.resetStats();
    }
    logger.info('All service statistics have been reset');
  }
}

// 导出全局服务管理器实例
export const serviceManager = new ServiceManager();
