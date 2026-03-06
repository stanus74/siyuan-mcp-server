/**
 * Terminal encoding processing tool
 * Fix Chinese character garbled issue in Windows terminal
 */

/**
 * Set Node.js process encoding
 */
function setupEncoding(): void {
  // Set standard output encoding to UTF-8
  if (process.stdout.setEncoding) {
    process.stdout.setEncoding('utf8');
  }
  
  // Set standard error output encoding to UTF-8
  if (process.stderr.setEncoding) {
    process.stderr.setEncoding('utf8');
  }
  
  // Set environment variables
  process.env.NODE_OPTIONS = process.env.NODE_OPTIONS || '--max-old-space-size=4096';
  
  // Windows-specific settings
  if (process.platform === 'win32') {
    // Try to set console code page
    try {
      const { execSync } = require('child_process');
      execSync('chcp 65001', { stdio: 'ignore' });
    } catch (error) {
      // Ignore errors and continue execution
    }
  }
}

/**
 * Safe console output to avoid garbled text
 */
function safeLog(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  try {
    // MCP protocol requirement: all logs must output to stderr, cannot pollute stdout
    // Completely disable log output - users don't need any logs
  } catch (error) {
    // If encoding issues occur, use ASCII-safe output
    const safeMessage = message.replace(/[^\x00-\x7F]/g, '?');
    // Completely disable log output - users don't need any logs
  }
}

/**
 * Convert Chinese messages to English to avoid garbled text
 */
function toEnglishMessage(chineseMessage: string): string {
  const messageMap: Record<string, string> = {
    '正在扫描端口': 'Scanning port',
    '端口扫描完成': 'Port scan completed',
    '发现思源笔记实例': 'Found SiYuan instance',
    '连接成功': 'Connection successful',
    '连接失败': 'Connection failed',
    '开始端口发现': 'Starting port discovery',
    '端口发现完成': 'Port discovery completed',
    '未找到可用端口': 'No available port found',
    '服务器启动': 'Server started',
    '服务器停止': 'Server stopped',
    '初始化完成': 'Initialization completed',
    '配置加载': 'Configuration loaded',
    '错误': 'Error',
    '警告': 'Warning',
    '信息': 'Info'
  };
  
  return messageMap[chineseMessage] || chineseMessage;
}
