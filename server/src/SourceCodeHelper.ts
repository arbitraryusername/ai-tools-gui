import fs from 'fs/promises';
import path from 'path';
import ignore from 'ignore';
import { encoding_for_model } from 'tiktoken'; 
import { getFilePathDelimiter } from './AppConfig.js';
import logger from './logger.js';
import { SourceFile } from '@ai-tools-gui/shared/src/index.js';
import pLimit from 'p-limit';

const FILE_PROCESSING_CONCURRENCY = 12; // I have a 12 physical core machine, 24 logical cores

interface FileProcessingError extends Error {
  path?: string;
}

/**
 * Applies code changes by updating or deleting files based on the provided input.
 *
 * @param generatedCodeChanges - The input string containing file delimiters and their corresponding content.
 * @returns A promise that resolves when all operations are successful or throws an error if a problem occurs.
 */
export async function applyChangesToSourceCode(
  generatedCodeChanges: string,
  sourceAbsolutePath: string
): Promise<void> {

  const delimiter = getFilePathDelimiter();

  // Using the original regex without line start anchors
  const regex = new RegExp(`${delimiter}([^\\r\\n]+)\\r?\\n([\\s\\S]*?)(?=${delimiter}|$)`, 'g');
  const matches = [...generatedCodeChanges.matchAll(regex)];

  logger.info(`Applying changes to path: ${sourceAbsolutePath}. Total file entries found: ${matches.length}`);

  for (const [index, match] of matches.entries()) {
    const relativeFilePath = match[1]?.trim();
    const content = match[2]?.trim();

    if (!relativeFilePath) {
      logger.warn(`Skipping invalid match at index ${index}`);
      continue;
    }

    const normalizedPath = path.normalize(relativeFilePath);
    const fullPath = path.resolve(sourceAbsolutePath, normalizedPath);

    logger.debug(`Processing file (${index + 1}/${matches.length}): ${relativeFilePath}`);

    if (!content) {
      try {
        await fs.unlink(fullPath);
        logger.info(`Deleted file: ${fullPath}`);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          logger.warn(`File not found, skipping deletion: ${fullPath}`);
        } else {
          logger.error(`Failed to delete file at ${fullPath}: ${error.message}`);
          throw new Error(`Failed to delete file at ${fullPath}: ${error.message}`);
        }
      }
      continue;
    }

    try {
      const directory = path.dirname(fullPath);
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
      logger.info(`Successfully updated file: ${fullPath}`);
    } catch (error: any) {
      logger.error(`Failed to process file at ${fullPath}: ${error.message}`);
      throw new Error(`Failed to process file at ${fullPath}: ${error.message}`);
    }
  }
}

/**
 * Combines content from all allowed files into a single string, separated by delimiters.
 * 
 * @param sourceAbsolutePath - The root directory.
 * @returns A string containing file paths and their contents.
 */
export async function combineFilesIntoString(
  sourceAbsolutePath: string,
  fileRelativePaths: string[]
): Promise<string> {
  const delimiter = getFilePathDelimiter();
  let combinedContent = '';

  try {
    for (let i = 0; i < fileRelativePaths.length; i += FILE_PROCESSING_CONCURRENCY) {
      const chunk = fileRelativePaths.slice(i, i + FILE_PROCESSING_CONCURRENCY);
      const readTasks = chunk.map(async (fileRelativePath) => {
        try {
          const fileContents = await fs.readFile(path.join(sourceAbsolutePath, fileRelativePath), 'utf-8');
          return `\n${delimiter}${fileRelativePath}\n${fileContents}`;
        } catch (error) {
          const processingError: FileProcessingError = new Error(`Error reading file: ${fileRelativePath}`);
          processingError.path = fileRelativePath;
          logger.error(`Error reading file: ${fileRelativePath}`, { error });
          throw processingError;
        }
      });

      const results = await Promise.all(readTasks);
      combinedContent += results.join('');
    }
  } catch (error) {
    logger.error('Error combining files into string.', { error });
    throw error;
  }

  return combinedContent;
}

export async function getSourceFiles(sourceAbsolutePath: string): Promise<SourceFile[]> {
  const excludedPaths = await getExcludedPaths(sourceAbsolutePath);
  return await getAllAllowedFiles(sourceAbsolutePath, excludedPaths);
}

const ignoredFolders = ['.git', 'node_modules'];
const ignoredFiles = ['LICENSE', 'package-lock.json', 'pnpm-lock.yaml'];

/**
 * Recursively collects all excluded paths based on a .gitignore file.
 * @param sourceAbsolutePath - The root directory containing the .gitignore file.
 * @returns A Set of excluded paths relative to the root directory, using forward slashes.
 */
async function getExcludedPaths(sourceAbsolutePath: string): Promise<Set<string>> {
  const gitignoreContent = await fs.readFile(path.join(sourceAbsolutePath, '.gitignore'), 'utf-8');
  const ignoreParser = ignore();
  ignoreParser.add(gitignoreContent);

  const allExcludedPaths: Set<string> = new Set();

  async function scanDirectory(dir: string, relativePath = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const entryRelativePath = path.posix.join(relativePath, entry.name);
      const fullPath = path.join(dir, entry.name);

      if (
        ignoreParser.ignores(entryRelativePath) ||
        ignoredFolders.includes(entryRelativePath) ||
        ignoredFiles.includes(entry.name)
      ) {
        allExcludedPaths.add(entryRelativePath);
        if (entry.isDirectory()) continue;
      }

      if (entry.isDirectory()) {
        await scanDirectory(fullPath, entryRelativePath);
      }
    }
  }

  await scanDirectory(sourceAbsolutePath);

  logger.debug('Excluded paths:', Array.from(allExcludedPaths));

  return allExcludedPaths;
}

/**
 * Recursively retrieves all allowed files that are not in the excludedPaths set.
 * 
 * @param directory - The root directory to scan.
 * @param excludedPaths - A set of paths to exclude (relative to the root directory).
 * @param rootDir - The root directory used for calculating relative paths.
 * @returns A promise resolving to an array of files with names and normalized paths.
 */
async function getAllAllowedFiles(
  directory: string,
  excludedPaths: Set<string>,
  rootDir: string = directory
): Promise<SourceFile[]> {
  const allowedFiles: SourceFile[] = [];
  const limit = pLimit(FILE_PROCESSING_CONCURRENCY);

  /**
   * Recursive helper function to traverse directories.
   */
  async function traverse(dir: string, relativePath = ''): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    const tasks = entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      const entryRelativePath = path.posix.join(path.relative(rootDir, fullPath).split(path.sep).join('/'));

      if (excludedPaths.has(entryRelativePath)) {
        return;
      }

      if (entry.isFile()) {
        // Schedule the token count computation with concurrency limit
        await limit(async () => {
          try {
            const tokenCount = await getTokenCount(fullPath);
            allowedFiles.push({ name: entry.name, relativePath: entryRelativePath, tokenCount });
          } catch {
            logger.warn(`Skipping token computation for ${entryRelativePath}`);
            allowedFiles.push({ name: entry.name, relativePath: entryRelativePath, tokenCount: null });
          }
        });
      } else if (entry.isDirectory()) {
        // Recursively traverse subdirectories
        await traverse(fullPath, entryRelativePath);
      }
    });

    await Promise.all(tasks);
  }

  await traverse(directory);

  return allowedFiles;
}

/**
 * Computes the number of tokens in a file's content using OpenAI's tokenizer.
 * 
 * @param filePath - The absolute path of the file.
 * @returns The number of tokens in the file content.
 */
export async function getTokenCount(filePath: string): Promise<number | null> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const encoding = encoding_for_model('gpt-4o-mini'); // assuming we are using gpt-4o-mini
    const tokens = encoding.encode(fileContent); // Returns an array of token IDs
    encoding.free(); // Free up memory used by the encoding object

    return tokens.length;
  } catch (error: any) {
    logger.error(`Failed to compute token count for ${filePath}: ${error.message}`, { error });
    return null;
  }
}
