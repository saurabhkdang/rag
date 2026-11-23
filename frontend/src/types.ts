export type SystemStatus = 'running' | 'stopped'

// Same shape as rag_systems/<id>/config.json
export interface RagSystem {
  id: string
  name: string
  subdomain: string
  status: SystemStatus
  created_at: string
  system_prompt: string
  chunk_size: number
  chunk_overlap: number
  top_k: number
  features: Record<string, boolean>
}

// Public info returned by GET /api/chat/info
export interface ChatInfo {
  name: string
  features: Record<string, boolean>
}

// Body for POST /api/admin/systems
export interface CreateSystemInput {
  id: string
  name: string
  subdomain?: string // optional: backend uses id if missing
}

// GET /api/admin/systems/{id}/documents
export interface DocumentInfo {
  name: string
  size: number // bytes
  uploaded_at: string
  indexed_chunks: number // 0 = not indexed yet
}

// POST /api/admin/systems/{id}/documents
export interface UploadResult {
  name: string
  size: number
  pages: number
  characters: number
}

export interface Chunk {
  chunk_index: number
  page: number
  text: string
}

// GET /api/admin/systems/{id}/documents/{name}/chunks
export interface ChunkPreview {
  chunk_size: number
  chunk_overlap: number
  total_chunks: number
  chunks: Chunk[]
}

// POST .../documents/{name}/index
export interface IndexResult {
  name: string
  indexed_chunks: number
}

// POST .../documents/reindex-all
export interface ReindexResult {
  indexed: Record<string, number> // { "file.pdf": 42 }
  total_chunks: number
}

export interface SearchResult {
  id: string
  text: string
  source: string
  page: number
  score: number | null // vector similarity; null = found by keyword search only
  match: 'vector' | 'keyword' | 'both'
}

// GET .../documents/search?q=...
export interface SearchResponse {
  query: string
  results: SearchResult[]
}

// One source in an answer (only sent when the system has citations on)
export interface Source {
  source: string
  page: number
}

// POST /api/chat/ask
export interface AskResponse {
  answer: string
  sources?: Source[]
}

export type MessageRole = 'user' | 'assistant' | 'error'

// One bubble in the chat
export interface ChatMessage {
  id: number
  role: MessageRole
  text: string
  sources?: Source[]
}
