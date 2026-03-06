import logger from '../logger';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export interface SiyuanPortInfo {
  port: number;
  baseURL: string;
  isFixed: boolean;
  version?: string;
}

/**
 * SiYuan Note Port Discovery Tool
 */
export class SiyuanPortDiscovery {
  private token: string;
  
  constructor(token: string) {
    this.token = token;
  }

  /**
   * Get port information by reading SiYuan Note's port.json file
   */
  private async readPortFromConfigFile(): Promise<number | null> {
    try {
      logger.silentInfo('Attempting to read port information from port.json file...');
      
      const homeDir = os.homedir();
      const portJsonPath = path.join(homeDir, '.config', 'siyuan', 'port.json');
      
      if (!fs.existsSync(portJsonPath)) {
        logger.silentInfo('port.json file does not exist');
        return null;
      }
      
      const fileContent = fs.readFileSync(portJsonPath, 'utf8');
      const portData = JSON.parse(fileContent);
      
      // port.json format: { "PID": "PORT" }
      const entries = Object.entries(portData) as [string, string][];
      
      if (entries.length === 0) {
        logger.silentInfo('No port information in port.json file');
        return null;
      }
      
      let kernelPids: Set<string> = new Set();
      
      if (process.platform === 'win32') {
        try {
          const { stdout: processOutput } = await execAsync('tasklist /FI "IMAGENAME eq SiYuan-Kernel.exe" /FO CSV');
          
          if (processOutput.includes('SiYuan-Kernel.exe')) {
            const lines = processOutput.split('\n');
            const kernelLines = lines.filter(line => line.includes('SiYuan-Kernel.exe'));
            
            for (const line of kernelLines) {
              const csvMatch = line.match(/"([^"]+)","(\d+)","([^"]+)","(\d+)","([^"]+)"/);
              if (csvMatch) {
                kernelPids.add(csvMatch[2]);
              }
            }
          }
        } catch (error) {
          logger.warn('Failed to get SiYuan-Kernel.exe process list:', error);
        }
      }
      
      logger.silentInfo(`Found SiYuan-Kernel.exe process PIDs: ${Array.from(kernelPids).join(', ')}`);
      
      const validEntries = entries.filter(([pid, portStr]) => {
        const port = parseInt(portStr);
        return !isNaN(port) && port > 0 && port <= 65535;
      });
      
      const kernelEntries = validEntries.filter(([pid]) => kernelPids.has(pid));
      const otherEntries = validEntries.filter(([pid]) => !kernelPids.has(pid));
      
      for (const [pid, portStr] of kernelEntries) {
        const port = parseInt(portStr);
        logger.silentInfo(`Verifying port: ${port} for SiYuan-Kernel.exe process PID ${pid}`);
        
        if (await this.isValidSiyuanPort(port)) {
          logger.silentInfo(`SiYuan-Kernel.exe process PID ${pid} port ${port} verification successful`);
          return port;
        }
      }
      
      for (const [pid, portStr] of otherEntries) {
        const port = parseInt(portStr);
        logger.silentInfo(`Verifying port: ${port} (PID: ${pid})`);
        
        if (await this.isValidSiyuanPort(port)) {
          logger.silentInfo(`Port ${port} verification successful`);
          return port;
        }
      }
      
      logger.silentInfo('All ports in port.json are unreachable');
      return null;
    } catch (error) {
      logger.error('Failed to read port.json file:', error);
      return null;
    }
  }

  /**
   * Find the port occupied by SiYuan Note through SiYuan-Kernel.exe process
   */
  private async findSiyuanProcessPort(): Promise<number | null> {
    try {
      logger.info('Finding port through SiYuan-Kernel.exe process...');
      
      // Windows system command
      if (process.platform === 'win32') {
        // Get the process PID list of SiYuan-Kernel.exe
        const { stdout: processOutput } = await execAsync('tasklist /FI "IMAGENAME eq SiYuan-Kernel.exe" /FO CSV');
        const kernelPids = new Set();
        
        if (processOutput.includes('SiYuan-Kernel.exe')) {
          const lines = processOutput.split('\n');
          const kernelLines = lines.filter(line => line.includes('SiYuan-Kernel.exe'));
          
          for (const line of kernelLines) {
            const csvMatch = line.match(/"([^"]+)","(\d+)","([^"]+)","(\d+)","([^"]+)"/);
            if (csvMatch) {
              kernelPids.add(csvMatch[2]);
            }
          }
        }
        
        if (kernelPids.size === 0) {
          logger.info('SiYuan-Kernel.exe process not found');
          return null;
        }
        
        logger.info(`Found SiYuan-Kernel.exe process PIDs: ${Array.from(kernelPids).join(', ')}`);
        
        // Get all listening ports
        const { stdout: netstatOutput } = await execAsync('netstat -ano | findstr LISTENING');
        const netstatLines = netstatOutput.split('\n');
        
        // Find the port that the kernel process is listening on
        for (const line of netstatLines) {
          if (line.includes('LISTENING')) {
            const match = line.match(/TCP\s+127\.0\.0\.1:(\d+)\s+.*LISTENING\s+(\d+)/);
            if (match) {
              const port = parseInt(match[1]);
              const pid = match[2];
              
              // Check if it is the PID of SiYuan-Kernel.exe process
              if (kernelPids.has(pid)) {
                logger.info(`Discovered SiYuan-Kernel.exe process PID ${pid} listening port: ${port}`);
                
                // Verify if the port is really SiYuan API
                if (await this.isValidSiyuanPort(port)) {
                  logger.info(`Verification successful, port ${port} is SiYuan API`);
                  return port;
                }
              }
            }
          }
        }
        
        logger.info('SiYuan-Kernel.exe process is not listening on any valid SiYuan API port');
        return null;
      } else {
        // Linux/macOS system command
        try {
          // Find SiYuan-Kernel process
          const { stdout: processOutput } = await execAsync('ps aux | grep -i siyuan-kernel | grep -v grep');
          
          if (!processOutput.trim()) {
            logger.info('SiYuan-Kernel process not found');
            return null;
          }
          
          // Get process PID
          const lines = processOutput.split('\n').filter(line => line.trim());
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 2) {
              const pid = parts[1];
              logger.info(`Found SiYuan-Kernel process PID: ${pid}`);
              
              try {
                // Find the port occupied by this process
                const { stdout: lsofOutput } = await execAsync(`lsof -Pan -p ${pid} -i`);
                
                // Parse port information
                const portMatches = lsofOutput.match(/:(\d+)\s+\(LISTEN\)/g);
                if (portMatches) {
                  for (const match of portMatches) {
                    const portMatch = match.match(/:(\d+)/);
                    if (portMatch) {
                      const port = parseInt(portMatch[1]);
                      if (port >= 3000 && port <= 65535) {
                        logger.info(`Discovered SiYuan-Kernel process listening port: ${port}`);
                        
                        // Verify if the port is really SiYuan API
                        if (await this.isValidSiyuanPort(port)) {
                          return port;
                        }
                      }
                    }
                  }
                }
              } catch (lsofError) {
                logger.warn(`Error finding port for PID ${pid}:`, lsofError);
                continue;
              }
            }
          }
        } catch (error) {
          logger.warn('Error finding SiYuan-Kernel process:', error);
        }
      }
      
      logger.info('Failed to find SiYuan port through SiYuan-Kernel process');
      return null;
    } catch (error) {
      logger.warn('Error finding SiYuan-Kernel process port:', error);
      return null;
    }
  }

  /**
   * Verify if the port is a valid SiYuan API port
   */
  private async isValidSiyuanPort(port: number): Promise<boolean> {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/system/version`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        const data = await response.json();
        return data && typeof data === 'object' && data.code === 0;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }



  /**
   * Test if the specified port is a SiYuan Note service
   */
  private async testPort(port: number, isFixed: boolean, timeout = 5000): Promise<SiyuanPortInfo | null> {
    const baseURL = `http://127.0.0.1:${port}/`;
    
    try {
      // Create timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // 1. Test basic connection
      const response = await fetch(baseURL, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SiyuanMCP/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return null;
      }

      // 2. Test API endpoint
      const apiController = new AbortController();
      const apiTimeoutId = setTimeout(() => apiController.abort(), timeout);
      
      const apiResponse = await fetch(`${baseURL}/api/system/version`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${this.token}`,
          'User-Agent': 'SiyuanMCP/1.0'
        },
        body: JSON.stringify({}),
        signal: apiController.signal
      });

      clearTimeout(apiTimeoutId);

      if (apiResponse.ok) {
        const result = await apiResponse.json();
        
        // Verify if it is a SiYuan Note API response
        if (result && typeof result === 'object') {
          return {
            port,
            baseURL,
            isFixed,
            version: typeof result.data === 'string' ? result.data : (result.data?.version || result.data?.ver || result.data?.kernelVersion || 'detected')
          };
        }
      }

      return null;
    } catch (error) {
      // Ignore connection errors, this is normal
      return null;
    }
  }



  /**
   * Auto-discover and return the best port configuration
   */
  async autoDiscover(): Promise<{ baseURL: string; port: number; version?: string } | null> {
    logger.info('Starting auto-discovery of SiYuan Note ports...');
    
    try {
      // 1. First try to read the port from port.json file (most direct method)
      const portFromFile = await this.readPortFromConfigFile();
      if (portFromFile) {
        logger.info(`Discovered SiYuan port from port.json file: ${portFromFile}`);
        
        // Get detailed port information including version
        const detailedInfo = await this.testPort(portFromFile, false);
        if (detailedInfo) {
          return {
            baseURL: detailedInfo.baseURL,
            port: detailedInfo.port,
            version: detailedInfo.version
          };
        }
        
        return {
          baseURL: `http://127.0.0.1:${portFromFile}/`,
          port: portFromFile,
          version: 'detected'
        };
      }
    } catch (error) {
      logger.warn('Failed to read port from port.json file:', error);
    }
    
    try {
      // 2. If port.json method fails, try to find the port through SiYuan-Kernel.exe process
      const siyuanPort = await this.findSiyuanProcessPort();
      if (siyuanPort) {
        logger.info(`Discovered SiYuan port through SiYuan-Kernel.exe: ${siyuanPort}`);
        
        return {
          baseURL: `http://127.0.0.1:${siyuanPort}/`,
          port: siyuanPort,
          version: 'unknown'
        };
      }
    } catch (error) {
      logger.warn('Failed to find port through SiYuan-Kernel.exe:', error);
    }
    
    // If all methods fail, return null
    logger.warn('No available SiYuan Note ports discovered');
    return null;
  }
}

/**
 * Create port discoverer
 */
export function createPortDiscovery(token: string): SiyuanPortDiscovery {
  return new SiyuanPortDiscovery(token);
}
