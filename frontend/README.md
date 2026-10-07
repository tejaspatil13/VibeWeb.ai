# AI Dev Studio — Frontend Prototype

This is the frontend vertical slice for the AI coding-agent assignment.

## What works now

- React + TypeScript + Vite
- Dark/light mode
- IDE-style layout
- Project file explorer
- Monaco code editor
- AI activity timeline
- Prompt composer
- Resizable left/editor/preview columns
- Resizable bottom agent/console area
- WebContainer integration for browser-side Node projects
- Runtime preview iframe
- Demo fallback that launches a small XO starter project

## What is intentionally stubbed

The backend agent is not included yet. `src/services/api.ts` defines the contract the future FastAPI + Google ADK backend should implement.

Expected endpoint:

`POST /api/agent/run`

Request:

```json
{
  "prompt": "Create a modern XO game",
  "project": null
}
```

Response:

```json
{
  "run_id": "run_123",
  "project": {
    "name": "xo-studio",
    "framework": "static",
    "entrypoint": "index.html",
    "files": [
      {
        "path": "index.html",
        "content": "<!doctype html>..."
      }
    ]
  },
  "events": [],
  "summary": "Created and validated the project."
}
```

## Run locally

```bash
npm install
npm run dev
```

The WebContainer runtime needs the browser to receive cross-origin isolation headers. Vite is configured with the required headers for local development.

## Next backend milestone

Implement:

1. FastAPI `/health`
2. FastAPI `/api/agent/run`
3. Google ADK supervisor
4. Prompt → structured project files
5. Return agent events, project metadata and files
6. Then connect those files to the existing WebContainer runtime.
