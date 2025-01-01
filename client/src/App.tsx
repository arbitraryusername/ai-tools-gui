import { useState, useEffect } from 'react';
import { Collapse } from 'react-collapse';
import { format } from 'date-fns';
import {
  TextField,
  Button,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  IconButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import HistoryIcon from '@mui/icons-material/History';
import type { ViewType } from 'react-diff-view';

import { GitCommit } from '@ai-tools-gui/shared';
import CommitDiffViewer from './components/CommitDiffViewer';
import DirectoryTree from './components/DirectoryTree';
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
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [files, setFiles] = useState([]);
  const [isOpen, setIsOpen] = useState<number | null>(null);
  const [showSplit, setShowSplit] = useState(true);
  const [selectedFilePaths, setSelectedFilePaths] = useState<string[]>([]);

  const viewType: ViewType = showSplit ? 'split' : 'unified';

  const handleSubmit = async () => {
    const response = await fetch('http://localhost:3001/api/processPrompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, sourceAbsolutePath, selectedFilePaths }),
    });

    const data = await response.json();
    if (data.commits) {
      await handleGetCommits();
    }
  };

  const handleRevertCommit = async () => {
    const response = await fetch('http://localhost:3001/api/revertLastCommit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sourceAbsolutePath }),
    });
    const data = await response.json();
    if (data.revertedCommit) {
      await handleGetCommits();
    }
  };

  const handleGetCommits = async () => {
    const response = await fetch(
      `http://localhost:3001/api/commits?sourceAbsolutePath=${encodeURIComponent(
        sourceAbsolutePath
      )}`
    );
    const data = await response.json();
    if (Array.isArray(data)) {
      setCommits(
        data.map((commit: GitCommit) => ({
          hash: commit.hash,
          message: commit.message,
          diff: commit.diff,
          timestamp: commit.timestamp,
        }))
      );
    }
  };

  const handleGetFiles = async () => {
    const response = await fetch(
      `http://localhost:3001/api/sourceFiles?sourceAbsolutePath=${encodeURIComponent(
        sourceAbsolutePath
      )}`
    );
    const files = await response.json();
    setFiles(files);
  };

  const loadRepo = async () => {
    await handleGetCommits();
    await handleGetFiles();
  }

  useEffect(() => {
    loadRepo();
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box
        display="flex"
        flexDirection="column"
        height="100vh"
        overflow="hidden"
      >
        {/* Top Section */}
        <Box display="flex" flex="0 0 40%" overflow="hidden">
          {/* Left Column */}
          <Box
            flex="1"
            display="flex"
            flexDirection="column"
            padding={2}
            overflow="auto"
          >
            <TextField
              label="Repo Directory Full Path"
              variant="outlined"
              value={sourceAbsolutePath}
              onChange={(e) => setSourceAbsolutePath(e.target.value)}
              fullWidth
              sx={{ marginBottom: 1 }}
            />
            <Box display="flex" gap={1} marginBottom={2}>
              <Button
                variant="contained"
                onClick={loadRepo}
                color="primary"
              >
                Load Repo
              </Button>
            </Box>
            <TextField
              label="Prompt"
              variant="outlined"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              multiline
              rows={5}
              fullWidth
              sx={{ marginBottom: 1 }}
            />
            <Button
              variant="contained"
              onClick={handleSubmit}
              color="primary"
              sx={{ alignSelf: 'flex-start' }}
            >
              Submit
            </Button>
          </Box>

          {/* Right Column */}
          <Box flex="1" overflow="auto">
            <Box display="flex" justifyContent="space-between" alignItems="left">
              <Typography sx={{ paddingTop: 1, paddingLeft: 1 }}>Select files to include in Prompt</Typography>
              <IconButton onClick={handleGetFiles} color="primary">
                <RefreshIcon />
              </IconButton>
            </Box>
            {
              files.length > 0 && 
              <DirectoryTree files={files} onCheckedChange={(checked) => setSelectedFilePaths(checked)} />
            }
          </Box>
        </Box>

        {/* Bottom Section */}
        <Box flex="1" overflow="auto" padding={2} sx={{ marginTop: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
            <Typography variant="h6">Commits</Typography>
            <Box display="flex" alignItems="center">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showSplit}
                    onChange={() => setShowSplit(!showSplit)}
                    color="primary"
                  />
                }
                label="Split View"
              />
              <IconButton onClick={handleRevertCommit} color="warning" title="Revert most recent commit">
                <HistoryIcon />
              </IconButton>
              <IconButton onClick={handleGetCommits} color="primary">
                <RefreshIcon />
              </IconButton>
            </Box>
          </Box>
          {commits.map((commit, index) => (
            <Box key={commit.hash}>
              <Box
                onClick={() => setIsOpen(isOpen === index ? null : index)}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  cursor: 'pointer',
                  marginBottom: '1rem',
                  gap: 2,
                }}
              >
                <Typography
                  component="span"
                  color="primary"
                  sx={{ flexShrink: 0 }}
                >
                  {isOpen === index ? '▼' : '▶'}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {format(new Date(commit.timestamp), 'MMM d yyyy HH:mm:ss')}
                </Typography>
                <Typography
                  component="strong"
                  color="primary"
                  sx={{
                    flex: 1,
                    wordBreak: 'break-word',
                    textAlign: 'left',
                  }}
                >
                  {commit.message}
                </Typography>
              </Box>
              <Collapse isOpened={isOpen === index}>
                <CommitDiffViewer diff={commit.diff} viewType={viewType} />
              </Collapse>
            </Box>
          ))}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;