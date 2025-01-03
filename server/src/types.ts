import { GitCommit } from '@ai-tools-gui/shared/src/index.js';

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export interface Model {
  id: string;
  inputCost: number;
  outputCost: number;
}

export interface ProcessPromptOptions {
  maxErrorResolutionAttempts?: number;
}

export interface ProcessPromptSuccessResponse {
  commits: GitCommit[];
}

export interface ProcessPromptErrorResponse {
  error: string;
  commits: GitCommit[]; // commits could be made but some problem occurs later
}

export type ProcessPromptResult = ProcessPromptSuccessResponse | ProcessPromptErrorResponse;

export interface ProcessPromptBody {
  prompt: string;
  sourceAbsolutePath: string;
}
