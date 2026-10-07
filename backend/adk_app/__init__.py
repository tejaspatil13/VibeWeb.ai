# adk_app/__init__.py
"""
Google ADK App package for VibeCode.ai.
Exports root_agent and app for ADK Web CLI compatibility.
"""

from .agent import (
    root_agent,
    app,
    full_workflow,
    planning_workflow,
    coding_workflow,
    review_workflow,
    planning_app,
    coding_app,
    review_app,
)

__all__ = [
    "root_agent",
    "app",
    "full_workflow",
    "planning_workflow",
    "coding_workflow",
    "review_workflow",
    "planning_app",
    "coding_app",
    "review_app",
]
