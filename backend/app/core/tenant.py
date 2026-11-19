"""
Tenant = which RAG system a request belongs to, decided by the subdomain.
  acme.localhost:8000   -> subdomain "acme"
  admin.localhost:8000  -> subdomain "admin" (super admin)
"""
from fastapi import HTTPException, Request

from app.core import registry
from app.settings import ADMIN_SUBDOMAIN, BASE_DOMAIN


def get_subdomain(request: Request):
    host = request.headers.get("host", "")
    host = host.split(":")[0].lower()          # remove port -> "acme.localhost"

    suffix = "." + BASE_DOMAIN                  # ".localhost"
    if not host.endswith(suffix):
        return None                             # e.g. plain "localhost"

    subdomain = host[: -len(suffix)]            # "acme"
    return subdomain or None


def require_admin_host(request: Request):
    """Admin API only works on admin.<BASE_DOMAIN>."""
    if get_subdomain(request) != ADMIN_SUBDOMAIN:
        raise HTTPException(status_code=404, detail="Not found")


def get_current_system(request: Request):
    """Return the config of the RAG system for this subdomain."""
    subdomain = get_subdomain(request)
    config = registry.find_by_subdomain(subdomain) if subdomain else None

    if config is None:
        raise HTTPException(status_code=404, detail="No RAG system at this address")
    if config["status"] != "running":
        raise HTTPException(status_code=503, detail="This service is currently unavailable")

    return config
