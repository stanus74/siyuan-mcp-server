import { createSiyuanClient } from '../siyuanClient';
import { contextManager } from '../contextStore/manager';
import logger from '../logger';

// MCP Prompt Template Definition
export interface MCPPrompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
    type?: string;
    default?: any;
  }>;
}

// Prompt Template Variables
export interface PromptVariables {
  [key: string]: any;
}

// Prompt Template Result
export interface PromptResult {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: {
      type: 'text';
      text: string;
    };
  }>;
}

export class PromptTemplateManager {
  private siyuanClient;
  private templates: Map<string, (variables: PromptVariables) => Promise<PromptResult>>;

  constructor() {
    this.siyuanClient = createSiyuanClient({
      baseURL: process.env.SIYUAN_BASE_URL || undefined,
      token: process.env.SIYUAN_TOKEN || '',
      autoDiscoverPort: true
    });
    
    this.templates = new Map();
    this.initializeTemplates();
  }

  // Initialize Built-in Templates
  private initializeTemplates() {
    // Note Search Assistant
    this.templates.set('note-search-assistant', async (variables) => {
      const { query, context = '', limit = 10 } = variables;
      
      let searchResults = '';
      if (query) {
        try {
          const results = await this.siyuanClient.searchNotes(query, limit);
          searchResults = results.map((r: any) => 
            `- ${r.content?.substring(0, 100)}... (${r.path})`
          ).join('\n');
        } catch (error) {
          searchResults = 'Search error occurred';
        }
      }

      return {
        messages: [
          {
            role: 'system',
            content: {
              type: 'text',
              text: `You are a SiYuan Note search assistant. You can help users search and find information in SiYuan Notes.

Current Search Results:
${searchResults || 'No search results yet'}

Please provide useful information and suggestions to users based on the search results.`
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: context || `Please help me search for information about "${query}"`
            }
          }
        ]
      };
    });

    // Document Creator Assistant
    this.templates.set('document-creator', async (variables) => {
      const { title, topic, notebook, outline = '' } = variables;
      
      let notebookInfo = '';
      if (notebook) {
        try {
          const notebooks = await this.siyuanClient.request('/api/notebook/lsNotebooks', {});
          const nb = notebooks.find((n: any) => n.id === notebook || n.name === notebook);
          notebookInfo = nb ? `Target Notebook: ${nb.name}` : '';
        } catch (error) {
          notebookInfo = '';
        }
      }

      return {
        messages: [
          {
            role: 'system',
            content: {
              type: 'text',
              text: `You are a SiYuan Note document creation assistant. You can help users create structured document content.

${notebookInfo}

Based on the information provided by the user, please create a structurally clear and content-rich document. Use Markdown format with appropriate heading levels, lists, and formatting.`
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please help me create a document about "${topic || title}".
${title ? `Document Title: ${title}` : ''}
${outline ? `Outline Requirements: ${outline}` : ''}

Please provide complete document content.`
            }
          }
        ]
      };
    });

    // Content Summarizer Assistant
    this.templates.set('content-summarizer', async (variables) => {
      const { content, sessionId, style = 'concise' } = variables;
      
      let contextInfo = '';
      if (sessionId) {
        try {
          const context = await contextManager.exportContextSummary(sessionId);
          contextInfo = `\nRelated Context:\n${context.summary}`;
        } catch (error) {
          contextInfo = '';
        }
      }

      const styleInstructions = {
        concise: 'Please provide a concise summary of key points',
        detailed: 'Please provide detailed analysis and summary',
        bullet: 'Please summarize using bullet point list format',
        academic: 'Please use academic style for summary analysis'
      };

      return {
        messages: [
          {
            role: 'system',
            content: {
              type: 'text',
              text: `You are a content summarization assistant. You can help users summarize and analyze document content.

Summarization Style: ${styleInstructions[style as keyof typeof styleInstructions] || styleInstructions.concise}${contextInfo}`
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please summarize the following content:

${content}`
            }
          }
        ]
      };
    });

    // Knowledge Connection Assistant
    this.templates.set('knowledge-connector', async (variables) => {
      const { topic, sessionId, depth = 'medium' } = variables;
      
      let relatedContent = '';
      let contextRefs = '';
      
      if (sessionId) {
        try {
          const context = await contextManager.getReferences(sessionId);
          contextRefs = context.map(ref => 
            `- ${ref.type}: ${ref.content?.substring(0, 100)}...`
          ).join('\n');
        } catch (error) {
          contextRefs = '';
        }
      }

      if (topic) {
        try {
          const searchResults = await this.siyuanClient.searchNotes(topic, 5);
          relatedContent = searchResults.map((r: any) => 
            `- ${r.content?.substring(0, 150)}... (${r.path})`
          ).join('\n');
        } catch (error) {
          relatedContent = '';
        }
      }

      const depthInstructions = {
        shallow: '提供基本的关联信息',
        medium: '提供中等深度的关联分析',
        deep: '提供深入的知识网络分析'
      };

      return {
        messages: [
          {
            role: 'system',
            content: {
              type: 'text',
              text: `你是一个知识连接助手。你可以帮助用户发现和建立知识之间的联系。

分析深度：${depthInstructions[depth as keyof typeof depthInstructions] || depthInstructions.medium}

相关内容：
${relatedContent || '暂无相关内容'}

当前上下文引用：
${contextRefs || '暂无上下文引用'}

请帮助用户建立知识连接，发现潜在的关联和洞察。`
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: `请帮我分析"${topic}"这个主题的知识连接和相关性。`
            }
          }
        ]
      };
    });

    // 学习路径规划助手
    this.templates.set('learning-path-planner', async (variables) => {
      const { subject, level = 'beginner', goals = '', timeframe = '' } = variables;
      
      let relatedNotes = '';
      if (subject) {
        try {
          const searchResults = await this.siyuanClient.searchNotes(subject, 8);
          relatedNotes = searchResults.map((r: any) => 
            `- ${r.content?.substring(0, 100)}...`
          ).join('\n');
        } catch (error) {
          relatedNotes = '';
        }
      }

      return {
        messages: [
          {
            role: 'system',
            content: {
              type: 'text',
              text: `你是一个学习路径规划助手。你可以帮助用户制定个性化的学习计划。

现有相关笔记：
${relatedNotes || '暂无相关笔记'}

请根据用户的学习目标和现有资源，制定一个结构化的学习路径。`
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: `请为我制定一个关于"${subject}"的学习路径。
学习水平：${level}
${goals ? `学习目标：${goals}` : ''}
${timeframe ? `时间安排：${timeframe}` : ''}

请提供详细的学习计划和建议。`
            }
          }
        ]
      };
    });

    // 写作助手
    this.templates.set('writing-assistant', async (variables) => {
      const { type = 'article', topic, audience = 'general', tone = 'professional' } = variables;
      
      let referenceContent = '';
      if (topic) {
        try {
          const searchResults = await this.siyuanClient.searchNotes(topic, 3);
          referenceContent = searchResults.map((r: any) => 
            `- ${r.content?.substring(0, 200)}...`
          ).join('\n');
        } catch (error) {
          referenceContent = '';
        }
      }

      const typeInstructions = {
        article: '撰写一篇结构完整的文章',
        blog: '撰写一篇博客文章',
        report: '撰写一份正式报告',
        summary: '撰写一份总结文档',
        tutorial: '撰写一份教程指南'
      };

      return {
        messages: [
          {
            role: 'system',
            content: {
              type: 'text',
              text: `你是一个专业的写作助手。你可以帮助用户创作各种类型的文档。

写作类型：${typeInstructions[type as keyof typeof typeInstructions] || typeInstructions.article}
目标受众：${audience}
写作风格：${tone}

参考资料：
${referenceContent || '暂无参考资料'}

请根据要求创作高质量的内容，注意结构清晰、逻辑严密。`
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: `请帮我写一篇关于"${topic}"的${type}。`
            }
          }
        ]
      };
    });
  }

  // 获取所有可用的提示模板
  getAvailablePrompts(): MCPPrompt[] {
    return [
      {
        name: 'note-search-assistant',
        description: '笔记搜索助手 - 帮助搜索和查找思源笔记中的信息',
        arguments: [
          { name: 'query', description: '搜索关键词', required: true, type: 'string' },
          { name: 'context', description: '额外的上下文信息', type: 'string' },
          { name: 'limit', description: '搜索结果数量限制', type: 'number', default: 10 }
        ]
      },
      {
        name: 'document-creator',
        description: '文档创建助手 - 帮助创建结构化的文档内容',
        arguments: [
          { name: 'title', description: '文档标题', type: 'string' },
          { name: 'topic', description: '文档主题', required: true, type: 'string' },
          { name: 'notebook', description: '目标笔记本', type: 'string' },
          { name: 'outline', description: '文档大纲要求', type: 'string' }
        ]
      },
      {
        name: 'content-summarizer',
        description: '内容总结助手 - 总结和分析文档内容',
        arguments: [
          { name: 'content', description: '要总结的内容', required: true, type: 'string' },
          { name: 'sessionId', description: '会话ID（用于获取上下文）', type: 'string' },
          { name: 'style', description: '总结风格', type: 'string', default: 'concise' }
        ]
      },
      {
        name: 'knowledge-connector',
        description: '知识连接助手 - 发现和建立知识之间的联系',
        arguments: [
          { name: 'topic', description: '分析主题', required: true, type: 'string' },
          { name: 'sessionId', description: '会话ID（用于获取上下文）', type: 'string' },
          { name: 'depth', description: '分析深度', type: 'string', default: 'medium' }
        ]
      },
      {
        name: 'learning-path-planner',
        description: '学习路径规划助手 - 制定个性化的学习计划',
        arguments: [
          { name: 'subject', description: '学习主题', required: true, type: 'string' },
          { name: 'level', description: '学习水平', type: 'string', default: 'beginner' },
          { name: 'goals', description: '学习目标', type: 'string' },
          { name: 'timeframe', description: '时间安排', type: 'string' }
        ]
      },
      {
        name: 'writing-assistant',
        description: '写作助手 - 帮助创作各种类型的文档',
        arguments: [
          { name: 'topic', description: '写作主题', required: true, type: 'string' },
          { name: 'type', description: '文档类型', type: 'string', default: 'article' },
          { name: 'audience', description: '目标受众', type: 'string', default: 'general' },
          { name: 'tone', description: '写作风格', type: 'string', default: 'professional' }
        ]
      }
    ];
  }

  // 获取提示模板
  async getPrompt(name: string, variables: PromptVariables = {}): Promise<PromptResult> {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Prompt template not found: ${name}`);
    }

    try {
      const result = await template(variables);
      logger.info({ name, variables }, 'Generated prompt template');
      return result;
    } catch (error) {
      logger.error({ error, name, variables }, 'Failed to generate prompt template');
      throw error;
    }
  }

  // 注册自定义模板
  registerTemplate(
    name: string, 
    template: (variables: PromptVariables) => Promise<PromptResult>
  ): void {
    this.templates.set(name, template);
    logger.info({ name }, 'Registered custom prompt template');
  }

  // 移除模板
  removeTemplate(name: string): boolean {
    const removed = this.templates.delete(name);
    if (removed) {
      logger.info({ name }, 'Removed prompt template');
    }
    return removed;
  }

  // 验证模板变量
  validateVariables(name: string, variables: PromptVariables): { valid: boolean; errors: string[] } {
    const prompts = this.getAvailablePrompts();
    const prompt = prompts.find(p => p.name === name);
    
    if (!prompt) {
      return { valid: false, errors: [`Prompt template not found: ${name}`] };
    }

    const errors: string[] = [];
    
    if (prompt.arguments) {
      for (const arg of prompt.arguments) {
        if (arg.required && !(arg.name in variables)) {
          errors.push(`Required argument missing: ${arg.name}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

// 创建默认的提示模板管理器实例
export const promptTemplateManager = new PromptTemplateManager();
