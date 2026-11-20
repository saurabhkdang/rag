"""
Registry = manages RAG system folders.
Each RAG system is a folder in rag_systems/ with a config.json file.
"""
import copy
import json
import re
import shutil
from datetime import datetime

from app.settings import RAG_SYSTEMS_DIR, SYSTEM_SUBFOLDERS, ADMIN_SUBDOMAIN

# Allowed format for system IDs and subdomains: lowercase letters, numbers, dashes
SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{1,30}$")

VALID_STATUSES = ("running", "stopped")

# Subdomains no client is allowed to use
RESERVED_SUBDOMAINS = {ADMIN_SUBDOMAIN, "www", "api"}

# Every new RAG system starts with this config
DEFAULT_CONFIG = {
    "id": "",
    "name": "",
    "subdomain": "",
    "status": "stopped",          # new systems start stopped
    "created_at": "",
    "system_prompt": "You are a helpful assistant. Answer only from the given context.",
    "chunk_size": 500,
    "chunk_overlap": 50,
    "top_k": 4,
    "features": {
        "citations": False,
        "chat_memory": False,
    },
}


# ---------- helpers ----------

def _folder(system_id):
    return RAG_SYSTEMS_DIR / system_id


def _config_path(system_id):
    return _folder(system_id) / "config.json"


def _validate_slug(value, label):
    if not SLUG_PATTERN.match(value):
        raise ValueError(
            f"Invalid {label} '{value}'. Use lowercase letters, numbers and dashes (2-31 chars)."
        )


# ---------- read ----------

def documents_dir(system_id):
    """Folder where a system's uploaded files are stored."""
    return _folder(system_id) / "documents"

def load_system(system_id):
    """Return the config dict of one system, or None if it doesn't exist."""
    path = _config_path(system_id)
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def list_systems():
    """Return configs of all systems (folders starting with '_' are ignored)."""
    systems = []
    for folder in sorted(RAG_SYSTEMS_DIR.iterdir()):
        if folder.is_dir() and not folder.name.startswith("_"):
            config = load_system(folder.name)
            if config:
                systems.append(config)
    return systems


def find_by_subdomain(subdomain):
    """Find which system a subdomain belongs to."""
    for config in list_systems():
        if config["subdomain"] == subdomain:
            return config
    return None


# ---------- write ----------

def save_system(config):
    """Save config.json safely: write to a temp file first, then replace."""
    path = _config_path(config["id"])
    temp_path = path.with_suffix(".tmp")
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)
    temp_path.replace(path)


def create_system(system_id, name, subdomain=None):
    """Create a new RAG system folder with default config."""
    subdomain = subdomain or system_id
    _validate_slug(system_id, "system id")
    _validate_slug(subdomain, "subdomain")

    if subdomain in RESERVED_SUBDOMAINS:
      raise ValueError(f"Subdomain '{subdomain}' is reserved.")

    if _folder(system_id).exists():
        raise ValueError(f"System '{system_id}' already exists.")
    if find_by_subdomain(subdomain):
        raise ValueError(f"Subdomain '{subdomain}' is already used.")

    # Create folder + sub-folders
    for sub in SYSTEM_SUBFOLDERS:
        (_folder(system_id) / sub).mkdir(parents=True)

    config = copy.deepcopy(DEFAULT_CONFIG)  # deepcopy so systems don't share the same dict
    config["id"] = system_id
    config["name"] = name
    config["subdomain"] = subdomain
    config["created_at"] = datetime.now().isoformat(timespec="seconds")

    save_system(config)
    return config


def set_status(system_id, status):
    """Run or stop a system."""
    if status not in VALID_STATUSES:
        raise ValueError(f"Status must be one of {VALID_STATUSES}")
    config = load_system(system_id)
    if config is None:
        raise ValueError(f"System '{system_id}' not found.")
    config["status"] = status
    save_system(config)
    return config


def start_system(system_id):
    return set_status(system_id, "running")


def stop_system(system_id):
    return set_status(system_id, "stopped")


def update_system(system_id, changes):
    """Update some fields of a config (e.g. name, system_prompt, features)."""
    config = load_system(system_id)
    if config is None:
        raise ValueError(f"System '{system_id}' not found.")
    protected = {"id", "created_at"}  # these must never change
    for key, value in changes.items():
        if key not in protected:
            config[key] = value
    save_system(config)
    return config


def archive_system(system_id):
    """'Delete' safely: rename folder to _archived_<id>_<time> instead of removing it."""
    folder = _folder(system_id)
    if not folder.exists():
        raise ValueError(f"System '{system_id}' not found.")
    stamp = datetime.now().strftime("%Y%m%d%H%M%S")
    shutil.move(str(folder), str(RAG_SYSTEMS_DIR / f"_archived_{system_id}_{stamp}"))
