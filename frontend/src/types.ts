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
