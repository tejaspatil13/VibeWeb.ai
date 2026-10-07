import { ArrowUp, Command, Paperclip, Sparkles } from "lucide-react";
import { useState } from "react";

interface Props {
  disabled?: boolean;
  onSubmit: (prompt: string) => void;
}

const suggestions = [
  "Create a modern XO game",
  "Create a weather dashboard",
  "Create a landing page"
];

export default function PromptBar({ disabled, onSubmit }: Props) {
  const [prompt, setPrompt] = useState("");

  function submit() {
    const value = prompt.trim();
    if (!value || disabled) return;
    onSubmit(value);
    setPrompt("");
  }

  return (
    <div className="composer-wrap">
      <div className="suggestions">
        {suggestions.map((item) => (
          <button key={item} onClick={() => setPrompt(item)} disabled={disabled}>{item}</button>
        ))}
      </div>
      <div className="composer">
        <div className="composer-top">
          <Sparkles size={16} />
          <textarea
            value={prompt}
            disabled={disabled}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="Describe what you want to build..."
            rows={2}
          />
        </div>
        <div className="composer-bottom">
          <button className="composer-tool" disabled><Paperclip size={15} /> Attach</button>
          <span className="composer-shortcut"><Command size={12} /> Enter to run</span>
          <button className="send-button" onClick={submit} disabled={disabled || !prompt.trim()}>
            <ArrowUp size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}