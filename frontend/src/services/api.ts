import type {
  AgentEvent,
  ProjectFile,
  SessionMemoryData,
} from "../types/project";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8000";

export interface AgentRequest {
  prompt: string;
  project?: {
    name: string;
    framework: string;
    entrypoint?: string;
    files: ProjectFile[];
  };
}

export interface AgentResponse {
  run_id: string;
  summary: string;
  project: {
    name: string;
    framework: string;
    entrypoint?: string;
    files: ProjectFile[];
  };
  events: AgentEvent[];
  validation?: unknown;
  review?: unknown;
  ready_for_preview: boolean;
}

export interface ApprovalRequest {
  run_id: string;
  approval_type: string;
  approved: boolean;
  approved_by?: string;
  reason?: string;
}

export async function checkBackend(): Promise<void> {
  const response = await fetch(`${API_BASE}/health`);

  if (!response.ok) {
    throw new Error("Backend is not available");
  }
}

export async function resolveApproval(
  runId: string,
  approvalType: string,
  approved: boolean,
  reason?: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/agent/${runId}/approval`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        run_id: runId,
        approval_type: approvalType,
        approved,
        approved_by: "user",
        reason,
      } satisfies ApprovalRequest),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Approval request failed: ${response.status} ${text}`
    );
  }
}

export async function streamAgent(
  request: AgentRequest,
  onEvent: (event: AgentEvent) => void,
  onComplete: (response: AgentResponse) => void
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/agent/run/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Agent request failed: ${response.status} ${text}`
    );
  }

  if (!response.body) {
    throw new Error("Backend returned no streaming body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";

  const handleMessage = (message: string) => {
    let eventName = "message";
    let data = "";

    for (const line of message.split("\n")) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      }

      if (line.startsWith("data:")) {
        data += line.slice(5).trim();
      }
    }

    if (!data) {
      return;
    }

    try {
      const parsed = JSON.parse(data);

      if (
        eventName === "agent_update" ||
        parsed.agent ||
        parsed.type
      ) {
        onEvent(parsed as AgentEvent);
      }

      if (
        eventName === "run_completed" ||
        (parsed.run_id && parsed.project)
      ) {
        onComplete(parsed as AgentResponse);
      }
    } catch {
      console.warn("Could not parse SSE event:", data);
    }
  };

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      // Flush a final message that had no trailing blank line.
      buffer += decoder.decode();
      buffer = buffer.replace(/\r\n/g, "\n");

      if (buffer.trim()) {
        handleMessage(buffer);
      }

      break;
    }

    buffer += decoder.decode(value, {
      stream: true,
    });

    // SSE servers (e.g. sse-starlette) may use \r\n line endings.
    buffer = buffer.replace(/\r\n/g, "\n");

    const messages = buffer.split("\n\n");

    buffer = messages.pop() || "";

    for (const message of messages) {
      handleMessage(message);
    }
  }
}

export async function fetchSessionMemory(
  sessionId: string
): Promise<SessionMemoryData | null> {
  try {
    const response = await fetch(
      `${API_BASE}/api/agent/session/${sessionId}/memory`
    );
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as SessionMemoryData;
  } catch (err) {
    console.warn("Failed to fetch session memory:", err);
    return null;
  }
}