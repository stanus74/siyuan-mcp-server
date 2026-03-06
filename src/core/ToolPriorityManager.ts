/**
 * Tool call priority manager
 * Ensures AI follows the correct order and dependency chain when invoking MCP tools
 */

import logger from '../logger';

/**
 * Tool priority enumeration
 */
export enum ToolPriority {
  CRITICAL = 1,    // Critical: notebook validation, permission checks
  HIGH = 2,        // High: prerequisites before document creation
  MEDIUM = 3,      // Medium: standard document operations
  LOW = 4,         // Low: supporting utilities
  BACKGROUND = 5   // Background: cleanup, analytics, etc.
}

/**
 * Tool dependency definition
 */
export interface ToolDependency {
  toolName: string;
  requiredTools: string[];
  priority: ToolPriority;
  description: string;
  validationRules?: string[];
}

/**
 * Tool call record
 */
export interface ToolCallRecord {
  toolName: string;
  timestamp: number;
  parameters: any;
  result?: any;
  success: boolean;
  error?: string;
}

/**
 * Tool priority manager implementation
 */
export class ToolPriorityManager {
  private toolDependencies: Map<string, ToolDependency> = new Map();
  private callHistory: ToolCallRecord[] = [];
  private maxHistorySize: number = 100;

  constructor() {
    this.initializeToolDependencies();
  }

  /**
   * Initialize tool dependencies
   */
  private initializeToolDependencies(): void {
    // Notebook-related tools
    this.registerTool({
      toolName: 'listNotebooks',
      requiredTools: [],
      priority: ToolPriority.CRITICAL,
      description: 'Get notebook list - prerequisite for all document operations',
      validationRules: ['Must first verify notebook existence']
    });

    this.registerTool({
      toolName: 'openNotebook',
      requiredTools: ['listNotebooks'],
      priority: ToolPriority.CRITICAL,
      description: 'Open notebook - must ensure notebook is open before document operations',
      validationRules: ['Notebook must exist', 'Notebook must not be closed']
    });

    // Document creation related tools
    this.registerTool({
      toolName: 'createDoc',
      requiredTools: ['listNotebooks', 'openNotebook'],
      priority: ToolPriority.HIGH,
      description: 'Create document - must be executed after notebook validation',
      validationRules: [
        'Direct document creation prohibited',
        'Must first verify target notebook exists',
        'Must ensure notebook is open',
        'Document title cannot be empty'
      ]
    });
    // Document query tools
    this.registerTool({
      toolName: 'getDoc',
      requiredTools: [],
      priority: ToolPriority.MEDIUM,
      description: 'Get document content',
      validationRules: ['Document ID must be valid']
    });

    this.registerTool({
      toolName: 'searchDocs',
      requiredTools: [],
      priority: ToolPriority.MEDIUM,
      description: 'Search documents',
      validationRules: ['Search keyword cannot be empty']
    });

    // Document modification tools
    this.registerTool({
      toolName: 'updateDoc',
      requiredTools: ['getDoc'],
      priority: ToolPriority.MEDIUM,
      description: 'Update document content - recommend getting current content first',
      validationRules: ['Document must exist', 'Content cannot be empty']
    });

    this.registerTool({
      toolName: 'deleteDoc',
      requiredTools: ['getDoc'],
      priority: ToolPriority.HIGH,
      description: 'Delete document - high-risk operation, requires confirmation',
      validationRules: ['Document must exist', 'Requires secondary confirmation']
    });

    // Batch operation tools
    this.registerTool({
      toolName: 'batchReadAllDocuments',
      requiredTools: ['listNotebooks'],
      priority: ToolPriority.LOW,
      description: 'Batch read all documents - resource-intensive operation',
      validationRules: ['Notebook must exist', 'Recommend executing during off-peak hours']
    });

    logger.info(`Registered ${this.toolDependencies.size} tool dependencies`);
  }

  /**
   * Register tool dependencies
   */
  registerTool(dependency: ToolDependency): void {
    this.toolDependencies.set(dependency.toolName, dependency);
    logger.debug(`Registered tool dependency: ${dependency.toolName}`);
  }

  /**
   * Validate whether tool calls satisfy dependencies
   */
  validateToolCall(toolName: string, parameters?: any): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    requiredPrerequisites: string[];
  } {
    const dependency = this.toolDependencies.get(toolName);
    const errors: string[] = [];
    const warnings: string[] = [];
    const requiredPrerequisites: string[] = [];

    // Check whether the tool has been registered
    if (!dependency) {
      warnings.push(`Tool ${toolName} has no registered dependencies, recommend adding`);
      return {
        valid: true, // Unregistered tools are allowed but will trigger a warning
        errors,
        warnings,
        requiredPrerequisites
      };
    }

    // Check whether required prerequisite tools have been called
    for (const requiredTool of dependency.requiredTools) {
      const hasBeenCalled = this.callHistory.some(
        record => record.toolName === requiredTool && record.success
      );

      if (!hasBeenCalled) {
        errors.push(`Missing call record for required tool: ${requiredTool}`);
        requiredPrerequisites.push(requiredTool);
      }
    }

    // Special validation rules
    if (toolName === 'createDoc') {
      // Validate notebook parameter
      if (!parameters?.notebook) {
        errors.push('Parameter validation failed: missing notebook ID');
      }

      // Validate title parameter
      if (!parameters?.title || typeof parameters.title !== 'string' || parameters.title.trim().length === 0) {
        errors.push('Parameter validation failed: document title cannot be empty');
      }

      // Check whether there is an attempt to create documents directly
      const hasNotebookValidation = this.callHistory.some(
        record => record.toolName === 'listNotebooks' && record.success
      );

      if (!hasNotebookValidation) {
        errors.push('Security rule violation: Direct document creation prohibited, must first validate notebook');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      requiredPrerequisites
    };
  }

  /**
   * Record tool calls
   */
  recordToolCall(record: ToolCallRecord): void {
    this.callHistory.push(record);

    // Limit history size
    if (this.callHistory.length > this.maxHistorySize) {
      this.callHistory = this.callHistory.slice(-this.maxHistorySize);
    }

    logger.debug(`Recorded tool call: ${record.toolName}, success: ${record.success}`);
  }

  /**
   * Get suggested tool call order
   */
  getSuggestedCallOrder(targetTool: string): string[] {
    const dependency = this.toolDependencies.get(targetTool);
    if (!dependency) {
      return [targetTool];
    }

    const order: string[] = [];
    const visited = new Set<string>();

    const buildOrder = (toolName: string) => {
      if (visited.has(toolName)) {
        return;
      }

      visited.add(toolName);
      const toolDep = this.toolDependencies.get(toolName);
      
      if (toolDep) {
        // Add dependent tools first
        for (const requiredTool of toolDep.requiredTools) {
          buildOrder(requiredTool);
        }
      }

      // Then add the current tool
      if (!order.includes(toolName)) {
        order.push(toolName);
      }
    };

    buildOrder(targetTool);
    return order;
  }

  /**
   * Get tool priority
   */
  getToolPriority(toolName: string): ToolPriority {
    const dependency = this.toolDependencies.get(toolName);
    return dependency?.priority || ToolPriority.MEDIUM;
  }

  /**
   * Get tool description and validation rules
   */
  getToolInfo(toolName: string): {
    description: string;
    validationRules: string[];
    requiredTools: string[];
    priority: ToolPriority;
  } | null {
    const dependency = this.toolDependencies.get(toolName);
    if (!dependency) {
      return null;
    }

    return {
      description: dependency.description,
      validationRules: dependency.validationRules || [],
      requiredTools: dependency.requiredTools,
      priority: dependency.priority
    };
  }

  /**
   * Clear call history
   */
  clearHistory(): void {
    this.callHistory = [];
    logger.info('Cleared tool call history');
  }

  /**
   * Get call statistics
   */
  getCallStatistics(): {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    toolUsageCount: Map<string, number>;
    recentCalls: ToolCallRecord[];
  } {
    const toolUsageCount = new Map<string, number>();
    let successfulCalls = 0;
    let failedCalls = 0;

    for (const record of this.callHistory) {
      const currentCount = toolUsageCount.get(record.toolName) || 0;
      toolUsageCount.set(record.toolName, currentCount + 1);

      if (record.success) {
        successfulCalls++;
      } else {
        failedCalls++;
      }
    }

    return {
      totalCalls: this.callHistory.length,
      successfulCalls,
      failedCalls,
      toolUsageCount,
      recentCalls: this.callHistory.slice(-10) // Most recent 10 calls
    };
  }

  /**
   * Generate tool call guide
   */
  generateCallGuide(): string {
    let guide = '# SiYuan MCP Tool Call Guide\n\n';
    guide += '## Important Security Rules\n';
    guide += '1. **Direct document creation prohibited** - Must first validate notebook existence\n';
    guide += '2. **Strictly follow call order** - Execute tool calls according to dependencies\n';
    guide += '3. **Parameter validation** - Ensure all required parameters are provided\n\n';

    guide += '## Tool Priority and Dependencies\n\n';

    // Group by priority
    const toolsByPriority = new Map<ToolPriority, ToolDependency[]>();
    for (const [_, dependency] of this.toolDependencies) {
      const tools = toolsByPriority.get(dependency.priority) || [];
      tools.push(dependency);
      toolsByPriority.set(dependency.priority, tools);
    }

    for (const [priority, tools] of toolsByPriority) {
      guide += `### ${this.getPriorityName(priority)} (Priority ${priority})\n\n`;
      
      for (const tool of tools) {
        guide += `**${tool.toolName}**\n`;
        guide += `- Description: ${tool.description}\n`;
        
        if (tool.requiredTools.length > 0) {
          guide += `- Dependencies: ${tool.requiredTools.join(', ')}\n`;
        }
        
        if (tool.validationRules && tool.validationRules.length > 0) {
          guide += `- Validation rules:\n`;
          for (const rule of tool.validationRules) {
            guide += `  - ${rule}\n`;
          }
        }
        guide += '\n';
      }
    }

    guide += '## Recommended Call Flow\n\n';
    guide += '### Correct Flow for Creating Documents\n';
    guide += '1. `listNotebooks` - Get and validate notebook list\n';
    guide += '2. `openNotebook` - Ensure target notebook is open\n';
    guide += '3. `createDoc` - Create document in validated notebook\n\n';
    guide += '### Recommended Flow for Modifying Documents\n';
    guide += '1. `getDoc` - Get current document content\n';
    guide += '2. `updateDoc` - Update document content\n\n';

    return guide;
  }

  /**
   * Get priority name
   */
  private getPriorityName(priority: ToolPriority): string {
    switch (priority) {
      case ToolPriority.CRITICAL: return 'Critical Operation';
      case ToolPriority.HIGH: return 'High Priority';
      case ToolPriority.MEDIUM: return 'Medium Priority';
      case ToolPriority.LOW: return 'Low Priority';
      case ToolPriority.BACKGROUND: return 'Background Operation';
      default: return 'Unknown Priority';
    }
  }
}

/**
 * Global tool priority manager instance
 */
export const toolPriorityManager = new ToolPriorityManager();

/**
 * Convenience wrapper: validate tool calls
 */
function validateToolCall(toolName: string, parameters?: any) {
  return toolPriorityManager.validateToolCall(toolName, parameters);
}

/**
 * Convenience wrapper: record tool calls
 */
function recordToolCall(record: ToolCallRecord) {
  return toolPriorityManager.recordToolCall(record);
}

/**
 * Convenience wrapper: get suggested call order
 */
function getSuggestedCallOrder(targetTool: string): string[] {
  return toolPriorityManager.getSuggestedCallOrder(targetTool);
}
