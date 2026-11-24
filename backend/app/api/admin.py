from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core import registry, chatlog
from app.core.auth import check_password, create_token, require_admin
from app.core.tenant import require_admin_host
from app.rag import vectorstore
from app.features import catalog, validate_features

# Every route in this file only works on admin.<BASE_DOMAIN>
router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin_host)],
)

# Add this to routes that need login
ADMIN_ONLY = [Depends(require_admin)]


# ---------- request bodies ----------

class LoginRequest(BaseModel):
    password: str


class CreateSystemRequest(BaseModel):
    id: str
    name: str
    subdomain: str | None = None


class UpdateSystemRequest(BaseModel):
    # All optional: send only what you want to change
    name: str | None = Field(default=None, min_length=1, max_length=100)
    welcome_message: str | None = Field(default=None, max_length=500)
    system_prompt: str | None = Field(default=None, min_length=1, max_length=4000)
    chunk_size: int | None = Field(default=None, ge=100, le=2000)    # ge = >=, le = <=
    chunk_overlap: int | None = Field(default=None, ge=0, le=1000)
    top_k: int | None = Field(default=None, ge=1, le=20)
    features: dict[str, bool] | None = None   # only the flags you want to change


# ---------- helpers ----------

def _get_or_404(system_id):
    # Validate first, so nobody can pass something like "../secret"
    if not registry.SLUG_PATTERN.match(system_id):
        raise HTTPException(status_code=400, detail="Invalid system id")
    config = registry.load_system(system_id)
    if config is None:
        raise HTTPException(status_code=404, detail="System not found")
    return config


# ---------- routes ----------

@router.post("/login")
def login(body: LoginRequest):
    if not check_password(body.password):
        raise HTTPException(status_code=401, detail="Wrong password")
    return {"token": create_token()}


@router.get("/systems", dependencies=ADMIN_ONLY)
def list_systems():
    return registry.list_systems()


@router.post("/systems", dependencies=ADMIN_ONLY)
def create_system(body: CreateSystemRequest):
    try:
        return registry.create_system(body.id, body.name, body.subdomain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/systems/{system_id}", dependencies=ADMIN_ONLY)
def get_system(system_id: str):
    return _get_or_404(system_id)


@router.patch("/systems/{system_id}", dependencies=ADMIN_ONLY)
def update_system(system_id: str, body: UpdateSystemRequest):
    config = _get_or_404(system_id)
    changes = body.model_dump(exclude_none=True)  # only fields that were sent

    # Check the combination: use the new value if sent, otherwise the current one
    chunk_size = changes.get("chunk_size", config["chunk_size"])
    chunk_overlap = changes.get("chunk_overlap", config["chunk_overlap"])
    if chunk_overlap >= chunk_size:
        raise HTTPException(status_code=400, detail="chunk_overlap must be smaller than chunk_size")

    if "features" in changes:
        try:
            validate_features(changes["features"])
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        # MERGE: only the flags that were sent change; all others keep their value
        changes["features"] = {**config.get("features", {}), **changes["features"]}

    return registry.update_system(system_id, changes)


@router.post("/systems/{system_id}/start", dependencies=ADMIN_ONLY)
def start_system(system_id: str):
    _get_or_404(system_id)
    return registry.start_system(system_id)


@router.post("/systems/{system_id}/stop", dependencies=ADMIN_ONLY)
def stop_system(system_id: str):
    _get_or_404(system_id)
    return registry.stop_system(system_id)


@router.delete("/systems/{system_id}", dependencies=ADMIN_ONLY)
def archive_system(system_id: str):
    _get_or_404(system_id)
    vectorstore.close(system_id)  # release ChromaDB files first (Windows locks open files)
    registry.archive_system(system_id)
    return {"archived": system_id}

@router.get("/features", dependencies=ADMIN_ONLY)
def list_features():
    return catalog()

@router.get("/systems/{system_id}/logs", dependencies=ADMIN_ONLY)
def get_logs(
    system_id: str,
    filter: Literal["all", "up", "down", "unanswered"] = "all",
    limit: int = Query(default=100, ge=1, le=500),
):
    _get_or_404(system_id)
    entries = chatlog.all_entries(system_id)

    if filter in ("up", "down"):
        entries = [e for e in entries if e["rating"] == filter]
    elif filter == "unanswered":
        entries = [e for e in entries if not e.get("found") and not e.get("error")]

    return entries[:limit]


@router.get("/systems/{system_id}/usage", dependencies=ADMIN_ONLY)
def get_usage(system_id: str):
    _get_or_404(system_id)
    return chatlog.usage_by_month(system_id)