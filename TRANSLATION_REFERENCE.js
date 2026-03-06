#!/usr/bin/env node
/**
 * Chinese to English Translation Reference for SiYuan MCP Server
 * This document contains all Chinese text that needs translation
 */

// ============================================================================
// src/services/SiyuanService.ts - Translation Dictionary
// ============================================================================

const SiyuanServiceTranslations = {
  // Lines 52-57: Protected onInitialize method header
  '初始化服务': 'Initialize service',
  '创建HTTP客户端': 'Create HTTP client',
  '添加请求拦截器': 'Add request interceptor',
  'API请求:': 'API request:',
  'API请求错误:': 'API request error:',
  '添加响应拦截器': 'Add response interceptor',
  'API响应:': 'API response:',
  'API响应错误:': 'API response error:',
  '测试连接': 'Test connection',

  // Lines 107-125: Test connection method
  '连接测试失败:': 'Connection test failed:',
  '思源笔记API连接测试成功': 'SiYuan Note API connection test successful',
  '思源笔记API连接测试失败:': 'SiYuan Note API connection test failed:',
  '无法连接到思源笔记API:': 'Cannot connect to SiYuan Note API:',

  // Lines 130: Generic API request method
  '通用API请求方法': 'Generic API request method',
  'API请求:': 'API request:',
  'API请求通常不缓存': 'API requests are typically not cached',
  'API请求失败': 'API request failed',

  // Lines 149: Notebook operations section
  '笔记本操作': 'Notebook Operations',
  '获取所有笔记本': 'Get all notebooks',
  '获取笔记本列表': 'Get notebook list',
  '获取笔记本列表失败': 'Failed to get notebook list',
  '1分钟缓存': '1 minute cache',

  '创建笔记本': 'Create notebook',
  '创建笔记本失败': 'Failed to create notebook',

  '打开笔记本': 'Open notebook',
  '打开笔记本失败': 'Failed to open notebook',

  '关闭笔记本': 'Close notebook',
  '关闭笔记本失败': 'Failed to close notebook',

  '重命名笔记本': 'Rename notebook',
  '重命名笔记本失败': 'Failed to rename notebook',

  '删除笔记本': 'Delete notebook',
  '删除笔记本失败': 'Failed to delete notebook',

  '获取笔记本配置': 'Get notebook configuration',
  '获取笔记本配置失败': 'Failed to get notebook configuration',

  '保存笔记本配置': 'Save notebook configuration',
  '保存笔记本配置失败': 'Failed to save notebook configuration',

  '使笔记本缓存失效': 'Invalidate notebook cache',

  // Lines 310+: Document operations
  '文档操作': 'Document Operations',
  '获取文档内容': 'Get document content',
  '无标题': 'Untitled',
  '获取文档失败': 'Failed to get document',
  '5分钟缓存': '5 minute cache',

  '创建文档': 'Create document',
  '创建文档失败': 'Failed to create document',

  '更新文档': 'Update document',
  '更新文档失败': 'Failed to update document',

  '删除文档': 'Delete document',
  '删除文档失败': 'Failed to delete document',

  '重命名文档': 'Rename document',
  '重命名文档失败': 'Failed to rename document',

  '获取可读路径': 'Get readable path',
  '获取可读路径失败': 'Failed to get readable path',

  '获取存储路径': 'Get storage path',
  '获取存储路径失败': 'Failed to get storage path',

  '获取文档ID': 'Get document ID',
  '获取文档ID失败': 'Failed to get document ID',

  '移动文档': 'Move document',
  '移动文档失败': 'Failed to move document',

  // Lines 630+: Search operations
  '搜索操作': 'Search Operations',
  '搜索内容': 'Search content',
  '搜索失败': 'Search failed',
  '3分钟缓存': '3 minute cache',

  '递归搜索': 'Recursive search',
  '递归搜索失败': 'Recursive search failed',

  // Lines 750+: Batch operations
  '批量操作': 'Batch Operations',
  '批量读取文档': 'Batch read documents',
  '批量读取文档': 'Batch read document',
  '批量读取文档_id_失败:': 'Failed to batch read document',
  '1分钟超时': '1 minute timeout',

  // Lines 800+: Utility methods
  '工具方法': 'Utility Methods',
  '获取文档树': 'Get document tree',
  '获取文档树失败': 'Failed to get document tree',
  '转换为文档树格式': 'Transform to document tree format'
};

// ============================================================================
// src/core/Application.ts - Translation Dictionary
// ============================================================================

const ApplicationTranslations = {
  '应用程序核心': 'Application Core',
  '统一的应用程序入口点和生命周期管理': 'Unified application entry point and lifecycle management',
  '应用程序配置接口': 'Application Configuration Interface',
  '应用程序状态枚举': 'Application State Enumeration',
  '应用程序类': 'Application Class',
  '合并配置': 'Merge configuration',
  '初始化应用程序': 'Initialize application',
  '应用程序已初始化，当前状态:': 'Application already initialized, current state:',
  '开始初始化应用程序...': 'Starting application initialization...',
  '初始化服务': 'Initialize services',
  '初始化工具': 'Initialize tools',
  '应用程序初始化完成': 'Application initialization complete',
  '应用程序初始化失败:': 'Application initialization failed:',
  '初始化服务..': 'Initializing services...',
  '服务初始化完成': 'Service initialization complete',
  '初始化工具...': 'Initializing tools...',
  '工具初始化完成': 'Tool initialization complete',
  '工具初始化完成，共注册': 'Tool initialization complete, registered',
  '个工具': 'tools',
  '获取应用程序状态': 'Get application state',
  '获取应用程序运行时间': 'Get application uptime',
  '检查应用程序是否正在运行': 'Check if application is running',
  '检查应用程序是否已准备就绪': 'Check if application is ready',
  '导出全局应用程序实例': 'Export global application instance'
};

// ============================================================================
// src/tools/standardTypes.ts - Translation Dictionary
// ============================================================================

const StandardTypesTranslations = {
  '标准化工具类型定义': 'Standardized Tool Type Definitions',
  '确保MCP AI模块能够准确调用不同函数': 'Ensure MCP AI module can accurately call different functions',
  '标准响应接口 - 统一所有工具的返回格式': 'Standard Response Interface - Unifies return format of all tools',
  '工具执行上下文接口': 'Tool Execution Context Interface',
  '错误类型枚举': 'Error Type Enumeration',
  '标准化工具错误类': 'Standardized Tool Error Class',
  '转换为标准响应格式': 'Convert to standard response format',
  '参数验证规则接口': 'Parameter Validation Rule Interface',
  '工具配置接口': 'Tool Configuration Interface',
  '标准化工具基类': 'Standardized Tool Base Class',
  '获取工具定义（MCP格式）': 'Get tool definition (MCP format)',
  '执行工具逻辑': 'Execute tool logic',
  '获取AI使用元数据': 'Get AI usage metadata',
  '参数验证': 'Parameter validation',
  '检查必填字段': 'Check required fields',
  '必填参数': 'Required parameter',
  '不能为空': 'cannot be empty',
  '如果值为空且非必填，跳过后续验证': 'If value is empty and not required, skip subsequent validation',
  '类型验证': 'Type validation',
  '参数': 'Parameter',
  '类型错误，期望': 'type error, expected',
  '实际': 'actually',
  '字符串长度验证': 'String length validation',
  '长度不能少于': 'length cannot be less than',
  '个字符': 'characters',
  '长度不能超过': 'length cannot exceed',
  '数值范围验证': 'Numeric range validation',
  '不能小于': 'cannot be less than'
};

// ============================================================================
// src/ai/aiAssistant.ts - Translation Dictionary
// ============================================================================

const AIAssistantTranslations = {
  '创建AI会话上下文': 'Create AI session context',
  'AI会话上下文已创建': 'AI session context created',
  '智能文档分析': 'Intelligent document analysis',
  'AI会话上下文不存在': 'AI session context does not exist',
  '获取文档Markdown内容失败，尝试获取基础文档信息': 'Failed to get document Markdown content, attempting to get basic document information',
  '文档分析完成': 'Document analysis complete',
  '智能内容生成': 'Intelligent content generation',
  '获取参考内容失败': 'Failed to get reference content',
  '内容生成完成': 'Content generation complete',
  '智能搜索和推荐': 'Intelligent search and recommendation',
  '智能搜索完成': 'Intelligent search complete',
  '搜索相关文档失败': 'Failed to search for related documents',
  '工作流_执行完成。成功执行': 'workflow execution complete. Successfully executed',
  '个步骤。': 'steps.',
  '提取关键词并搜索相关文档': 'Extract keywords and search for related documents',
  '不支持的工作流步骤类型:': 'Unsupported workflow step type:',
  '执行工作流': 'Execute workflow',
  '工作流执行失败': 'Workflow execution failed',
  '工作流执行完成': 'Workflow execution complete',
  '生成相关查询}: ': 'Generate related queries',
  '进阶': 'Advanced',
  '问题解决': 'Problem solving',
  '对比分析': 'Comparative analysis',
  '应用场景': 'Use cases'
};

// ============================================================================
// Export all translations
// ============================================================================

module.exports = {
  SiyuanServiceTranslations,
  ApplicationTranslations,
  StandardTypesTranslations,
  AIAssistantTranslations
};

/**
 * Usage instructions:
 * 1. Review each translation pair
 * 2. Use find-and-replace in IDE or command line
 * 3. Verify translations maintain code functionality
 * 4. Run tests to ensure no breakage
 */
