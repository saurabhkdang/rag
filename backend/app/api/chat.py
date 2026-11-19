from fastapi import APIRouter, Depends

from app.core.tenant import get_current_system

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.get("/info")
def system_info(system: dict = Depends(get_current_system)):
    # Only return safe, public info (never the full config)
    return {
        "name": system["name"],
        "features": system["features"],
    }
