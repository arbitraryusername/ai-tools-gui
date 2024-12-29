import fs from 'fs/promises';
import path from 'path';
import { getFilePathDelimiter } from './AppConfig.js';
import gitignoreParser from 'gitignore-parser';
import ignore from 'ignore';

// TODO: should I only use the .gitignore file to determine the initial set of disallowed files? 
// const ALLOWED_EXTENSIONS = [
//   '.ts',
//   '.tsx',
//   '.js',
//   '.jsx',
//   '.html',
//   '.css',
//   '.scss',
//   '.json',
//   '.yml',
//   '.yaml',
// ] as const;

// const EXCLUDED_DIRS = new Set([
//   'node_modules',
//   '.git',
//   'dist',
//   'build',
//   '.cache',
//   '.vscode',
//   'public',
// ] as const);

// const EXCLUDED_FILES = new Set([
//   'package-lock.json',
//   'pnpm-lock.yaml',
//   'eslint.config.js',
//   'tsconfig.json',
//   'vite-env.d.ts',
//   'vite.config.ts',
// ] as const);

const FILE_PROCESSING_CONCURRENCY = 20;

interface FileProcessingError extends Error {
  path?: string;
}

/**
 * Applies code changes by updating or deleting files based on the provided input.
 *
 * @param generatedCodeChanges - The input string containing file delimiters and their corresponding content.
 * @returns A promise that resolves when all operations are successful or throws an error if a problem occurs.
 */
export async function applyChangesToSourceCode(generatedCodeChanges: string, sourceAbsolutePath: string): Promise<void> {
  console.log(`\n\nApplying changes to path ${sourceAbsolutePath}`);

  const delimiter = getFilePathDelimiter();
  const regex = new RegExp(`${delimiter}([^\\r\\n]+)\\r?\\n([\\s\\S]*?)(?=${delimiter}|$)`, 'g');
  const matches = [...generatedCodeChanges.matchAll(regex)];

  console.log(`Total file entries found: ${matches.length}`);

  for (const [index, match] of matches.entries()) {
    const relativeFilePath = match[1]?.trim();
    const content = match[2]?.trim();

    if (!relativeFilePath) {
      console.warn(`Skipping invalid match at index ${index}`);
      continue;
    }

    console.log(`Processing file (${index + 1}/${matches.length}): ${relativeFilePath}`);
    const normalizedPath = path.normalize(relativeFilePath);
    const fullPath = path.resolve(sourceAbsolutePath, normalizedPath);

    console.log(`Resolved full path: ${fullPath}`);

    if (!content) {
      try {
        await fs.unlink(fullPath);
        console.log(`Deleted file: ${fullPath}`);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          console.log(`File not found, skipping deletion: ${fullPath}`);
        } else {
          throw new Error(`Failed to delete file at ${fullPath}: ${error.message}`);
        }
      }
      continue;
    }

    try {
      const directory = path.dirname(fullPath);
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
      console.log(`Successfully updated file: ${fullPath}`);
    } catch (error: any) {
      throw new Error(`Failed to process file at ${fullPath}: ${error.message}`);
    }
  }
}

export async function combineFilesIntoString(
  sourceAbsolutePath: string
): Promise<string> {
  let combinedContent = '';
  const delimiter = getFilePathDelimiter();

  try {
    const excludedPaths = await getExcludedPaths(sourceAbsolutePath);
    const allFiles = await getAllAllowedFiles(sourceAbsolutePath, excludedPaths);

    for (let i = 0; i < allFiles.length; i += FILE_PROCESSING_CONCURRENCY) {
      const chunk = allFiles.slice(i, i + FILE_PROCESSING_CONCURRENCY);
      const readTasks = chunk.map(async (filePath) => {
        try {
          const fileContents = await fs.readFile(filePath.path, 'utf-8');
          let relativePath = path.relative(sourceAbsolutePath, filePath.path);
          relativePath = relativePath.split(path.sep).join('/');

          return `\n${delimiter}${relativePath}\n${fileContents}`;
        } catch (error) {
          const processingError: FileProcessingError = new Error(
            `Error reading file: ${filePath}`
          );
          processingError.path = filePath.path;
          processingError.cause = error;
          throw processingError;
        }
      });

      const results = await Promise.all(readTasks);
      combinedContent += results.join('');
    }
  } catch (error) {
    const processingError: FileProcessingError = new Error(
      'Error combining files into string'
    );
    processingError.cause = error;
    throw processingError;
  }

  return combinedContent;
}

export async function getSourceFiles(sourceAbsolutePath: string): Promise<{ name: string; path: string; children?: any[] }[]> {
  const excludedPaths = await getExcludedPaths(sourceAbsolutePath);
  return await getAllAllowedFiles(sourceAbsolutePath, excludedPaths);
}

/**
 * Recursively collects all excluded paths based on a .gitignore file.
 * @param sourceAbsolutePath - The root directory containing the .gitignore file.
 * @returns A Set of excluded paths relative to the root directory, using forward slashes.
 */
async function getExcludedPaths(sourceAbsolutePath: string): Promise<Set<string>> {
  // Read and parse the .gitignore file
  const gitignoreContent = await fs.readFile(path.join(sourceAbsolutePath, '.gitignore'), 'utf-8');
  const ignoreParser = ignore();
  ignoreParser.add(gitignoreContent);

  const allExcludedPaths: Set<string> = new Set();

  /**
   * Recursively scans a directory to find excluded paths.
   * @param dir - The directory to scan.
   * @param relativePath - The path relative to the source root.
   */
  async function scanDirectory(dir: string, relativePath = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const entryRelativePath = path.posix.join(relativePath, entry.name); // Use path.posix.join for forward slashes
      const fullPath = path.join(dir, entry.name);

      // Check if the relative path is ignored
      if (ignoreParser.ignores(entryRelativePath)) {
        allExcludedPaths.add(entryRelativePath);
        // Skip further processing of ignored directories
        if (entry.isDirectory()) continue;
      }

      // Recursively scan subdirectories
      if (entry.isDirectory()) {
        await scanDirectory(fullPath, entryRelativePath);
      }
    }
  }

  // Start scanning from the root directory
  await scanDirectory(sourceAbsolutePath);

  console.log("allExcludedPaths: ", allExcludedPaths);

  return allExcludedPaths;
}

/**
 * Recursively retrieves all allowed files and directories that are not in the excludedPaths set.
 * Returns a tree structure with file and directory names and their paths (using forward slashes).
 * 
 * @param directory - The root directory to scan.
 * @param excludedPaths - A set of paths to exclude (relative to the root directory).
 * @returns A promise resolving to an array representing the directory tree, with paths normalized to use forward slashes.
 */
async function getAllAllowedFiles(
  directory: string,
  excludedPaths: Set<string>
): Promise<{ name: string; path: string; children?: any[] }[]> {
  const fileTree: { name: string; path: string; children?: any[] }[] = [];

  const entries = await fs.readdir(directory, { withFileTypes: true });
  const tasks = entries.map(async (entry) => {
    const relativePath = path.posix.join(path.relative(directory, entry.name));
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!excludedPaths.has(relativePath)) {
        const children = await getAllAllowedFiles(fullPath, excludedPaths);
        fileTree.push({ name: entry.name, path: fullPath.replace(/\\/g, '/'), children });
      }
    } else if (entry.isFile()) {
      if (!excludedPaths.has(relativePath)) {
        fileTree.push({ name: entry.name, path: fullPath.replace(/\\/g, '/') });
      }
    }
  });

  await Promise.all(tasks);
  return fileTree;
}