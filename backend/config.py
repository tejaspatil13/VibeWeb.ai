import os

from dotenv import load_dotenv


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()


# ============================================================
# OPENAI
# ============================================================

OPENAI_API_KEY = os.getenv(
    "OPENAI_API_KEY"
)

OPENAI_MODEL = os.getenv(
    "OPENAI_MODEL",
    "openai/gpt-5.6",
)


# ============================================================
# FRONTEND
# ============================================================

FRONTEND_ORIGIN = os.getenv(
    "FRONTEND_ORIGIN",
    "http://localhost:5173",
)


# ============================================================
# VALIDATION
# ============================================================

if not OPENAI_API_KEY:

    raise RuntimeError(
        "OPENAI_API_KEY is not set. "
        "Create a .env file in the backend directory."
    )


# LiteLLM uses this environment variable
# when ADK calls the OpenAI model.

os.environ[
    "OPENAI_API_KEY"
] = OPENAI_API_KEY