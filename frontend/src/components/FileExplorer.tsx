import {
  ChevronDown,
  ChevronRight,
  Code2,
  FileCode2,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Trash2,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import type { ProjectFile } from "../types/project";

interface Props {
  files: ProjectFile[];
  selectedPath: string;
  onSelect: (path: string) => void;
  onNewFile: (fileName: string) => void;
  onNewFolder: (folderName: string) => void;
  onDeleteFile: (path: string) => void;
}

type TreeNode = {
  name: string;
  path: string;
  children?: TreeNode[];
  file?: boolean;
};

function getFileIcon(fileName: string) {
  if (fileName.endsWith(".html")) {
    return <span className="file-icon html">&lt;&gt;</span>;
  }
  if (fileName.endsWith(".css")) {
    return <span className="file-icon css">#</span>;
  }
  if (fileName.endsWith(".js") || fileName.endsWith(".jsx")) {
    return <span className="file-icon js">JS</span>;
  }
  if (fileName.endsWith(".ts") || fileName.endsWith(".tsx")) {
    return <span className="file-icon ts">TS</span>;
  }
  if (fileName.endsWith(".json")) {
    return <span className="file-icon json">&#123;&#125;</span>;
  }
  return <FileCode2 size={15} className="file-icon" />;
}

function buildTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let level = root;
    let currentPath = "";
    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      let node = level.find((item) => item.name === part);
      if (!node) {
        node = {
          name: part,
          path: currentPath,
          file: index === parts.length - 1,
        };
        level.push(node);
      }
      if (!node.file) {
        node.children ??= [];
        level = node.children;
      }
    });
  }
  return root;
}

function Node({
  node,
  depth,
  selectedPath,
  onSelect,
  onDeleteFile,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string;
  onSelect: (path: string) => void;
  onDeleteFile: (path: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const isFolder = !node.file;

  return (
    <div>
      <div
        className={`tree-node-row ${selectedPath === node.path ? "selected" : ""}`}
        style={{ paddingLeft: 10 + depth * 14 }}
        onClick={() => (isFolder ? setOpen((v) => !v) : onSelect(node.path))}
      >
        {isFolder ? (
          open ? (
            <ChevronDown size={14} className="folder-chevron" />
          ) : (
            <ChevronRight size={14} className="folder-chevron" />
          )
        ) : (
          <span style={{ width: 14 }} />
        )}

        {isFolder ? (
          open ? (
            <FolderOpen size={16} className="file-icon folder" />
          ) : (
            <Folder size={16} className="file-icon folder" />
          )
        ) : (
          getFileIcon(node.name)
        )}

        <span className="node-name" title={node.path}>
          {node.name}
        </span>

        {!isFolder && (
          <div className="node-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="node-action-btn"
              title="Delete File"
              onClick={() => onDeleteFile(node.path)}
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {isFolder &&
        open &&
        node.children?.map((child) => (
          <Node
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedPath={selectedPath}
            onSelect={onSelect}
            onDeleteFile={onDeleteFile}
          />
        ))}
    </div>
  );
}

export default function FileExplorer({
  files,
  selectedPath,
  onSelect,
  onNewFile,
  onNewFolder,
  onDeleteFile,
}: Props) {
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [inputName, setInputName] = useState("");

  const tree = useMemo(() => buildTree(files), [files]);

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputName.trim();
    if (!trimmed) {
      setIsCreatingFile(false);
      setIsCreatingFolder(false);
      return;
    }

    if (isCreatingFile) {
      onNewFile(trimmed);
    } else if (isCreatingFolder) {
      onNewFolder(trimmed);
    }

    setInputName("");
    setIsCreatingFile(false);
    setIsCreatingFolder(false);
  }

  return (
    <div className="subpanel" style={{ height: "100%" }}>
      <div className="panel-header">
        <div className="panel-header-left">
          <span className="panel-title">
            <Code2 size={14} color="var(--accent-primary)" />
            Files
          </span>
          <span className="panel-count">{files.length}</span>
        </div>

        <div className="panel-header-actions">
          <button
            className="icon-btn"
            title="New File"
            onClick={() => {
              setIsCreatingFolder(false);
              setIsCreatingFile(true);
              setInputName("");
            }}
          >
            <FilePlus size={14} />
          </button>

          <button
            className="icon-btn"
            title="New Folder"
            onClick={() => {
              setIsCreatingFile(false);
              setIsCreatingFolder(true);
              setInputName("");
            }}
          >
            <FolderPlus size={14} />
          </button>
        </div>
      </div>

      <div className="explorer-body">
        {(isCreatingFile || isCreatingFolder) && (
          <form onSubmit={handleCreateSubmit} className="new-item-row">
            {isCreatingFolder ? (
              <Folder size={14} color="var(--text-muted)" />
            ) : (
              <FileText size={14} color="var(--text-muted)" />
            )}
            <input
              autoFocus
              className="new-item-input"
              placeholder={isCreatingFolder ? "Folder name..." : "file.js..."}
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              onBlur={() => {
                if (!inputName.trim()) {
                  setIsCreatingFile(false);
                  setIsCreatingFolder(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setIsCreatingFile(false);
                  setIsCreatingFolder(false);
                }
              }}
            />
          </form>
        )}

        {files.length === 0 ? (
          <div
            style={{
              padding: "20px 14px",
              color: "var(--text-muted)",
              fontSize: "var(--font-xs)",
              textAlign: "center",
            }}
          >
            No files in project. Click "+" above or ask the AI to generate.
          </div>
        ) : (
          tree.map((node) => (
            <Node
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onDeleteFile={onDeleteFile}
            />
          ))
        )}
      </div>
    </div>
  );
}