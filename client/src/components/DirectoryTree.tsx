import React, { useState } from "react";
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

type FilePayload = { name: string; path: string };

type DirectoryTreeProps = {
  files: FilePayload[];
  onCheckedChange: (checked: string[]) => void;
};

/**
 * Converts a flat array of file paths into a nested structure suitable for react-checkbox-tree.
 */
const convertToCheckboxTreeData = (payload: any[]) => {
  const tree = {};

  // Helper function to build the tree structure
  const addNode = (parts: string[], subTree: any, fullPath: string, isLeaf: boolean) => {
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
  payload.forEach(({ path }) => {
    const parts = path.split("/");
    const isLeaf = parts.length === 1; // Determine if it's a file or a folder
    addNode(parts, tree, path, isLeaf);
  });

  // Helper function to convert the tree object to an array
  const treeToArray = (subTree: any) => {
    return Object.values(subTree).map((node: any): any => ({
      value: node.value,
      label: node.label,
      children: node.children ? treeToArray(node.children) : undefined,
    }));
  };

  return treeToArray(tree);
};

const DirectoryTree: React.FC<DirectoryTreeProps> = ({ files, onCheckedChange }) => {
  const [checked, setChecked] = useState([] as string[]);
  const [expanded, setExpanded] = useState([] as string[]);

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

  const handleSelectAll = () => {
    const allPaths = flattenTree(treeData);
    setChecked(allPaths);
    onCheckedChange(allPaths); // Notify parent
  };

  const handleSelectNone = () => {
    setChecked([]);
    onCheckedChange([]); // Notify parent
  };

  const handleCheck = (checked: string[]) => {
    setChecked(checked);
    onCheckedChange(checked); // Notify parent
  };

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
        <Typography variant="body1" sx={{ marginLeft: 1, paddingTop: 1, color: checked.length === 0 ? 'warning.main' : 'white' }}>
          {`Selected: ${checked.length}`}
        </Typography>
      </Box>
      <CheckboxTree
        nodes={treeData}
        checked={checked}
        expanded={expanded}
        onCheck={handleCheck}
        onExpand={(expanded) => setExpanded(expanded)}
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