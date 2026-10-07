import json
import logging
import time
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from config import FRONTEND_ORIGIN

from models import (
    AgentEvent,
    AgentRunRequest,
    AgentRunResponse,
    ApprovalResponse,
    ProjectSnapshot,
)

from adk_app.workflow.runner import (
    run_adk_workflow,
    get_session_memory,
)

from adk_app.workflow.approval import (
    get_approval,
    resolve_approval,
    approval_to_dict,
)


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format=(
        "%(asctime)s | "
        "%(levelname)s | "
        "%(name)s | "
        "%(message)s"
    ),
)

logger = logging.getLogger("vibecode")


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="VibeCode.ai",
    version="1.0.0",
    description=(
        "Production-style AI coding agent "
        "using Google ADK with OpenAI models"
    ),
)




# ============================================================
# CORS
# ============================================================

ALLOWED_ORIGINS = [
    FRONTEND_ORIGIN,
    "https://vibe-web-ai.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# REQUEST LOGGING
# ============================================================

@app.middleware("http")
async def request_logger(
    request: Request,
    call_next,
):
    start_time = time.perf_counter()

    logger.info(
        "REQUEST START | method=%s | path=%s",
        request.method,
        request.url.path,
    )

    try:
        response = await call_next(request)

        duration = (
            time.perf_counter()
            - start_time
        )

        logger.info(
            "REQUEST END | method=%s | "
            "path=%s | status=%s | "
            "duration=%.3fs",
            request.method,
            request.url.path,
            response.status_code,
            duration,
        )

        return response

    except Exception:
        duration = (
            time.perf_counter()
            - start_time
        )

        logger.exception(
            "REQUEST FAILED | method=%s | "
            "path=%s | duration=%.3fs",
            request.method,
            request.url.path,
            duration,
        )

        raise


# ============================================================
# GLOBAL ERROR HANDLER
# ============================================================

@app.exception_handler(Exception)
async def global_exception_handler(
    request: Request,
    exc: Exception,
):
    logger.exception(
        "UNHANDLED EXCEPTION | method=%s | path=%s",
        request.method,
        request.url.path,
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
        },
    )


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "vibecode-backend",
        "agent_framework": "google-adk",
        "model_provider": "openai",
    }


# ============================================================
# STREAMING AGENT ENDPOINT
# ============================================================

@app.post("/api/agent/run/stream")
async def run_agent_stream(
    request: AgentRunRequest,
):
    run_id = f"run_{uuid4().hex[:12]}"

    logger.info("=" * 70)

    logger.info(
        "ADK RUN START | run_id=%s",
        run_id,
    )

    logger.info(
        "PROMPT | %s",
        request.prompt,
    )

    if request.project:
        logger.info(
            "PROJECT | name=%s | framework=%s | files=%s",
            request.project.name,
            request.project.framework,
            len(request.project.files),
        )

    async def event_generator():

        # ----------------------------------------------------
        # RUN STARTED
        # ----------------------------------------------------

        yield (
            "event: run_started\n"
            f"data:{json.dumps({
                'run_id': run_id,
                'message': 'Google ADK workflow started',
            })}\n\n"
        )

        try:

            # ------------------------------------------------
            # ADK WORKFLOW
            # ------------------------------------------------

            async for event in run_adk_workflow(
                prompt=request.prompt,
                session_id=run_id,
                project=request.project,
            ):

                payload = {
                    "run_id": run_id,
                    **event,
                }

                event_type = (
                    "run_completed"
                    if event.get("type") == "run_completed"
                    else "agent_update"
                )

                yield (
                    f"event: {event_type}\n"
                    f"data: {json.dumps(payload)}\n\n"
                )

        except Exception as exc:

            logger.exception(
                "ADK RUN FAILED | run_id=%s",
                run_id,
            )

            yield (
                "event: error\n"
                f"data: {json.dumps({
                    'run_id': run_id,
                    'message': str(exc),
                    'status': 'failed',
                })}\n\n"
            )

        logger.info(
            "ADK RUN COMPLETE | run_id=%s",
            run_id,
        )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ============================================================
# NON-STREAMING AGENT ENDPOINT
# ============================================================

@app.post(
    "/api/agent/run",
    response_model=AgentRunResponse,
)
async def run_agent(
    request: AgentRunRequest,
):

    run_id = f"run_{uuid4().hex[:12]}"

    events: list[AgentEvent] = []

    try:

        async for event in run_adk_workflow(
            prompt=request.prompt,
            session_id=run_id,
            project=request.project,
        ):

            events.append(
                AgentEvent(
                    agent=event.get(
                        "agent",
                        "system",
                    ),
                    message=event.get(
                        "message",
                        "",
                    ),
                    status=event.get(
                        "status",
                        "running",
                    ),
                    type=event.get(
                        "type",
                        "agent",
                    ),
                    path=event.get(
                        "path"
                    ),
                    data=event.get(
                        "data"
                    ),
                )
            )

        # ----------------------------------------------------
        # TEMPORARY PROJECT FALLBACK
        # ----------------------------------------------------

        project = (
            request.project
            or ProjectSnapshot(
                name="generated-project",
                framework="react",
                entrypoint="src/main.tsx",
                files=[],
            )
        )

        return AgentRunResponse(
            run_id=run_id,
            summary=(
                "Google ADK workflow completed."
            ),
            project=project,
            events=events,
            ready_for_preview=False,
        )

    except Exception:

        logger.exception(
            "ADK RUN FAILED | run_id=%s",
            run_id,
        )

        raise


# ============================================================
# GET APPROVAL STATUS
# ============================================================

@app.get(
    "/api/agent/{run_id}/approval"
)
async def get_agent_approval(
    run_id: str,
    approval_type: str,
):

    approval = get_approval(
        run_id=run_id,
        approval_type=approval_type,
    )

    if approval is None:

        return JSONResponse(
            status_code=404,
            content={
                "error": (
                    "Approval request not found"
                ),
                "run_id": run_id,
                "approval_type": approval_type,
            },
        )

    return approval_to_dict(
        approval
    )


# ============================================================
# RESOLVE HUMAN APPROVAL
# ============================================================

@app.post(
    "/api/agent/{run_id}/approval"
)
async def submit_approval(
    run_id: str,
    request: ApprovalResponse,
):

    logger.info(
        "APPROVAL REQUEST | run_id=%s | "
        "type=%s | approved=%s",
        run_id,
        request.approval_type,
        request.approved,
    )

    # --------------------------------------------------------
    # Verify run ID
    # --------------------------------------------------------

    if request.run_id != run_id:

        raise HTTPException(
            status_code=400,
            detail=(
                "run_id in URL and request body "
                "do not match."
            ),
        )

    # --------------------------------------------------------
    # Find pending approval
    # --------------------------------------------------------

    approval = get_approval(
        run_id=run_id,
        approval_type=request.approval_type,
    )

    if approval is None:

        raise HTTPException(
            status_code=404,
            detail=(
                f"No pending approval found for "
                f"run_id={run_id}, "
                f"approval_type={request.approval_type}"
            ),
        )

    # --------------------------------------------------------
    # Resolve approval
    # --------------------------------------------------------

    resolve_approval(
        run_id=run_id,
        approval_type=request.approval_type,
        approved=request.approved,
        approved_by=request.approved_by,
        reason=request.reason,
    )

    logger.info(
        "APPROVAL RESOLVED | run_id=%s | "
        "type=%s | approved=%s",
        run_id,
        request.approval_type,
        request.approved,
    )

    return {
        "success": True,
        "run_id": run_id,
        "approval_type": request.approval_type,
        "approved": request.approved,
    }


# ============================================================
# ADK SESSION MEMORY ENDPOINT
# ============================================================

@app.get("/api/agent/session/{session_id}/memory")
async def get_session_memory_route(
    session_id: str,
):
    """
    Returns the Google ADK Session Memory & state history.
    """
    return await get_session_memory(session_id)