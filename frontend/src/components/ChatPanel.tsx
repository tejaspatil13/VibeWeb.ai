import {
  Check,
  ChevronRight,
  CircleAlert,
  Loader2,
  MessageSquare,
  X,
} from "lucide-react";
import { useState } from "react";
import type { ChatMessage } from "../types/project";

interface ApprovalState {
  approval_type: string;
  message: string;
  data?: Record<string, unknown>;
}

interface Props {
  messages: ChatMessage[];
  running: boolean;
  onSubmit: (prompt: string) => void;
  onClearChat: () => void;
  onSelectFile?: (path: string) => void;

  approval?: ApprovalState | null;
  approvalLoading?: boolean;
  onApproval?: (
    approved: boolean,
    reason?: string
  ) => void;
}

export default function ChatPanel({
  messages,
  running,
  onSubmit,
  onClearChat,
  onSelectFile,
  approval,
  approvalLoading = false,
  onApproval,
}: Props) {
  const [input, setInput] = useState("");

  const submit = () => {
    const value = input.trim();

    if (!value || running || approval) {
      return;
    }

    onSubmit(value);
    setInput("");
  };

  const isPlanApproval =
    approval?.approval_type === "plan_approval";

  const isBuildApproval =
    approval?.approval_type === "build_approval";

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
      <div className="panel-header">
        <div className="panel-header-left">
          <span className="panel-title">
            <MessageSquare size={14} />
            AI Engineer
          </span>
        </div>

        <button
          className="icon-button"
          onClick={onClearChat}
          title="Clear chat"
          type="button"
        >
          Clear
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: 14,
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              marginBottom: 14,
              display: "flex",
              flexDirection: "column",
              alignItems:
                message.sender === "user"
                  ? "flex-end"
                  : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "90%",
                padding: "10px 12px",
                borderRadius: 12,
                background:
                  message.sender === "user"
                    ? "var(--purple-color)"
                    : "var(--panel-bg)",
                border:
                  message.sender === "assistant"
                    ? "1px solid var(--border-color)"
                    : "none",
                whiteSpace: "pre-wrap",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {message.content}
            </div>

            {message.modifiedFiles &&
              message.modifiedFiles.length > 0 && (
                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 5,
                    maxWidth: "90%",
                  }}
                >
                  {message.modifiedFiles.map((file) => (
                    <button
                      key={file}
                      type="button"
                      onClick={() => onSelectFile?.(file)}
                      style={{
                        fontSize: 10,
                        padding: "3px 7px",
                        borderRadius: 5,
                        cursor: "pointer",
                        background:
                          "var(--surface-color)",
                        border:
                          "1px solid var(--border-color)",
                        color:
                          "var(--text-secondary)",
                      }}
                    >
                      {file}
                    </button>
                  ))}
                </div>
              )}
          </div>
        ))}

        {running && !approval && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "var(--text-secondary)",
              padding: "8px 4px",
            }}
          >
            <Loader2
              size={14}
              className="spin"
            />
            AI is analyzing and coding...
          </div>
        )}

        {approval && (
          <div
            style={{
              marginTop: 12,
              border: "1px solid var(--purple-color)",
              borderRadius: 12,
              padding: 14,
              background:
                "color-mix(in srgb, var(--purple-color) 8%, var(--panel-bg))",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 700,
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              <CircleAlert
                size={16}
                color="var(--purple-color)"
              />

              {isPlanApproval
                ? "Plan approval required"
                : isBuildApproval
                  ? "Build & preview approval required"
                  : "Your approval is required"}
            </div>

            <div
              style={{
                fontSize: 12,
                lineHeight: 1.5,
                color: "var(--text-secondary)",
                marginBottom: 12,
                whiteSpace: "pre-wrap",
              }}
            >
              {approval.message}
            </div>

            {typeof approval.data?.plan === "string" && approval.data.plan && (
              <div
                style={{
                  fontSize: 11,
                  lineHeight: 1.5,
                  padding: "8px 10px",
                  borderRadius: 6,
                  background: "var(--surface-color)",
                  border: "1px solid var(--border-color)",
                  marginBottom: 10,
                  maxHeight: 140,
                  overflowY: "auto",
                  whiteSpace: "pre-wrap",
                  color: "var(--text-primary)",
                }}
              >
                {approval.data.plan}
              </div>
            )}


            {Array.isArray(
              approval.data?.files_to_create
            ) && (
              <div style={{ marginBottom: 10 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    marginBottom: 5,
                  }}
                >
                  Files to create
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 5,
                  }}
                >
                  {(
                    approval.data
                      ?.files_to_create as string[]
                  ).map((file) => (
                    <span
                      key={file}
                      style={{
                        fontSize: 10,
                        padding: "3px 7px",
                        borderRadius: 5,
                        background:
                          "var(--surface-color)",
                        border:
                          "1px solid var(--border-color)",
                      }}
                    >
                      {file}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(
              approval.data?.files_to_modify
            ) && (
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    marginBottom: 5,
                  }}
                >
                  Files to modify
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 5,
                  }}
                >
                  {(
                    approval.data
                      ?.files_to_modify as string[]
                  ).map((file) => (
                    <span
                      key={file}
                      style={{
                        fontSize: 10,
                        padding: "3px 7px",
                        borderRadius: 5,
                        background:
                          "var(--surface-color)",
                        border:
                          "1px solid var(--border-color)",
                      }}
                    >
                      {file}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 8,
              }}
            >
              <button
                type="button"
                disabled={approvalLoading}
                onClick={() =>
                  onApproval?.(true)
                }
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 10px",
                  cursor: approvalLoading
                    ? "default"
                    : "pointer",
                  background:
                    "var(--purple-color)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  opacity: approvalLoading
                    ? 0.6
                    : 1,
                }}
              >
                {approvalLoading ? (
                  <Loader2
                    size={13}
                    className="spin"
                  />
                ) : (
                  <Check size={13} />
                )}

                {isPlanApproval
                  ? "Approve & Build"
                  : "Approve & Preview"}
              </button>

              <button
                type="button"
                disabled={approvalLoading}
                onClick={() =>
                  onApproval?.(
                    false,
                    "User rejected this step."
                  )
                }
                style={{
                  padding: "9px 12px",
                  borderRadius: 8,
                  cursor: approvalLoading
                    ? "default"
                    : "pointer",
                  background:
                    "var(--surface-color)",
                  border:
                    "1px solid var(--border-color)",
                  color:
                    "var(--text-secondary)",
                  fontWeight: 600,
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <X size={13} />
                Reject
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          borderTop:
            "1px solid var(--border-color)",
          padding: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          <input
            value={input}
            disabled={running || !!approval}
            onChange={(e) =>
              setInput(e.target.value)
            }
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey
              ) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={
              approval
                ? "Waiting for your approval..."
                : "Tell the AI what to build..."
            }
            style={{
              flex: 1,
              minWidth: 0,
              border:
                "1px solid var(--border-color)",
              borderRadius: 8,
              padding: "9px 10px",
              background:
                "var(--surface-color)",
              color: "var(--text-primary)",
              outline: "none",
              fontSize: 12,
            }}
          />

          <button
            type="button"
            disabled={
              running ||
              !!approval ||
              !input.trim()
            }
            onClick={submit}
            style={{
              width: 38,
              border: "none",
              borderRadius: 8,
              background:
                "var(--purple-color)",
              color: "#fff",
              cursor: "pointer",
              opacity:
                running ||
                !!approval ||
                !input.trim()
                  ? 0.5
                  : 1,
            }}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}