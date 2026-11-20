import os
from pathlib import Path

from dotenv import load_dotenv

# backend/ folder
BASE_DIR = Path(__file__).resolve().parent.parent

#load backend/.env into environment variables
load_dotenv(BASE_DIR / ".env")

#-------- RAG systems --------------
RAG_SYSTEMS_DIR = BASE_DIR / "rag_systems"
RAG_SYSTEMS_DIR.mkdir(exist_ok=True)
SYSTEM_SUBFOLDERS = ["documents", "vectordb", "logs"]

# -------- Domains --------------
BASE_DOMAIN = os.getenv("BASE_DOMAIN", "localhost")
ADMIN_SUBDOMAIN = os.getenv("ADMIN_SUBDOMAIN", "admin")

# ---------------- Admin Login ---------------------
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
SECRET_KEY = os.getenv("SECRET_KEY", "")
TOKEN_HOURS = int(os.getenv("TOKEN_HOURS", "12"))

# Stops early with a clear message if secrets are missing
if not ADMIN_PASSWORD or not SECRET_KEY:
  raise RuntimeError("Missing required secrets: ADMIN_PASSWORD and SECRET_KEY must be set")

# ----- Uploads -----
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "20"))

# ----- Embeddings -----
# Changing this later requires "Re-index all" for every system
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

# ----- LLM (OpenAI) -----
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "")

# Search results with a lower score are treated as "not relevant"
MIN_SCORE = float(os.getenv("MIN_SCORE", "0.3"))
