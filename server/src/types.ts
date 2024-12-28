export interface GitCommitResult {
  hash: string;
  message: string;
  diff: string;
  timestamp: Date;
}

export interface ProcessPromptSuccessResponse {
  commits: GitCommitResult[];
}

export interface ProcessPromptErrorResponse {
  error: string;
  commits: GitCommitResult[]; // commits could be made but some problem occurs later
}

export interface ProcessPromptBody {
  prompt: string;
  sourceAbsolutePath: string;
}

export type ProcessPromptResult = ProcessPromptSuccessResponse | ProcessPromptErrorResponse;

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
