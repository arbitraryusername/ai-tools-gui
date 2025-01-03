import React, { useMemo, useState } from "react";
import CheckboxTree from "react-checkbox-tree";
import "react-checkbox-tree/lib/react-checkbox-tree.css";
import {
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  IndeterminateCheckBox as IndeterminateCheckBoxIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Description as FileIcon,
  SelectAll as SelectAllIcon,
  Deselect as DeselectIcon,
} from "@mui/icons-material";
import { Box, IconButton, Typography } from "@mui/material";
import { SourceFile } from "@ai-tools-gui/shared/src/index.js";

type DirectoryTreeProps = {
  files: SourceFile[];
  onCheckedChange: (checked: string[]) => void;
};

/**
 * Converts a flat array of file paths into a nested structure suitable for react-checkbox-tree.
 */
const convertToCheckboxTreeData = (payload: SourceFile[]) => {
  const tree = {} as Record<string, any>;

  // Helper function to build the tree structure
  const addNode = (
    parts: string[],
    subTree: any,
    fullPath: string,
    isLeaf: boolean
  ) => {
    const [current, ...rest] = parts;

    if (!subTree[current]) {
      subTree[current] = {
        value: isLeaf && rest.length === 0 ? fullPath : `${fullPath}/`, // Ensure unique values for folders and files
        label: current,
        children: rest.length > 0 ? {} : null,
      };
    }

    if (rest.length > 0) {
      addNode(rest, subTree[current].children, fullPath, rest.length === 1);
    }
  };

  // Build the tree from the payload
  payload.forEach(({ relativePath }) => {
    const parts = relativePath.split("/");
    const isLeaf = parts.length === 1; // Determine if it's a file or a folder
    addNode(parts, tree, relativePath, isLeaf);
  });

  // Helper function to convert the tree object to an array
  const treeToArray = (subTree: Record<string, any>) => {
    return Object.values(subTree).map((node: any): any => ({
      value: node.value,
      label: node.label,
      children: node.children ? treeToArray(node.children) : undefined,
    }));
  };

  return treeToArray(tree);
};

const DirectoryTree: React.FC<DirectoryTreeProps> = ({ files, onCheckedChange }) => {
  console.log("DirectoryTree input files.length: ", files.length);
  const [checked, setChecked] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);

  // Convert files to the tree data format
  const treeData = convertToCheckboxTreeData(files);

  // Flatten all node values for select/deselect operations
  const flattenTree = (nodes: any[]): string[] => {
    return nodes.reduce((acc: string[], node: any) => {
      acc.push(node.value);
      if (node.children) {
        acc = acc.concat(flattenTree(node.children));
      }
      return acc;
    }, []);
  };

  // Helper to filter out directories and include only leaf nodes
  const getLeafNodes = (paths: string[]) => {
    const allFilePaths = files.map((file) => file.relativePath);
    return paths.filter((path) => allFilePaths.includes(path));
  };

  const handleSelectAll = () => {
    const allPaths = flattenTree(treeData);
    setChecked(allPaths);
    onCheckedChange(allPaths); // Notify parent
  };

  const handleSelectNone = () => {
    setChecked([]);
    onCheckedChange([]); // Notify parent
  };

  const handleCheck = (newChecked: string[]) => {
    setChecked(newChecked);
    onCheckedChange(newChecked); // Notify parent
  };

  /**
   * Computes the count of selected leaf nodes (files) and their total tokens.
   */
  const { totalTokens, selectedFileCount } = useMemo(() => {
    const leafNodes = getLeafNodes(checked);
    const tokenSum = leafNodes.reduce((sum, path) => {
      const matchedFile = files.find((f) => f.relativePath === path);
      return sum + (matchedFile?.tokenCount ?? 0);
    }, 0);
    return { totalTokens: tokenSum, selectedFileCount: leafNodes.length };
  }, [checked, files]);

  return (
    <Box>
      <Box display="flex" alignItems="left" marginBottom={1}>
        <IconButton onClick={handleSelectAll} color="primary">
          <span style={{ fontSize: '1rem', marginRight: '4px' }}>All</span>
          <SelectAllIcon />
        </IconButton>
        <IconButton onClick={handleSelectNone} color="primary">
          <span style={{ fontSize: '1rem', marginRight: '4px' }}>None</span>
          <DeselectIcon />
        </IconButton>
        <Typography
          variant="body1"
          sx={{
            marginLeft: 1,
            paddingTop: 1,
            color: selectedFileCount === 0 ? 'warning.main' : 'white',
          }}
        >
          {`Selected Files: ${selectedFileCount}`}
          &nbsp;&nbsp;&nbsp;
          {`${totalTokens > 0 ? '(' + totalTokens + ' tokens)' : ''}`}
        </Typography>
      </Box>
      <CheckboxTree
        nodes={treeData}
        checked={checked}
        expanded={expanded}
        onCheck={handleCheck}
        onExpand={(expandedPaths) => setExpanded(expandedPaths)}
        icons={{
          check: <CheckBoxIcon color="primary" />,
          uncheck: <CheckBoxOutlineBlankIcon color="primary" />,
          halfCheck: <IndeterminateCheckBoxIcon color="primary" />,
          expandClose: <ChevronRightIcon color="primary" />,
          expandOpen: <ExpandMoreIcon color="primary" />,
          parentClose: <FolderIcon color="primary" />,
          parentOpen: <FolderOpenIcon color="primary" />,
          leaf: <FileIcon color="primary" />,
        }}
      />
    </Box>
  );
};

export default DirectoryTree;
