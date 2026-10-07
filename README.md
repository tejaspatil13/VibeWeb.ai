# VibeWeb.ai — Agentic AI Coding Agent

VibeWeb.ai is a web-based AI coding agent that accepts a developer task in natural language, understands a project, identifies relevant files, creates an implementation plan, generates or modifies code, reviews the changes, validates the result, and presents the updated project for preview.

The system uses a multi-agent workflow orchestrated with **Google ADK**, a **FastAPI** backend, a **React + Vite + TypeScript** frontend, and **OpenAI GPT-5.6**.

---

## 🚀 Features

- Natural-language coding requests
- Project/file workspace
- Multi-file project understanding
- Relevant-file identification
- AI-generated implementation plan
- Automated code generation and modification
- Code review before completion
- Validation/testing step
- Real-time agent activity using Server-Sent Events (SSE)
- Changed files and results displayed in the UI
- Live project preview
- Session/project state handling
- Deployed frontend and backend

---

## 🏗️ Architecture

```text
Developer
    |
    v
React + Vite Frontend
    |
    | HTTPS / REST / SSE
    v
FastAPI Backend
    |
    v
Google ADK Multi-Agent Workflow
    |
    +--> Analyzer Agent
    |       |
    |       +--> Understand task
    |       +--> Analyze project structure
    |       +--> Identify relevant files
    |
    +--> Planner Agent
    |       |
    |       +--> Create implementation plan
    |       +--> Determine required file changes
    |
    +--> Coder Agent
    |       |
    |       +--> Generate / modify code
    |       +--> Create files when required
    |
    +--> Reviewer Agent
    |       |
    |       +--> Review changes
    |       +--> Check code quality and consistency
    |
    +--> Validator Agent
            |
            +--> Run validation / tests
            +--> Check project result
            +--> Provide final status

                    |
                    v
              OpenAI GPT-5.6

                    |
                    v
          Updated Project / Preview
