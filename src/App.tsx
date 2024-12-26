import { useState } from 'react'
import { TextField, Button, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import './App.css'

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  const [localDirectory, setLocalDirectory] = useState('');
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    // Handle submit logic here
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div>
        <TextField
          label="Local Directory Full Path"
          variant="outlined"
          value={localDirectory}
          onChange={(e) => setLocalDirectory(e.target.value)}
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