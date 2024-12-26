import { useState } from 'react'
import { TextField, Button } from '@mui/material';
import './App.css'

function App() {
  const [localDirectory, setLocalDirectory] = useState('');
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    // Handle submit logic here
  };

  return (
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
  )
}

export default App