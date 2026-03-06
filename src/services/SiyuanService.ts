/**
 * SiYuan Service
 * Standardized SiYuan Note API service based on BaseService
 */

import { BaseService } from '../core/BaseService.js';
import { 
  BaseConfig, 
  APIResponse, 
  Document, 
  Notebook, 
  Block, 
  SearchOptions,
  BaseSearchOptions,
  RecursiveSearchOptions,
  BatchOptions,
  DocumentTreeNode,
  OperationResult 
} from '../interfaces/index.js';
import { withRetry } from '../utils/retry.js';
import { cacheManager } from '../utils/cache.js';
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import logger from '../logger.js';

/**
 * SiYuan Service Configuration Interface
 */
export interface SiyuanServiceConfig extends BaseConfig {
  autoDiscoverPort?: boolean;
  maxRetries?: number;
  requestTimeout?: number;
}

/**
 * SiYuan Service Class
 */
export class SiyuanService extends BaseService {
  private httpClient!: AxiosInstance;
  private serviceConfig: SiyuanServiceConfig;

  constructor(config: SiyuanServiceConfig) {
    super('SiyuanService', '1.0.0', config);
    this.serviceConfig = {
      autoDiscoverPort: true,
      maxRetries: 3,
      requestTimeout: 30000,
      ...config
    };
  }

  /**
   * Initialize service
   */
  protected async onInitialize(): Promise<void> {
    // Create HTTP client
    this.httpClient = axios.create({
      baseURL: this.serviceConfig.baseURL,
      timeout: this.serviceConfig.requestTimeout,
      headers: {
        'Authorization': `Token ${this.serviceConfig.token}`,
        'Content-Type': 'application/json'
      }
    });

    // 添加请求拦截器
    this.httpClient.interceptors.request.use(
      (config) => {
        logger.debug(`API请求: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('API请求错误:', error);
        return Promise.reject(error);
      }
    );

    // 添加响应拦截器
    this.httpClient.interceptors.response.use(
      (response) => {
        logger.debug(`API响应: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('API响应错误:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );

    // 测试连接
    await this.testConnection();
  }

  /**
   * 销毁服务
   */
  protected async onDestroy(): Promise<void> {
    // 清理HTTP客户端
    if (this.httpClient) {
      // Axios没有显式的销毁方法，但我们可以清理拦截器
      this.httpClient.interceptors.request.clear();
      this.httpClient.interceptors.response.clear();
    }
  }

  /**
   * 测试连接
   */
  private async testConnection(): Promise<void> {
    try {
      const response = await this.httpClient.get('/api/system/getConf');
      if (response.data.code !== 0) {
        throw new Error(`连接测试失败: ${response.data.msg}`);
      }
      logger.info('思源笔记API连接测试成功');
    } catch (error: any) {
      logger.error('思源笔记API连接测试失败:', error.message);
      throw new Error(`无法连接到思源笔记API: ${error.message}`);
    }
  }

  /**
   * 通用API请求方法
   */
  async request<T = any>(endpoint: string, data?: any): Promise<APIResponse<T>> {
    const operation = async () => {
      const response = await this.httpClient.post(endpoint, data);
      return response.data;
    };

    const result = await this.executeOperation(
      `API请求: ${endpoint}`,
      () => withRetry(operation, { maxRetries: this.serviceConfig.maxRetries || 3 }),
      {
        useCache: false // API请求通常不缓存
      }
    );

    if (!result.success) {
      throw new Error(result.error || 'API请求失败');
    }

    return result.data;
  }

  // ==================== 笔记本操作 ====================

  /**
   * 获取所有笔记本
   */
  async listNotebooks(): Promise<OperationResult<Notebook[]>> {
    return await this.executeOperation(
      '获取笔记本列表',
      async () => {
        const response = await this.request('/api/notebook/lsNotebooks');
        if (response.code === 0 && response.data) {
          return response.data.notebooks.map((notebook: any) => ({
            id: notebook.id,
            name: notebook.name,
            icon: notebook.icon,
            closed: notebook.closed,
            sort: notebook.sort
          }));
        }
        throw new Error(response.msg || '获取笔记本列表失败');
      },
      {
        useCache: true,
        cacheKey: 'notebooks_list',
        cacheTTL: 60000 // 1分钟缓存
      }
    );
  }

  /**
   * 创建笔记本
   */
  async createNotebook(name: string, icon: string = '📔'): Promise<OperationResult<Notebook>> {
    return await this.executeOperation(
      '创建笔记本',
      async () => {
        const response = await this.request('/api/notebook/createNotebook', {
          name,
          icon
        });
        
        if (response.code === 0 && response.data) {
          const notebookId = response.data.notebook?.id || response.data.id;
          return {
            id: notebookId,
            name,
            icon,
            closed: false,
            sort: 0
          };
        }
        throw new Error(response.msg || '创建笔记本失败');
      }
    );
  }

  /**
   * 打开笔记本
   */
  async openNotebook(notebookId: string): Promise<OperationResult<void>> {
    return await this.executeOperation(
      '打开笔记本',
      async () => {
        const response = await this.request('/api/notebook/openNotebook', {
          notebook: notebookId
        });

        if (response.code === 0) {
          this.invalidateNotebookCache();
          return;
        }
        throw new Error(response.msg || '打开笔记本失败');
      }
    );
  }

  /**
   * 关闭笔记本
   */
  async closeNotebook(notebookId: string): Promise<OperationResult<void>> {
    return await this.executeOperation(
      '关闭笔记本',
      async () => {
        const response = await this.request('/api/notebook/closeNotebook', {
          notebook: notebookId
        });

        if (response.code === 0) {
          this.invalidateNotebookCache();
          return;
        }
        throw new Error(response.msg || '关闭笔记本失败');
      }
    );
  }

  /**
   * 重命名笔记本
   */
  async renameNotebook(notebookId: string, name: string): Promise<OperationResult<Notebook>> {
    return await this.executeOperation(
      '重命名笔记本',
      async () => {
        const response = await this.request('/api/notebook/renameNotebook', {
          notebook: notebookId,
          name
        });

        if (response.code === 0 && response.data) {
          this.invalidateNotebookCache();
          return {
            id: notebookId,
            name,
            icon: response.data.icon || '📔',
            closed: false,
            sort: response.data.sort || 0
          };
        }
        throw new Error(response.msg || '重命名笔记本失败');
      }
    );
  }

  /**
   * 删除笔记本
   */
  async removeNotebook(notebookId: string): Promise<OperationResult<boolean>> {
    return await this.executeOperation(
      '删除笔记本',
      async () => {
        const response = await this.request('/api/notebook/removeNotebook', {
          notebook: notebookId
        });

        if (response.code === 0) {
          this.invalidateNotebookCache();
          return true;
        }
        throw new Error(response.msg || '删除笔记本失败');
      }
    );
  }

  /**
   * 获取笔记本配置
   */
  async getNotebookConf(notebookId: string): Promise<OperationResult<any>> {
    return await this.executeOperation(
      '获取笔记本配置',
      async () => {
        const response = await this.request('/api/notebook/getNotebookConf', {
          notebook: notebookId
        });

        if (response.code === 0 && response.data) {
          return response.data;
        }
        throw new Error(response.msg || '获取笔记本配置失败');
      },
      {
        useCache: true,
        cacheKey: `notebook_conf_${notebookId}`,
        cacheTTL: 300000
      }
    );
  }

  /**
   * 保存笔记本配置
   */
  async setNotebookConf(notebookId: string, conf: any): Promise<OperationResult<void>> {
    return await this.executeOperation(
      '保存笔记本配置',
      async () => {
        const response = await this.request('/api/notebook/setNotebookConf', {
          notebook: notebookId,
          conf
        });

        if (response.code === 0) {
          const cache = cacheManager.getCache(this.serviceName);
          cache.delete(`notebook_conf_${notebookId}`);
          return;
        }
        throw new Error(response.msg || '保存笔记本配置失败');
      }
    );
  }

  /**
   * 使笔记本缓存失效
   */
  private invalidateNotebookCache(): void {
    const cache = cacheManager.getCache(this.serviceName);
    cache.delete('notebooks_list');
  }

  // ==================== 文档操作 ====================

  /**
   * 获取文档内容
   */
  async getDocument(id: string): Promise<OperationResult<Document>> {
    return await this.executeOperation(
      '获取文档内容',
      async () => {
        const response = await this.request('/api/block/getBlockKramdown', { id });
        
        if (response.code === 0 && response.data) {
          return {
            id,
            title: response.data.title || '无标题',
            content: response.data.kramdown || response.data.markdown || '',
            notebook: response.data.box || '',
            path: response.data.path || '',
            created: response.data.created,
            updated: response.data.updated,
            contentLength: (response.data.kramdown || response.data.markdown || '').length
          };
        }
        throw new Error(response.msg || '获取文档失败');
      },
      {
        useCache: true,
        cacheKey: `document_${id}`,
        cacheTTL: 300000 // 5分钟缓存
      }
    );
  }

  /**
   * 创建文档
   */
  async createDocument(
    notebook: string, 
    path: string, 
    title: string, 
    content: string = ''
  ): Promise<OperationResult<Document>> {
    return await this.executeOperation(
      '创建文档',
      async () => {
        const response = await this.request('/api/filetree/createDoc', {
          notebook,
          path,
          title,
          markdown: content
        });
        
        if (response.code === 0 && response.data) {
          return {
            id: response.data.id,
            title,
            content,
            notebook,
            path,
            created: new Date().toISOString(),
            contentLength: content.length
          };
        }
        throw new Error(response.msg || '创建文档失败');
      }
    );
  }

  /**
   * 更新文档
   */
  async updateDocument(id: string, content: string): Promise<OperationResult<Document>> {
    return await this.executeOperation(
      '更新文档',
      async () => {
        const response = await this.request('/api/block/updateBlock', {
          id,
          data: content,
          dataType: 'markdown'
        });
        
        if (response.code === 0) {
          // 清除缓存
          const cache = cacheManager.getCache(this.serviceName);
          cache.delete(`document_${id}`);
          
          return {
            id,
            title: '已更新',
            content,
            notebook: '',
            path: '',
            updated: new Date().toISOString(),
            contentLength: content.length
          };
        }
        throw new Error(response.msg || '更新文档失败');
      }
    );
  }

  /**
   * 删除文档
   */
  async deleteDocument(id: string): Promise<OperationResult<boolean>> {
    return await this.executeOperation(
      '删除文档',
      async () => {
        const response = await this.request('/api/block/deleteBlock', { id });
        
        if (response.code === 0) {
          // 清除缓存
          const cache = cacheManager.getCache(this.serviceName);
          cache.delete(`document_${id}`);
          
          return true;
        }
        throw new Error(response.msg || '删除文档失败');
      }
    );
  }

  /**
   * 重命名文档（路径方式）
   */
  async renameDoc(
    notebook: string,
    path: string,
    title: string
  ): Promise<OperationResult<{ id: string; path: string }>> {
    return await this.executeOperation(
      '重命名文档',
      async () => {
        const response = await this.request('/api/filetree/renameDoc', {
          notebook,
          path,
          title
        });

        if (response.code === 0 && response.data) {
          return {
            id: response.data.id,
            path: response.data.path || path
          };
        }
        throw new Error(response.msg || '重命名文档失败');
      }
    );
  }

  /**
   * 重命名文档（ID方式）
   */
  async renameDocByID(id: string, title: string): Promise<OperationResult<string>> {
    return await this.executeOperation(
      '重命名文档',
      async () => {
        const response = await this.request('/api/filetree/renameDocByID', {
          id,
          title
        });

        if (response.code === 0) {
          return id;
        }
        throw new Error(response.msg || '重命名文档失败');
      }
    );
  }

  /**
   * 删除文档（路径方式）
   */
  async removeDoc(notebook: string, path: string): Promise<OperationResult<boolean>> {
    return await this.executeOperation(
      '删除文档',
      async () => {
        const response = await this.request('/api/filetree/removeDoc', {
          notebook,
          path
        });

        if (response.code === 0) {
          return true;
        }
        throw new Error(response.msg || '删除文档失败');
      }
    );
  }

  /**
   * 删除文档（ID方式）
   */
  async removeDocByID(id: string): Promise<OperationResult<boolean>> {
    return await this.executeOperation(
      '删除文档',
      async () => {
        const response = await this.request('/api/filetree/removeDocByID', {
          id
        });

        if (response.code === 0) {
          const cache = cacheManager.getCache(this.serviceName);
          cache.delete(`document_${id}`);
          return true;
        }
        throw new Error(response.msg || '删除文档失败');
      }
    );
  }

  /**
   * 移动文档（路径方式）
   */
  async moveDocs(
    fromNotebook: string,
    fromPaths: string[],
    toNotebook: string,
    toPath: string
  ): Promise<OperationResult<{ moved: number }>> {
    return await this.executeOperation(
      '移动文档',
      async () => {
        const response = await this.request('/api/filetree/moveDocs', {
          fromNotebook,
          fromPaths,
          toNotebook,
          toPath
        });

        if (response.code === 0) {
          return {
            moved: fromPaths.length
          };
        }
        throw new Error(response.msg || '移动文档失败');
      }
    );
  }

  /**
   * 移动文档（ID方式）
   */
  async moveDocsByID(
    fromIDs: string[],
    toID: string
  ): Promise<OperationResult<{ moved: number }>> {
    return await this.executeOperation(
      '移动文档',
      async () => {
        const response = await this.request('/api/filetree/moveDocsByID', {
          fromIDs,
          toID
        });

        if (response.code === 0) {
          return {
            moved: fromIDs.length
          };
        }
        throw new Error(response.msg || '移动文档失败');
      }
    );
  }

  /**
   * 根据路径获取可读路径
   */
  async getHPathByPath(notebook: string, path: string): Promise<OperationResult<string>> {
    return await this.executeOperation(
      '获取可读路径',
      async () => {
        const response = await this.request('/api/filetree/getHPathByPath', {
          notebook,
          path
        });

        if (response.code === 0 && response.data) {
          return response.data.path;
        }
        throw new Error(response.msg || '获取可读路径失败');
      }
    );
  }

  /**
   * 根据ID获取可读路径
   */
  async getHPathByID(id: string): Promise<OperationResult<string>> {
    return await this.executeOperation(
      '获取可读路径',
      async () => {
        const response = await this.request('/api/filetree/getHPathByID', {
          id
        });

        if (response.code === 0 && response.data) {
          return response.data.path;
        }
        throw new Error(response.msg || '获取可读路径失败');
      }
    );
  }

  /**
   * 根据ID获取存储路径
   */
  async getPathByID(id: string): Promise<OperationResult<{ notebook: string; path: string }>> {
    return await this.executeOperation(
      '获取存储路径',
      async () => {
        const response = await this.request('/api/filetree/getPathByID', {
          id
        });

        if (response.code === 0 && response.data) {
          return {
            notebook: response.data.box,
            path: response.data.path
          };
        }
        throw new Error(response.msg || '获取存储路径失败');
      }
    );
  }

  /**
   * 根据可读路径获取ID
   */
  async getIDsByHPath(notebook: string, path: string): Promise<OperationResult<string[]>> {
    return await this.executeOperation(
      '获取文档ID',
      async () => {
        const response = await this.request('/api/filetree/getIDsByHPath', {
          notebook,
          path
        });

        if (response.code === 0 && response.data) {
          return response.data.ids || [];
        }
        throw new Error(response.msg || '获取文档ID失败');
      }
    );
  }

  // ==================== 搜索操作 ====================

  /**
   * 基础搜索
   */
  async searchContent(query: string, options: BaseSearchOptions = {}): Promise<OperationResult<any>> {
    return await this.executeOperation(
      '搜索内容',
      async () => {
        const searchData = {
          query,
          types: {
            document: true,
            heading: true,
            paragraph: true,
            list: true,
            listItem: true,
            codeBlock: true,
            mathBlock: true,
            table: true,
            blockquote: true,
            superBlock: true,
            ...options.types
          },
          method: options.method || 0,
          orderBy: options.orderBy || 0,
          groupBy: options.groupBy || 0,
          paths: options.paths,
          page: options.page || 1,
          pageSize: options.pageSize || 20
        };

        const response = await this.request('/api/search/searchBlock', searchData);
        
        if (response.code === 0) {
          return response.data;
        }
        throw new Error(response.msg || '搜索失败');
      },
      {
        useCache: true,
        cacheKey: `search_${JSON.stringify({ query, ...options })}`,
        cacheTTL: 180000 // 3分钟缓存
      }
    );
  }

  /**
   * 递归搜索
   */
  async recursiveSearch(
    query: string, 
    notebook?: string, 
    options: RecursiveSearchOptions = {}
  ): Promise<OperationResult<any>> {
    return await this.executeOperation(
      '递归搜索',
      async () => {
        // 这里应该调用之前实现的递归搜索逻辑
        // 为了简化，我们先使用基础搜索
        const searchOptions: SearchOptions = {
          query,
          types: options.types,
          method: options.fuzzyMatch ? 0 : 1,
          orderBy: options.orderBy || 0,
          groupBy: 1,
          paths: notebook ? [`/data/${notebook}`] : undefined,
          page: options.page || 1,
          pageSize: options.limit || 50
        };

        const searchResult = await this.searchContent(query, searchOptions);
        
        if (searchResult.success) {
          return {
            ...searchResult.data,
            searchOptions: options,
            isRecursive: true
          };
        }
        throw new Error('递归搜索失败');
      },
      {
        useCache: true,
        cacheKey: `recursive_search_${JSON.stringify({ query, notebook, ...options })}`,
        cacheTTL: 300000 // 5分钟缓存
      }
    );
  }

  // ==================== 批量操作 ====================

  /**
   * 批量读取文档
   */
  async batchReadDocuments(
    documentIds: string[], 
    options: BatchOptions = {}
  ): Promise<OperationResult<Document[]>> {
    return await this.executeOperation(
      '批量读取文档',
      async () => {
        const {
          batchSize = 5,
          maxConcurrency = 3,
          delay = 100
        } = options;

        const results: Document[] = [];
        
        // 分批处理
        for (let i = 0; i < documentIds.length; i += batchSize) {
          const batch = documentIds.slice(i, i + batchSize);
          
          // 并发处理当前批次
          const batchPromises = batch.map(async (id) => {
            try {
              const docResult = await this.getDocument(id);
              return docResult.success ? docResult.data : null;
            } catch (error) {
              logger.warn(`批量读取文档 ${id} 失败:`, error);
              return null;
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults.filter(doc => doc !== null) as Document[]);
          
          // 批次间延迟
          if (i + batchSize < documentIds.length) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        return results;
      },
      {
        timeout: 60000 // 1分钟超时
      }
    );
  }

  // ==================== 工具方法 ====================

  /**
   * 获取文档树
   */
  async getDocumentTree(notebook: string): Promise<OperationResult<DocumentTreeNode[]>> {
    return await this.executeOperation(
      '获取文档树',
      async () => {
        const response = await this.request('/api/filetree/getDoc', {
          notebook,
          path: '/'
        });
        
        if (response.code === 0 && response.data) {
          return this.transformToDocumentTree(response.data);
        }
        throw new Error(response.msg || '获取文档树失败');
      },
      {
        useCache: true,
        cacheKey: `doc_tree_${notebook}`,
        cacheTTL: 300000 // 5分钟缓存
      }
    );
  }

  /**
   * 转换为文档树格式
   */
  private transformToDocumentTree(nodes: any[]): DocumentTreeNode[] {
    return nodes.map(node => ({
      id: node.id,
      title: node.title || node.name || '无标题',
      type: node.type,
      notebook: node.box,
      path: node.path,
      children: node.children ? this.transformToDocumentTree(node.children) : [],
      depth: node.depth || 0,
      hasChildren: !!(node.children && node.children.length > 0),
      childrenCount: node.children ? node.children.length : 0
    }));
  }
}
