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
  welcome_message?: string
}

// Public info returned by GET /api/chat/info
export interface ChatInfo {
  name: string
  features: Record<string, boolean>
  welcome_message: string
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
  context: string // LLM-written description ("" if none)
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
  id: string | null // null if the server couldn't save the log
  answer: string
  sources?: Source[]
}

export type MessageRole = 'user' | 'assistant' | 'error'

// One bubble in the chat
export type Rating = 'up' | 'down'

export interface ChatMessage {
  id: number
  role: MessageRole
  text: string
  sources?: Source[]
  logId?: string | null // server id of this answer (for feedback)
  rating?: Rating
}

// GET /api/admin/features
export interface FeatureInfo {
  key: string
  label: string
  description: string
  default: boolean
  needs_reindex: boolean
  coming_soon: boolean
}

// PATCH /api/admin/systems/{id} (send only what changed)
export interface UpdateSystemInput {
  name?: string
  welcome_message?: string
  system_prompt?: string
  top_k?: number
  chunk_size?: number
  chunk_overlap?: number
  features?: Record<string, boolean>
}

// One earlier message sent with a question (chat memory)
export interface HistoryMessage {
  role: 'user' | 'assistant'
  content: string
}

// ----- admin: logs & usage -----
export type LogFilter = 'all' | 'up' | 'down' | 'unanswered'

export interface LogEntry {
  id: string
  at: string
  model: string
  question: string
  search_question?: string // missing when the AI call failed
  answer?: string
  found?: boolean
  error?: boolean
  sources?: Source[]
  input_tokens?: number
  output_tokens?: number
  cost_usd: number
  duration_ms: number
  history_used: number
  rating: Rating | null
}

export interface MonthUsage {
  month: string
  questions: number
  unanswered: number
  errors: number
  input_tokens: number
  output_tokens: number
  cost_usd: number
  up: number
  down: number
}