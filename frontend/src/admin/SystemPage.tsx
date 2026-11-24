import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  deleteDocument,
  getErrorMessage,
  getSystem,
  indexDocument,
  listDocuments,
  reindexAll,
} from '../api'

import StatusBadge from '../components/StatusBadge'
import { systemUrl } from '../config'
import { formatBytes, formatDateTime } from '../format'
import type { DocumentInfo, RagSystem } from '../types'
import ChunkPreviewPanel from './ChunkPreviewPanel'
import DocumentUpload from './DocumentUpload'
import SearchTester from './SearchTester'

export default function SystemPage() {
  const { id = '' } = useParams() // "acme" from the URL /systems/acme

  const [system, setSystem] = useState<RagSystem | null>(null)
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [indexing, setIndexing] = useState<string | null>(null) // filename, or '*' = all

  // useCallback keeps the SAME function between renders (unless id changes),
  // so it's safe to use inside useEffect's dependency list
  const loadDocuments = useCallback(() => {
    listDocuments(id)
      .then(setDocuments)
      .catch((err) => setError(getErrorMessage(err)))
  }, [id])

  useEffect(() => {
    getSystem(id)
      .then(setSystem)
      .catch((err) => setError(getErrorMessage(err)))
    loadDocuments()
  }, [id, loadDocuments])

  async function handleDelete(name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return

    setDeleting(name)
    setError(null)
    try {
      await deleteDocument(id, name)
      setDocuments((list) => list.filter((d) => d.name !== name))
      if (previewFile === name) setPreviewFile(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeleting(null)
    }
  }

    async function handleIndex(name: string) {
    setIndexing(name)
    setError(null)
    try {
      const result = await indexDocument(id, name)
      // Update only this row: copy it (...doc) and change one field
      setDocuments((list) =>
        list.map((doc) => (doc.name === name ? { ...doc, indexed_chunks: result.indexed_chunks } : doc)),
      )
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIndexing(null)
    }
  }

  async function handleReindexAll() {
    if (!window.confirm('Rebuild the index for all documents? Use this after changing chunk settings.')) return

    setIndexing('*')
    setError(null)
    try {
      await reindexAll(id)
      loadDocuments() // reload to get the new counts
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIndexing(null)
    }
  }


  if (!system) {
    return (
      <div>
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← All systems
        </Link>
        <p className="mt-4 text-slate-500">{error ?? 'Loading...'}</p>
      </div>
    )
  }

  const notIndexed = documents.filter((doc) => doc.indexed_chunks === 0).length

  return (
    <div>
      <Link to="/" className="text-sm text-slate-500 hover:text-slate-900">
        ← All systems
      </Link>

      {/* ----- header ----- */}
      <div className="mb-6 mt-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{system.name}</h2>
          <StatusBadge status={system.status} />
          <Link
            to={`/systems/${id}/settings`}
            className="ml-auto rounded-md border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-50"
          >
            Settings
          </Link>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {system.id} ·{' '}
          <a href={systemUrl(system.subdomain)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
            {system.subdomain}
          </a>{' '}
          · chunk size {system.chunk_size} · overlap {system.chunk_overlap}
        </p>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {/* ----- documents ----- */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">
          Documents ({documents.length})
          {notIndexed > 0 && (
            <span className="ml-2 text-sm font-normal text-amber-600">{notIndexed} not indexed</span>
          )}
        </h3>
        {documents.length > 0 && (
          <button
            onClick={handleReindexAll}
            disabled={indexing !== null}
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {indexing === '*' ? 'Re-indexing...' : 'Re-index all'}
          </button>
        )}
      </div>

      <DocumentUpload systemId={id} onUploaded={loadDocuments} />

      {documents.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No documents yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium">Indexed</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr
                  key={doc.name}
                  className={`border-b border-slate-100 last:border-0 ${previewFile === doc.name ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-3 font-medium">{doc.name}</td>
                  <td className="px-4 py-3 text-slate-500">{formatBytes(doc.size)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(doc.uploaded_at)}</td>
                  <td className="px-4 py-3">
                    {doc.indexed_chunks > 0 ? (
                      <span className="text-green-700">✓ {doc.indexed_chunks} chunks</span>
                    ) : (
                      <span className="text-amber-600">Not indexed</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      onClick={() => handleIndex(doc.name)}
                      disabled={indexing !== null}
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                    >
                      {indexing === doc.name ? 'Indexing...' : doc.indexed_chunks > 0 ? 'Re-index' : 'Index'}
                    </button>
                    <button
                      onClick={() => setPreviewFile(doc.name)}
                      className="ml-2 rounded-md border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-50"
                    >
                      Preview chunks
                    </button>
                    <button
                      onClick={() => handleDelete(doc.name)}
                      disabled={deleting === doc.name}
                      className="ml-2 rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SearchTester systemId={id} defaultTopK={system.top_k} />

      {/* key={previewFile}: a different file = a brand-new panel with fresh state */}
      {previewFile && (
        <ChunkPreviewPanel
          key={previewFile}
          systemId={id}
          filename={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  )
}
