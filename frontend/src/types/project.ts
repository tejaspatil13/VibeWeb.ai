export interface ProjectFile {
  path: string;
  content: string;
}

export type AgentEventType =
  | "status"
  | "analysis"
  | "plan"
  | "tool"
  | "change"
  | "success"
  | "error"
  | "agent_started"
  | "agent_completed"
  | "file_created"
  | "approval_required"
  | "approval_waiting"
  | "validation"
  | "run_completed";

export interface AgentEvent {
  id?: string;
  agent: string;
  message: string;
  status?: string;
  type: AgentEventType;
  path?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  content: string;
  timestamp: string;
  status?: "pending" | "done" | "error";
  modifiedFiles?: string[];
}

export interface FileChangeItem {
  path: string;
  action: "created" | "modified" | "deleted";
  timestamp: string;
}

export interface SessionMemoryEvent {
  author: string;
  summary: string;
  timestamp: string;
}

export interface SessionMemoryData {
  session_id: string;
  app_name?: string;
  user_id?: string;
  status?: string;
  events_count?: number;
  state?: Record<string, unknown>;
  events?: SessionMemoryEvent[];
}