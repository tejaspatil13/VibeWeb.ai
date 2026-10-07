# adk_app/workflow/approval.py

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timezone


logger = logging.getLogger(
    "vibecode.approval"
)


# ============================================================
# APPROVAL TYPES
# ============================================================


PLAN_APPROVAL = "plan_approval"

BUILD_APPROVAL = "build_approval"


# ============================================================
# APPROVAL STATE
# ============================================================


@dataclass
class ApprovalRequest:

    run_id: str

    approval_type: str

    message: str

    status: str = "pending"

    created_at: str = ""

    resolved_at: str | None = None

    approved_by: str | None = None

    reason: str | None = None

    event: asyncio.Event | None = None

    def __post_init__(self):

        if not self.created_at:

            self.created_at = (
                datetime.now(
                    timezone.utc
                ).isoformat()
            )

        if self.event is None:

            self.event = asyncio.Event()


# ============================================================
# IN-MEMORY APPROVAL STORE
# ============================================================

_pending_approvals: dict[
    str,
    ApprovalRequest
] = {}


# ============================================================
# CREATE APPROVAL
# ============================================================


def create_approval(
    run_id: str,
    approval_type: str,
    message: str,
) -> ApprovalRequest:

    approval = ApprovalRequest(
        run_id=run_id,

        approval_type=approval_type,

        message=message,
    )

    key = make_key(
        run_id,
        approval_type,
    )

    _pending_approvals[key] = approval

    logger.info(
        "APPROVAL CREATED | run_id=%s | type=%s",
        run_id,
        approval_type,
    )

    return approval


# ============================================================
# KEY
# ============================================================


def make_key(
    run_id: str,
    approval_type: str,
) -> str:

    return (
        f"{run_id}:{approval_type}"
    )


# ============================================================
# GET APPROVAL
# ============================================================


def get_approval(
    run_id: str,
    approval_type: str,
) -> ApprovalRequest | None:

    return _pending_approvals.get(
        make_key(
            run_id,
            approval_type,
        )
    )


# ============================================================
# RESOLVE APPROVAL
# ============================================================


def resolve_approval(
    run_id: str,
    approval_type: str,
    approved: bool,
    approved_by: str = "user",
    reason: str | None = None,
) -> ApprovalRequest | None:

    approval = get_approval(
        run_id,
        approval_type,
    )

    if approval is None:

        return None

    if approval.status != "pending":

        return approval

    approval.status = (
        "approved"
        if approved
        else "rejected"
    )

    approval.approved_by = (
        approved_by
    )

    approval.reason = reason

    approval.resolved_at = (
        datetime.now(
            timezone.utc
        ).isoformat()
    )

    if approval.event:

        approval.event.set()

    logger.info(
        "APPROVAL RESOLVED | "
        "run_id=%s | type=%s | status=%s",

        run_id,

        approval_type,

        approval.status,
    )

    return approval


# ============================================================
# WAIT FOR APPROVAL
# ============================================================


async def wait_for_approval(
    run_id: str,
    approval_type: str,
    timeout_seconds: int | None = None,
) -> ApprovalRequest:

    approval = get_approval(
        run_id,
        approval_type,
    )

    if approval is None:

        raise RuntimeError(
            "Approval request does not exist."
        )

    if approval.status != "pending":

        return approval

    logger.info(
        "WAITING FOR APPROVAL | "
        "run_id=%s | type=%s",

        run_id,

        approval_type,
    )

    if approval.event is None:

        raise RuntimeError(
            "Approval event is not initialized."
        )

    try:

        if timeout_seconds:

            await asyncio.wait_for(
                approval.event.wait(),
                timeout=timeout_seconds,
            )

        else:

            await approval.event.wait()

    except asyncio.TimeoutError:

        approval.status = "timeout"

        approval.resolved_at = (
            datetime.now(
                timezone.utc
            ).isoformat()
        )

        logger.warning(
            "APPROVAL TIMEOUT | "
            "run_id=%s | type=%s",

            run_id,

            approval_type,
        )

    return approval


# ============================================================
# DELETE APPROVAL
# ============================================================


def delete_approval(
    run_id: str,
    approval_type: str,
) -> None:

    key = make_key(
        run_id,
        approval_type,
    )

    _pending_approvals.pop(
        key,
        None,
    )


# ============================================================
# GET ALL APPROVALS FOR RUN
# ============================================================


def get_run_approvals(
    run_id: str,
) -> list[ApprovalRequest]:

    prefix = f"{run_id}:"

    return [
        approval

        for key, approval
        in _pending_approvals.items()

        if key.startswith(prefix)
    ]


# ============================================================
# SERIALIZE APPROVAL
# ============================================================


def approval_to_dict(
    approval: ApprovalRequest | None,
) -> dict | None:

    if approval is None:

        return None

    return {
        "run_id": approval.run_id,

        "approval_type": (
            approval.approval_type
        ),

        "message": approval.message,

        "status": approval.status,

        "created_at": (
            approval.created_at
        ),

        "resolved_at": (
            approval.resolved_at
        ),

        "approved_by": (
            approval.approved_by
        ),

        "reason": approval.reason,
    }