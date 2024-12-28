import express from 'express';
import cors from 'cors';
import { promptProcessor } from './PromptProcessor.js';

const app = express();
const PORT = 3001;

// Enable CORS for all origins
app.use(cors());

app.use(express.json());

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

app.post('/api/processPrompt', (req, res) => {
  console.log("/api/processPrompt -> req.body: ", req.body)

  const { prompt, sourceAbsolutePath } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing "prompt" parameter.' });
  }
  if (!sourceAbsolutePath) {
    return res.status(400).json({ error: 'Missing "sourceAbsolutePath" parameter.' });
  }

  try {
    const commits = promptProcessor.process(prompt, sourceAbsolutePath);
    res.json({ commits });
  } catch (error) {
    return res.status(500).json({ error });
  }
});
