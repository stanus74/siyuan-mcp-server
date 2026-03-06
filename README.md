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

## 🚀 Quick Start

### 1. Install SiYuan Note
1. Download the installer from [https://github.com/siyuan-note/siyuan/releases](https://github.com/siyuan-note/siyuan/releases)
2. Launch SiYuan Note

### 2. Configure SiYuan Note
1. Start SiYuan Note
2. Go to Settings → About → API Token
3. Copy the API token for later use

### 3. Install the MCP Server

#### Install via npm
```bash
npm install -g siyuan-mcp-server
```

#### Install from source
```bash
git clone https://github.com/your-username/siyuan-mcp-server.git
cd siyuan-mcp-server
npm install
npm run build
npm link
```

### 4. Configure your MCP client

Add the following entry to your MCP client configuration:

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

**Notes**:
- `SIYUAN_API_URL` is optional; the server will auto-discover SiYuan Note ports if you leave it unset
- To force a specific port, add `"SIYUAN_API_URL": "http://127.0.0.1:6806"`

### 5. Environment variables

- `SIYUAN_API_TOKEN`: the SiYuan Note API token (required)
- `SIYUAN_API_URL`: the SiYuan Note API endpoint (optional; auto-discovered by default)

**Port discovery behavior**:
- The server checks common SiYuan Note ports (6806, 6807, 6808)
- It automatically connects to a running instance if one is found
- If discovery fails, it falls back to port 6806
- Set `SIYUAN_API_URL` manually if you need to override the default

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Protocol**: Model Context Protocol (MCP)
- **HTTP client**: Axios
- **Build tool**: TypeScript Compiler

## 📡 MCP Tooling Summary

### 📚 Notebook Operations
- `list_notebooks` — List all notebooks
- `open_notebook` — Open a notebook
- `close_notebook` — Close a notebook
- `rename_notebook` — Rename a notebook
- `remove_notebook` — Delete a notebook

### 📄 Document Operations
- `create_document` — Create a new document
- `get_document` — Retrieve document content
- `update_document` — Update document content
- `delete_document` — Remove a document
- `list_documents` — Enumerate documents
- `batch_read_all` — Read all documents in bulk

### 🧱 Block Operations
- `create_block` — Create a block
- `get_block` — Fetch a block
- `update_block` — Update a block
- `delete_block` — Delete a block
- `prepend_block` — Insert a block before another
- `append_block` — Append a block after another
- `fold_block` — Fold (collapse) a block
- `unfold_block` — Unfold (expand) a block
- `transfer_block_ref` — Transfer block references
- `set_block_attrs` — Set block attributes
- `get_block_attrs` — Get block attributes
- `batch_create_blocks` — Create blocks in bulk
- `batch_update_blocks` — Update multiple blocks at once
- `batch_delete_blocks` — Delete several blocks in one request

### 🔍 Search Operations
- `simple_search` — Basic keyword search
- `recursive_search` — Deep search that traverses hierarchies
- `search_in_document` — Search within a specified document

### 🎨 Template Operations
- `render_template` — Render a standard template
- `render_sprig_template` — Render a Sprig-enhanced template

### 📤 Export Operations
- `export_markdown` — Export content as Markdown
- `export_file` — Export to a given format
- `export_expand` — Export structured tree data

### 🖼️ Asset Management
- `upload_asset` — Upload file resources
- `list_assets` — List document assets
- `rename_asset` — Rename asset files
- `ocr_asset` — OCR an image

### 💾 SQL Queries
- `query_sql` — Run SQL queries

### 📁 File Operations
- `read_file` — Read a file
- `write_file` — Write a file
- `delete_file` — Delete a file
- `list_files` — List files in a directory

### ⏰ System Operations
- `get_current_time` — Retrieve the current real-world time

## 📖 Usage Examples

### Create a Document
```typescript
// Create a new document
await toolRegistry.execute('create_document', {
  notebook: 'notebook-id',
  path: '/path/to/document',
  title: 'Document Title',
  content: 'Document Content'
});
```

### Search Content
```typescript
// Recursive search
await toolRegistry.execute('recursive_search', {
  query: 'keywords',
  notebook: 'notebook-id',
  maxDepth: 5
});
```

### Batch Operations
```typescript
// Batch create blocks
await toolRegistry.execute('batch_create_blocks', {
  requests: [
    { content: 'First block' },
    { content: 'Second block' }
  ]
});
```

### Get Current Time
```typescript
// Retrieve current time
await toolRegistry.execute('get_current_time', {
  format: 'iso',
  timezone: 'Asia/Shanghai'
});
```

### Export Documents
```typescript
// Export as Markdown
await toolRegistry.execute('export_markdown', {
  id: 'document-id'
});
```

## 🔧 Development

### Build the Project
```bash
npm run build
```

### Run Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npm run typecheck
```

## 🤝 Contribution Guide

Contributions, bug reports, and feature suggestions are welcome!

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License – see [LICENSE](LICENSE) for details

## 🙏 Acknowledgements

Thanks to the SiYuan Note team for providing an excellent note-taking application and API support.

## 📮 Contact

- Issue tracking: [GitHub Issues](https://github.com/your-username/siyuan-mcp-server/issues)
- Feature suggestions: [GitHub Discussions](https://github.com/your-username/siyuan-mcp-server/discussions)
