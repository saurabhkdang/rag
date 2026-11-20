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
