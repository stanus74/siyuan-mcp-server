/**
 * Performance optimizer - simplified version
 * Specialized memory management and performance optimization for low-parameter model environments
 */

import logger from '../logger.js';
import { cacheManager } from './cache.js';

/**
 * Performance configuration interface
 */
export interface PerformanceConfig {
  memoryThreshold: number;        // Memory threshold (MB)
  gcInterval: number;             // Garbage collection interval (milliseconds)
  enableAdaptiveOptimization: boolean; // Enable adaptive optimization
  lowMemoryMode: boolean;         // Low memory mode
  maxConcurrentOperations: number; // Maximum concurrent operations
}

/**
 * Default performance configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  memoryThreshold: 100,
  gcInterval: 30000,
  enableAdaptiveOptimization: true,
  lowMemoryMode: false,
  maxConcurrentOperations: 5
};

/**
 * Performance optimizer class
 */
export class PerformanceOptimizer {
  private config: PerformanceConfig;
  private gcTimer: NodeJS.Timeout | null = null;
  private operationQueue: Array<() => Promise<any>> = [];
  private activeOperations = 0;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
    this.startPerformanceMonitoring();
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Periodic garbage collection
    if (this.config.gcInterval > 0) {
      this.gcTimer = setInterval(() => {
        this.performGarbageCollection();
      }, this.config.gcInterval);
    }
  }

  /**
   * Perform garbage collection
   */
  private performGarbageCollection(): void {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    if (heapUsedMB > this.config.memoryThreshold) {
      if (global.gc) {
        global.gc();
        logger.info(`Perform garbage collection, memory usage: ${heapUsedMB}MB`);
      } else {
        logger.warn('Garbage collection not available, please use --expose-gc startup parameter');
      }
    }
  }

  /**
   * Optimize operation execution
   */
  async optimizeOperation<T>(operation: () => Promise<T>): Promise<T> {
    // If maximum concurrency reached, wait
    while (this.activeOperations >= this.config.maxConcurrentOperations) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.activeOperations++;
    
    try {
      const result = await operation();
      return result;
    } finally {
      this.activeOperations--;
    }
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): { heapUsed: number; heapTotal: number; external: number; rss: number } {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024)
    };
  }

  /**
   * Check if low memory mode should be enabled
   */
  shouldUseLowMemoryMode(): boolean {
    const memUsage = this.getMemoryUsage();
    return this.config.lowMemoryMode || memUsage.heapUsed > this.config.memoryThreshold;
  }

  /**
   * Destroy optimizer
   */
  destroy(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
  }
}

// Export global performance optimizer instance
export const performanceOptimizer = new PerformanceOptimizer();

/**
 * Memory optimization decorator
 */
function memoryOptimized<T extends (...args: any[]) => Promise<any>>(
  target: T,
  options: { cacheKey?: string; ttl?: number } = {}
): T {
  return (async (...args: any[]) => {
    const { cacheKey, ttl = 300000 } = options;
    
    // If a cache key is provided, try to get from cache
    if (cacheKey) {
      const cache = cacheManager.getCache('memoryOptimized');
      const key = `${cacheKey}_${JSON.stringify(args)}`;
      const cached = cache.get(key);
      
      if (cached) {
        return cached;
      }
      
      // Execute operation and cache result
      const result = await performanceOptimizer.optimizeOperation(() => target(...args));
      cache.set(key, result, ttl);
      return result;
    }
    
    // Directly execute optimization operation
    return await performanceOptimizer.optimizeOperation(() => target(...args));
  }) as T;
}
