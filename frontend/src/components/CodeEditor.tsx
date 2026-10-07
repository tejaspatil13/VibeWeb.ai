import Editor from "@monaco-editor/react";
import { Check, Code2, Copy, FileCode, WrapText } from "lucide-react";
import { useState } from "react";
import type { ProjectFile } from "../types/project";

interface Props {
  file?: ProjectFile;
  openFiles: string[];
  selectedPath: string;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onContentChange: (path: string, content: string) => void;
  dark: boolean;
}

function getLanguage(path: string): string {
  if (path.endsWith(".html") || path.endsWith(".htm")) return "html";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".js") || path.endsWith(".jsx")) return "javascript";
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  return "plaintext";
}

export default function CodeEditor({
  file,
  openFiles,
  selectedPath,
  onSelectTab,
  onCloseTab,
  onContentChange,
  dark,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);

  function copyCode() {
    if (!file) return;
    navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const language = file ? getLanguage(file.path) : "plaintext";

  return (
    <div className="editor-wrapper">
      <div className="editor-tabs-bar">
        <div className="editor-tabs-list">
          {openFiles.map((path) => {
            const fileName = path.split("/").pop() || path;
            const isActive = path === selectedPath;
            return (
              <div
                key={path}
                className={`editor-tab ${isActive ? "active" : ""}`}
                onClick={() => onSelectTab(path)}
              >
                <span className="tab-badge-dot" />
                <span title={path}>{fileName}</span>
                {openFiles.length > 1 && (
                  <span
                    style={{
                      marginLeft: 4,
                      fontSize: "13px",
                      fontWeight: 700,
                      opacity: 0.7,
                      cursor: "pointer",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(path);
                    }}
                    title="Close Tab"
                  >
                    ×
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="editor-tools">
          {file && (
            <>
              <button
                className={`icon-btn ${wrapLines ? "active" : ""}`}
                onClick={() => setWrapLines((w) => !w)}
                title={wrapLines ? "Disable Word Wrap (Enable Horizontal Scroll)" : "Enable Word Wrap"}
                style={{ width: "auto", padding: "0 6px", gap: 4, fontSize: "var(--font-2xs)" }}
              >
                <WrapText size={12} />
                <span>{wrapLines ? "Wrap: On" : "Wrap: Off"}</span>
              </button>

              <button
                className="icon-btn"
                onClick={copyCode}
                title="Copy Code"
                style={{ width: "auto", padding: "0 6px", gap: 4, fontSize: "var(--font-2xs)" }}
              >
                {copied ? <Check size={12} color="var(--success-color)" /> : <Copy size={12} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>

              <span className="editor-lang-pill">{language}</span>
            </>
          )}
        </div>
      </div>

      <div className="editor-canvas">
        {file ? (
          <Editor
            theme={dark ? "vs-dark" : "light"}
            language={language}
            value={file.content}
            onChange={(val) => onContentChange(file.path, val ?? "")}
            options={{
              fontSize: 13.5,
              lineHeight: 22,
              fontFamily:
                "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, Menlo, monospace",
              fontLigatures: true,
              minimap: { enabled: false },
              padding: { top: 12, bottom: 12 },
              smoothScrolling: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: wrapLines ? "on" : "off",
              tabSize: 2,
              cursorBlinking: "smooth",
              renderLineHighlight: "all",
              scrollbar: {
                vertical: "visible",
                horizontal: "visible",
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
                alwaysConsumeMouseWheel: false,
              },
            }}
          />
        ) : (
          <div className="editor-empty-state">
            <div>
              <FileCode size={36} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
              <strong>No File Selected</strong>
              <p style={{ marginTop: 6, fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>
                Select a file from the explorer on the left or create a new one.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
