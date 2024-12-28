import { useState } from 'react'
import { TextField, Button, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
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

  const handleSubmit = async () => {
    const response = await fetch('http://localhost:3001/api/processPrompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, sourceAbsolutePath }),
    });

    const data = await response.json();
    console.log(data);
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
    </ThemeProvider>
  )
}

export default App