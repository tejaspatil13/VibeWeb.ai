# adk_app/workflow/file_events.py

import json
import logging
import re
from typing import Any


logger = logging.getLogger("vibecode.file_events")


# ============================================================
# PUBLIC API
# ============================================================

def parse_coding_result(
    text: str,
) -> dict[str, Any] | None:
    """
    Parse the response returned by the Coding Agent.

    Expected response:

    {
        "summary": "Created a Todo application",
        "files": [
            {
                "path": "package.json",
                "content": "..."
            },
            {
                "path": "src/App.tsx",
                "content": "..."
            }
        ]
    }

    Supports:
        1. Raw JSON
        2. JSON inside ```json ... ```
        3. JSON embedded inside normal text
    """

    if not text:
        return None

    cleaned = text.strip()

    # ========================================================
    # 1. DIRECT JSON
    # ========================================================

    try:
        data = json.loads(cleaned)

        if isinstance(data, dict):
            result = _extract_files(data)

            if result is not None:
                logger.info(
                    "Coder JSON parsed successfully "
                    "from direct JSON response."
                )

                return result

    except json.JSONDecodeError:
        pass

    # ========================================================
    # 2. MARKDOWN JSON CODE BLOCK
    # ========================================================

    matches = re.findall(
        r"```(?:json)?\s*(\{.*?\})\s*```",
        cleaned,
        flags=re.DOTALL | re.IGNORECASE,
    )

    for match in matches:

        try:
            data = json.loads(match.strip())

            if isinstance(data, dict):
                result = _extract_files(data)

                if result is not None:
                    logger.info(
                        "Coder JSON parsed successfully "
                        "from markdown JSON block."
                    )

                    return result

        except json.JSONDecodeError:
            continue

    # ========================================================
    # 3. EMBEDDED JSON OBJECT
    # ========================================================

    json_text = _extract_balanced_json(cleaned)

    if json_text is not None:

        try:
            data = json.loads(json_text)

            if isinstance(data, dict):
                result = _extract_files(data)

                if result is not None:
                    logger.info(
                        "Coder JSON parsed successfully "
                        "from embedded JSON."
                    )

                    return result

        except json.JSONDecodeError as exc:

            logger.warning(
                "Embedded coder JSON could not be decoded: %s",
                exc,
            )

    # ========================================================
    # 4. PARSING FAILED
    # ========================================================

    logger.warning(
        "Could not parse coder JSON from response. "
        "Response preview: %s",
        cleaned[:1000],
    )

    return None


# ============================================================
# FILE EXTRACTION / VALIDATION
# ============================================================

def _extract_files(
    data: dict[str, Any],
) -> dict[str, Any] | None:
    """
    Validate the structure of the coder response.
    """

    files = data.get("files")

    if not isinstance(files, list):
        return None

    valid_files: list[dict[str, str]] = []

    for file_data in files:

        if not isinstance(file_data, dict):
            continue

        path = file_data.get("path")
        content = file_data.get("content")

        # Both path and content are required.
        if path is None:
            continue

        if content is None:
            continue

        path = str(path).strip()

        if not path:
            continue

        valid_files.append(
            {
                "path": path,
                "content": str(content),
            }
        )

    # A successful coding response must contain
    # at least one valid file.
    if not valid_files:
        return None

    return {
        "summary": str(
            data.get(
                "summary",
                "Code generated successfully.",
            )
        ),
        "files": valid_files,
    }


# ============================================================
# BALANCED JSON EXTRACTION
# ============================================================

def _extract_balanced_json(
    text: str,
) -> str | None:
    """
    Extract the first balanced JSON object from text.

    This is safer than:

        text.find("{")
        text.rfind("}")

    because generated source code contains many
    curly braces.

    Example:

        Here is the result:

        {
            "summary": "...",
            "files": [...]
        }

        Hope this helps.

    The function extracts only the JSON object.
    """

    start = text.find("{")

    if start == -1:
        return None

    depth = 0
    in_string = False
    escaped = False

    for index in range(
        start,
        len(text),
    ):

        char = text[index]

        # ----------------------------------------------------
        # Inside JSON string
        # ----------------------------------------------------

        if in_string:

            if escaped:
                escaped = False
                continue

            if char == "\\":
                escaped = True
                continue

            if char == '"':
                in_string = False

            continue

        # ----------------------------------------------------
        # Start JSON string
        # ----------------------------------------------------

        if char == '"':
            in_string = True
            continue

        # ----------------------------------------------------
        # Track object nesting
        # ----------------------------------------------------

        if char == "{":

            depth += 1

        elif char == "}":

            depth -= 1

            if depth == 0:

                return text[
                    start : index + 1
                ]

    return None