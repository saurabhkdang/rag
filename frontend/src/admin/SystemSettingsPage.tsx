import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { getErrorMessage, getSystem, listFeatures, updateSystem } from '../api'
import Toggle from '../components/Toggle'
import type { FeatureInfo, RagSystem, UpdateSystemInput } from '../types'

// Everything this page can edit
interface SettingsForm {
  name: string
  welcome_message: string
  system_prompt: string
  top_k: number
  chunk_size: number
  chunk_overlap: number
  features: Record<string, boolean>
}

const SIMPLE_FIELDS = [
  'name',
  'welcome_message',
  'system_prompt',
  'top_k',
  'chunk_size',
  'chunk_overlap',
] as const

function toForm(system: RagSystem): SettingsForm {
  return {
    name: system.name,
    welcome_message: system.welcome_message ?? '', // ?? = use '' if missing
    system_prompt: system.system_prompt,
    top_k: system.top_k,
    chunk_size: system.chunk_size,
    chunk_overlap: system.chunk_overlap,
    features: { ...system.features },
  }
}

// Compare the saved values with the form: return only what changed
function getChanges(original: SettingsForm, form: SettingsForm): UpdateSystemInput {
  const changes: UpdateSystemInput = {}

  for (const field of SIMPLE_FIELDS) {
    if (form[field] !== original[field]) {
      Object.assign(changes, { [field]: form[field] })
    }
  }

  const changedFeatures: Record<string, boolean> = {}
  for (const [key, value] of Object.entries(form.features)) {
    if (original.features[key] !== value) changedFeatures[key] = value
  }
  if (Object.keys(changedFeatures).length > 0) changes.features = changedFeatures

  return changes
}

function needsReindex(changes: UpdateSystemInput, catalog: FeatureInfo[]): boolean {
  if (changes.chunk_size !== undefined || changes.chunk_overlap !== undefined) return true
  return Object.keys(changes.features ?? {}).some(
    (key) => catalog.find((f) => f.key === key)?.needs_reindex,
  )
}

const inputClass =
  'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none'

export default function SystemSettingsPage() {
  const { id = '' } = useParams()

  const [original, setOriginal] = useState<SettingsForm | null>(null) // last saved values
  const [form, setForm] = useState<SettingsForm | null>(null) // values being edited
  const [catalog, setCatalog] = useState<FeatureInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reindexNeeded, setReindexNeeded] = useState(false)

  useEffect(() => {
    // Load the system and the feature list at the same time
    Promise.all([getSystem(id), listFeatures()])
      .then(([system, features]) => {
        setOriginal(toForm(system))
        setForm(toForm(system))
        setCatalog(features)
      })
      .catch((err) => setError(getErrorMessage(err)))
  }, [id])

  if (!form || !original) {
    return (
      <div>
        <Link to={`/systems/${id}`} className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to documents
        </Link>
        <p className="mt-4 text-slate-500">{error ?? 'Loading...'}</p>
      </div>
    )
  }

  const changes = getChanges(original, form)
  const hasChanges = Object.keys(changes).length > 0

  // Quick checks before saving (the backend checks again anyway)
  let problem: string | null = null
  if (!form.name.trim()) problem = 'Name is required.'
  else if (!form.system_prompt.trim()) problem = 'System prompt is required.'
  else if (form.chunk_overlap >= form.chunk_size) problem = 'Chunk overlap must be smaller than chunk size.'

  // Update one field. <K extends keyof SettingsForm> = "K is one of the field names",
  // so TypeScript checks that the value has the right type for that field.
  function setField<K extends keyof SettingsForm>(field: K, value: SettingsForm[K]) {
    setForm((current) => (current ? { ...current, [field]: value } : current))
    setSaved(false)
  }

  function setFeature(key: string, value: boolean) {
    setForm((current) =>
      current ? { ...current, features: { ...current.features, [key]: value } } : current,
    )
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const updated = await updateSystem(id, changes)
      setOriginal(toForm(updated))
      setForm(toForm(updated))
      if (needsReindex(changes, catalog)) setReindexNeeded(true)
      setSaved(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pb-24">
      <Link to={`/systems/${id}`} className="text-sm text-slate-500 hover:text-slate-900">
        ← Back to documents
      </Link>
      <h2 className="mb-6 mt-3 text-xl font-semibold">Settings · {original.name}</h2>

      {reindexNeeded && (
        <div className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Indexing settings changed. Go to{' '}
          <Link to={`/systems/${id}`} className="font-medium underline">
            Documents
          </Link>{' '}
          and click <b>Re-index all</b> for the change to take effect.
        </div>
      )}

      <Section title="General">
        <Field label="Name">
          <input value={form.name} onChange={(e) => setField('name', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Welcome message" hint="Shown in the chat before the first question. Leave empty for the default.">
          <input
            value={form.welcome_message}
            onChange={(e) => setField('welcome_message', e.target.value)}
            maxLength={500}
            placeholder="e.g. Ask me anything about your policy."
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="AI behaviour">
        <Field label="System prompt" hint="Instructions for the AI: tone, role, language. The 'answer only from the documents' rules are always added.">
          <textarea
            value={form.system_prompt}
            onChange={(e) => setField('system_prompt', e.target.value)}
            rows={5}
            maxLength={4000}
            className={inputClass}
          />
        </Field>
        <Field label="Chunks sent to the AI (top_k)" hint="More = better for broad questions, slightly higher cost. 6–10 is a good range.">
          <input
            type="number"
            min={1}
            max={20}
            value={form.top_k}
            onChange={(e) => setField('top_k', Number(e.target.value))}
            className={`${inputClass} max-w-32`}
          />
        </Field>
      </Section>

      <Section title="Indexing">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Chunk size (characters)" hint="100–2000. Changing it needs Re-index all.">
            <input
              type="number"
              min={100}
              max={2000}
              value={form.chunk_size}
              onChange={(e) => setField('chunk_size', Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Chunk overlap (characters)" hint="Must be smaller than chunk size.">
            <input
              type="number"
              min={0}
              max={1000}
              value={form.chunk_overlap}
              onChange={(e) => setField('chunk_overlap', Number(e.target.value))}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section title="Features">
        <ul className="divide-y divide-slate-100">
          {catalog.map((feature) => (
            <li key={feature.key} className="flex items-start justify-between gap-4 py-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {feature.label}
                  {feature.needs_reindex && (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-normal text-amber-700">
                      needs re-index
                    </span>
                  )}
                  {feature.coming_soon && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-500">
                      coming soon
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-slate-500">{feature.description}</p>
              </div>
              <Toggle
                label={feature.label}
                checked={form.features[feature.key] ?? false}
                onChange={(value) => setFeature(feature.key, value)}
                disabled={feature.coming_soon}
              />
            </li>
          ))}
        </ul>
      </Section>

      {/* ----- save bar, always visible at the bottom ----- */}
      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-3 px-6 py-3">
          {error && <span className="mr-auto text-sm text-red-600">{error}</span>}
          {!error && problem && <span className="mr-auto text-sm text-red-600">{problem}</span>}
          {!error && !problem && saved && !hasChanges && (
            <span className="mr-auto text-sm text-green-700">✓ Saved</span>
          )}
          {!error && !problem && hasChanges && (
            <span className="mr-auto text-sm text-slate-500">Unsaved changes</span>
          )}

          <button
            onClick={() => setForm(original)}
            disabled={!hasChanges || saving}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving || problem !== null}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ----- small layout helpers, to avoid repeating the same markup -----

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="mb-4 font-semibold">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {children}
      {hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  )
}