import fs from 'fs/promises';
import path from 'path';
import ignore from 'ignore';
import { getFilePathDelimiter } from './AppConfig.js';
import logger from './logger.js';

const FILE_PROCESSING_CONCURRENCY = 10;

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

export async function getSourceFiles(sourceAbsolutePath: string): Promise<{ name: string; path: string; children?: any[] }[]> {
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
): Promise<{ name: string; path: string }[]> {
  const allowedFiles: { name: string; path: string }[] = [];

  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    const relativePath = path.posix.join(path.relative(rootDir, fullPath).split(path.sep).join('/'));

    if (excludedPaths.has(relativePath)) {
      continue;
    }

    if (entry.isFile()) {
      allowedFiles.push({ name: entry.name, path: relativePath });
    } else if (entry.isDirectory()) {
      const children = await getAllAllowedFiles(fullPath, excludedPaths, rootDir);
      allowedFiles.push(...children);
    }
  }

  return allowedFiles;
}
