import React from 'react';
import { parseDiff, Diff, Hunk, ViewType } from 'react-diff-view';
import 'react-diff-view/style/index.css';

interface CommitDiffViewerProps {
  diff: string;
  viewType: ViewType;
}

const CommitDiffViewer: React.FC<CommitDiffViewerProps> = ({ diff, viewType }) => {
  try {
    const files = parseDiff(diff);

    return (
      <div style={{ margin: '1rem 0 2rem 0' }}>
        {files.map(({ oldPath, newPath, type, hunks }) => {
          return (
            <div key={newPath || oldPath} style={{ marginBottom: '2rem' }}>
              <div style={{ width: '100%', borderBottom: '1px solid white', marginBottom: '8px', fontWeight: 'bold' }}>
                {type === 'rename'
                  ? `Renamed: ${oldPath} → ${newPath}`
                  : type === 'copy'
                  ? `Copied: ${oldPath} → ${newPath}`
                  : oldPath === '/dev/null'
                  ? `New File: ${newPath}`
                  : newPath === '/dev/null'
                  ? `Deleted File: ${oldPath}`
                  : `${oldPath} → ${newPath}`}
              </div>
              <Diff viewType={viewType} hunks={hunks} diffType={type}>
                {(hunks) => hunks.map((hunk) => <Hunk key={hunk.content} hunk={hunk} />)}
              </Diff>
            </div>
          );
        })}
      </div>
    );
  } catch (error) {
    console.error('Error parsing diff:', error);
    return <div>Error displaying the diff. Please check the format.</div>;
  }
};

export default CommitDiffViewer;
