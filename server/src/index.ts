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

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ commits: [], error: 'Internal Server Error' });
});

app.post('/api/startApp', asyncHandler(async (req: Request, res: Response) => {
  const { sourceAbsolutePath } = req.body;
  if (!sourceAbsolutePath) {
    return res.status(400).json({ error: 'Missing "sourceAbsolutePath" parameter.' });
  }

  await devServerManager.startDevServer(sourceAbsolutePath);
  res.json({ success: true });
}));

app.post('/api/stopApp', asyncHandler(async (req: Request, res: Response) => {
  await devServerManager.stopDevServer();
  res.json({ success: true });
}));

app.post('/api/processPrompt', asyncHandler(async (req: Request, res: Response) => {
  const { prompt, sourceAbsolutePath } = req.body;
  if (!prompt) {
    return res.status(400).json({ commits: [], error: 'Missing "prompt" parameter.' });
  }
  if (!sourceAbsolutePath) {
    return res.status(400).json({ commits: [], error: 'Missing "sourceAbsolutePath" parameter.' });
  }

  const result: ProcessPromptResult = await promptProcessor.process(prompt, sourceAbsolutePath);

  if ('error' in result) {
    return res.status(500).json(result as ProcessPromptErrorResponse);
  }

  return res.json(result as ProcessPromptSuccessResponse);
}));

app.get('/api/commits', asyncHandler(async (req: Request, res: Response) => {
  const sourceAbsolutePath = req.query.sourceAbsolutePath as string;

  if (!sourceAbsolutePath) {
    return res.status(400).json({ error: 'Missing "sourceAbsolutePath" query parameter.' });
  }

  const commits = await getLastCommits(sourceAbsolutePath, 10);
  res.json(commits);
}));

app.get('/api/sourceFiles', asyncHandler(async (req: Request, res: Response) => {
  const sourceAbsolutePath = req.query.sourceAbsolutePath as string;

  if (!sourceAbsolutePath) {
    return res.status(400).json({ error: 'Missing "sourceAbsolutePath" query parameter.' });
  }

  const files = await getSourceFiles(sourceAbsolutePath);
  res.json(files);
}));