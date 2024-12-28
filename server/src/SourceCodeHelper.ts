import fs from 'fs/promises';
import path from 'path';
import { getFilePathDelimiter, getSourceCodeAbsolutePath } from './AppConfig';

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

const ALLOWED_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.html',
  '.css',
  '.scss',
  '.json',
  '.yml',
  '.yaml',
] as const;

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.cache',
  '.vscode',
  'public',
] as const);

const EXCLUDED_FILES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'eslint.config.js',
  'tsconfig.json',
  'vite-env.d.ts',
  'vite.config.ts',
] as const);

const FILE_PROCESSING_CONCURRENCY = 10;

type AllowedExtension = typeof ALLOWED_EXTENSIONS[number];
type ExcludedDir = typeof EXCLUDED_DIRS extends Set<infer T> ? T : never;
type ExcludedFile = typeof EXCLUDED_FILES extends Set<infer T> ? T : never;

interface FileProcessingError extends Error {
  path?: string;
}

async function getAllAllowedFiles(directory: string): Promise<string[]> {
  const filePaths: string[] = [];

  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    const tasks = entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name as ExcludedDir)) {
          return;
        }
        const nestedFiles = await getAllAllowedFiles(fullPath);
        filePaths.push(...nestedFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase() as AllowedExtension;
        const isExcludedFile = EXCLUDED_FILES.has(entry.name as ExcludedFile);

        if (ALLOWED_EXTENSIONS.includes(ext) && !isExcludedFile) {
          filePaths.push(fullPath);
        }
      }
    });

    await Promise.all(tasks);
  } catch (error) {
    const processingError: FileProcessingError = new Error(
      `Error reading directory: ${directory}`
    );
    processingError.path = directory;
    processingError.cause = error;
    throw processingError;
  }

  return filePaths;
}

export async function combineFilesIntoString(
  absolutePathStart: string
): Promise<string> {
  let combinedContent = '';
  const delimiter = getFilePathDelimiter();

  try {
    const allFiles = await getAllAllowedFiles(absolutePathStart);

    for (let i = 0; i < allFiles.length; i += FILE_PROCESSING_CONCURRENCY) {
      const chunk = allFiles.slice(i, i + FILE_PROCESSING_CONCURRENCY);
      const readTasks = chunk.map(async (filePath) => {
        try {
          const fileContents = await fs.readFile(filePath, 'utf-8');
          let relativePath = path.relative(absolutePathStart, filePath);
          relativePath = relativePath.split(path.sep).join('/');

          return `\n${delimiter}${relativePath}\n${fileContents}`;
        } catch (error) {
          const processingError: FileProcessingError = new Error(
            `Error reading file: ${filePath}`
          );
          processingError.path = filePath;
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

export type {
  AllowedExtension,
  ExcludedDir,
  ExcludedFile,
  FileProcessingError
};
