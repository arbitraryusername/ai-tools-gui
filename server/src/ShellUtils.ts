import spawn from 'cross-spawn';
import { ChildProcess } from 'child_process';
import { CommandResult } from 'types';
import logger from './logger';

export async function executeCommand(
  command: string,
  targetDir: string
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');

    const child: ChildProcess = spawn(cmd, args, {
      cwd: targetDir,
      shell: true,
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        stdout += output;
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data: Buffer) => {
        const errorOutput = data.toString();
        stderr += errorOutput;
      });
    }

    child.on('close', (code: number | null) => {
      if (code === 0) {
        logger.info(`Command "${command}" executed successfully in directory "${targetDir}"\nSTDOUT:\n${stdout}`);
        resolve({ stdout, stderr });
      } else {
        logger.error(`Command "${command}" failed in directory "${targetDir}" with exit code ${code}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
        reject(new Error(`Command failed with exit code ${code}.\n${stderr}`));
      }
    });

    child.on('error', (error: Error) => {
      logger.error(`Failed to start command "${command}" in directory "${targetDir}": ${error.message}`);
      reject(error);
    });
  });
}
