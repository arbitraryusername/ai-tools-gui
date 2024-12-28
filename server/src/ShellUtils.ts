import spawn from 'cross-spawn';
import { ChildProcess } from 'child_process';

interface CommandResult {
  stdout: string;
  stderr: string;
}

export async function executeCommand(
  command: string,
  targetDir: string
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');

    const child: ChildProcess = spawn(cmd, args, {
      cwd: targetDir,
      shell: true,
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
    }

    child.on('close', (code: number | null) => {
      if (code === 0) {
        console.log(`Command ${command} @ ${targetDir} succeeded:\n${stdout}`);
        resolve({ stdout, stderr });
      } else {
        console.error(`Command '${command}' @ ${targetDir} failed with exit code ${code}:\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
        reject(new Error(`${stdout}\n${stderr}`));
      }
    });

    child.on('error', (error: Error) => {
      console.error('Failed to start command:', error);
      reject(error);
    });
  });
}

export type { CommandResult };