import { useState, useEffect } from 'react';
import { Collapse } from 'react-collapse';
import { format } from 'date-fns';
import { TextField, Button, CssBaseline, ThemeProvider, createTheme, Box, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh'; 
import type { ViewType } from 'react-diff-view';

import { GitCommit, sampleGitCommits } from '@ai-tools-gui/shared';
import CommitDiffViewer from './components/DiffViewer';
import './App.css';

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
  const [showSplit, setShowSplit] = useState(false);
  const viewType: ViewType = showSplit ? 'split' : 'unified';

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

  const handleGetCommits = async () => {
    if (!sourceAbsolutePath) {
      console.warn('cannot get commits because source path is not set');
      return;
    }
    const response = await fetch(`http://localhost:3001/api/commits?sourceAbsolutePath=${encodeURIComponent(sourceAbsolutePath)}`);
    const data = await response.json();
    if (Array.isArray(data)) {
      const newCommits = data.map((commit: GitCommit) => ({
        hash: commit.hash,
        message: commit.message,
        diff: commit.diff,
        timestamp: commit.timestamp,
      }));
      console.log("GET commits result: ");
      console.log(newCommits);
      setCommits(newCommits);
    }
  };

  // Automatically fetch commits when the component mounts
  useEffect(() => {
    handleGetCommits();
  }, []); // Empty dependency array ensures this runs only once

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
        <Button variant="contained" onClick={handleStartApp} color="success" sx={{ marginRight: 2 }}>
          Start App
        </Button>
        <Button variant="contained" onClick={handleStopApp} color="error">
          Stop App
        </Button>
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
        <Button variant="contained" onClick={handleSubmit} color="primary">
          Submit
        </Button>
      </div>
      {commits.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <Box
            display="flex"
            alignItems="center"
            marginBottom={2}
            justifyContent="space-between"
          >
            <Typography variant="h6" component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
              Last 10 Commits
              <RefreshIcon
                onClick={handleGetCommits}
                sx={{
                  cursor: 'pointer',
                  marginLeft: 2,
                  color: 'primary.main',
                }}
              />
            </Typography>
            <Box display="inline-flex" alignItems="center">
              <label>
                <input
                  type="checkbox"
                  checked={showSplit}
                  onChange={() => setShowSplit(!showSplit)}
                />
                Show Diffs In Split View
              </label>
            </Box>
          </Box>
          {commits.map((commit, index) => (
            <div key={commit.hash}>
              <Box
                onClick={() => setIsOpen(isOpen === index ? null : index)}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  marginBottom: '0.5rem',
                  gap: 2,
                }}
              >
                <Typography
                  component="span"
                  color="primary"
                  sx={{ flexShrink: 0 }}
                >
                  {isOpen === index ? '▼' : '▲'}
                </Typography>
                <Typography
                  component="span"
                  sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  {format(new Date(commit.timestamp), 'MMM d yyyy HH:mm:ss')}
                </Typography>
                <Typography
                  component="strong"
                  color="primary"
                  sx={{
                    flex: 1,
                    wordBreak: 'break-word',
                  }}
                >
                  {commit.message}
                </Typography>
              </Box>
              <Collapse isOpened={isOpen === index}>
                <CommitDiffViewer diff={commit.diff} viewType={viewType} />
              </Collapse>
            </div>
          ))}
        </div>
      )}
    </ThemeProvider>
  );
}

export default App;
