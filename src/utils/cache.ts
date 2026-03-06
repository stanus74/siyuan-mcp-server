/**
 * Cache Manager
 * Provides memory caching and performance optimization features
 */

import logger from '../logger.js';

/**
 * Cache item interface
 */
interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  enableStats: boolean;
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  memoryUsage: number;
}

/**
 * Default cache configuration
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 1000,
  defaultTTL: 300000, // 5 minutes
  cleanupInterval: 60000, // 1 minute
  enableStats: true
};

/**
 * Memory cache manager
 */
export class MemoryCache<T = any> {
  private cache = new Map<string, CacheItem<T>>();
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
      memoryUsage: 0
    };

    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Set cache item
   */
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const itemTTL = ttl || this.config.defaultTTL;

    // If cache is full, remove the least used items
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: now,
      ttl: itemTTL,
      accessCount: 0,
      lastAccessed: now
    });

    this.updateStats();
  }

  /**
   * Get cache item
   */
  get(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    const now = Date.now();
    
    // Check if expired
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    // Update access information
    item.accessCount++;
    item.lastAccessed = now;
    
    this.stats.hits++;
    this.updateHitRate();
    
    return item.value;
  }

  /**
   * Delete cache item
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    this.updateStats();
    return result;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.updateStats();
  }

  /**
   * Check if cache item exists
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up expired items
   */
  private cleanup(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      logger.debug(`Cache cleanup completed, removed ${removedCount} expired items`);
      this.updateStats();
    }
  }

  /**
   * 移除最少使用的项（LRU）
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < lruTime) {
        lruTime = item.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      logger.debug(`LRU淘汰: ${lruKey}`);
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.size = this.cache.size;
    this.updateHitRate();
    this.updateMemoryUsage();
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * 更新内存使用量估算
   */
  private updateMemoryUsage(): void {
    // 简单估算内存使用量
    this.stats.memoryUsage = this.cache.size * 1024; // 假设每项1KB
  }

  /**
   * 销毁缓存
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

/**
 * 全局缓存管理器
 */
class CacheManager {
  private caches = new Map<string, MemoryCache>();

  /**
   * 获取或创建缓存实例
   */
  getCache<T = any>(name: string, config?: Partial<CacheConfig>): MemoryCache<T> {
    if (!this.caches.has(name)) {
      this.caches.set(name, new MemoryCache<T>(config));
    }
    return this.caches.get(name) as MemoryCache<T>;
  }

  /**
   * 销毁指定缓存
   */
  destroyCache(name: string): boolean {
    const cache = this.caches.get(name);
    if (cache) {
      cache.destroy();
      return this.caches.delete(name);
    }
    return false;
  }

  /**
   * 销毁所有缓存
   */
  destroyAll(): void {
    for (const cache of this.caches.values()) {
      cache.destroy();
    }
    this.caches.clear();
  }

  /**
   * 获取所有缓存统计
   */
  getAllStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }
    return stats;
  }
}

// 导出全局缓存管理器实例
export const cacheManager = new CacheManager();

// 导出默认缓存实例
export const defaultCache = cacheManager.getCache('default');
