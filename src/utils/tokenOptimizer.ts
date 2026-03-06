/**
 * Token optimization tool - reduce token consumption in AI interactions
 */

export interface TokenOptimizationConfig {
  maxContentLength: number;
  summaryLength: number;
  keywordsLimit: number;
  contextWindow: number;
}

export class TokenOptimizer {
  private config: TokenOptimizationConfig;

  constructor(config: Partial<TokenOptimizationConfig> = {}) {
    this.config = {
      maxContentLength: 2000,
      summaryLength: 200,
      keywordsLimit: 10,
      contextWindow: 4000,
      ...config
    };
  }

  /**
   * Compress document content, preserve key information
   */
  compressContent(content: string): string {
    if (content.length <= this.config.maxContentLength) {
      return content;
    }

    // Extract titles and key paragraphs
    const lines = content.split('\n');
    const important: string[] = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      // Preserve titles
      if (trimmed.startsWith('#')) {
        important.push(trimmed);
      }
      // Preserve keyword-dense paragraphs
      else if (this.isImportantParagraph(trimmed)) {
        important.push(trimmed.substring(0, 100) + '...');
      }
    });

    return important.join('\n').substring(0, this.config.maxContentLength);
  }

  /**
   * Generate concise summary
   */
  generateSummary(content: string): string {
    const compressed = this.compressContent(content);
    const sentences = compressed.split(/[。！？.!?]/).filter(s => s.trim());
    
    // Select the most important sentences
    const important = sentences
      .filter(s => s.length > 10 && s.length < 100)
      .slice(0, 3)
      .join('。');

    return important.substring(0, this.config.summaryLength);
  }

  /**
   * Extract keywords
   */
  extractKeywords(content: string): string[] {
    const text = content.toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && word.length < 15);

    const frequency: Record<string, number> = {};
    text.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.config.keywordsLimit)
      .map(([word]) => word);
  }

  /**
   * Optimize search results
   */
  optimizeSearchResults(results: any[]): any[] {
    return results.slice(0, 5).map(result => ({
      id: result.id,
      title: this.truncateText(result.title || '', 50),
      content: this.truncateText(result.content || '', 100),
      score: result.score
    }));
  }

  /**
   * Batch operation result summary
   */
  summarizeBatchResults(results: any[]): string {
    const success = results.filter(r => r.success).length;
    const total = results.length;
    const errors = results.filter(r => !r.success).length;

    return `Batch operation completed: ${success}/${total} succeeded${errors > 0 ? `, ${errors} errors` : ''}`;
  }

  isImportantParagraph(text: string): boolean {
    const keywords = ['important', 'critical', 'core', 'main', 'summary', 'conclusion'];
    return keywords.some(keyword => text.includes(keyword)) || text.length > 50;
  }

  truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
}

const tokenOptimizer = new TokenOptimizer();
