import { useState } from 'react'
import { createSystem, getErrorMessage } from '../api'
import type { RagSystem } from '../types'

// Same rule as SLUG_PATTERN in backend/app/core/registry.py
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,30}$/

// "Acme Corp!" -> "acme-corp"
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // anything else -> dash
    .replace(/^-+|-+$/g, '') // remove dashes at start/end
    .slice(0, 31)
}

const inputClass =
  'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none'

interface Props {
  onCreated: (system: RagSystem) => void
  onCancel: () => void
}

export default function CreateSystemForm({ onCreated, onCancel }: Props) {
  const [name, setName] = useState('')
  const [id, setId] = useState('')
  const [idEditedByUser, setIdEditedByUser] = useState(false)
  const [subdomain, setSubdomain] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function handleNameChange(value: string) {
    setName(value)
    // keep filling the ID from the name, until the user types their own ID
    if (!idEditedByUser) {
      setId(toSlug(value))
    }
  }

  async function handleSubmit() {
    // Check here first for quick feedback; the backend checks again anyway
    if (!SLUG_PATTERN.test(id)) {
      setError('ID: lowercase letters, numbers and dashes, 2-31 characters.')
      return
    }
    if (subdomain && !SLUG_PATTERN.test(subdomain)) {
      setError('Subdomain: same rules as ID.')
      return
    }

    setError(null)
    setSaving(true)
    try {
      const created = await createSystem({
        id,
        name: name.trim(),
        subdomain: subdomain || undefined,
      })
      onCreated(created)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit()
      }}
      className="mb-6 rounded-lg border border-slate-200 bg-white p-5"
    >
      <h3 className="mb-4 font-semibold">New RAG system</h3>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Acme Corp"
            autoFocus
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          ID (folder name)
          <input
            value={id}
            onChange={(e) => {
              setId(e.target.value)
              setIdEditedByUser(true)
            }}
            placeholder="acme"
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Subdomain <span className="font-normal text-slate-400">(optional)</span>
          <input
            value={subdomain}
            onChange={(e) => setSubdomain(e.target.value)}
            placeholder={id || 'same as ID'}
            className={inputClass}
          />
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5 flex gap-2">
        <button
          type="submit"
          disabled={saving || !name.trim() || !id}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? 'Creating...' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
