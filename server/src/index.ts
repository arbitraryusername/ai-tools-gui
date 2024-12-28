import express, { NextFunction } from 'express';
import cors from 'cors';
import { promptProcessor } from './PromptProcessor.js';
import { Request, Response } from 'express';
import { ProcessPromptErrorResponse, ProcessPromptResult, ProcessPromptSuccessResponse } from 'types.js';

const app = express();
const PORT = 3001;

// Enable CORS for all origins
app.use(cors());

app.use(express.json());

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

// Middleware to handle async errors 
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ commits: [], error: 'Internal Server Error' });
});

app.post('/api/processPrompt', asyncHandler(async (req: Request, res: Response) => {
  console.log("/api/processPrompt -> req.body: ", req.body);

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

