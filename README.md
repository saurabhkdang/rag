# RAG Platform

A platform for running **many separate RAG chat assistants** (Retrieval-Augmented Generation) from one codebase, one per client.

A super admin creates a RAG system for each client, uploads that client's documents, chooses which features it gets, and starts or stops it. Each system has its **own subdomain** and its **own folder**, so clients' data never mixes:

```
admin.example.com   → super admin panel (create systems, upload documents, settings, logs)
acme.example.com    → chat assistant answering from Acme's documents only
globex.example.com  → chat assistant answering from Globex's documents only
```

---

## Features

**Platform**
- Multi-tenant by subdomain: the `Host` header decides which system answers
- Folder per system: config, documents, vector database and logs in `backend/rag_systems/<id>/`
- Create, start, stop and archive systems from the admin panel (archiving renames the folder; nothing is deleted)
- Per-system settings: name, welcome message, system prompt, chunk size and overlap, top-k
- Password-protected admin with signed, expiring tokens

**Documents**
- Upload PDF, TXT and Markdown files (max 20 MB)
- Index, re-index and delete per document, or re-index everything
- Chunk preview and a search tester showing scores and match type

**Per-system feature toggles** (the feature catalog in `backend/app/features/`)

| Feature | What it does | Default |
|---|---|---|
| Hybrid search | Meaning-based (vector) + keyword (BM25) search, merged with Reciprocal Rank Fusion. Much better for names, numbers and IDs. | on |
| Contextual chunks | At indexing time, an LLM writes a short description of each chunk, which improves results on forms and tables. Needs a re-index. | on |
| Citations | Show the source file and page under each answer | off |
| Chat memory | Follow-up questions ("and its premium?") are rewritten into standalone questions using recent messages | off |
| Answer feedback | 👍/👎 under answers, visible on the admin Logs page | on |

**Logs and usage**
- Every question is logged per system (JSON Lines, one file per month)
- Tokens and estimated cost per question and per month
- Unanswered questions and 👎 answers can be filtered on the admin Logs page

---

## Tech stack

| Part | Technology |
|---|---|
| Backend | Python 3.12+, FastAPI, Uvicorn |
| Vector database | ChromaDB (one persistent database per system) |
| Embeddings | sentence-transformers, `BAAI/bge-small-en-v1.5` (runs locally) |
| Keyword search | rank-bm25 |
| LLM | OpenAI API (Chat Completions) |
| PDF reading | pypdf |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, React Router |

There's no separate database server. Configs and logs are plain JSON files.

---

## How a question is answered

```
question ─► (chat memory on?) rewrite follow-up into a standalone question
         ─► retrieve chunks: vector search (+ BM25 keyword search if hybrid) ─► merge (RRF)
         ─► nothing relevant? → "I couldn't find information…" (no LLM call)
         ─► prompt = system prompt + rules + numbered context chunks + question
         ─► LLM answer (or NOT_FOUND → "I couldn't find information…")
         ─► log question, answer, tokens, cost
```

Indexing a document: **load** (per page) → **chunk** (word boundaries, with overlap) → **describe** each chunk (if contextual chunks is on) → **embed** → store in ChromaDB.

---

## Project structure

```
rag/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, routers, /api/health
│   │   ├── settings.py        # reads backend/.env
│   │   ├── api/               # HTTP routes: admin, documents, chat
│   │   ├── core/              # registry (system folders), auth, tenant (subdomain), chat log
│   │   ├── features/          # feature catalog: defaults, validation, admin UI
│   │   └── rag/               # loader, chunker, contextualizer, embedder, vectorstore,
│   │                          # keyword_search, retriever, llm, pipeline, ingest
│   ├── rag_systems/           # one folder per client system (NOT in git)
│   │   └── <id>/
│   │       ├── config.json
│   │       ├── documents/
│   │       ├── vectordb/
│   │       └── logs/          # chat-YYYY-MM.jsonl, feedback.jsonl
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── admin/             # admin panel pages
    │   ├── chat/              # public chat
    │   ├── components/        # shared UI pieces
    │   ├── api.ts             # all backend calls
    │   ├── config.ts          # domain / subdomain helpers
    │   └── types.ts
    └── vite.config.ts         # dev server + /api proxy to the backend
```

One React app serves both sides: on `admin.<domain>` it shows the admin panel, and on any other subdomain it shows the chat.

---

## Local setup

**Requirements:** Python 3.12+, Node.js 22+, an OpenAI API key.

### 1. Backend

```powershell
cd backend
python -m venv ..\.venv
..\.venv\Scripts\activate          # macOS/Linux: source ../.venv/bin/activate
pip install -r requirements.txt
copy .env.example .env             # macOS/Linux: cp .env.example .env
```

Fill in `backend/.env`:

| Variable | Example | Meaning |
|---|---|---|
| `ADMIN_PASSWORD` | *(choose one)* | Super admin login password |
| `SECRET_KEY` | *(random, long)* | Signs admin tokens. Generate with `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `BASE_DOMAIN` | `localhost` | Domain the subdomains hang under |
| `ADMIN_SUBDOMAIN` | `admin` | Subdomain of the admin panel |
| `TOKEN_HOURS` | `12` | How long an admin login lasts |
| `OPENAI_API_KEY` | `sk-...` | OpenAI key (backend only, never in the frontend) |
| `OPENAI_MODEL` | *(model name)* | Model used for answers and chunk descriptions |
| `MIN_SCORE` | `0.3` | Minimum vector similarity for a chunk to count as relevant |
| `EMBEDDING_MODEL` | `BAAI/bge-small-en-v1.5` | Local embedding model (downloaded on first use) |
| `EMBEDDING_QUERY_PREFIX` | `Represent this sentence for searching relevant passages: ` | Prefix added to search queries (required by bge models) |
| `PRICE_INPUT_PER_1M` | `0.80` | USD per 1M input tokens for your model (cost tracking only) |
| `PRICE_OUTPUT_PER_1M` | `3.20` | USD per 1M output tokens |

Start the backend from the `backend` folder:

```powershell
uvicorn app.main:app --reload
```

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

### 3. Open it

`*.localhost` subdomains work in modern browsers without any hosts-file changes.

1. Go to **http://admin.localhost:5173** and log in with `ADMIN_PASSWORD`
2. Create a system, e.g. id `acme`
3. Open it, upload documents, and click **Index**
4. Click **Start**
5. Go to **http://acme.localhost:5173** and ask questions

The Vite dev server forwards `/api` to the backend on port 8000 and keeps the original `Host` header, so the backend knows which system is asking.

**API docs (Swagger):** http://admin.localhost:8000/docs for admin routes, or http://acme.localhost:8000/docs for a system's chat routes.

---

## API overview

| Area | Route | Notes |
|---|---|---|
| Health | `GET /api/health` | |
| Admin | `POST /api/admin/login` | returns a token |
| | `GET, POST /api/admin/systems` | list / create |
| | `GET, PATCH, DELETE /api/admin/systems/{id}` | read / update settings / archive |
| | `POST /api/admin/systems/{id}/start`, `/stop` | |
| | `GET /api/admin/features` | feature catalog |
| | `GET /api/admin/systems/{id}/logs?filter=all\|up\|down\|unanswered` | chat log |
| | `GET /api/admin/systems/{id}/usage` | usage and cost per month |
| Documents | `GET, POST /api/admin/systems/{id}/documents` | list / upload |
| | `DELETE /api/admin/systems/{id}/documents/{filename}` | |
| | `POST .../documents/{filename}/index`, `POST .../documents/reindex-all` | |
| | `GET .../documents/{filename}/chunks` | chunk preview |
| | `GET .../documents/search?q=...` | search tester |
| Chat | `GET /api/chat/info` | name, welcome message, features |
| | `POST /api/chat/ask` | `{question, history}` |
| | `POST /api/chat/feedback` | `{id, rating: "up" \| "down"}` |

Admin routes only work on the admin subdomain and need `Authorization: Bearer <token>`. Chat routes answer for the system matching the subdomain, and only while it is running.

---

## Security notes

- `backend/.env` and `backend/rag_systems/*` (client documents, vectors, logs) are git-ignored. Never commit them.
- The OpenAI key lives only in the backend.
- Retrieved document text is treated as reference material, not instructions (prompt-injection guard in the rules).
- Chat history roles are limited to `user`/`assistant`, so visitors can't inject system messages.
- Visitor questions are stored in the logs. Let clients know chats are logged.

---

## Development workflow

- One feature branch per module (e.g. `feature/module-13-logs-usage`), merged into `main` through a pull request.
- Before opening a PR: `npm run build` in `frontend` (type check + build).

## Deployment

Planned setup: an Ubuntu VPS, wildcard DNS (`*.example.com`), Caddy for HTTPS with on-demand certificates, and the backend as a systemd service. The deployment guide and config files will be added in the deployment module.
