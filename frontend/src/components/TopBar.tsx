import {
  Download,
  FolderGit2,
  FolderPlus,
  Moon,
  Play,
  Sparkles,
  Sun,
} from "lucide-react";

interface Props {
  dark: boolean;
  onToggleTheme: () => void;
  projectName: string;
  onRunProject: () => void;
  onDownloadProject: () => void;
  onOpenLauncher: () => void;
}

export default function TopBar({
  dark,
  onToggleTheme,
  projectName,
  onRunProject,
  onDownloadProject,
  onOpenLauncher,
}: Props) {
  const handleDownload = () => {
    console.log("DOWNLOAD BUTTON CLICKED");
    onDownloadProject();
  };

  return (
    <header className="topbar">
      <div className="brand-section">
        <div
          className="brand-badge"
          onClick={onOpenLauncher}
          style={{ cursor: "pointer" }}
          title="Back to Project Launcher"
        >
          <div className="brand-icon">
            <Sparkles size={16} />
          </div>

          <span>VibeWeb.ai</span>
          <span className="brand-tag">IDE</span>
        </div>

        <div
          className="project-pill"
          title="Current Workspace Project"
        >
          <FolderGit2 size={13} />

          <span>Project:</span>

          <strong>
            {projectName || "Untitled Project"}
          </strong>

          <button
            type="button"
            className="icon-btn"
            title="Download Project"
            onClick={handleDownload}
          >
            <Download size={15} />
          </button>
        </div>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={onOpenLauncher}
          title="Create New Project or Switch Sample"
        >
          <FolderPlus size={13} />
          <span>New Project</span>
        </button>

        <button
          type="button"
          className="btn-primary"
          onClick={onRunProject}
          title="Run project and update preview"
        >
          <Play
            size={13}
            fill="currentColor"
          />
          <span>Run App</span>
        </button>

        <button
          type="button"
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={`Switch to ${
            dark ? "Light" : "Dark"
          } Theme`}
        >
          {dark ? (
            <Sun size={14} />
          ) : (
            <Moon size={14} />
          )}

          <span>
            {dark
              ? "Light Mode"
              : "Dark Mode"}
          </span>
        </button>
      </div>
    </header>
  );
}