import {
  CheckCircle2,
  CircleDot,
  Loader2,
  Sparkles,
  Terminal,
  XCircle,
} from "lucide-react";

import type { AgentEvent } from "../types/project";

interface Props {
  events: AgentEvent[];
  running: boolean;
}

const icons = {
  status: CircleDot,
  analysis: Sparkles,
  plan: Sparkles,
  tool: Terminal,
  change: Sparkles,
  success: CheckCircle2,
  error: XCircle,
};

export default function AgentPanel({
  events,
  running,
}: Props) {
  return (
    <div className="agent-feed">
      <div className="feed-title">
        <span>
          <Sparkles size={15} />
          AI ACTIVITY
        </span>

        {running && (
          <Loader2
            className="spin"
            size={14}
          />
        )}
      </div>

      <div className="feed-scroll">
        {events.length === 0 ? (
          <div className="empty-feed">
            <div className="empty-orb">
              <Sparkles size={19} />
            </div>

            <strong>
              Ready when you are
            </strong>

            <span>
              Describe what you want to
              build. The agent will analyze,
              plan, create, run and validate
              it.
            </span>
          </div>
        ) : (
          events.map((event) => {
            const Icon =
  icons[event.type as keyof typeof icons] ??
  Sparkles;
            return (
              <div
                className={`event event-${event.type}`}
                key={event.id}
              >
                <div className="event-icon">
                  <Icon size={14} />
                </div>

                <div>
                  <div className="event-message">
                    {event.message}
                  </div>

                  <div className="event-time">
                    {new Date(
                      event.timestamp
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}