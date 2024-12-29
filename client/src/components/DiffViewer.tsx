import React from 'react';
import { parseDiff, Diff, Hunk } from 'react-diff-view';
import 'react-diff-view/style/index.css';

interface CommitDiffViewerProps {
  diff: string;
  viewType: string;
}

const CommitDiffViewer: React.FC<CommitDiffViewerProps> = ({ diff, viewType }) => {
  try {
    const files = parseDiff(diff);

    return (
      <div>
        {files.map(({ oldPath, newPath, hunks }) => (
          <div key={newPath || oldPath} style={{ marginBottom: '1rem' }}>
            <strong>
              {oldPath === '/dev/null'
                ? `New File: ${newPath}`
                : newPath === '/dev/null'
                ? `Deleted File: ${oldPath}`
                : `${oldPath} → ${newPath}`}
            </strong>
            <Diff viewType={viewType} hunks={hunks}>
              {(hunks) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
            </Diff>
          </div>
        ))}
      </div>
    );
  } catch (error) {
    console.error('Error parsing diff:', error);
    return <div>Error displaying the diff. Please check the format.</div>;
  }
};

export default CommitDiffViewer;