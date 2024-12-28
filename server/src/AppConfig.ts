import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const FILE_PATH_DELIMITER = "~~" as const;

export function getCurrentDirectory(): string {
  const __filename = fileURLToPath(import.meta.url);
  return path.dirname(__filename);
}

export function getSourceCodeRelativePath(): string {
  const relativePath = process.env.SOURCE_CODE_RELATIVE_PATH;
  if (!relativePath) {
    throw new Error('SOURCE_CODE_RELATIVE_PATH environment variable is not set');
  }
  return relativePath;
}

/**
 * Retrieves the absolute path to the source code directory with forward slashes.
 *
 * @returns The absolute path with forward slashes
 * @throws Error if required environment variables are not set
 */
export function getSourceCodeAbsolutePath(): string {
  const currentDirectory = getCurrentDirectory();
  const sourceCodeRelativePath = getSourceCodeRelativePath();
  
  const absolutePath = path.resolve(currentDirectory, sourceCodeRelativePath);
  return absolutePath.split(path.sep).join('/');
}

export function getOpenAiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return apiKey;
}

export function getFilePathDelimiter(): string {
  return FILE_PATH_DELIMITER;
}

export type { FilePathDelimiter };
type FilePathDelimiter = typeof FILE_PATH_DELIMITER;