import { useState } from 'react'
import { getErrorMessage, searchDocuments } from '../api'
import type { SearchResult } from '../types'

interface Props {
  systemId: string
  defaultTopK: number
}

export default function SearchTester({ systemId, defaultTopK }: Props) {
  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(defaultTopK)
  const [results, setResults] = useState<SearchResult[] | null>(null) // null = not searched yet
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch() {
    setSearching(true)
    setError(null)
    try {
      const data = await searchDocuments(systemId, query, topK)
      setResults(data.results)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSearching(false)
    }
  }

  return (
    <section className="mt-8">
      <h3 className="font-semibold">Test search</h3>
      <p className="mb-3 text-sm text-slate-500">
        Ask a question and see which chunks the system would use to answer it.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSearch()
        }}
        className="flex flex-wrap gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. What is the refund policy?"
          className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Top
          <input
            type="number"
            min={1}
            max={20}
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            className="w-16 rounded-md border border-slate-300 px-2 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {results && results.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">
          No relevant chunks found (or nothing is indexed yet).
        </p>
      )}

      {results && results.length > 0 && (
        <ol className="mt-4 space-y-3">
          {results.map((r, i) => (
            <li key={r.id} className="rounded-md border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center gap-3 text-xs text-slate-500">
                <span className="font-medium text-slate-700">#{i + 1}</span>
                <span>
                  {r.source} · page {r.page}
                </span>
                <MatchBadge match={r.match} />
                {r.score !== null && <ScoreBar score={r.score} />}
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-800">{r.text}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

// Small bar showing how close the chunk's meaning is to the question
function ScoreBar({ score }: { score: number }) {
  const percent = Math.max(0, Math.min(100, Math.round(score * 100)))
  const color = score >= 0.5 ? 'bg-green-500' : score >= 0.3 ? 'bg-amber-500' : 'bg-slate-400'

  return (
    <span className="ml-auto flex items-center gap-2">
      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
        <span className={`block h-full ${color}`} style={{ width: `${percent}%` }} />
      </span>
      <span className="tabular-nums">{score.toFixed(2)}</span>
    </span>
  )
}

// How the chunk was found
function MatchBadge({ match }: { match: 'vector' | 'keyword' | 'both' }) {
  const styles = {
    vector: 'bg-blue-50 text-blue-700',
    keyword: 'bg-purple-50 text-purple-700',
    both: 'bg-green-50 text-green-700',
  }
  return <span className={`rounded px-1.5 py-0.5 font-medium ${styles[match]}`}>{match}</span>
}
