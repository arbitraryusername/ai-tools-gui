import fs from 'fs/promises';
import path from 'path';
import { getFilePathDelimiter } from './AppConfig.js';
import gitignoreParser from 'gitignore-parser';

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

export async function getSourceFiles(sourceAbsolutePath: string): Promise<{ name: string; path: string; children?: any[] }[]> {
  const excludedPaths = await getExcludedPaths(sourceAbsolutePath);
  return await getAllAllowedFiles(sourceAbsolutePath, excludedPaths);
}

async function getExcludedPaths(sourceAbsolutePath: string): Promise<Set<string>> {
  const gitignoreContent = await fs.readFile(path.join(sourceAbsolutePath, '.gitignore'), 'utf-8');
  const parser = gitignoreParser.compile(gitignoreContent);
  const allExcludedPaths: Set<string> = new Set();

  const entries = await fs.readdir(sourceAbsolutePath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(sourceAbsolutePath, entry.name);

    if (parser.denies(fullPath)) {
      allExcludedPaths.add(entry.name);
    }
  }
  
  return allExcludedPaths;
}

async function getAllAllowedFiles(directory: string, excludedPaths: Set<string>): Promise<{ name: string; path: string; children?: any[] }[]> {
  const fileTree: { name: string; path: string; children?: any[] }[] = [];

  const entries = await fs.readdir(directory, { withFileTypes: true });
  const tasks = entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    const ext = path.extname(entry.name).toLowerCase() as typeof ALLOWED_EXTENSIONS[number];

    if (entry.isDirectory()) {
      if (!excludedPaths.has(entry.name) && !EXCLUDED_DIRS.has(entry.name as any)) {
        const children = await getAllAllowedFiles(fullPath, excludedPaths);
        fileTree.push({ name: entry.name, path: fullPath, children });
      }
    } else if (entry.isFile()) {
      const isExcludedFile = excludedPaths.has(entry.name) || EXCLUDED_FILES.has(entry.name as any);
      if (ALLOWED_EXTENSIONS.includes(ext) && !isExcludedFile) {
        fileTree.push({ name: entry.name, path: fullPath });
      }
    }
  });

  await Promise.all(tasks);
  return fileTree;
}