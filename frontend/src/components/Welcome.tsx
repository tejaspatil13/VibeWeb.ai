import { ArrowRight, Github, FolderUp, Plus } from "lucide-react";

interface Props {
  onCreate: () => void;
}

export default function Welcome({ onCreate }: Props) {
  return (
    <div className="welcome">
      <div className="welcome-glow" />
      <div className="welcome-badge">AI SOFTWARE ENGINEER</div>
      <h1>Build, run and change<br /><span>projects in your browser.</span></h1>
      <p>Start with a prompt today. Import a folder or GitHub repository next.</p>

      <div className="entry-grid">
        <button className="entry-card featured" onClick={onCreate}>
          <div className="entry-icon"><Plus size={19} /></div>
          <div><strong>Create project</strong><span>Describe an app and let the agent build it.</span></div>
          <ArrowRight size={16} />
        </button>
        <button className="entry-card" disabled>
          <div className="entry-icon"><FolderUp size={19} /></div>
          <div><strong>Upload project</strong><span>ZIP/folder import · Coming next</span></div>
        </button>
        <button className="entry-card" disabled>
          <div className="entry-icon"><Github size={19} /></div>
          <div><strong>GitHub repository</strong><span>Paste a repository URL · Coming next</span></div>
        </button>
      </div>

      <div className="welcome-note">For the prototype, choose <b>Create project</b> and start with an XO game.</div>
    </div>
  );
}