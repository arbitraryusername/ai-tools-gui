import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Enable CORS for all origins
app.use(cors());

app.use(express.json());

app.post('/api/processPrompt', (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Missing "prompt" parameter.' });
  }

  res.json({ response: `Processed prompt: ${prompt}` });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
