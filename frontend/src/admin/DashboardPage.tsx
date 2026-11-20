import { useEffect, useState } from 'react'
import { archiveSystem, getErrorMessage, listSystems, startSystem, stopSystem } from '../api'
import StatusBadge from '../components/StatusBadge'
import { systemUrl } from '../config'
import type { RagSystem } from '../types'
import CreateSystemForm from './CreateSystemForm'
import { Link } from 'react-router'

export default function DashboardPage() {
  const [systems, setSystems] = useState<RagSystem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null) // system being started/stopped
  const [showCreate, setShowCreate] = useState(false)

  // Load the list once when the page opens
  useEffect(() => {
    listSystems()
      .then(setSystems)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  // Swap one system in the list with its updated version
  function replaceSystem(updated: RagSystem) {
    setSystems((list) => list.map((s) => (s.id === updated.id ? updated : s)))
  }

  async function toggleStatus(system: RagSystem) {
    setBusyId(system.id)
    setError(null)
    try {
      const updated =
        system.status === 'running' ? await stopSystem(system.id) : await startSystem(system.id)
      replaceSystem(updated)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  async function handleArchive(system: RagSystem) {
    const ok = window.confirm(
      `Archive "${system.name}"?\n\nIts subdomain will stop working. The folder is kept on the server, renamed to _archived_${system.id}_...`,
    )
    if (!ok) return

    setBusyId(system.id)
    setError(null)
    try {
      await archiveSystem(system.id)
      setSystems((list) => list.filter((s) => s.id !== system.id))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  function handleCreated(created: RagSystem) {
    setSystems((list) => [...list, created].sort((a, b) => a.id.localeCompare(b.id)))
    setShowCreate(false)
  }

  // ----- decide what goes in the main area -----
  let content
  if (loading) {
    content = <p className="text-slate-500">Loading...</p>
  } else if (systems.length === 0) {
    content = (
      <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-500">
        No systems yet. Create your first one.
      </p>
    )
  } else {
    content = (
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Subdomain</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {systems.map((system) => (
              <tr key={system.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <Link to={`/systems/${system.id}`} className="font-medium hover:text-blue-600 hover:underline">
                    {system.name}
                  </Link>

                  <div className="text-xs text-slate-400">{system.id}</div>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={systemUrl(system.subdomain)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {system.subdomain}
                  </a>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={system.status} />
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(system.created_at).toLocaleDateString()}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button
                    onClick={() => toggleStatus(system)}
                    disabled={busyId === system.id}
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                  >
                    {system.status === 'running' ? 'Stop' : 'Start'}
                  </button>
                  <button
                    onClick={() => handleArchive(system)}
                    disabled={busyId === system.id}
                    className="ml-2 rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Archive
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">RAG systems</h2>
          <p className="text-sm text-slate-500">{systems.length} total</p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            + New system
          </button>
        )}
      </div>

      {showCreate && (
        <CreateSystemForm onCreated={handleCreated} onCancel={() => setShowCreate(false)} />
      )}

      {error && <p className="mb-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {content}
    </div>
  )
}
