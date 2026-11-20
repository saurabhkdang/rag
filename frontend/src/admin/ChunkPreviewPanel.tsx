import { useEffect, useState } from 'react'
import { getErrorMessage, previewChunks } from '../api'
import type { ChunkPreview } from '../types'

interface Props {
  systemId: string
  filename: string
  onClose: () => void
}

export default function ChunkPreviewPanel({ systemId, filename, onClose }: Props) {
  const [preview, setPreview] = useState<ChunkPreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // If the component closes before the answer arrives, ignore the answer
    let cancelled = false

    previewChunks(systemId, filename)
      .then((data) => {
        if (!cancelled) setPreview(data)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err))
      })

    return () => {
      cancelled = true // "cleanup" runs when the component goes away
    }
  }, [systemId, filename])

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="font-semibold">Chunks · {filename}</h3>
          {preview && (
            <p className="text-xs text-slate-500">
              {preview.total_chunks} chunks · size {preview.chunk_size} · overlap{' '}
              {preview.chunk_overlap}
              {preview.total_chunks > preview.chunks.length &&
                ` · showing first ${preview.chunks.length}`}
            </p>
          )}
        </div>
        <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900">
          Close
        </button>
      </div>

      <div className="max-h-[32rem] space-y-3 overflow-y-auto p-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!preview && !error && <p className="text-sm text-slate-500">Loading...</p>}

        {preview?.chunks.map((chunk) => (
          <div key={chunk.chunk_index} className="rounded-md border border-slate-100 bg-slate-50 p-3">
            <div className="mb-1 text-xs font-medium text-slate-500">
              #{chunk.chunk_index} · page {chunk.page} · {chunk.text.length} characters
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-800">{chunk.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
