import logger from '../logger';

export interface RetryConfig {
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelay: number; // Base delay time (milliseconds)
  maxDelay: number; // Maximum delay time (milliseconds)
  retryableErrors: string[]; // Retryable error types
  onRetry?: (attempt: number, error: Error) => void;
}

export interface RetryStats {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  averageAttempts: number;
}

export class RetryManager {
  private stats: RetryStats = {
    totalAttempts: 0,
    successfulRetries: 0,
    failedRetries: 0,
    averageAttempts: 0
  };

  private defaultConfig: RetryConfig = {
    maxRetries: 3,
    backoffStrategy: 'exponential',
    baseDelay: 1000,
    maxDelay: 10000,
    retryableErrors: [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNRESET',
      'Network Error',
      'timeout'
    ]
  };

  /**
   * Execute operation with retry
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    let lastError: Error;
    let attempt = 0;

    while (attempt <= finalConfig.maxRetries) {
      try {
        this.stats.totalAttempts++;
        const result = await operation();
        
        if (attempt > 0) {
          this.stats.successfulRetries++;
          logger.info(`Operation succeeded after ${attempt + 1} attempts`);
        }
        
        this.updateAverageAttempts();
        return result;
        
      } catch (error) {
        lastError = error as Error;
        
        // Check if the error is retryable
        if (!this.isRetryableError(lastError, finalConfig.retryableErrors)) {
          logger.debug(`Non-retryable error: ${lastError.message}`);
          throw lastError;
        }

        // If maximum retries reached
        if (attempt >= finalConfig.maxRetries) {
          this.stats.failedRetries++;
          logger.error(`Operation failed, maximum retries reached ${finalConfig.maxRetries}`);
          break;
        }

        // Calculate delay time
        const delay = this.calculateDelay(attempt, finalConfig);
        
        logger.warn({
          attempt: attempt + 1,
          maxRetries: finalConfig.maxRetries,
          delay,
          error: lastError.message
        }, `Operation failed, will retry in ${delay}ms`);

        // Call retry callback
        if (finalConfig.onRetry) {
          finalConfig.onRetry(attempt + 1, lastError);
        }

        // Wait for delay time
        await this.delay(delay);
        attempt++;
      }
    }

    this.updateAverageAttempts();
    throw lastError!;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error, retryableErrors: string[]): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorCode = (error as any).code;
    
    return retryableErrors.some(retryableError => {
      const lowerRetryable = retryableError.toLowerCase();
      return errorMessage.includes(lowerRetryable) || 
             errorCode === retryableError ||
             error.name.toLowerCase().includes(lowerRetryable);
    });
  }

  /**
   * Calculate delay time
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay: number;

    switch (config.backoffStrategy) {
      case 'linear':
        delay = config.baseDelay * (attempt + 1);
        break;
      case 'exponential':
        delay = config.baseDelay * Math.pow(2, attempt);
        break;
      case 'fixed':
      default:
        delay = config.baseDelay;
        break;
    }

    // Add random jitter to avoid thundering herd
    const jitter = Math.random() * 0.1 * delay;
    delay += jitter;

    // Ensure delay does not exceed maximum
    return Math.min(delay, config.maxDelay);
  }

  /**
   * Delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update average attempts
   */
  private updateAverageAttempts(): void {
    const totalOperations = this.stats.successfulRetries + this.stats.failedRetries;
    if (totalOperations > 0) {
      this.stats.averageAttempts = this.stats.totalAttempts / totalOperations;
    }
  }

  /**
   * Get retry statistics
   */
  getStats(): RetryStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageAttempts: 0
    };
  }
}

// Global retry manager instance
export const retryManager = new RetryManager();

/**
 * Convenient retry function
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  return retryManager.withRetry(operation, config);
}
