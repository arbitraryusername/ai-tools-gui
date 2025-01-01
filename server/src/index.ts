import express, { NextFunction } from 'express';
import cors from 'cors';
import { promptProcessor } from './PromptProcessor.js';
import { Request, Response } from 'express';
import { 
  ProcessPromptErrorResponse,
  ProcessPromptResult,
  ProcessPromptSuccessResponse
} from 'types.js';
import { devServerManager } from './DevServerManager.js';
import { getLastCommits } from './GitUtils.js';
import { getSourceFiles } from './SourceCodeHelper.js';
import { revertLastCommit } from './GitUtils.js';
import logger from './logger.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.listen(PORT, () => {
  logger.info(`Server is running at http://localhost:${PORT}`);
});

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error("Unhandled error caught:", err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// app.post('/api/startApp', asyncHandler(async (req: Request, res: Response) => {
//   const { sourceAbsolutePath } = req.body;
//   if (!sourceAbsolutePath) {
//     return res.status(400).json({ error: 'Missing "sourceAbsolutePath" parameter.' });
//   }

//   await devServerManager.startDevServer(sourceAbsolutePath);
//   res.json({ success: true });
// }));

// app.post('/api/stopApp', asyncHandler(async (req: Request, res: Response) => {
//   await devServerManager.stopDevServer();
//   res.json({ success: true });
// }));

app.post('/api/processPrompt', asyncHandler(async (req: Request, res: Response) => {
  const { prompt, sourceAbsolutePath, selectedFilePaths } = req.body;
  if (!prompt) {
    return res.status(400).json({ commits: [], error: 'Prompt is empty.' });
  }
  if (!sourceAbsolutePath) {
    return res.status(400).json({ commits: [], error: 'Repo directory is empty.' });
  }
  if (!selectedFilePaths?.length) {
    return res.status(400).json({ commits: [], error: 'No selected files.' });
  }

  const result: ProcessPromptResult = await promptProcessor.process(prompt, sourceAbsolutePath, selectedFilePaths);

  if ('error' in result) {
    return res.status(500).json(result as ProcessPromptErrorResponse);
  }

  return res.json(result as ProcessPromptSuccessResponse);
}));

app.get('/api/commits', asyncHandler(async (req: Request, res: Response) => {
  const sourceAbsolutePath = req.query.sourceAbsolutePath as string;

  if (!sourceAbsolutePath) {
    return res.status(400).json({ error: 'Repo directory is empty.' });
  }

  const commits = await getLastCommits(sourceAbsolutePath, 10);
  res.json(commits);
}));

app.get('/api/sourceFiles', asyncHandler(async (req: Request, res: Response) => {
  const sourceAbsolutePath = req.query.sourceAbsolutePath as string;

  if (!sourceAbsolutePath) {
    return res.status(400).json({ error: 'Repo directory is empty.' });
  }

  const files = await getSourceFiles(sourceAbsolutePath);
  res.json(files);
}));

app.post('/api/revertLastCommit', asyncHandler(async (req: Request, res: Response) => {
  const sourceAbsolutePath = req.body.sourceAbsolutePath as string;

  if (!sourceAbsolutePath) {
    return res.status(400).json({ error: 'Repo directory is empty.' });
  }

  try {
    const revertedCommit = await revertLastCommit(sourceAbsolutePath);
    return res.json(revertedCommit);
  } catch (error: any) {
    return res.status(500).json({ error: `Rever commit failed: ${error.message}` });
  }
}));