import React from 'react';
import DiffViewer from 'react-diff-viewer';
import { Box, Typography } from '@mui/material';

interface DiffViewerProps {
  oldCode: string;
  newCode: string;
  title?: string;
}

const DiffDisplay: React.FC<DiffViewerProps> = ({ oldCode, newCode, title }) => {
  return (
    <Box sx={{ p: 2, border: '1px solid #444', borderRadius: 1, bgcolor: 'background.paper' }}>
      {title && (
        <Typography variant="h6" sx={{ mb: 2 }}>
          {title}
        </Typography>
      )}
      <DiffViewer
        oldValue={oldCode}
        newValue={newCode}
        splitView={true}
        useDarkTheme={true}
        showDiffOnly={true}
      />
    </Box>
  );
};

export default DiffDisplay;
