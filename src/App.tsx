import { useState } from 'react'
import './App.css'

function App() {
  const [localDirectory, setLocalDirectory] = useState('');
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    // Handle submit logic here
  };

  return (
    <div>
      <label>
        Local Directory Full Path:
        <input 
          type="text" 
          value={localDirectory} 
          onChange={(e) => setLocalDirectory(e.target.value)} 
        />
      </label>
      <label>
        Prompt:
        <textarea 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)} 
        />
      </label>
      <button onClick={handleSubmit}>Submit</button>
    </div>
  )
}

export default App