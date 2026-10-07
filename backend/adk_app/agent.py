from google.adk.agents.sequential_agent import SequentialAgent
from google.adk.apps import App

from .agents.planner import planner_agent
from .agents.coder import coder_agent
from .agents.validator import validator_agent
from .agents.reviewer import reviewer_agent


# ============================================================
# PHASE 1 — PLANNING
# ============================================================
# One Planning Agent now performs:
#
# - requirement analysis
# - project analysis
# - architecture decisions
# - implementation planning
#
# This reduces the planning phase from 3 LLM calls to 1.
# ============================================================

planning_workflow = SequentialAgent(
    name="planning_workflow",
    description=(
        "Analyze the user's coding request and existing project, "
        "then create a concrete implementation plan."
    ),
    sub_agents=[
        planner_agent,
    ],
)


# ============================================================
# PHASE 2 — CODING + VALIDATION
# ============================================================

coding_workflow = SequentialAgent(
    name="coding_workflow",
    description=(
        "Implement the approved coding plan and validate the "
        "generated project."
    ),
    sub_agents=[
        coder_agent,
        validator_agent,
    ],
)


# ============================================================
# PHASE 3 — REVIEW
# ============================================================

review_workflow = SequentialAgent(
    name="review_workflow",
    description=(
        "Review the completed implementation and determine "
        "whether it is ready for preview."
    ),
    sub_agents=[
        reviewer_agent,
    ],
)


# ============================================================
# GOOGLE ADK APPS
# ============================================================

planning_app = App(
    name="vibecode_planning",
    root_agent=planning_workflow,
)


coding_app = App(
    name="vibecode_coding",
    root_agent=coding_workflow,
)


review_app = App(
    name="vibecode_review",
    root_agent=review_workflow,
)


# ============================================================
# FULL PIPELINE
# ============================================================

full_workflow = SequentialAgent(
    name="vibecode_full_workflow",
    description=(
        "Full end-to-end coding workflow: "
        "Planning -> Coding -> Review"
    ),
    sub_agents=[
        planning_workflow,
        coding_workflow,
        review_workflow,
    ],
)


root_agent = full_workflow


app = App(
    name="vibecode",
    root_agent=root_agent,
)