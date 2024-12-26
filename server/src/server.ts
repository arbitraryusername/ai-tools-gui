import express from 'express';

const app = express();
const PORT = 3001;

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
