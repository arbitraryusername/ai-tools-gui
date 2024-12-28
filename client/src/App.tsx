import { useState } from 'react'
import { TextField, Button, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { Collapse } from 'react-collapse';
import './App.css'

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

interface Commit {
  hash: string;
  message: string;
  diff: string;
  timestamp: string;
}

function App() {
  const defaultPath = 'C:/Users/craig/dev/ai-tools-gui';
  const [sourceAbsolutePath, setSourceAbsolutePath] = useState(defaultPath);
  const [prompt, setPrompt] = useState('');
  const [commits, setCommits] = useState<Commit[]>([]);
  const [isOpen, setIsOpen] = useState<number | null>(null);

  const handleSubmit = async () => {
    const response = await fetch('http://localhost:3001/api/processPrompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, sourceAbsolutePath }),
    });

    const data = await response.json();

    if (data.commits) {
      const newCommits = data.commits.map((commit: Commit) => ({
        hash: commit.hash,
        message: commit.message,
        diff: commit.diff,
        timestamp: commit.timestamp.toString(),
      }));
      setCommits(newCommits.concat(commits));
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div>
        <TextField
          label="Local Directory Full Path"
          variant="outlined"
          value={sourceAbsolutePath}
          onChange={(e) => setSourceAbsolutePath(e.target.value)}
          fullWidth
        />
        <TextField
          label="Prompt"
          variant="outlined"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          multiline
          rows={4}
          fullWidth
        />
        <Button variant="contained" onClick={handleSubmit}>Submit</Button>
      </div>
      {commits.length > 0 && (
        <div>
          <h3>Commits:</h3>
          {commits.map((commit, index) => (
            <div key={commit.hash}>
              <div onClick={() => setIsOpen(isOpen === index ? null : index)}>
                <strong>{commit.timestamp}</strong>: {commit.message}
              </div>
              <Collapse isOpened={isOpen === index}>
                <pre>{commit.diff}</pre>
              </Collapse>
            </div>
          ))}
        </div>
      )}
    </ThemeProvider>
  )
}

export default App