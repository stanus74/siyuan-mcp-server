/**
 * Tool call interceptor
 * Responsible for intercepting and validating all MCP tool calls, ensuring compliance with security rules and dependencies
 */

import { ToolPriorityManager, ToolCallRecord } from './ToolPriorityManager';
import logger from '../logger';

/**
 * Tool call request interface
 */
export interface ToolCallRequest {
  toolName: string;
  parameters: any;
  timestamp?: number;
  requestId?: string;
}

/**
 * Tool call interception result interface
 */
export interface InterceptResult {
  allowed: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  suggestedOrder?: string[];
  modifiedParameters?: any;
}

/**
 * Batch call validation result interface
 */
export interface BatchValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  reorderedCalls?: ToolCallRequest[];
  conflictingCalls?: ToolCallRequest[];
}

/**
 * Tool call interceptor class
 */
export class ToolCallInterceptor {
  private priorityManager: ToolPriorityManager;
  private blockedCalls: ToolCallRequest[] = [];
  private allowedCalls: ToolCallRequest[] = [];

  constructor(priorityManager?: ToolPriorityManager) {
    this.priorityManager = priorityManager || new ToolPriorityManager();
  }

  /**
   * Intercept tool calls
   */
  async interceptToolCall(request: ToolCallRequest): Promise<InterceptResult> {
    const { toolName, parameters } = request;
    
    logger.info(`Intercepted tool call: ${toolName}`, { parameters });

    // Validate tool call
    const validation = this.priorityManager.validateToolCall(toolName, parameters);
    
    const result: InterceptResult = {
      allowed: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      suggestions: []
    };

    // Provide repair suggestions when validation fails
    if (!validation.valid) {
      this.blockedCalls.push(request);
      
        // Generate suggestions
if (validation.requiredPrerequisites.length > 0) {
        result.suggestions.push(`Please call first: ${validation.requiredPrerequisites.join(', ')}`);
        result.suggestedOrder = this.priorityManager.getSuggestedCallOrder(toolName);
      }

      // Parameter repair suggestions
      if (toolName === 'createDoc') {
        if (!parameters?.notebook) {
          result.suggestions.push('Please provide a valid notebook ID');
        }
        if (!parameters?.title) {
          result.suggestions.push('Please provide a valid document title');
        }
      }

      logger.warn(`Tool call intercepted: ${toolName}`, {
        errors: result.errors,
        suggestions: result.suggestions
      });
    } else {
      this.allowedCalls.push(request);
      logger.info(`Tool call passed validation: ${toolName}`);
    }

    return result;
  }

  /**
   * Validate batch calls
   */
  async validateBatchCalls(calls: ToolCallRequest[]): Promise<BatchValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const reorderedCalls: ToolCallRequest[] = [];

    // Sort calls by priority
    const callsWithPriority = calls.map(call => ({
      ...call,
      priority: this.priorityManager.getToolPriority(call.toolName)
    }));

    // Sort by priority (smaller numbers mean higher priority)
    callsWithPriority.sort((a, b) => a.priority - b.priority);

    // Validate dependencies for each call
    for (const call of callsWithPriority) {
      const suggestedOrder = this.priorityManager.getSuggestedCallOrder(call.toolName);
      
      // Ensure dependent tools run before the current call
      for (const requiredTool of suggestedOrder.slice(0, -1)) {
        const hasRequiredTool = reorderedCalls.some(c => c.toolName === requiredTool);
        if (!hasRequiredTool) {
          // Check whether the tool exists in the original call list
          const requiredCall = calls.find(c => c.toolName === requiredTool);
          if (requiredCall && !reorderedCalls.includes(requiredCall)) {
            reorderedCalls.push(requiredCall);
          } else if (!requiredCall) {
            errors.push(`Missing required tool call: ${requiredTool} (to execute ${call.toolName})`);
          }
        }
      }

      if (!reorderedCalls.includes(call)) {
        reorderedCalls.push(call);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      reorderedCalls: errors.length === 0 ? reorderedCalls : undefined
    };
  }

  /**
 * Get intercepted call records
 */
getBlockedCalls(): ToolCallRequest[] {
return [...this.blockedCalls];
  }

  /**
 * Get allowed call records
 */
getAllowedCalls(): ToolCallRequest[] {
return [...this.allowedCalls];
  }

  /**
   * 清理调用历史
   */
  clearHistory(): void {
    this.blockedCalls = [];
    this.allowedCalls = [];
    logger.info('Cleared interceptor call history');
  }

  /**
   * Execute secure tool calls
   */
  async safeToolCall(request: ToolCallRequest, executor: (req: ToolCallRequest) => Promise<any>): Promise<{
    success: boolean;
    result?: any;
    error?: string;
    interceptResult: InterceptResult;
  }> {
    const interceptResult = await this.interceptToolCall(request);

    if (!interceptResult.allowed) {
      return {
        success: false,
        error: `Tool call intercepted: ${interceptResult.errors.join(', ')}`,
        interceptResult
      };
    }

    try {
      // Use modified parameters when available
      const finalRequest = {
        ...request,
        parameters: interceptResult.modifiedParameters || request.parameters
      };

      const result = await executor(finalRequest);

      // Record successful calls
      this.priorityManager.recordToolCall({
        toolName: request.toolName,
        timestamp: Date.now(),
        parameters: finalRequest.parameters,
        result,
        success: true
      });

      return {
        success: true,
        result,
        interceptResult
      };
    } catch (error: any) {
      // Record failed calls
      this.priorityManager.recordToolCall({
        toolName: request.toolName,
        timestamp: Date.now(),
        parameters: request.parameters,
        success: false,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        interceptResult
      };
    }
  }

  /**
   * Generate security guide
   */
  generateSecurityGuide(): string {
    let guide = '# MCP Tool Call Security Guide\n\n';
    
    guide += '## Core Security Principles\n';
    guide += '1. **Strict Dependency Validation** - All tool calls must satisfy dependencies\n';
    guide += '2. **Parameter Integrity Check** - Ensure all required parameters are provided and valid\n';
    guide += '3. **Operation Order Control** - Execute tool calls in correct priority order\n';
    guide += '4. **Error Handling and Recovery** - Provide clear error messages and repair suggestions\n\n';

    guide += '## Common Interception Scenarios\n\n';
    guide += '### Document Creation Security Check\n';
    guide += '- **Issue**: Direct call to `createDoc` without validating notebook\n';
    guide += '- **Solution**: Call `listNotebooks` and `openNotebook` first\n';
    guide += '- **Correct Order**: `listNotebooks` → `openNotebook` → `createDoc`\n\n';

    guide += '### Parameter Validation Failure\n';
    guide += '- **Issue**: Providing empty or invalid parameters\n';
    guide += '- **Solution**: Ensure all required parameters have valid values\n';
    guide += '- **Example**: `notebook` cannot be empty, `title` must be a non-empty string\n\n';
    guide += this.priorityManager.generateCallGuide();

    return guide;
  }

  /**
 * Get interception statistics
 */
getInterceptStatistics(): {
totalIntercepted: number;
    blockedCalls: number;
    allowedCalls: number;
    mostBlockedTool: string | null;
    commonErrors: string[];
  } {
    const toolBlockCount = new Map<string, number>();
    const errorCount = new Map<string, number>();

    for (const call of this.blockedCalls) {
      const count = toolBlockCount.get(call.toolName) || 0;
      toolBlockCount.set(call.toolName, count + 1);
    }

    // 找出最常被拦截的工具
    let mostBlockedTool: string | null = null;
    let maxBlocks = 0;
    for (const [tool, count] of toolBlockCount) {
      if (count > maxBlocks) {
        maxBlocks = count;
        mostBlockedTool = tool;
      }
    }

    // Simplified common error statistics
    const commonErrors = [
      'Missing call record for required tool',
      'Parameter validation failed',
      'Security rule violation'
    ];

    return {
      totalIntercepted: this.blockedCalls.length + this.allowedCalls.length,
      blockedCalls: this.blockedCalls.length,
      allowedCalls: this.allowedCalls.length,
      mostBlockedTool,
      commonErrors
    };
  }
}

/**
 * 全局工具调用拦截器实例
 */
export const toolCallInterceptor = new ToolCallInterceptor();
