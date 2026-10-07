import {
  Brain,
  CheckCircle2,
  Database,
  FileEdit,
  RefreshCw,
  SquareTerminal,
  Trash2,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import type { FileChangeItem, SessionMemoryData } from "../types/project";

interface Props {
  logs: string[];
  changes: FileChangeItem[];
  sessionMemory?: SessionMemoryData | null;
  sessionId?: string;
  onRefreshMemory?: () => void;
  onClearLogs: () => void;
  onSelectFile: (path: string) => void;
}

export default function ConsoleChangesPanel({
  logs,
  changes,
  sessionMemory,
  sessionId,
  onRefreshMemory,
  onClearLogs,
  onSelectFile,
}: Props) {
  const [activeTab, setActiveTab] = useState<
    "console" | "changes" | "memory"
  >("console");
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === "console") {
      consoleBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs.length, activeTab]);

  return (
    <div className="console-changes-panel">
      {/* PANEL TABS */}
      <div className="panel-tabs-header">
        <div className="panel-tab-btns">
          <button
            className={`panel-tab-btn ${activeTab === "console" ? "active" : ""}`}
            onClick={() => setActiveTab("console")}
            type="button"
          >
            <SquareTerminal size={13} />
            <span>Console</span>
            <span className="tab-counter">{logs.length}</span>
          </button>

          <button
            className={`panel-tab-btn ${activeTab === "changes" ? "active" : ""}`}
            onClick={() => setActiveTab("changes")}
            type="button"
          >
            <FileEdit size={13} />
            <span>AI Changes</span>
            <span className="tab-counter">{changes.length}</span>
          </button>

          <button
            className={`panel-tab-btn ${activeTab === "memory" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("memory");
              onRefreshMemory?.();
            }}
            type="button"
          >
            <Brain size={13} color="var(--purple-color)" />
            <span>ADK Memory</span>
            {sessionId && (
              <span
                className="tab-counter"
                style={{
                  background: "rgba(168, 85, 247, 0.2)",
                  color: "var(--purple-color)",
                }}
              >
                ADK
              </span>
            )}
          </button>
        </div>

        <div className="panel-header-actions">
          {activeTab === "console" && logs.length > 0 && (
            <button
              className="icon-btn"
              title="Clear Console Logs"
              onClick={onClearLogs}
              type="button"
            >
              <Trash2 size={13} />
            </button>
          )}

          {activeTab === "memory" && (
            <button
              className="icon-btn"
              title="Refresh ADK Session Memory"
              onClick={onRefreshMemory}
              type="button"
            >
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      </div>

      {/* CONSOLE TAB */}
      {activeTab === "console" && (
        <div className="console-terminal">
          {logs.length === 0 ? (
            <div className="console-empty">
              $ WebContainer console ready. Logs and build messages will appear here.
            </div>
          ) : (
            logs.map((log, index) => {
              // Sanitize log line to avoid gigantic blocks in terminal
              const line =
                log.length > 250 ? log.slice(0, 240) + "..." : log;
              return (
                <div key={`${log}-${index}`} className="console-line">
                  <span className="console-prompt">$</span>
                  <span>{line}</span>
                </div>
              );
            })
          )}
          <div ref={consoleBottomRef} />
        </div>
      )}

      {/* AI CHANGES TAB */}
      {activeTab === "changes" && (
        <div className="changes-list">
          {changes.length === 0 ? (
            <div
              style={{
                padding: "24px 14px",
                color: "var(--text-muted)",
                fontSize: "var(--font-xs)",
                textAlign: "center",
              }}
            >
              No file changes recorded yet. When the AI edits code, affected files will be tracked here.
            </div>
          ) : (
            changes.map((item, idx) => (
              <div
                key={`${item.path}-${idx}`}
                className="change-item"
                onClick={() => onSelectFile(item.path)}
                title="Click to view file in editor"
              >
                <span className="change-path">
                  <FileEdit size={13} color="var(--accent-primary)" />
                  {item.path}
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={`change-badge ${item.action}`}>
                    {item.action}
                  </span>
                  <span
                    style={{
                      fontSize: "var(--font-2xs)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {new Date(item.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ADK SESSION MEMORY TAB */}
      {activeTab === "memory" && (
        <div className="memory-container">
          {/* SESSION OVERVIEW CARD */}
          <div className="memory-card">
            <div className="memory-header">
              <div className="memory-title">
                <Database size={14} />
                <span>Google ADK Session Memory</span>
              </div>
              <span className="memory-badge">
                {sessionId ? `Session: ${sessionId.slice(0, 10)}...` : "Active"}
              </span>
            </div>

            <div className="memory-item">
              <span className="memory-key">Framework:</span>
              <span className="memory-value">Google Agent Development Kit (ADK)</span>
            </div>

            <div className="memory-item">
              <span className="memory-key">Session Service:</span>
              <span className="memory-value">InMemorySessionService</span>
            </div>

            <div className="memory-item">
              <span className="memory-key">Memory Service:</span>
              <span className="memory-value">InMemoryMemoryService</span>
            </div>

            <div className="memory-item">
              <span className="memory-key">Session ID:</span>
              <span className="memory-value" style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                {sessionId || "Initialized / Ready"}
              </span>
            </div>

            <div className="memory-item">
              <span className="memory-key">Retained Events:</span>
              <span className="memory-value">
                {sessionMemory?.events_count ?? sessionMemory?.events?.length ?? 0} ADK events tracked
              </span>
            </div>
          </div>

          {/* SESSION EVENTS LOG */}
          <div className="memory-card">
            <div className="memory-header">
              <div className="memory-title">
                <Brain size={14} />
                <span>Retained Agent Transitions & Memory</span>
              </div>
            </div>

            {sessionMemory?.events && sessionMemory.events.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                {sessionMemory.events.map((evt, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "6px 8px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "11px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <strong style={{ color: "var(--purple-color)" }}>{evt.author}</strong>
                      <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{evt.timestamp}</span>
                    </div>
                    <div style={{ color: "var(--text-secondary)" }}>{evt.summary}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "12px", color: "var(--text-muted)", padding: "8px 0" }}>
                No past session memory stored yet. Trigger an agent workflow to record session memory.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
