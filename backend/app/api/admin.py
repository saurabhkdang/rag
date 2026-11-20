from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core import registry
from app.core.auth import check_password, create_token, require_admin
from app.core.tenant import require_admin_host

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
    name: str | None = None
    system_prompt: str | None = None
    chunk_size: int | None = Field(default=None, ge=100, le=5000)    # ge = >=, le = <=
    chunk_overlap: int | None = Field(default=None, ge=0, le=1000)
    top_k: int | None = Field(default=None, ge=1, le=20)
    features: dict | None = None


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
    registry.archive_system(system_id)
    return {"archived": system_id}
