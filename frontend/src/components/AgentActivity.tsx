import {
  AlertCircle,
  CheckCircle2,
  CircleAlert,
  CircleDot,
  FileEdit,
  ListTodo,
  Loader2,
  Sparkles,
  Terminal,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import type { AgentEvent, AgentEventType } from "../types/project";

interface Props {
  events: AgentEvent[];
  running: boolean;
  onClearEvents: () => void;
}

const defaultIcons: Record<AgentEventType, LucideIcon> = {
  status: CircleDot,
  analysis: Sparkles,
  plan: ListTodo,
  tool: Terminal,
  change: FileEdit,
  success: CheckCircle2,
  error: AlertCircle,
  agent_started: Loader2,
  agent_completed: CheckCircle2,
  file_created: FileEdit,
  approval_required: CircleAlert,
  approval_waiting: Loader2,
  validation: CheckCircle2,
  run_completed: CheckCircle2,
};

function formatEventMessage(event: AgentEvent): string {
  const msg = event.message || "";
  // If the message is a raw dump of code or JSON or very long markdown
  if (msg.includes("```") || msg.includes('{"files"') || msg.length > 140) {
    if (event.agent === "Planner") {
      return "Formulated project implementation plan and file roadmap.";
    }
    if (event.agent === "Supervisor") {
      return "Analyzed user requirements and system architecture.";
    }
    if (event.agent === "Analyst") {
      return "Reviewed existing project structure and dependencies.";
    }
    if (event.agent === "Coder") {
      return "Generated application source files.";
    }
    // Truncate cleanly
    const firstLine = msg.split("\n")[0].trim();
    if (firstLine.length > 0 && firstLine.length < 120) {
      return firstLine;
    }
    return msg.slice(0, 110) + "...";
  }
  return msg;
}


/**
 * Work out which events are *genuinely* still in progress.
 *
 * Previously every event with status "running" / type "agent_started" spun
 * forever, because nothing ever marked it finished. Now an event only spins
 * when:
 *   - the overall run is still active, AND
 *   - it is the latest "started/waiting" event of its agent, AND
 *   - nothing afterwards has completed, failed or superseded it.
 */
function computeActiveIndexes(
  events: AgentEvent[],
  running: boolean
): Set<number> {
  const active = new Set<number>();
  if (!running) return active;

  const openByAgent = new Map<string, number>();

  const closeAll = () => {
    openByAgent.forEach((idx) => active.delete(idx));
    openByAgent.clear();
  };

  events.forEach((event, idx) => {
    const agent = event.agent || "System";
    const status = String(event.status ?? "").toLowerCase();

    const isDoneStatus = [
      "completed",
      "complete",
      "done",
      "success",
      "failed",
      "error",
      "rejected",
      "approved",
      "skipped",
    ].includes(status);

    // Run finished or failed -> nothing can still be working.
    if (event.type === "run_completed" || event.type === "error") {
      closeAll();
      return;
    }

    const isStart =
      !isDoneStatus &&
      (event.type === "agent_started" ||
        event.type === "approval_waiting" ||
        (status === "running" && agent !== "System"));

    if (isStart) {
      // Agents run one after another: a new start closes everyone else.
      openByAgent.forEach((openIdx, openAgent) => {
        if (openAgent !== agent) {
          active.delete(openIdx);
          openByAgent.delete(openAgent);
        }
      });
      // A repeated start for the same agent replaces the older one.
      const previous = openByAgent.get(agent);
      if (previous !== undefined) active.delete(previous);

      openByAgent.set(agent, idx);
      active.add(idx);
      return;
    }

    // Completion-style events close the agent's open item.
    if (
      event.type === "agent_completed" ||
      event.type === "success" ||
      event.type === "file_created" ||
      event.type === "validation" ||
      event.type === "approval_required" ||
      isDoneStatus
    ) {
      const open = openByAgent.get(agent);
      if (open !== undefined) {
        active.delete(open);
        openByAgent.delete(agent);
      }
    }

    // Once the human has answered, an approval wait is over.
    if (event.agent === "System" && /Human (approved|rejected)/i.test(event.message)) {
      closeAll();
    }
  });

  return active;
}

export default function AgentActivity({
  events,
  running,
  onClearEvents,
}: Props) {
  const feedRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeIndexes = useMemo(
    () => computeActiveIndexes(events, running),
    [events, running]
  );

  // Automatically scroll down when new events arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [events.length]);

  return (
    <div
      className="subpanel"
      style={{
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HEADER */}
      <div className="panel-header">
        <div className="panel-header-left">
          <span className="panel-title">
            <Sparkles size={14} color="var(--purple-color)" />
            AI Activity
          </span>

          <span className="panel-count">{events.length}</span>

          {running && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: "var(--font-2xs)",
                color: "var(--accent-primary)",
                fontWeight: 600,
              }}
            >
              <Loader2 className="spin" size={12} />
              Active
            </span>
          )}
        </div>

        <div className="panel-header-actions">
          {events.length > 0 && (
            <button
              className="icon-btn"
              title="Clear Activities"
              onClick={onClearEvents}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ACTIVITY FEED */}
      <div
        ref={feedRef}
        className="activity-feed"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {events.length === 0 ? (
          <div className="activity-empty">
            <div className="activity-empty-icon">
              <Sparkles size={18} />
            </div>

            <strong>No activities yet</strong>

            <p>
              When you prompt the AI, actions, planned steps, and file
              modifications will appear live in this feed.
            </p>
          </div>
        ) : (
          <>
            {events.map((event, idx) => {
              const isRunning = activeIndexes.has(idx);

              const isCompleted =
                !isRunning &&
                (event.status === "completed" ||
                  event.type === "agent_completed" ||
                  event.type === "success" ||
                  event.type === "run_completed");

              const Icon = isRunning
                ? Loader2
                : isCompleted
                ? CheckCircle2
                : event.type === "agent_started" ||
                  event.type === "approval_waiting"
                ? CircleDot
                : defaultIcons[event.type] ?? Sparkles;

              const cleanMsg = formatEventMessage(event);

              return (
                <div key={event.id || idx} className="activity-card">
                  {/* ICON BADGE */}
                  <div className={`activity-icon-badge ${event.type}`}>
                    <Icon
                      size={14}
                      className={isRunning ? "spin" : undefined}
                      color={
                        isRunning
                          ? "var(--accent-primary)"
                          : isCompleted
                          ? "var(--success-color)"
                          : undefined
                      }
                    />
                  </div>

                  {/* CONTENT */}
                  <div className="activity-content">
                    {/* Agent Header & Status Badge */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 3,
                      }}
                    >
                      {event.agent && (
                        <span
                          style={{
                            fontSize: "var(--font-2xs)",
                            fontWeight: 700,
                            color: "var(--purple-color)",
                          }}
                        >
                          {event.agent}
                        </span>
                      )}

                      {isRunning && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            fontSize: "10px",
                            color: "var(--accent-primary)",
                            fontWeight: 600,
                          }}
                        >
                          <Loader2 size={10} className="spin" />
                          Working...
                        </span>
                      )}

                      {isCompleted && (
                        <span
                          style={{
                            fontSize: "10px",
                            color: "var(--success-color)",
                            fontWeight: 600,
                          }}
                        >
                          Done
                        </span>
                      )}
                    </div>

                    {/* Concise Message */}
                    <div className="activity-msg">{cleanMsg}</div>

                    {/* File Path if any */}
                    {event.path && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: "var(--font-2xs)",
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-muted)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {event.path}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="activity-time">
                      {new Date(event.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Invisible anchor for smooth auto-scroll */}
            <div ref={bottomRef} style={{ height: 1, width: "100%" }} />
          </>
        )}
      </div>
    </div>
  );
}