import { useState } from 'react'
import { Collapse } from 'react-collapse';
import { TextField, Button, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { format } from 'date-fns';
import { GitCommit, sampleGitCommits } from '@ai-tools-gui/shared';
import './App.css'

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  const defaultPath = 'C:/Users/craig/dev/ai-tools-gui';
  const [sourceAbsolutePath, setSourceAbsolutePath] = useState(defaultPath);
  const [prompt, setPrompt] = useState('');
  const [commits, setCommits] = useState<GitCommit[]>(sampleGitCommits);
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
      const newCommits = data.commits.map((commit: GitCommit) => ({
        hash: commit.hash,
        message: commit.message,
        diff: commit.diff,
        timestamp: commit.timestamp,
      }));
      setCommits(newCommits.concat(commits));
    }
  };

  const handleStartApp = async () => {
    await fetch('http://localhost:3001/api/startApp', { method: 'POST' });
  };

  const handleStopApp = async () => {
    await fetch('http://localhost:3001/api/stopApp', { method: 'POST' });
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div>
        <TextField
          label="Repo Directory Full Path"
          variant="outlined"
          value={sourceAbsolutePath}
          onChange={(e) => setSourceAbsolutePath(e.target.value)}
          fullWidth
          className="local-directory-full-path"
        />
        <Button variant="contained" onClick={handleStartApp} style={{ backgroundColor: 'lightgreen', marginRight: '8px' }}>Start App</Button>
        <Button variant="contained" onClick={handleStopApp} style={{ backgroundColor: 'lightcoral' }}>Stop App</Button>
        <TextField
          label="Prompt"
          variant="outlined"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          multiline
          rows={4}
          fullWidth
          className="prompt"
        />
        <Button variant="contained" onClick={handleSubmit}>Submit</Button>
      </div>
      {commits.length > 0 && (
        <div>
          <h4>Commits:</h4>
          {commits.map((commit, index) => (
            <div key={commit.hash}>
              <div onClick={() => setIsOpen(isOpen === index ? null : index)}>
                <span style={{ color: 'lightblue' }}>{isOpen === index ? '▼' : '▲'}</span> <strong>{format(new Date(commit.timestamp), 'PPpp')}</strong>: {commit.message}
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