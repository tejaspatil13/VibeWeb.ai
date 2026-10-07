import {
  ArrowRight,
  FolderPlus,
  FolderUp,
  Gamepad2,
  Github,
  Moon,
  Sparkles,
  Sun,
} from "lucide-react";
import React, { useState } from "react";

interface Props {
  onCreateProject: (projectName: string) => void;
  onOpenSample: () => void;
  dark: boolean;
  onToggleTheme: () => void;
}

export default function ProjectLauncher({
  onCreateProject,
  onOpenSample,
  dark,
  onToggleTheme,
}: Props) {
  const [projectName, setProjectName] = useState("my-web-app");
  const [showNameInput, setShowNameInput] = useState(false);

  function handleCreate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const name = projectName.trim() || "my-web-app";
    onCreateProject(name);
  }

  return (
    <div className="launcher-stage">
      <header className="launcher-topbar">
        <div className="brand-badge">
          <div className="brand-icon">
            <Sparkles size={16} />
          </div>
          <span>VibeWeb.ai</span>
          <span className="brand-tag">IDE</span>
        </div>

        <button
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={`Switch to ${dark ? "Light" : "Dark"} Theme`}
        >
          {dark ? <Sun size={14} /> : <Moon size={14} />}
          <span>{dark ? "Light Mode" : "Dark Mode"}</span>
        </button>
      </header>

      <main className="launcher-content">
        <div className="launcher-hero">
          <div className="launcher-pill">
            <Sparkles size={13} />
            <span>AUTONOMOUS AI WEB IDE</span>
          </div>

          <h1 className="launcher-title">
            Build, edit and run web apps with <span>VibeWeb.ai</span>
          </h1>

          <p className="launcher-subtitle">
            Create a fresh project from scratch or test drive the IDE with our
            interactive sample.
          </p>
        </div>

        {/* Primary 3 Options Grid */}
        <div className="launcher-grid">
          {/* 1. Create Folder / Project (ACTIVE) */}
          <div
            className={`launcher-card active-card ${
              showNameInput ? "expanded" : ""
            }`}
            onClick={() => {
              if (!showNameInput) setShowNameInput(true);
            }}
          >
            <div className="card-top">
              <div className="card-icon active-icon">
                <FolderPlus size={22} />
              </div>
              <span className="card-badge active-badge">Ready to Create</span>
            </div>

            <h3 className="card-heading">Create Folder / Project</h3>
            <p className="card-desc">
              Start a clean, brand new workspace from scratch. The AI agent will
              generate code, files, and styles based on your prompts.
            </p>

            {showNameInput ? (
              <form onSubmit={handleCreate} className="create-form" onClick={(e) => e.stopPropagation()}>
                <label className="form-label" htmlFor="project-name-input">
                  Project Folder Name:
                </label>
                <div className="form-row">
                  <input
                    id="project-name-input"
                    type="text"
                    className="project-name-input"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="my-web-app"
                    autoFocus
                  />
                  <button type="submit" className="btn-primary" style={{ padding: "8px 16px" }}>
                    <span>Launch</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            ) : (
              <div className="card-action">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNameInput(true);
                  }}
                >
                  <span>Start New Project</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* 2. Upload Folder (Disabled) */}
          <div className="launcher-card disabled-card">
            <div className="card-top">
              <div className="card-icon muted-icon">
                <FolderUp size={22} />
              </div>
              <span className="card-badge disabled-badge">Coming Soon</span>
            </div>

            <h3 className="card-heading">Upload Folder</h3>
            <p className="card-desc">
              Import a local folder or ZIP archive from your computer directly into
              the in-browser workspace.
            </p>
          </div>

          {/* 3. Upload GitHub Link (Disabled) */}
          <div className="launcher-card disabled-card">
            <div className="card-top">
              <div className="card-icon muted-icon">
                <Github size={22} />
              </div>
              <span className="card-badge disabled-badge">Coming Soon</span>
            </div>

            <h3 className="card-heading">Upload GitHub Link</h3>
            <p className="card-desc">
              Clone any public or private repository using its Git URL into the
              development environment.
            </p>
          </div>
        </div>

        {/* Below Option for Testing Purpose: Tic-Tac-Toe */}
        <div className="sample-test-section">
          <div className="sample-card" onClick={onOpenSample}>
            <div className="sample-left">
              <div className="sample-icon">
                <Gamepad2 size={24} />
              </div>
              <div>
                <div className="sample-tag">TESTING PURPOSE SAMPLE</div>
                <h4 className="sample-title">Interactive Tic-Tac-Toe Game</h4>
                <p className="sample-desc">
                  Load a pre-configured Tic-Tac-Toe game with 2-player mode, scores,
                  and animations to test the 3-column layout, Monaco editor, and live
                  preview.
                </p>
              </div>
            </div>

            <button className="btn-secondary sample-btn" onClick={onOpenSample}>
              <span>Open Tic-Tac-Toe Sample</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
