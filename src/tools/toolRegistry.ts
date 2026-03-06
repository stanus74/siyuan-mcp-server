/**
 * Tool Registry
 * Manages registration, discovery, and execution of all standardized tools
 */

import logger from '../logger.js';
import { 
  StandardTool, 
  StandardToolResponse, 
  ToolRegistry, 
  StandardToolError, 
  ToolErrorType 
} from './standardTypes.js';
import { cacheManager } from '../utils/cache.js';
import { performanceOptimizer } from '../utils/performanceOptimizer.js';

/**
 * Tool Registry Implementation
 */
export class StandardToolRegistry implements ToolRegistry {
  private tools = new Map<string, StandardTool>();
  private executionStats = new Map<string, {
    totalExecutions: number;
    successCount: number;
    failureCount: number;
    averageExecutionTime: number;
    lastExecuted: Date;
  }>();

  /**
   * Register a tool
   */
  register(tool: StandardTool): void {
    const toolDefinition = tool.getToolDefinition();
    const toolName = toolDefinition.name;

    if (this.tools.has(toolName)) {
      logger.warn(`Tool '${toolName}' already exists, will be overridden`);
    }

    this.tools.set(toolName, tool);
    
    // Initialize statistics
    this.executionStats.set(toolName, {
      totalExecutions: 0,
      successCount: 0,
      failureCount: 0,
      averageExecutionTime: 0,
      lastExecuted: new Date()
    });

    logger.info(`Tool '${toolName}' registered successfully`);
  }

  /**
   * Unregister a tool
   */
  unregister(toolName: string): void {
    if (this.tools.delete(toolName)) {
      this.executionStats.delete(toolName);
      logger.info(`Tool '${toolName}' unregistered successfully`);
    } else {
      logger.warn(`Tool '${toolName}' does not exist, cannot unregister`);
    }
  }

  /**
   * Get a tool
   */
  get(toolName: string): StandardTool | undefined {
    return this.tools.get(toolName);
  }

  /**
   * List all tools
   */
  list(): StandardTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get all tool definitions (MCP format)
   */
  getAllToolDefinitions() {
    return Array.from(this.tools.values()).map(tool => tool.getToolDefinition());
  }

  /**
   * Get AI usage metadata for a tool
   */
  getAIUsageMetadata(toolName: string) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return null;
    }
    return tool.getAIUsageMetadata();
  }

  /**
   * Get AI usage metadata for all tools
   */
  getAllAIUsageMetadata() {
    const metadata: Record<string, any> = {};
    for (const [name, tool] of this.tools.entries()) {
      metadata[name] = tool.getAIUsageMetadata();
    }
    return metadata;
  }

  /**
   * Recommend tools based on usage scenario
   */
  recommendToolsForScenario(scenario: string): string[] {
    const recommendations: Array<{ toolName: string; relevance: number }> = [];

    for (const [name, tool] of this.tools.entries()) {
      const aiUsage = tool.getAIUsageMetadata();
      if (!aiUsage) continue;

      let relevance = 0;
      const scenarioLower = scenario.toLowerCase();
      const whenToUseLower = aiUsage.whenToUse.toLowerCase();

      // Check if 'whenToUse' contains scenario keywords
      if (whenToUseLower.includes(scenarioLower)) {
        relevance += 10;
      }

      // Check if examples contain the scenario
      for (const example of aiUsage.examples) {
        if (example.toLowerCase().includes(scenarioLower)) {
          relevance += 5;
        }
      }

      if (relevance > 0) {
        recommendations.push({ toolName: name, relevance });
      }
    }

    // Sort by relevance
    recommendations.sort((a, b) => b.relevance - a.relevance);

    return recommendations.map(r => r.toolName);
  }

  /**
   * Get tool selection advice
   */
  getToolSelectionAdvice(userIntent: string) {
    const intentLower = userIntent.toLowerCase();
    const advice: {
      recommended: string[];
      alternatives: string[];
      reasoning: string[];
    } = {
      recommended: [],
      alternatives: [],
      reasoning: []
    };

    // Analyze user intent and recommend tools
    for (const [name, tool] of this.tools.entries()) {
      const aiUsage = tool.getAIUsageMetadata();
      if (!aiUsage) continue;

      // Check 'whenToUse'
      if (aiUsage.whenToUse.toLowerCase().includes(intentLower)) {
        advice.recommended.push(name);
        advice.reasoning.push(`Tool '${name}' use scenario includes: ${aiUsage.whenToUse}`);
      }

      // Check examples
      for (const example of aiUsage.examples) {
        if (example.toLowerCase().includes(intentLower)) {
          if (!advice.recommended.includes(name)) {
            advice.recommended.push(name);
          }
          advice.reasoning.push(`Tool '${name}' example: ${example}`);
        }
      }

      // Collect alternative tools
      if (aiUsage.alternativeTools) {
        for (const altTool of aiUsage.alternativeTools) {
          if (!advice.alternatives.includes(altTool)) {
            advice.alternatives.push(altTool);
          }
        }
      }
    }

    // Deduplicate
    advice.recommended = [...new Set(advice.recommended)];
    advice.alternatives = [...new Set(advice.alternatives)];

    return advice;
  }

  /**
   * Execute a tool
   */
  async execute(toolName: string, parameters: Record<string, any>): Promise<StandardToolResponse> {
    const startTime = Date.now();
    
    try {
      // Check if tool exists
      const tool = this.tools.get(toolName);
      if (!tool) {
        throw new StandardToolError(
          ToolErrorType.RESOURCE_NOT_FOUND,
          `Tool '${toolName}' does not exist`,
          'TOOL_NOT_FOUND',
          { toolName, availableTools: Array.from(this.tools.keys()) }
        );
      }

      // Log execution start
      logger.info({
        toolName,
        parameters,
        requestId: `${toolName}_${Date.now()}`
      }, 'Starting tool execution');

      // Use performance optimizer to execute tool
      const result = await performanceOptimizer.optimizeOperation(async () => {
        return await tool.executeWithStandardization(parameters);
      });

      // Update execution statistics
      this.updateExecutionStats(toolName, Date.now() - startTime, true);

      // Log execution success
      logger.info({
        toolName,
        success: result.success,
        executionTime: result.executionTime,
        message: result.message
      }, 'Tool execution completed');

      return result;

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      // Update execution statistics
      this.updateExecutionStats(toolName, executionTime, false);

      // Handle standardized errors
      if (error instanceof StandardToolError) {
        logger.error({
          toolName,
          errorType: error.type,
          errorCode: error.code,
          message: error.message,
          details: error.details
        }, 'Tool execution failed');

        return error.toStandardResponse(toolName, executionTime);
      }

      // Handle other errors
      logger.error({
        toolName,
        error: error.message,
        stack: error.stack
      }, 'Tool execution encountered an unknown error');

      const standardError = new StandardToolError(
        ToolErrorType.INTERNAL_ERROR,
        error.message || 'Tool execution failed',
        'EXECUTION_FAILED',
        { originalError: error.toString() }
      );

      return standardError.toStandardResponse(toolName, executionTime);
    }
  }

  /**
   * Batch execute tools
   */
  async executeBatch(requests: Array<{ toolName: string; parameters: Record<string, any> }>): Promise<StandardToolResponse[]> {
    const results: StandardToolResponse[] = [];
    
    // Execute batch requests with concurrency control
    const batchSize = 3; // Limit concurrency
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => 
        this.execute(request.toolName, request.parameters)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get tool execution statistics
   */
  getExecutionStats(toolName?: string) {
    if (toolName) {
      return this.executionStats.get(toolName);
    }
    
    const allStats: Record<string, any> = {};
    for (const [name, stats] of this.executionStats.entries()) {
      allStats[name] = { ...stats };
    }
    return allStats;
  }

  /**
   * Get tool health status
   */
  getHealthStatus() {
    const totalTools = this.tools.size;
    let totalExecutions = 0;
    let totalSuccesses = 0;
    let totalFailures = 0;

    for (const stats of this.executionStats.values()) {
      totalExecutions += stats.totalExecutions;
      totalSuccesses += stats.successCount;
      totalFailures += stats.failureCount;
    }

    const successRate = totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0;

    return {
      totalTools,
      totalExecutions,
      totalSuccesses,
      totalFailures,
      successRate: Math.round(successRate * 100) / 100,
      registeredTools: Array.from(this.tools.keys()),
      memoryUsage: performanceOptimizer.getMemoryUsage(),
      cacheStats: cacheManager.getAllStats()
    };
  }

  /**
   * Update execution statistics
   */
  private updateExecutionStats(toolName: string, executionTime: number, success: boolean): void {
    const stats = this.executionStats.get(toolName);
    if (!stats) return;

    stats.totalExecutions++;
    stats.lastExecuted = new Date();
    
    if (success) {
      stats.successCount++;
    } else {
      stats.failureCount++;
    }

    // Update average execution time
    const totalTime = stats.averageExecutionTime * (stats.totalExecutions - 1) + executionTime;
    stats.averageExecutionTime = Math.round(totalTime / stats.totalExecutions);
  }

  /**
   * Clear statistics
   */
  clearStats(): void {
    for (const stats of this.executionStats.values()) {
      stats.totalExecutions = 0;
      stats.successCount = 0;
      stats.failureCount = 0;
      stats.averageExecutionTime = 0;
    }
    logger.info('Tool execution statistics cleared');
  }

  /**
   * Destroy registry
   */
  destroy(): void {
    this.tools.clear();
    this.executionStats.clear();
    logger.info('Tool registry destroyed');
  }
}

// Export global tool registry instance
export const toolRegistry = new StandardToolRegistry();
