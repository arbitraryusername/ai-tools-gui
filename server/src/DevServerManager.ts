import { spawn, ChildProcess } from 'child_process';
import logger from './logger.js';

class DevServerManager {
  private process: ChildProcess | null = null;

  /**
   * Starts the dev server using "pnpm dev" and keeps a reference to the process.
   * @param targetDir The directory where the command should run.
   * @returns A promise that resolves when the process starts successfully or rejects on error.
   */
  async startDevServer(targetDir: string): Promise<void> {
    if (this.process) {
      logger.warn("Dev server is already running.");
      return;
    }

    return new Promise((resolve, reject) => {
      logger.info(`Starting dev server in directory: ${targetDir}`);
      this.process = spawn('pnpm', ['dev'], {
        cwd: targetDir,
        shell: true,
        stdio: 'inherit',
      });

      this.process.on('spawn', () => {
        logger.info('Dev server started successfully.');
        resolve();
      });

      this.process.on('error', (err) => {
        logger.error(`Failed to start dev server: ${err}`);
        this.process = null;
        reject(err);
      });

      this.process.on('close', (code) => {
        logger.info(`Dev server stopped with exit code ${code}`);
        this.process = null;
      });
    });
  }

  /**
   * Stops the running dev server if it exists.
   * @returns A promise that resolves when the process is stopped or rejects if no process is running.
   */
  async stopDevServer(): Promise<void> {
    if (!this.process) {
      logger.warn("No dev server is currently running.");
      return Promise.reject(new Error("No dev server is currently running."));
    }

    return new Promise((resolve, reject) => {
      logger.info("Stopping dev server...");
      this.process?.on('close', (code) => {
        logger.info(`Dev server stopped with exit code ${code}`);
        this.process = null;
        resolve();
      });

      try {
        this.process?.kill('SIGINT'); // Graceful termination signal
      } catch (err) {
        logger.error(`Failed to stop dev server: ${err}`);
        reject(err);
      }
    });
  }

  /**
   * Checks if the dev server is running.
   * @returns True if the dev server process exists, false otherwise.
   */
  isDevServerRunning(): boolean {
    const isRunning = this.process !== null;
    logger.debug(`Dev server running: ${isRunning}`);
    return isRunning;
  }
}

// Usage example
export const devServerManager = new DevServerManager();
