import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import JSZip from "jszip";

import AgentActivity from "./components/AgentActivity";
import ChatPanel from "./components/ChatPanel";
import CodeEditor from "./components/CodeEditor";
import ConsoleChangesPanel from "./components/ConsoleChangesPanel";
import FileExplorer from "./components/FileExplorer";
import ProjectLauncher from "./components/ProjectLauncher";
import Resizer from "./components/Resizer";
import RuntimePreview from "./components/RuntimePreview";
import TopBar from "./components/TopBar";
import PreviewPage from "./components/PreviewPage";

import { runProject } from "./runtime/webcontainer";

import {
  checkBackend,
  fetchSessionMemory,
  resolveApproval,
  streamAgent,
} from "./services/api";

import type {
  AgentEvent,
  ChatMessage,
  FileChangeItem,
  ProjectFile,
  SessionMemoryData,
} from "./types/project";


/* ============================================================
   STARTER PROJECT
   ============================================================ */

const defaultDemoFiles: ProjectFile[] = [
  {
    path: "index.html",
    content: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>XO Studio - Tic Tac Toe</title>
  <link rel="stylesheet" href="style.css" />
</head>

<body>
  <div class="game-container">
    <header class="game-header">
      <h1>Tic Tac Toe</h1>
      <p class="subtitle">AI Dev Studio Showcase</p>
    </header>

    <div class="status-panel">
      <div class="turn-indicator" id="turnIndicator">
        Turn:
        <span id="currentTurn" class="player-x">
          Player X
        </span>
      </div>
    </div>

    <div class="scoreboard">
      <div class="score-card x-card">
        <span class="label">PLAYER X</span>
        <span class="score" id="scoreX">0</span>
      </div>

      <div class="score-card ties-card">
        <span class="label">TIES</span>
        <span class="score" id="scoreTies">0</span>
      </div>

      <div class="score-card o-card">
        <span class="label">PLAYER O</span>
        <span class="score" id="scoreO">0</span>
      </div>
    </div>

    <main class="board" id="board">
      <button class="cell" data-index="0"> </button>
      <button class="cell" data-index="1"> </button>
      <button class="cell" data-index="2"> </button>
      <button class="cell" data-index="3"> </button>
      <button class="cell" data-index="4"> </button>
      <button class="cell" data-index="5"> </button>
      <button class="cell" data-index="6"> </button>
      <button class="cell" data-index="7"> </button>
      <button class="cell" data-index="8"> </button>
    </main>

    <footer class="game-controls">
      <button class="btn reset-btn" id="resetBtn">
        Restart Round
      </button>

      <button class="btn clear-btn" id="clearScoresBtn">
        Reset Scores
      </button>
    </footer>

    <div class="banner" id="banner"></div>
  </div>

  <script src="script.js"></script>
</body>
</html>`,
  },

  {
    path: "style.css",
    content: `:root {
  --bg-color: #0f172a;
  --card-bg: rgba(30, 41, 59, 0.7);
  --cell-bg: #1e293b;
  --cell-hover: #334155;
  --border-color: #334155;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --color-x: #38bdf8;
  --color-o: #f43f5e;
  --color-win: #10b981;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif;
}

body {
  min-height: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background:
    radial-gradient(circle at 50% 20%, #1e1b4b, var(--bg-color));
  color: var(--text-main);
  padding: 24px 16px;
  overflow-y: auto;
}

.game-container {
  width: 100%;
  max-width: 380px;
  margin: auto 0;
  background: var(--card-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  text-align: center;
}

.game-header h1 {
  font-size: 24px;
  font-weight: 800;
}

.subtitle {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

.status-panel {
  margin: 16px 0 12px;
}

.turn-indicator {
  display: inline-block;
  padding: 6px 14px;
  background: #0f172a;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid var(--border-color);
}

.player-x {
  color: var(--color-x);
}

.player-o {
  color: var(--color-o);
}

.scoreboard {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.score-card {
  background: #0f172a;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.score-card .label {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
}

.score-card .score {
  font-size: 18px;
  font-weight: 800;
}

.x-card .score {
  color: var(--color-x);
}

.o-card .score {
  color: var(--color-o);
}

.ties-card .score {
  color: var(--text-main);
}

.board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.cell {
  aspect-ratio: 1;
  background: var(--cell-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  font-size: 40px;
  font-weight: 900;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cell:hover:not(:disabled) {
  background: var(--cell-hover);
  transform: translateY(-2px);
}

.cell.x {
  color: var(--color-x);
}

.cell.o {
  color: var(--color-o);
}

.cell.win {
  background: rgba(16, 185, 129, 0.2);
  border-color: var(--color-win);
}

.game-controls {
  display: flex;
  gap: 10px;
}

.btn {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.reset-btn {
  background: #3b82f6;
  color: white;
}

.clear-btn {
  background: #334155;
  color: var(--text-main);
}

.banner {
  margin-top: 14px;
  font-size: 13px;
  font-weight: 600;
  min-height: 20px;
}`,
  },

  {
    path: "script.js",
    content: `console.log("XO Studio ready.");`,
  },
];


/* ============================================================
   HELPERS
   ============================================================ */

function makeEvent(
  type: AgentEvent["type"],
  message: string,
  extra: Partial<AgentEvent> = {}
): AgentEvent {
  return {
    id: crypto.randomUUID(),
    type,
    message,
    timestamp: new Date().toISOString(),
    agent: extra.agent ?? "System",
    status: extra.status ?? "completed",
    ...extra,
  };
}


function generateSrcDoc(files: ProjectFile[]): string {
  const htmlFile =
    files.find((f) => f.path === "index.html") ||
    files.find((f) => f.path.endsWith(".html"));

  if (!htmlFile) {
    return `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;padding:30px;text-align:center">
<h3>No HTML entry file found</h3>
<p>Create an index.html file to view preview.</p>
</body>
</html>`;
  }

  let html = htmlFile.content;

  const cssFiles = files.filter((f) =>
    f.path.endsWith(".css")
  );

  const combinedCss = cssFiles
    .map((f) => f.content)
    .join("\n");

  if (combinedCss) {
    const style = `<style>${combinedCss}</style>`;

    if (html.includes("</head>")) {
      html = html.replace(
        "</head>",
        `${style}</head>`
      );
    } else {
      html = style + html;
    }
  }

  const jsFiles = files.filter(
    (f) =>
      f.path.endsWith(".js") ||
      f.path.endsWith(".jsx")
  );

  const combinedJs = jsFiles
    .map((f) => f.content)
    .join("\n");

  if (combinedJs) {
    const script = `<script>${combinedJs}</script>`;

    if (html.includes("</body>")) {
      html = html.replace(
        "</body>",
        `${script}</body>`
      );
    } else {
      html += script;
    }
  }

  return html;
}


/* ============================================================
   APP
   ============================================================ */

export default function App() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved =
      localStorage.getItem("ai_studio_theme");

    return saved !== null
      ? saved === "dark"
      : true;
  });

  const [viewMode, setViewMode] =
    useState<"launcher" | "workspace">(
      "launcher"
    );

  const [projectName, setProjectName] =
    useState<string>("my-web-app");

  const [projectMode, setProjectMode] =
    useState<"create" | "edit">("create");

  const [files, setFiles] =
    useState<ProjectFile[]>(() => {
      const saved =
        localStorage.getItem("ai_studio_files");

      if (saved) {
        try {
          const parsed = JSON.parse(saved);

          if (
            Array.isArray(parsed) &&
            parsed.length > 0
          ) {
            return parsed;
          }
        } catch {
          // ignore
        }
      }

      return defaultDemoFiles;
    });

  const [selectedPath, setSelectedPath] =
    useState<string>("index.html");

  const [openFiles, setOpenFiles] =
    useState<string[]>([
      "index.html",
      "style.css",
      "script.js",
    ]);

  const [messages, setMessages] =
    useState<ChatMessage[]>([
      {
        id: "initial-msg",
        sender: "assistant",
        content:
          "Hello! I am your AI Software Engineer. I can build, modify, validate, and review your application.\n\nTry asking me: 'Create a modern weather dashboard'.",
        timestamp:
          new Date().toISOString(),
        modifiedFiles: [
          "index.html",
          "style.css",
          "script.js",
        ],
      },
    ]);

  const [events, setEvents] =
    useState<AgentEvent[]>([
      makeEvent(
        "status",
        "Workspace initialized with starter project."
      ),
    ]);

  const [changes, setChanges] =
    useState<FileChangeItem[]>([]);

  const [logs, setLogs] =
    useState<string[]>([
      "Studio engine initialized.",
    ]);

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [running, setRunning] =
    useState<boolean>(false);

  type WorkflowStatus =
    | "idle"
    | "planning"
    | "waiting_plan_approval"
    | "building"
    | "waiting_build_approval"
    | "reviewing"
    | "ready"
    | "rejected"
    | "error";

  interface ApprovalState {
    approval_type: string;
    message: string;
    data?: Record<string, unknown>;
  }

  const [runId, setRunId] =
    useState<string | null>(null);

  const [approval, setApproval] =
    useState<ApprovalState | null>(null);

  const [approvalLoading, setApprovalLoading] =
    useState(false);

  const [workflowStatus, setWorkflowStatus] =
    useState<WorkflowStatus>("idle");

  const [runtimeLoading, setRuntimeLoading] =
    useState(false);

  const [isBackendConnected, setIsBackendConnected] =
    useState(false);

  /*
   * Always-current copy of the project files (state updates are async, and
   * several SSE events can arrive in the same tick).
   */
  const filesRef = useRef<ProjectFile[]>(files);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  /* Makes sure the app is auto-run only once per AI run. */
  const autoRunDoneRef = useRef(false);

  const [sessionMemory, setSessionMemory] =
    useState<SessionMemoryData | null>(null);

  const loadSessionMemory = useCallback(async () => {
    if (!runId) return;
    const data = await fetchSessionMemory(runId);
    if (data) {
      setSessionMemory(data);
    }
  }, [runId]);


  const [leftWidth, setLeftWidth] =
    useState<number>(270);

  const [rightWidth, setRightWidth] =
    useState<number>(430);

  const [leftTopPercent, setLeftTopPercent] =
    useState<number>(50);

  const [centerTopPercent, setCenterTopPercent] =
    useState<number>(58);

  const [rightTopPercent, setRightTopPercent] =
    useState<number>(64);

  const leftColRef =
    useRef<HTMLDivElement>(null);

  const centerColRef =
    useRef<HTMLDivElement>(null);

  const rightColRef =
    useRef<HTMLDivElement>(null);


  /* ============================================================
     EFFECTS
     ============================================================ */

  useEffect(() => {
    document.documentElement.dataset.theme =
      dark ? "dark" : "light";

    localStorage.setItem(
      "ai_studio_theme",
      dark ? "dark" : "light"
    );
  }, [dark]);


  useEffect(() => {
    localStorage.setItem(
      "ai_studio_files",
      JSON.stringify(files)
    );
  }, [files]);


  useEffect(() => {
    checkBackend()
      .then(() => {
        setIsBackendConnected(true);

        setEvents((cur) => [
          ...cur,
          makeEvent(
            "success",
            "AI backend connected."
          ),
        ]);
      })
      .catch(() => {
        setIsBackendConnected(false);

        setEvents((cur) => [
          ...cur,
          makeEvent(
            "error",
            "AI backend is not connected."
          ),
        ]);
      });
  }, []);


  /* ============================================================
     FILE HELPERS
     ============================================================ */

  const selectedFile = useMemo(
    () =>
      files.find(
        (file) =>
          file.path === selectedPath
      ),
    [files, selectedPath]
  );

  const currentSrcDoc = useMemo(
    () => generateSrcDoc(files),
    [files]
  );


  const updateFileContent = useCallback(
    (path: string, content: string) => {
      setFiles((current) =>
        current.map((file) =>
          file.path === path
            ? {
                ...file,
                content,
              }
            : file
        )
      );
    },
    []
  );


  const handleSelectFile =
    useCallback((path: string) => {
      setSelectedPath(path);

      setOpenFiles((current) =>
        current.includes(path)
          ? current
          : [...current, path]
      );
    }, []);


  const handleCloseTab = useCallback(
    (path: string) => {
      setOpenFiles((current) => {
        const next = current.filter(
          (p) => p !== path
        );

        if (
          selectedPath === path &&
          next.length > 0
        ) {
          setSelectedPath(
            next[next.length - 1]
          );
        }

        return next;
      });
    },
    [selectedPath]
  );


  const handleCreateFile = useCallback(
    (name: string) => {
      setFiles((current) => {
        if (
          current.some(
            (f) => f.path === name
          )
        ) {
          return current;
        }

        return [
          ...current,
          {
            path: name,
            content: "",
          },
        ];
      });

      setChanges((cur) => [
        {
          path: name,
          action: "created",
          timestamp:
            new Date().toISOString(),
        },
        ...cur,
      ]);

      handleSelectFile(name);

      setEvents((cur) => [
        ...cur,
        makeEvent(
          "tool",
          `Created new file: ${name}`
        ),
      ]);
    },
    [handleSelectFile]
  );


  const handleCreateFolder = useCallback(
    (name: string) => {
      const keepPath =
        `${name}/.gitkeep`;

      setFiles((current) => [
        ...current,
        {
          path: keepPath,
          content: "",
        },
      ]);

      setSelectedPath(keepPath);

      setEvents((cur) => [
        ...cur,
        makeEvent(
          "tool",
          `Created folder: ${name}`
        ),
      ]);
    },
    []
  );


  const handleDeleteFile = useCallback(
    (path: string) => {
      if (
        !window.confirm(
          `Delete ${path}?`
        )
      ) {
        return;
      }

      setFiles((current) =>
        current.filter(
          (f) => f.path !== path
        )
      );

      setOpenFiles((current) =>
        current.filter(
          (p) => p !== path
        )
      );

      setChanges((cur) => [
        {
          path,
          action: "deleted",
          timestamp:
            new Date().toISOString(),
        },
        ...cur,
      ]);

      setEvents((cur) => [
        ...cur,
        makeEvent(
          "tool",
          `Deleted file: ${path}`
        ),
      ]);

      if (selectedPath === path) {
        setSelectedPath(
          files[0]?.path ?? ""
        );
      }
    },
    [files, selectedPath]
  );


  /* ============================================================
     PROJECT LAUNCHER
     ============================================================ */

  const handleCreateNewProject =
    useCallback(
      (name: string) => {
        const cleanName =
          name.trim() || "my-web-app";

        const initialFiles: ProjectFile[] =
          [
            {
              path: "index.html",
              content: `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${cleanName}</title>
</head>

<body>
  <div id="root">
    <h1>${cleanName}</h1>
    <p>Tell the AI what you want to build.</p>
  </div>
</body>
</html>`,
            },

            {
              path: "style.css",
              content: `* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: system-ui, sans-serif;
  background: #0f172a;
  color: white;
}`,
            },

            {
              path: "script.js",
              content:
                `console.log("${cleanName} ready.");`,
            },
          ];

        setProjectMode("create");

        setProjectName(cleanName);

        setFiles(initialFiles);

        setSelectedPath("index.html");

        setOpenFiles([
          "index.html",
          "style.css",
          "script.js",
        ]);

        setPreviewUrl(null);

        setApproval(null);

        setRunId(null);

        setWorkflowStatus("idle");

        setEvents([
          makeEvent(
            "status",
            `Created new project workspace: ${cleanName}`
          ),
          makeEvent(
            "success",
            "3 initial files ready for AI instructions."
          ),
        ]);

        setChanges([]);

        setMessages([
          {
            id: crypto.randomUUID(),
            sender: "assistant",
            content:
              `I created a clean project "${cleanName}".\n\nTell me what you want to build and I will analyze it, create a plan, ask for approval, code it, validate it, and show the preview.`,
            timestamp:
              new Date().toISOString(),
          },
        ]);

        setViewMode("workspace");
      },
      []
    );


  const handleOpenSample =
    useCallback(() => {
      setProjectMode("edit");

      setProjectName("xo-studio");

      setFiles(defaultDemoFiles);

      setSelectedPath("index.html");

      setOpenFiles([
        "index.html",
        "style.css",
        "script.js",
      ]);

      setPreviewUrl(null);

      setApproval(null);

      setRunId(null);

      setWorkflowStatus("idle");

      setEvents([
        makeEvent(
          "status",
          "Loaded Tic-Tac-Toe testing sample."
        ),
        makeEvent(
          "success",
          "3 files loaded into editor."
        ),
      ]);

      setChanges([]);

      setMessages([
        {
          id: crypto.randomUUID(),
          sender: "assistant",
          content:
            "Tic-Tac-Toe sample loaded. Ask me to add a feature or modify the application.",
          timestamp:
            new Date().toISOString(),
          modifiedFiles: [
            "index.html",
            "style.css",
            "script.js",
          ],
        },
      ]);

      setViewMode("workspace");
    }, []);


  /* ============================================================
     DOWNLOAD
     ============================================================ */

  const handleDownloadProject =
    useCallback(async () => {
      if (!files.length) {
        return;
      }

      const zip = new JSZip();

      for (const file of files) {
        if (!file.path.trim()) {
          continue;
        }

        zip.file(
          file.path,
          file.content
        );
      }

      const blob =
        await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
        });

      const url =
        URL.createObjectURL(blob);

      const anchor =
        document.createElement("a");

      anchor.href = url;

      anchor.download =
        `${projectName || "vibecode-project"}.zip`;

      document.body.appendChild(anchor);

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(url);

      setEvents((cur) => [
        ...cur,
        makeEvent(
          "success",
          `Project downloaded as ${projectName}.zip`
        ),
      ]);
    },
    [files, projectName]
  );


  /* ============================================================
     WEB CONTAINER
     ============================================================ */

  const startRuntime = useCallback(
    async (projectFiles: ProjectFile[]) => {
      setRuntimeLoading(true);

      setLogs((cur) => [
        ...cur,
        "Starting WebContainer runtime...",
      ]);

      try {
        const started = await runProject(
          projectFiles,

          (url) => {
            setPreviewUrl(url);

            setRuntimeLoading(false);

            setLogs((cur) => [
              ...cur,
              `Server ready: ${url}`,
            ]);

            setEvents((cur) => [
              ...cur,
              makeEvent(
                "success",
                "Live preview server is ready."
              ),
            ]);
          },

          (line) => {
            setLogs((cur) => [
              ...cur,
              line,
            ]);
          }
        );

        if (!started) {
          // Plain HTML/CSS/JS project: the in-browser preview is the app.
          setPreviewUrl(null);

          setEvents((cur) => [
            ...cur,
            makeEvent(
              "success",
              "Application is running in the live preview."
            ),
          ]);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        setEvents((cur) => [
          ...cur,
          makeEvent(
            "error",
            `Runtime failed: ${message}`
          ),
        ]);

        setLogs((cur) => [
          ...cur,
          `RUNTIME ERROR: ${message}`,
        ]);
      } finally {
        // Never leave the preview spinning.
        setRuntimeLoading(false);
      }
    },
    []
  );

  /* Auto-run the finished application exactly once per AI run. */
  const autoRunProject = useCallback(
    (projectFiles: ProjectFile[]) => {
      if (
        autoRunDoneRef.current ||
        projectFiles.length === 0
      ) {
        return;
      }

      autoRunDoneRef.current = true;

      void startRuntime(projectFiles);
    },
    [startRuntime]
  );


  /* ============================================================
     HUMAN APPROVAL
     ============================================================ */

  const handleApproval =
    useCallback(
      async (approved: boolean) => {
        if (!runId || !approval) {
          return;
        }

        setApprovalLoading(true);

        try {
          setEvents((cur) => [
            ...cur,
            makeEvent(
              approved
                ? "success"
                : "error",
              approved
                ? `Human approved: ${approval.approval_type}`
                : `Human rejected: ${approval.approval_type}`
            ),
          ]);

          setLogs((cur) => [
            ...cur,
            approved
              ? `Human approval granted: ${approval.approval_type}`
              : `Human approval rejected: ${approval.approval_type}`,
          ]);

          await resolveApproval(
            runId,
            approval.approval_type,
            approved,
            approved
              ? "Approved from VibeCode UI."
              : "Rejected from VibeCode UI."
          );

          if (!approved) {
            setWorkflowStatus("rejected");

            setRunning(false);

            setMessages((cur) => [
              ...cur,
              {
                id: crypto.randomUUID(),
                sender: "assistant",
                content:
                  "The workflow was stopped because the requested approval was rejected.",
                timestamp:
                  new Date().toISOString(),
                status: "error",
              },
            ]);
          }

          setApproval(null);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : String(error);

          setEvents((cur) => [
            ...cur,
            makeEvent(
              "error",
              `Approval failed: ${message}`
            ),
          ]);
        } finally {
          setApprovalLoading(false);
        }
      },
      [approval, runId]
    );


  /* ============================================================
     AI PROMPT
     ============================================================ */

  const handlePrompt = useCallback(
    async (prompt: string) => {
      const trimmedPrompt =
        prompt.trim();

      if (
        !trimmedPrompt ||
        running ||
        approval
      ) {
        return;
      }

      setRunning(true);

      autoRunDoneRef.current = false;

      let runCompletedSeen = false;

      setApproval(null);

      setRunId(null);

      setWorkflowStatus("planning");

      setPreviewUrl(null);

      const userMessage: ChatMessage =
        {
          id: crypto.randomUUID(),
          sender: "user",
          content: trimmedPrompt,
          timestamp:
            new Date().toISOString(),
          status: "done",
        };

      setMessages((cur) => [
        ...cur,
        userMessage,
      ]);

      setEvents((cur) => [
        ...cur,
        makeEvent(
          "status",
          `User prompt received: "${trimmedPrompt}"`
        ),
      ]);

      setLogs((cur) => [
        ...cur,
        `AI request started: ${trimmedPrompt}`,
      ]);

      try {
        const request =
          projectMode === "edit"
            ? {
                prompt: trimmedPrompt,

                project: {
                  name: projectName,

                  framework: "vanilla",

                  entrypoint:
                    selectedPath,

                  files,
                },
              }
            : {
                prompt: trimmedPrompt,
              };


        await streamAgent(
          request,

          /* ======================================================
             LIVE EVENTS
             ====================================================== */

          (event: AgentEvent) => {
            setEvents((cur) => [
              ...cur,
              event,
            ]);

            if (event.message) {
              let logText = event.message;
              if (
                logText.includes("```") ||
                logText.includes('{"files"') ||
                logText.length > 140
              ) {
                if (event.agent === "Planner") {
                  logText = "Implementation plan formulated.";
                } else if (event.agent === "Supervisor") {
                  logText = "Requirements analyzed.";
                } else if (event.agent === "Analyst") {
                  logText = "Project dependencies analyzed.";
                } else if (event.agent === "Coder") {
                  logText = "Source files generated.";
                } else {
                  logText = logText.slice(0, 100) + "...";
                }
              }
              setLogs((cur) => [
                ...cur,
                event.agent
                  ? `[${event.agent}] ${logText}`
                  : logText,
              ]);
            }


            /* ====================================================
               RUN ID & MEMORY
               ==================================================== */

            if (
              event.data?.run_id
            ) {
              const currentRunId = String(
                event.data.run_id
              );
              setRunId(currentRunId);
              void fetchSessionMemory(currentRunId).then((mem) => {
                if (mem) setSessionMemory(mem);
              });
            }


            /* ====================================================
               WORKFLOW STATE
               ==================================================== */

            const agent =
              String(
                event.agent ?? ""
              ).toLowerCase();

            if (
              agent.includes("planner")
            ) {
              setWorkflowStatus(
                "planning"
              );
            }

            if (
              agent.includes("coder")
            ) {
              setWorkflowStatus(
                "building"
              );
            }

            if (
              agent.includes("reviewer")
            ) {
              setWorkflowStatus(
                "reviewing"
              );
            }


            /* ====================================================
               HUMAN APPROVAL
               ==================================================== */

            if (
              event.type ===
              "approval_required"
            ) {
              const approvalType =
                String(
                  event.data
                    ?.approval_type ??
                    ""
                );

              const message =
                String(
                  event.data
                    ?.message ??
                    event.message ??
                    "Human approval is required."
                );

              setApproval({
                approval_type:
                  approvalType,

                message,

                data:
                  event.data ??
                  undefined,
              });


              if (
                approvalType ===
                "plan_approval"
              ) {
                setWorkflowStatus(
                  "waiting_plan_approval"
                );
              }


              if (
                approvalType ===
                "build_approval"
              ) {
                setWorkflowStatus(
                  "waiting_build_approval"
                );
              }

              setLogs((cur) => [
                ...cur,
                `Waiting for human approval: ${approvalType}`,
              ]);
            }


            /* ====================================================
               FILE CREATED / MODIFIED
               ==================================================== */

            if (
              event.type ===
                "file_created" &&
              event.path
            ) {
              const path =
                event.path;

              const content =
                event.data?.content;


              setChanges((cur) => [
                {
                  path,
                  action: files.some(
                    (file) =>
                      file.path === path
                  )
                    ? "modified"
                    : "created",
                  timestamp:
                    new Date().toISOString(),
                },

                ...cur,
              ]);


              if (
                typeof content ===
                "string"
              ) {
                filesRef.current = [
                  ...filesRef.current.filter(
                    (file) =>
                      file.path !== path
                  ),
                  { path, content },
                ];

                setFiles((current) => {
                  const exists =
                    current.some(
                      (file) =>
                        file.path ===
                        path
                    );

                  if (exists) {
                    return current.map(
                      (file) =>
                        file.path ===
                        path
                          ? {
                              ...file,
                              content,
                            }
                          : file
                    );
                  }

                  return [
                    ...current,
                    {
                      path,
                      content,
                    },
                  ];
                });

                handleSelectFile(path);
              }
            }


            /* ====================================================
               VALIDATION
               ==================================================== */

            if (
              event.type ===
              "validation"
            ) {
              const passed =
                event.data?.passed;

              setLogs((cur) => [
                ...cur,
                passed
                  ? "Validation passed."
                  : "Validation failed.",
              ]);
            }


            /* ====================================================
               COMPLETION
               ==================================================== */

            if (
              event.type ===
              "run_completed"
            ) {
              runCompletedSeen = true;

              setWorkflowStatus(
                "ready"
              );

              // The agents are finished - stop every spinner.
              setRunning(false);
            }

            if (
              event.type === "error" &&
              event.status === "failed"
            ) {
              setRunning(false);
            }
          },


          /* ======================================================
             FINAL RESPONSE
             ====================================================== */

          (response) => {
            if (response.run_id) {
              setRunId(
                response.run_id
              );
            }

            runCompletedSeen = true;

            const generatedFiles =
              response.project?.files ??
              [];


            if (
              response.ready_for_preview !== false &&
              generatedFiles.length > 0
            ) {
              filesRef.current =
                generatedFiles;

              setFiles(
                generatedFiles
              );

              setProjectMode(
                "edit"
              );

              setProjectName(
                response.project
                  ?.name ||
                  projectName ||
                  "ai-generated-project"
              );


              const nextSelectedPath =
                generatedFiles.some(
                  (file) =>
                    file.path ===
                    selectedPath
                )
                  ? selectedPath
                  : generatedFiles[0]
                      ?.path ??
                    "index.html";


              setSelectedPath(
                nextSelectedPath
              );


              setOpenFiles(
                (current) => {
                  const next = [
                    ...current,
                  ];

                  for (
                    const file of
                      generatedFiles
                  ) {
                    if (
                      !next.includes(
                        file.path
                      )
                    ) {
                      next.push(
                        file.path
                      );
                    }
                  }

                  return next;
                }
              );


              const existingPaths =
                new Set(
                  files.map(
                    (file) =>
                      file.path
                  )
                );


              const changedFiles =
                generatedFiles.map(
                  (file) => ({
                    path:
                      file.path,

                    action:
                      projectMode ===
                        "create" ||
                      !existingPaths.has(
                        file.path
                      )
                        ? ("created" as const)
                        : ("modified" as const),

                    timestamp:
                      new Date().toISOString(),
                  })
                );


              setChanges((cur) => [
                ...changedFiles,
                ...cur,
              ]);


              setMessages((cur) => [
                ...cur,
                {
                  id: crypto.randomUUID(),

                  sender:
                    "assistant",

                  content:
                    response.summary ||
                    "The coding workflow completed successfully.",

                  timestamp:
                    new Date().toISOString(),

                  status: "done",

                  modifiedFiles:
                    generatedFiles.map(
                      (file) =>
                        file.path
                    ),
                },
              ]);


              setWorkflowStatus(
                "ready"
              );


              setLogs((cur) => [
                ...cur,

                `Agent workflow completed: ${response.run_id}`,

                `Generated ${generatedFiles.length} project files.`,

                "Human approvals completed.",

                "Starting live project runtime...",
              ]);


              /*
               * IMPORTANT:
               *
               * Runtime starts ONLY after
               * backend says ready_for_preview=true.
               */

              setRunning(false);

              autoRunProject(
                generatedFiles
              );
            } else {
              /*
               * Stream may end while waiting
               * for human approval.
               *
               * Do NOT start preview here.
               */

              if (
                approval === null &&
                !response.ready_for_preview
              ) {
                setLogs((cur) => [
                  ...cur,
                  "Workflow paused or waiting for approval.",
                ]);
              }
            }
          }
        );

        /*
         * Fallback: the stream finished and the run completed, but the
         * final payload carried no project - run what we already have.
         */
        if (
          runCompletedSeen &&
          !autoRunDoneRef.current
        ) {
          autoRunProject(
            filesRef.current
          );
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        console.error(
          "Coding agent failed:",
          error
        );

        setWorkflowStatus(
          "error"
        );

        setApproval(null);

        setRunning(false);

        setEvents((cur) => [
          ...cur,
          makeEvent(
            "error",
            `Agent workflow failed: ${message}`
          ),
        ]);

        setLogs((cur) => [
          ...cur,
          `ERROR: ${message}`,
        ]);

        setMessages((cur) => [
          ...cur,
          {
            id: crypto.randomUUID(),

            sender:
              "assistant",

            content:
              `I couldn't complete the coding task.\n\n${message}`,

            timestamp:
              new Date().toISOString(),

            status: "error",
          },
        ]);

        return;
      }

      /*
       * IMPORTANT:
       *
       * If an approval card exists, keep the
       * workflow in running state.
       *
       * Otherwise the workflow is finished.
       */

      setRunning(false);
    },
    [
      approval,
      autoRunProject,
      files,
      handleSelectFile,
      projectMode,
      projectName,
      running,
      selectedPath,
      startRuntime,
    ]
  );


  /* ============================================================
     RESIZE HANDLERS
     ============================================================ */

  const handleLeftHorizontalResize =
    useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();

        const onMove = (
          moveEvent: MouseEvent
        ) => {
          const newWidth =
            Math.max(
              180,
              Math.min(
                window.innerWidth *
                  0.45,
                moveEvent.clientX
              )
            );

          setLeftWidth(
            Math.round(newWidth)
          );
        };

        const onUp = () => {
          window.removeEventListener(
            "mousemove",
            onMove
          );

          window.removeEventListener(
            "mouseup",
            onUp
          );
        };

        window.addEventListener(
          "mousemove",
          onMove
        );

        window.addEventListener(
          "mouseup",
          onUp
        );
      },
      []
    );


  const handleRightHorizontalResize =
    useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();

        const onMove = (
          moveEvent: MouseEvent
        ) => {
          const newWidth =
            Math.max(
              260,
              Math.min(
                window.innerWidth *
                  0.55,
                window.innerWidth -
                  moveEvent.clientX
              )
            );

          setRightWidth(
            Math.round(newWidth)
          );
        };

        const onUp = () => {
          window.removeEventListener(
            "mousemove",
            onMove
          );

          window.removeEventListener(
            "mouseup",
            onUp
          );
        };

        window.addEventListener(
          "mousemove",
          onMove
        );

        window.addEventListener(
          "mouseup",
          onUp
        );
      },
      []
    );


  const handleLeftVerticalResize =
    useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();

        const onMove = (
          moveEvent: MouseEvent
        ) => {
          if (!leftColRef.current) {
            return;
          }

          const rect =
            leftColRef.current.getBoundingClientRect();

          const relY =
            moveEvent.clientY -
            rect.top;

          const pct =
            Math.max(
              15,
              Math.min(
                85,
                (relY /
                  rect.height) *
                  100
              )
            );

          setLeftTopPercent(
            Math.round(pct)
          );
        };

        const onUp = () => {
          window.removeEventListener(
            "mousemove",
            onMove
          );

          window.removeEventListener(
            "mouseup",
            onUp
          );
        };

        window.addEventListener(
          "mousemove",
          onMove
        );

        window.addEventListener(
          "mouseup",
          onUp
        );
      },
      []
    );


  const handleCenterVerticalResize =
    useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();

        const onMove = (
          moveEvent: MouseEvent
        ) => {
          if (!centerColRef.current) {
            return;
          }

          const rect =
            centerColRef.current.getBoundingClientRect();

          const relY =
            moveEvent.clientY -
            rect.top;

          const pct =
            Math.max(
              15,
              Math.min(
                85,
                (relY /
                  rect.height) *
                  100
              )
            );

          setCenterTopPercent(
            Math.round(pct)
          );
        };

        const onUp = () => {
          window.removeEventListener(
            "mousemove",
            onMove
          );

          window.removeEventListener(
            "mouseup",
            onUp
          );
        };

        window.addEventListener(
          "mousemove",
          onMove
        );

        window.addEventListener(
          "mouseup",
          onUp
        );
      },
      []
    );


  const handleRightVerticalResize =
    useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();

        const onMove = (
          moveEvent: MouseEvent
        ) => {
          if (!rightColRef.current) {
            return;
          }

          const rect =
            rightColRef.current.getBoundingClientRect();

          const relY =
            moveEvent.clientY -
            rect.top;

          const pct =
            Math.max(
              15,
              Math.min(
                85,
                (relY /
                  rect.height) *
                  100
              )
            );

          setRightTopPercent(
            Math.round(pct)
          );
        };

        const onUp = () => {
          window.removeEventListener(
            "mousemove",
            onMove
          );

          window.removeEventListener(
            "mouseup",
            onUp
          );
        };

        window.addEventListener(
          "mousemove",
          onMove
        );

        window.addEventListener(
          "mouseup",
          onUp
        );
      },
      []
    );


  /* ============================================================
     PREVIEW ROUTE
     ============================================================ */

  if (
    window.location.pathname ===
    "/preview"
  ) {
    return <PreviewPage />;
  }


  /* ============================================================
     LAUNCHER
     ============================================================ */

  if (
    viewMode === "launcher"
  ) {
    return (
      <ProjectLauncher
        onCreateProject={
          handleCreateNewProject
        }

        onOpenSample={
          handleOpenSample
        }

        dark={dark}

        onToggleTheme={() =>
          setDark((value) => !value)
        }
      />
    );
  }


  /* ============================================================
     WORKSPACE
     ============================================================ */

  return (
    <div className="app-shell">

      <TopBar
        dark={dark}

        onToggleTheme={() =>
          setDark((value) => !value)
        }

        projectName={projectName}

        onRunProject={() => {
          /*
           * Manual runtime launch is allowed
           * only when workflow is ready.
           */

          if (!running) {
            void startRuntime(
              files
            );
          } else {
            setEvents((cur) => [
              ...cur,
              makeEvent(
                "status",
                "The AI workflow is still running. The app will start automatically when it finishes."
              ),
            ]);
          }
        }}

        onDownloadProject={
          handleDownloadProject
        }

        onOpenLauncher={() =>
          setViewMode("launcher")
        }
      />


      <main className="workspace-container">

        {/* =====================================================
            LEFT COLUMN
            ===================================================== */}

        <section
          ref={leftColRef}
          className="workspace-column left-col"
          style={{
            width: `${leftWidth}px`,
          }}
        >

          <div
            style={{
              height: `${leftTopPercent}%`,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <FileExplorer
              files={files}
              selectedPath={selectedPath}
              onSelect={
                handleSelectFile
              }
              onNewFile={
                handleCreateFile
              }
              onNewFolder={
                handleCreateFolder
              }
              onDeleteFile={
                handleDeleteFile
              }
            />
          </div>


          <Resizer
            direction="horizontal"
            onMouseDown={
              handleLeftVerticalResize
            }
            onDoubleClick={() =>
              setLeftTopPercent(50)
            }
            title="Drag to resize Folder Structure vs AI Activities"
          />


          <div
            style={{
              height: `calc(${100 - leftTopPercent}% - 6px)`,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <AgentActivity
              events={events}
              running={running}
              onClearEvents={() =>
                setEvents([])
              }
            />
          </div>

        </section>


        {/* =====================================================
            LEFT/CENTER RESIZER
            ===================================================== */}

        <Resizer
          direction="vertical"
          onMouseDown={
            handleLeftHorizontalResize
          }
          onDoubleClick={() =>
            setLeftWidth(270)
          }
          title="Drag to resize Left Column"
        />


        {/* =====================================================
            CENTER COLUMN
            ===================================================== */}

        <section
          ref={centerColRef}
          className="workspace-column center-col"
        >

          <div
            style={{
              height: `${centerTopPercent}%`,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <CodeEditor
              file={selectedFile}
              openFiles={openFiles}
              selectedPath={selectedPath}
              onSelectTab={
                handleSelectFile
              }
              onCloseTab={
                handleCloseTab
              }
              onContentChange={
                updateFileContent
              }
              dark={dark}
            />
          </div>


          <Resizer
            direction="horizontal"
            onMouseDown={
              handleCenterVerticalResize
            }
            onDoubleClick={() =>
              setCenterTopPercent(58)
            }
            title="Drag to resize Code Editor vs Chat"
          />


          <div
            style={{
              height: `calc(${100 - centerTopPercent}% - 6px)`,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              overflow: "hidden",
            }}
          >

            <ChatPanel
              messages={messages}
              running={running}
              onSubmit={handlePrompt}
              onClearChat={() =>
                setMessages([])
              }
              onSelectFile={
                handleSelectFile
              }
              approval={approval}
              approvalLoading={approvalLoading}
              onApproval={handleApproval}
            />
          </div>

        </section>


        {/* =====================================================
            CENTER/RIGHT RESIZER
            ===================================================== */}

        <Resizer
          direction="vertical"
          onMouseDown={
            handleRightHorizontalResize
          }
          onDoubleClick={() =>
            setRightWidth(430)
          }
          title="Drag to resize Preview"
        />


        {/* =====================================================
            RIGHT COLUMN
            ===================================================== */}

        <section
          ref={rightColRef}
          className="workspace-column right-col"
          style={{
            width: `${rightWidth}px`,
          }}
        >

          <div
            style={{
              height: `${rightTopPercent}%`,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              overflow: "hidden",
            }}
          >

            <RuntimePreview
              url={previewUrl}

              srcDoc={
                previewUrl
                  ? undefined
                  : currentSrcDoc
              }

              loading={
                runtimeLoading &&
                !previewUrl
              }

              onRefresh={() => {
                if (previewUrl) {
                  setPreviewUrl(
                    `${previewUrl.split("#")[0]}#${Date.now()}`
                  );
                } else if (!running) {
                  void startRuntime(
                    files
                  );
                }
              }}

              onStartRuntime={() => {
                if (!running) {
                  void startRuntime(
                    files
                  );
                } else {
                  setEvents((cur) => [
                    ...cur,
                    makeEvent(
                      "status",
                      "The AI workflow is still running. The app will start automatically when it finishes."
                    ),
                  ]);
                }
              }}

              dark={dark}
            />

          </div>


          <Resizer
            direction="horizontal"
            onMouseDown={
              handleRightVerticalResize
            }
            onDoubleClick={() =>
              setRightTopPercent(64)
            }
            title="Drag to resize Preview vs Console"
          />


          <div
            style={{
              height: `calc(${100 - rightTopPercent}% - 6px)`,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              overflow: "hidden",
            }}
          >

            <ConsoleChangesPanel
              logs={logs}
              changes={changes}
              sessionMemory={sessionMemory}
              sessionId={runId ?? undefined}
              onRefreshMemory={loadSessionMemory}
              onClearLogs={() =>
                setLogs([])
              }
              onSelectFile={
                handleSelectFile
              }
            />

          </div>

        </section>

      </main>

    </div>
  );
}