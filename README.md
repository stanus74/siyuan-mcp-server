# SiYuan MCP Server

Model Context Protocol (MCP) server designed for SiYuan Note, delivering comprehensive AI integration and intelligent knowledge management capabilities.

## 🌟 Core Features

### Notebook Management
- **Notebook operations**: create, list, open, close, rename, and delete notebooks
- **Document management**: create, read, update, delete documents with batch support
- **Block operations**: create, read, update, delete blocks with batch capabilities
- **Block attributes**: manage custom block metadata

### Search Capabilities
- **Simple search**: quick keyword search
- **Recursive search**: deep content harvesting with hierarchy traversal
- **Document search**: precise lookups inside a document
- **Batch read**: efficient retrieval of multiple documents

### Templates & Rendering
- **Template rendering**: support standard template syntax
- **Sprig templates**: leverage Sprig function library for advanced logic
- **Dynamic content**: generate formatted content based on templates

### Export Functionality
- **Markdown export**: export to standard Markdown format
- **Multi-format export**: support PDF, Word, HTML, and other formats
- **Structured export**: preserve document hierarchy when exporting as JSON

### Resource Management
- **File uploads**: upload images, documents, and other resources
- **Resource listings**: enumerate all resources embedded in a document
- **Resource renaming**: rename resource files
- **OCR**: recognize text within images

### Data Operations
- **SQL queries**: execute SQL for complex data inspection
- **File operations**: read, write, and delete files
- **Directory listings**: enumerate files within folders

### System Utilities
- **Time retrieval**: fetch current time across formats and time zones
- **Health checks**: monitor system status and SiYuan connectivity
- **Port discovery**: automatically find available SiYuan ports

### AI Integration
- **Smart tool selection**: AI-powered tool recommendations
- **Usage guidance**: detailed usage scenarios and examples
- **Performance tips**: optimization advice based on usage patterns
- **Error management**: standardized error handling and retries

### Performance Optimization
- **Caching strategies**: intelligent caching for faster responses
- **Batch processing**: high-efficiency batch data operations
- **Monitoring**: real-time performance metrics and stats
- **Concurrency control**: manage request concurrency responsibly

## 🚀 快速开始

### 1. 安装思源笔记
1. 下载安装包：[https://github.com/siyuan-note/siyuan/releases](https://github.com/siyuan-note/siyuan/releases)
2. 启动思源笔记

### 2. 配置思源笔记
1. 启动思源笔记
2. 设置 → 关于 → API token
3. 复制API Token

### 3. 安装 MCP Server

#### 从 npm 安装
```bash
npm install -g siyuan-mcp-server
```

#### 从源码安装
```bash
git clone https://github.com/your-username/siyuan-mcp-server.git
cd siyuan-mcp-server
npm install
npm run build
npm link
```

### 4. 配置 MCP

在您的 MCP 客户端配置文件中添加：

```json
{
  "mcpServers": {
    "siyuan": {
      "command": "npx",
      "args": ["siyuan-mcp-server"],
      "env": {
        "SIYUAN_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

**注意**: 
- `SIYUAN_API_URL` 是可选的，如果不配置，系统会自动发现思源笔记的可用端口
- 如果需要指定端口，可以添加 `"SIYUAN_API_URL": "http://127.0.0.1:6806"`

### 5. 环境变量

- `SIYUAN_API_TOKEN`: 思源笔记 API Token（必需）
- `SIYUAN_API_URL`: 思源笔记 API 地址（可选，默认自动发现可用端口）

**端口自动发现**:
- 系统会自动扫描思源笔记的常用端口（6806, 6807, 6808）
- 如果思源笔记正在运行，系统会自动连接到正确的端口
- 如果自动发现失败，会尝试使用默认端口 6806
- 如需指定端口，可手动设置 `SIYUAN_API_URL` 环境变量

## 🛠️ 技术栈

- **运行时**: Node.js 18+
- **语言**: TypeScript
- **协议**: Model Context Protocol (MCP)
- **HTTP客户端**: Axios
- **构建工具**: TypeScript Compiler

## 📡 MCP 工具列表

### 📚 笔记本操作 (Notebook)
- `list_notebooks` - 列出所有笔记本
- `open_notebook` - 打开笔记本
- `close_notebook` - 关闭笔记本
- `rename_notebook` - 重命名笔记本
- `remove_notebook` - 删除笔记本

### 📄 文档操作 (Document)
- `create_document` - 创建新文档
- `get_document` - 获取文档内容
- `update_document` - 更新文档
- `delete_document` - 删除文档
- `list_documents` - 列出文档
- `batch_read_all` - 批量读取所有文档

### 🧱 块操作 (Block)
- `create_block` - 创建块
- `get_block` - 获取块
- `update_block` - 更新块
- `delete_block` - 删除块
- `prepend_block` - 在块前插入
- `append_block` - 在块后追加
- `fold_block` - 折叠块
- `unfold_block` - 展开块
- `transfer_block_ref` - 转移块引用
- `set_block_attrs` - 设置块属性
- `get_block_attrs` - 获取块属性
- `batch_create_blocks` - 批量创建块
- `batch_update_blocks` - 批量更新块
- `batch_delete_blocks` - 批量删除块

### 🔍 搜索操作 (Search)
- `simple_search` - 简单搜索
- `recursive_search` - 递归搜索
- `search_in_document` - 在文档中搜索

### 🎨 模板操作 (Template)
- `render_template` - 渲染模板
- `render_sprig_template` - 渲染Sprig模板

### 📤 导出操作 (Export)
- `export_markdown` - 导出为Markdown
- `export_file` - 导出为指定格式
- `export_expand` - 导出为树状结构

### 🖼️ 资源操作 (Assets)
- `upload_asset` - 上传资源文件
- `list_assets` - 列出资源文件
- `rename_asset` - 重命名资源文件
- `ocr_asset` - OCR识别图片

### 💾 SQL查询 (SQL)
- `query_sql` - 执行SQL查询

### 📁 文件操作 (File)
- `read_file` - 读取文件
- `write_file` - 写入文件
- `delete_file` - 删除文件
- `list_files` - 列出文件

### ⏰ 系统操作 (System)
- `get_current_time` - 获取当前真实时间

## 📖 使用示例

### 创建文档
```typescript
// 创建新文档
await toolRegistry.execute('create_document', {
  notebook: 'notebook-id',
  path: '/path/to/document',
  title: '文档标题',
  content: '文档内容'
});
```

### 搜索内容
```typescript
// 递归搜索
await toolRegistry.execute('recursive_search', {
  query: '关键词',
  notebook: 'notebook-id',
  maxDepth: 5
});
```

### 批量操作
```typescript
// 批量创建块
await toolRegistry.execute('batch_create_blocks', {
  requests: [
    { content: '第一个块' },
    { content: '第二个块' }
  ]
});
```

### 获取时间
```typescript
// 获取当前时间
await toolRegistry.execute('get_current_time', {
  format: 'iso',
  timezone: 'Asia/Shanghai'
});
```

### 导出文档
```typescript
// 导出为Markdown
await toolRegistry.execute('export_markdown', {
  id: 'document-id'
});
```

## 🔧 开发

### 构建项目
```bash
npm run build
```

### 运行测试
```bash
npm test
```

### 代码检查
```bash
npm run lint
```

### 类型检查
```bash
npm run typecheck
```

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

感谢思源笔记团队提供优秀的笔记软件和 API 支持。

## 📮 联系方式

- 问题反馈: [GitHub Issues](https://github.com/your-username/siyuan-mcp-server/issues)
- 功能建议: [GitHub Discussions](https://github.com/your-username/siyuan-mcp-server/discussions)
