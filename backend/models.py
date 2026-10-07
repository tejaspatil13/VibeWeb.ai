from pydantic import BaseModel, Field


# ============================================================
# PROJECT
# ============================================================


class ProjectFile(BaseModel):
    path: str
    content: str


class ProjectSnapshot(BaseModel):
    name: str = "workspace"

    framework: str = "unknown"

    entrypoint: str | None = None

    files: list[ProjectFile] = Field(
        default_factory=list
    )


# ============================================================
# AGENT REQUEST
# ============================================================


class AgentRunRequest(BaseModel):

    prompt: str = Field(
        min_length=1,
        description=(
            "Natural-language coding request"
        ),
    )

    project: ProjectSnapshot | None = None


# ============================================================
# SUPERVISOR
# ============================================================


class SupervisorDecision(BaseModel):

    task_type: str

    description: str

    framework: str

    language: str

    existing_project: bool

    next_step: str


# ============================================================
# ANALYST
# ============================================================


class AnalystResult(BaseModel):

    project_type: str

    framework: str

    language: str

    entrypoint: str | None = None

    relevant_files: list[str] = Field(
        default_factory=list
    )

    dependencies: list[str] = Field(
        default_factory=list
    )

    architecture_summary: str


# ============================================================
# PLANNER
# ============================================================


class PlanStep(BaseModel):

    step: int

    description: str

    files_to_create: list[str] = Field(
        default_factory=list
    )

    files_to_modify: list[str] = Field(
        default_factory=list
    )


class ProjectPlan(BaseModel):

    goal: str

    framework: str

    language: str

    steps: list[PlanStep] = Field(
        default_factory=list
    )

    files_to_create: list[str] = Field(
        default_factory=list
    )

    files_to_modify: list[str] = Field(
        default_factory=list
    )


# ============================================================
# CODER
# ============================================================


class GeneratedFile(BaseModel):

    path: str

    content: str


class CodingResult(BaseModel):

    summary: str

    files: list[GeneratedFile] = Field(
        default_factory=list
    )


# ============================================================
# VALIDATOR
# ============================================================


class ValidationResult(BaseModel):

    passed: bool

    command: str | None = None

    output: str = ""

    errors: list[str] = Field(
        default_factory=list
    )

    warnings: list[str] = Field(
        default_factory=list
    )

    exit_code: int | None = None

    duration_ms: float | None = None


# ============================================================
# REVIEWER
# ============================================================


class ReviewResult(BaseModel):

    approved: bool

    summary: str

    issues: list[str] = Field(
        default_factory=list
    )

    suggestions: list[str] = Field(
        default_factory=list
    )


# ============================================================
# HUMAN APPROVAL
# ============================================================


class ApprovalRequest(BaseModel):

    run_id: str

    approval_type: str

    message: str

    status: str = "pending"

    created_at: str | None = None

    resolved_at: str | None = None

    approved_by: str | None = None

    reason: str | None = None


class ApprovalResponse(BaseModel):

    run_id: str

    approval_type: str

    approved: bool

    approved_by: str = "user"

    reason: str | None = None


# ============================================================
# AGENT EVENTS
# ============================================================


class AgentEvent(BaseModel):

    id: str | None = None

    agent: str

    message: str

    status: str = "running"

    type: str = "agent"

    path: str | None = None

    data: dict | None = None


# ============================================================
# AGENT RUN RESPONSE
# ============================================================


class AgentRunResponse(BaseModel):

    run_id: str

    summary: str

    project: ProjectSnapshot

    events: list[AgentEvent] = Field(
        default_factory=list
    )

    validation: ValidationResult | None = None

    review: ReviewResult | None = None

    ready_for_preview: bool = False