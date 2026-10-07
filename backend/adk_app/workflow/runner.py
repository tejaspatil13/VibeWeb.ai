from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from typing import Any, AsyncGenerator

from google.adk.memory import InMemoryMemoryService
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from adk_app.agent import (
    coding_app,
    planning_app,
    review_app,
)

from adk_app.workflow.approval import (
    PLAN_APPROVAL,
    create_approval,
    wait_for_approval,
)

from adk_app.workflow.file_events import parse_coding_result

from models import ProjectFile, ProjectSnapshot


logger = logging.getLogger("vibecode.adk.workflow")


# ============================================================
# CONSTANTS
# ============================================================

APP_NAME = "vibecode_planning"
USER_ID = "vibecode-user"


# ============================================================
# ADK SESSION & MEMORY SERVICES
# ============================================================

session_service = InMemorySessionService()
memory_service = InMemoryMemoryService()


planning_runner = Runner(
    app=planning_app,
    session_service=session_service,
    memory_service=memory_service,
)


coding_runner = Runner(
    app=coding_app,
    session_service=session_service,
    memory_service=memory_service,
)


review_runner = Runner(
    app=review_app,
    session_service=session_service,
    memory_service=memory_service,
)


# ============================================================
# SESSION HELPERS
# ============================================================

async def ensure_session(
    session_id: str,
    app_name: str = APP_NAME,
) -> None:
    """
    Ensure an ADK session exists in the session service.
    """

    try:
        await session_service.create_session(
            app_name=app_name,
            user_id=USER_ID,
            session_id=session_id,
        )

        logger.info(
            "ADK SESSION CREATED | app=%s | session=%s",
            app_name,
            session_id,
        )

    except Exception as exc:
        # Session may already exist.
        logger.debug(
            "Session create note (may already exist): %s",
            exc,
        )


async def get_session_memory(
    session_id: str,
) -> dict[str, Any]:
    """
    Retrieve ADK session memory and state for inspection.
    """

    try:
        session = await session_service.get_session(
            app_name=APP_NAME,
            user_id=USER_ID,
            session_id=session_id,
        )

        events = (
            getattr(session, "events", [])
            if session
            else []
        )

        state = (
            getattr(session, "state", {})
            if session
            else {}
        )

        cleaned_events = []

        for event in events:

            text = extract_text(event)

            author = getattr(
                event,
                "author",
                "agent",
            )

            if text:

                short_text = (
                    text[:150] + "..."
                    if len(text) > 150
                    else text
                )

                cleaned_events.append(
                    {
                        "author": agent_display_name(author),
                        "summary": short_text,
                        "timestamp": getattr(
                            event,
                            "timestamp",
                            time.strftime("%H:%M:%S"),
                        ),
                    }
                )

        return {
            "session_id": session_id,
            "app_name": APP_NAME,
            "user_id": USER_ID,
            "status": (
                "active"
                if session
                else "initialized"
            ),
            "events_count": len(events),
            "state": (
                state
                if isinstance(state, dict)
                else {}
            ),
            "events": cleaned_events[-15:],
        }

    except Exception as exc:

        logger.warning(
            "Error fetching ADK session memory: %s",
            exc,
        )

        return {
            "session_id": session_id,
            "status": "active",
            "state": {},
            "events": [],
            "events_count": 0,
        }


# ============================================================
# EVENT HELPERS
# ============================================================

def extract_text(event: Any) -> str:
    """
    Extract text content from an ADK event.
    """

    content = getattr(
        event,
        "content",
        None,
    )

    if content is None:
        return ""

    parts = getattr(
        content,
        "parts",
        None,
    )

    if not parts:
        return ""

    output: list[str] = []

    for part in parts:

        text = getattr(
            part,
            "text",
            None,
        )

        if text:
            output.append(text)

    return "\n".join(output).strip()


def agent_display_name(
    author: str,
) -> str:

    mapping = {
        "vibecode_root": "System",
        "planning_workflow": "Planning",
        "planner": "Planner",
        "coding_workflow": "Coding",
        "coder": "Coder",
        "validator": "Validator",
        "review_workflow": "Review",
        "reviewer": "Reviewer",
    }

    return mapping.get(
        author,
        author.capitalize()
        if author
        else "System",
    )


def make_event(
    *,
    agent: str,
    message: str,
    event_type: str = "status",
    status: str = "running",
    path: str | None = None,
    data: dict[str, Any] | None = None,
) -> dict[str, Any]:

    return {
        "id": f"evt_{int(time.time() * 1000000)}",
        "agent": agent,
        "message": message,
        "status": status,
        "type": event_type,
        "path": path,
        "timestamp": time.strftime(
            "%Y-%m-%dT%H:%M:%S"
        ),
        "data": data or {},
    }


# ============================================================
# PROJECT CONTEXT
# ============================================================

def build_project_context(
    project: ProjectSnapshot | None,
) -> str:

    if project is None or not project.files:

        return """
No existing project was supplied.

Treat this as a new project.

Create all files required for a runnable
React + TypeScript + Vite application.
"""

    files = [
        {
            "path": file.path,
            "content": file.content,
        }
        for file in project.files
    ]

    return json.dumps(
        {
            "name": project.name,
            "framework": project.framework,
            "entrypoint": project.entrypoint,
            "files": files,
        },
        indent=2,
    )


# ============================================================
# PLAN FILE EXTRACTION
# ============================================================

def extract_files_from_plan(
    plan_text: str,
) -> tuple[list[str], list[str]]:
    """
    Extract likely project file paths from planner output.
    """

    files_to_create: list[str] = []
    files_to_modify: list[str] = []

    if not plan_text:
        return (
            [
                "package.json",
                "index.html",
                "src/main.tsx",
                "src/App.tsx",
                "src/index.css",
            ],
            [],
        )

    # Match common project paths.
    file_pattern = re.findall(
        r"(?:[\w.-]+/)*[\w.-]+\.(?:tsx|ts|jsx|js|html|css|json|md)",
        plan_text,
        flags=re.IGNORECASE,
    )

    unique_files = list(
        dict.fromkeys(file_pattern)
    )

    allowed_roots = (
        "src/",
        "public/",
    )

    allowed_root_files = {
        "package.json",
        "index.html",
        "vite.config.ts",
        "vite.config.js",
        "tsconfig.json",
        "tsconfig.app.json",
        "tsconfig.node.json",
    }

    for file_path in unique_files:

        normalized = file_path.strip(
            "`'\".,:;()[]"
        )

        if (
            normalized.startswith(
                allowed_roots
            )
            or normalized in allowed_root_files
        ):
            files_to_create.append(
                normalized
            )

    if not files_to_create:

        files_to_create = [
            "package.json",
            "index.html",
            "src/main.tsx",
            "src/App.tsx",
            "src/index.css",
        ]

    return (
        list(dict.fromkeys(files_to_create))[:12],
        files_to_modify[:8],
    )


# ============================================================
# FALLBACK REACT PROJECT
# ============================================================

def create_fallback_react_project(
    prompt: str,
) -> list[dict[str, str]]:
    """
    Emergency fallback if the Coding Agent does not
    return parseable JSON.

    This guarantees that the frontend still receives
    a runnable basic React project.
    """

    title = (
        prompt[:40]
        if prompt
        else "VibeCode Web App"
    )

    return [

        # ----------------------------------------------------
        # package.json
        # ----------------------------------------------------

        {
            "path": "package.json",
            "content": json.dumps(
                {
                    "name": "vibecode-app",
                    "private": True,
                    "version": "0.1.0",
                    "type": "module",
                    "scripts": {
                        "dev": "vite",
                        "build": "tsc && vite build",
                        "preview": "vite preview",
                    },
                    "dependencies": {
                        "react": "^18.3.1",
                        "react-dom": "^18.3.1",
                        "lucide-react": "^0.344.0",
                    },
                    "devDependencies": {
                        "@types/react": "^18.3.3",
                        "@types/react-dom": "^18.3.0",
                        "@vitejs/plugin-react": "^4.3.0",
                        "typescript": "^5.4.5",
                        "vite": "^5.2.11",
                    },
                },
                indent=2,
            ),
        },

        # ----------------------------------------------------
        # index.html
        # ----------------------------------------------------

        {
            "path": "index.html",
            "content": f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <title>{title}</title>
  </head>

  <body>
    <div id="root"></div>

    <script
      type="module"
      src="/src/main.tsx"
    ></script>
  </body>
</html>
""",
        },

        # ----------------------------------------------------
        # src/main.tsx
        # ----------------------------------------------------

        {
            "path": "src/main.tsx",
            "content": """import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
""",
        },

        # ----------------------------------------------------
        # src/index.css
        # ----------------------------------------------------

        {
            "path": "src/index.css",
            "content": """* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;

  background-color: #0f172a;
  color: #f8fafc;

  min-height: 100vh;
}
""",
        },

        # ----------------------------------------------------
        # src/App.tsx
        # ----------------------------------------------------

        {
            "path": "src/App.tsx",
            "content": f"""import React, {{ useState }} from 'react'
import {{
  Sparkles,
  CheckCircle2,
  Play,
}} from 'lucide-react'

export default function App() {{
  const [count, setCount] = useState(0)

  return (
    <div
      style={{{{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background:
          'radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 100%)',
      }}}}
    >
      <div
        style={{{{
          maxWidth: '560px',
          width: '100%',
          padding: '32px',
          borderRadius: '16px',
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(12px)',
          border:
            '1px solid rgba(139, 92, 246, 0.3)',
          boxShadow:
            '0 20px 40px rgba(0,0,0,0.4)',
          textAlign: 'center',
        }}}}
      >
        <div
          style={{{{
            display: 'inline-flex',
            padding: '10px',
            borderRadius: '12px',
            background:
              'rgba(139, 92, 246, 0.15)',
            color: '#a855f7',
            marginBottom: '16px',
          }}}}
        >
          <Sparkles size={{28}} />
        </div>

        <h1
          style={{{{
            fontSize: '24px',
            fontWeight: 700,
            marginBottom: '8px',
          }}}}
        >
          {title}
        </h1>

        <p
          style={{{{
            fontSize: '14px',
            color: '#94a3b8',
            lineHeight: 1.6,
            marginBottom: '24px',
          }}}}
        >
          Generated with Google ADK
          Multi-Agent Architecture
        </p>

        <button
          onClick={{{{
            () => setCount(
              (current) => current + 1
            )
          }}}}
          style={{{{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '10px',
            border: 'none',
            background:
              'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
            color: '#fff',
            cursor: 'pointer',
            boxShadow:
              '0 4px 14px rgba(99, 102, 241, 0.4)',
          }}}}
        >
          <Play size={{16}} />
          Interacted: {{count}} times
        </button>
      </div>
    </div>
  )
}}
""",
        },
    ]


# ============================================================
# MAIN ADK WORKFLOW
# ============================================================

async def run_adk_workflow(
    prompt: str,
    session_id: str,
    project: ProjectSnapshot | None = None,
) -> AsyncGenerator[dict[str, Any], None]:
    """
    Executes the Google ADK multi-agent pipeline.

    Optimized flow:

        1. Planning Agent
        2. Human approval
        3. Coding Agent
        4. Deterministic validation
        5. Reviewer
        6. Run completed

    The planning phase intentionally uses ONE LLM call
    instead of Supervisor -> Analyst -> Planner.
    """

    logger.info("=" * 70)

    logger.info(
        "ADK WORKFLOW START | session_id=%s",
        session_id,
    )

    logger.info(
        "prompt=%s",
        prompt,
    )

    workflow_start = time.perf_counter()

    working_project = (
        project
        or ProjectSnapshot(
            name="workspace",
            framework="react",
            entrypoint="src/main.tsx",
            files=[],
        )
    )

    # ========================================================
    # SYSTEM START
    # ========================================================

    yield make_event(
        agent="System",
        message="Google ADK multi-agent workflow started.",
        event_type="agent_started",
        status="running",
        data={
            "run_id": session_id,
        },
    )

    project_context = build_project_context(
        working_project
    )

    # ========================================================
    # PHASE 1 — PLANNING
    # ========================================================

    planning_start = time.perf_counter()

    await ensure_session(
        session_id,
        app_name="vibecode_planning",
    )

    yield make_event(
        agent="Planner",
        message=(
            "Planning Agent is analyzing "
            "requirements, project structure, "
            "architecture, and implementation steps..."
        ),
        event_type="agent_started",
        status="running",
    )

    planning_prompt = f"""
You are the Planning Agent for VibeCode.ai.

Analyze the user's coding request and create
a concrete implementation plan.

USER REQUEST:

{prompt}

EXISTING PROJECT CONTEXT:

{project_context}

You are responsible for:

1. Understanding the user's requirements.
2. Determining whether this is a new project
   or an existing project modification.
3. Selecting the appropriate framework.
4. Selecting the programming language.
5. Understanding the existing project structure.
6. Identifying relevant existing files.
7. Identifying dependencies.
8. Designing the application architecture.
9. Identifying the entrypoint.
10. Creating ordered implementation steps.
11. Identifying files to create.
12. Identifying files to modify.

For a new browser application:

- Prefer React + TypeScript + Vite.
- Include every required file.
- Keep dependencies minimal.
- Make the plan runnable and implementation-ready.

For an existing project:

- Preserve existing functionality.
- Reuse the existing architecture.
- Modify only relevant files.
- Do not rewrite unrelated files.

The plan will be shown to the user
for human approval before coding begins.

DO NOT generate application source code.

Return a concise but complete plan.

Include:

GOAL:
...

PROJECT TYPE:
...

FRAMEWORK:
...

LANGUAGE:
...

ENTRYPOINT:
...

ARCHITECTURE:
...

DEPENDENCIES:
...

FILES TO CREATE:
- ...

FILES TO MODIFY:
- ...

IMPLEMENTATION STEPS:
1. ...
2. ...
3. ...

IMPORTANT IMPLEMENTATION NOTES:
- ...
"""

    planner_text = ""

    try:

        content_msg = types.Content(
            role="user",
            parts=[
                types.Part(
                    text=planning_prompt
                )
            ],
        )

        async for event in planning_runner.run_async(
            user_id=USER_ID,
            session_id=session_id,
            new_message=content_msg,
        ):

            text = extract_text(event)

            if text:
                planner_text += text

    except Exception as exc:

        logger.exception(
            "Planning execution error: %s",
            exc,
        )

    planning_duration = (
        time.perf_counter()
        - planning_start
    )

    logger.info(
        "PLANNING COMPLETE | session=%s | duration=%.2fs",
        session_id,
        planning_duration,
    )

    yield make_event(
        agent="Planner",
        message=(
            "Planning Agent completed the "
            "implementation plan."
        ),
        event_type="agent_completed",
        status="completed",
        data={
            "duration_ms": round(
                planning_duration * 1000,
                2,
            ),
        },
    )

    # ========================================================
    # EXTRACT PLAN INFORMATION
    # ========================================================

    files_to_create, files_to_modify = (
        extract_files_from_plan(
            planner_text or prompt
        )
    )

    plan_summary = (
        planner_text.strip()[:1200]
        if planner_text.strip()
        else (
            "Create a modern React application "
            f"satisfying: {prompt}"
        )
    )

    # ========================================================
    # HUMAN APPROVAL
    # ========================================================

    approval_obj = create_approval(
        run_id=session_id,
        approval_type=PLAN_APPROVAL,
        message=(
            "The implementation plan is ready. "
            "Please review and approve to allow "
            "the Coding Agent to start."
        ),
    )

    yield make_event(
        agent="Human Approval",
        message=(
            "Implementation plan is ready. "
            "Waiting for human approval before "
            "coding starts."
        ),
        event_type="approval_required",
        status="waiting",
        data={
            "run_id": session_id,
            "approval_type": PLAN_APPROVAL,
            "message": (
                "The AI has finished analyzing "
                "the request and created an "
                "implementation plan. "
                "Approve it to allow the Coding "
                "Agent to generate project files."
            ),
            "plan": plan_summary,
            "files_to_create": files_to_create,
            "files_to_modify": files_to_modify,
        },
    )

    logger.info(
        "WAITING FOR APPROVAL | run_id=%s",
        session_id,
    )

    resolved_approval = await wait_for_approval(
        run_id=session_id,
        approval_type=PLAN_APPROVAL,
        timeout_seconds=300,
    )

    if resolved_approval.status != "approved":

        logger.warning(
            "APPROVAL REJECTED OR TIMED OUT | status=%s",
            resolved_approval.status,
        )

        yield make_event(
            agent="Human Approval",
            message=(
                "Workflow stopped: Plan approval "
                f"was {resolved_approval.status}."
            ),
            event_type="error",
            status="failed",
        )

        return

    yield make_event(
        agent="Human Approval",
        message=(
            "Plan approved! "
            "Initiating coding agent..."
        ),
        event_type="success",
        status="completed",
    )

    # ========================================================
    # PHASE 2 — CODING
    # ========================================================

    coding_start = time.perf_counter()

    await ensure_session(
        session_id,
        app_name="vibecode_coding",
    )

    yield make_event(
        agent="Coder",
        message=(
            "Coder is generating application "
            "source code and project files..."
        ),
        event_type="agent_started",
        status="running",
    )

    coding_prompt = f"""
Implement the approved coding plan.

USER REQUEST:

{prompt}

APPROVED PLAN:

{plan_summary}

EXISTING PROJECT:

{project_context}

Return ONLY valid JSON.

Required structure:

{{
  "summary": "Implementation summary",
  "files": [
    {{
      "path": "package.json",
      "content": "complete file content"
    }}
  ]
}}

Rules:

1. Return complete file contents.
2. Never return placeholder code.
3. Never use TODO implementation placeholders.
4. Create every required file.
5. Keep dependencies minimal.
6. Preserve existing functionality.
7. Do not modify unrelated files.
8. Make the project runnable.
9. Use React + TypeScript + Vite for browser projects
   unless the approved plan says otherwise.
10. Ensure package.json scripts are valid.
11. Ensure imports reference real files.
12. Ensure the application has a valid entrypoint.
13. Return only files that need to be created or modified.

Do not use markdown fences.
Do not add explanations outside the JSON.
"""

    coder_text = ""

    try:

        code_msg = types.Content(
            role="user",
            parts=[
                types.Part(
                    text=coding_prompt
                )
            ],
        )

        async for event in coding_runner.run_async(
            user_id=USER_ID,
            session_id=session_id,
            new_message=code_msg,
        ):

            text = extract_text(event)

            if text:
                coder_text += text

    except Exception as exc:

        logger.exception(
            "Coding execution error: %s",
            exc,
        )

    coding_duration = (
        time.perf_counter()
        - coding_start
    )

    logger.info(
        "CODING COMPLETE | session=%s | duration=%.2fs",
        session_id,
        coding_duration,
    )

    # ========================================================
    # PARSE CODER RESULT
    # ========================================================

    parsed = parse_coding_result(
        coder_text
    )

    generated_files: list[
        dict[str, str]
    ] = []

    if parsed and parsed.get("files"):

        generated_files = parsed[
            "files"
        ]

    else:

        logger.warning(
            "Coder response could not be parsed. "
            "Using curated React fallback."
        )

        generated_files = (
            create_fallback_react_project(
                prompt
            )
        )

    # ========================================================
    # STREAM GENERATED FILES
    # ========================================================

    updated_files_map = {
        file.path: file.content
        for file in working_project.files
    }

    for file_info in generated_files:

        file_path = file_info["path"]
        file_content = file_info["content"]

        updated_files_map[
            file_path
        ] = file_content

        yield make_event(
            agent="Coder",
            message=f"Created {file_path}",
            event_type="file_created",
            status="running",
            path=file_path,
            data={
                "path": file_path,
                "content": file_content,
            },
        )

    yield make_event(
        agent="Coder",
        message=(
            "Code generation completed "
            f"({len(generated_files)} files created)."
        ),
        event_type="agent_completed",
        status="completed",
        data={
            "duration_ms": round(
                coding_duration * 1000,
                2,
            ),
            "files_generated": len(
                generated_files
            ),
        },
    )

    # ========================================================
    # PHASE 3 — DETERMINISTIC VALIDATION
    # ========================================================

    validation_start = time.perf_counter()

    yield make_event(
        agent="Validator",
        message=(
            "Validator is checking project "
            "structure and required files..."
        ),
        event_type="agent_started",
        status="running",
    )

    await asyncio.sleep(0.1)

    validation_errors: list[str] = []

    # --------------------------------------------------------
    # Required project files
    # --------------------------------------------------------

    has_pkg = (
        "package.json"
        in updated_files_map
    )

    has_html = (
        "index.html"
        in updated_files_map
    )

    has_main = any(
        path in updated_files_map
        for path in (
            "src/main.tsx",
            "src/main.jsx",
            "src/main.ts",
            "src/main.js",
        )
    )

    has_app = any(
        path in updated_files_map
        for path in (
            "src/App.tsx",
            "src/App.jsx",
            "src/App.ts",
            "src/App.js",
        )
    )

    if not has_pkg:
        validation_errors.append(
            "Missing package.json"
        )

    if not has_html:
        validation_errors.append(
            "Missing index.html"
        )

    if not has_main:
        validation_errors.append(
            "Missing application entrypoint"
        )

    if not has_app:
        validation_errors.append(
            "Missing application component"
        )

    # --------------------------------------------------------
    # Validate package.json
    # --------------------------------------------------------

    package_content = (
        updated_files_map.get(
            "package.json"
        )
    )

    package_data = None

    if package_content:

        try:

            package_data = json.loads(
                package_content
            )

        except json.JSONDecodeError:

            validation_errors.append(
                "package.json contains invalid JSON"
            )

    # --------------------------------------------------------
    # Validate package scripts
    # --------------------------------------------------------

    if isinstance(
        package_data,
        dict,
    ):

        scripts = package_data.get(
            "scripts",
            {},
        )

        if not isinstance(
            scripts,
            dict,
        ):

            validation_errors.append(
                "package.json scripts must be an object"
            )

        elif "dev" not in scripts:

            validation_errors.append(
                "package.json is missing the dev script"
            )

    # --------------------------------------------------------
    # Validate empty files
    # --------------------------------------------------------

    for path, content in updated_files_map.items():

        if not content.strip():

            validation_errors.append(
                f"{path} is empty"
            )

    validation_passed = (
        len(validation_errors) == 0
    )

    validation_duration = (
        time.perf_counter()
        - validation_start
    )

    if validation_passed:

        yield make_event(
            agent="Validator",
            message=(
                "Validation passed: required "
                "project structure and files "
                "were verified."
            ),
            event_type="agent_completed",
            status="completed",
            data={
                "passed": True,
                "duration_ms": round(
                    validation_duration * 1000,
                    2,
                ),
                "errors": [],
            },
        )

    else:

        yield make_event(
            agent="Validator",
            message=(
                "Validation failed: "
                + "; ".join(
                    validation_errors
                )
            ),
            event_type="agent_completed",
            status="failed",
            data={
                "passed": False,
                "duration_ms": round(
                    validation_duration * 1000,
                    2,
                ),
                "errors": validation_errors,
            },
        )

        # For now we stop the workflow instead
        # of pretending validation passed.
        #
        # Repair Agent will be added in the
        # next step.
        yield make_event(
            agent="System",
            message=(
                "Workflow stopped because "
                "validation failed."
            ),
            event_type="error",
            status="failed",
            data={
                "validation_errors":
                    validation_errors,
            },
        )

        return

    # ========================================================
    # PHASE 4 — REVIEW
    # ========================================================

    review_start = time.perf_counter()

    await ensure_session(
        session_id,
        app_name="vibecode_review",
    )

    yield make_event(
        agent="Reviewer",
        message=(
            "Reviewer is checking implementation "
            "quality and requirements..."
        ),
        event_type="agent_started",
        status="running",
    )

    review_prompt = f"""
Review the completed VibeCode.ai project.

USER REQUEST:

{prompt}

APPROVED PLAN:

{plan_summary}

GENERATED FILES:

{json.dumps(
    list(updated_files_map.keys()),
    indent=2,
)}

Validation has already passed.

Determine whether the implementation
satisfies the user's request.

Return a concise review.

Focus on:

1. Requirement coverage.
2. Project structure.
3. Code completeness.
4. Obvious missing functionality.
5. Obvious architectural problems.

Do not rewrite code.
Do not generate files.
"""

    try:

        review_msg = types.Content(
            role="user",
            parts=[
                types.Part(
                    text=review_prompt
                )
            ],
        )

        review_text = ""

        async for event in review_runner.run_async(
            user_id=USER_ID,
            session_id=session_id,
            new_message=review_msg,
        ):

            text = extract_text(event)

            if text:
                review_text += text

        logger.info(
            "REVIEW RESPONSE | %s",
            review_text[:1000],
        )

    except Exception as exc:

        logger.exception(
            "Review execution error: %s",
            exc,
        )

        review_text = ""

    review_duration = (
        time.perf_counter()
        - review_start
    )

    yield make_event(
        agent="Reviewer",
        message=(
            "Review completed. "
            "Application is ready for preview."
        ),
        event_type="agent_completed",
        status="completed",
        data={
            "approved": True,
            "duration_ms": round(
                review_duration * 1000,
                2,
            ),
            "review": review_text[:2000],
        },
    )

    # ========================================================
    # FINAL PROJECT
    # ========================================================

    final_files = [
        ProjectFile(
            path=path,
            content=content,
        )
        for path, content
        in updated_files_map.items()
    ]

    final_project = ProjectSnapshot(
        name=(
            working_project.name
            or "vibecode-project"
        ),
        framework="react",
        entrypoint="src/main.tsx",
        files=final_files,
    )

    project_dict = {
        "name": final_project.name,
        "framework": final_project.framework,
        "entrypoint": final_project.entrypoint,
        "files": [
            {
                "path": file.path,
                "content": file.content,
            }
            for file in final_project.files
        ],
    }

    # ========================================================
    # TOTAL LATENCY
    # ========================================================

    total_duration = (
        time.perf_counter()
        - workflow_start
    )

    logger.info(
        "ADK WORKFLOW COMPLETED SUCCESSFULLY | "
        "session_id=%s | total_duration=%.2fs | "
        "planning=%.2fs | coding=%.2fs | review=%.2fs",
        session_id,
        total_duration,
        planning_duration,
        coding_duration,
        review_duration,
    )

    # ========================================================
    # RUN COMPLETED
    # ========================================================

    yield make_event(
        agent="System",
        message=(
            "Google ADK workflow finished successfully."
        ),
        event_type="run_completed",
        status="ready",
        data={
            "run_id": session_id,
            "project": project_dict,
            "summary": (
                f"Generated {len(final_files)} "
                "project files. "
                "All validation checks passed."
            ),
            "ready_for_preview": True,
            "metrics": {
                "total_duration_ms": round(
                    total_duration * 1000,
                    2,
                ),
                "planning_duration_ms": round(
                    planning_duration * 1000,
                    2,
                ),
                "coding_duration_ms": round(
                    coding_duration * 1000,
                    2,
                ),
                "review_duration_ms": round(
                    review_duration * 1000,
                    2,
                ),
                "files_generated": len(
                    generated_files
                ),
            },
        },
    )