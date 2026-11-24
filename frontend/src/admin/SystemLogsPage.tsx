import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getErrorMessage, getLogs, getUsage } from '../api'
import { formatDateTime } from '../format'
import type { LogEntry, LogFilter, MonthUsage } from '../types'

const FILTERS: { value: LogFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'down', label: '👎 Not helpful' },
  { value: 'up', label: '👍 Helpful' },
  { value: 'unanswered', label: 'Unanswered' },
]

export default function SystemLogsPage() {
  const { id = '' } = useParams()
  const [usage, setUsage] = useState<MonthUsage[]>([])
  const [logs, setLogs] = useState<LogEntry[] | null>(null)
  const [filter, setFilter] = useState<LogFilter>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getUsage(id)
      .then(setUsage)
      .catch((err) => setError(getErrorMessage(err)))
  }, [id])

  useEffect(() => {
    // If the filter changes again before this answer arrives, ignore the old answer
    let ignore = false
    getLogs(id, filter)
      .then((data) => {
        if (!ignore) setLogs(data)
      })
      .catch((err) => setError(getErrorMessage(err)))
    return () => {
      ignore = true
    }
  }, [id, filter])

  return (
    <div>
      <Link to={`/systems/${id}`} className="text-sm text-slate-500 hover:text-slate-900">
        ← Back to system
      </Link>
      <h2 className="mt-4 text-xl font-semibold text-slate-800">Logs & usage</h2>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <UsageTable usage={usage} />

      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === f.value
                ? 'bg-slate-900 text-white'
                : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {logs === null ? (
        <p className="mt-4 text-sm text-slate-500">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No questions here yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {logs.map((entry) => (
            <LogItem key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  )
}

const CELL = 'px-3 py-2'

function UsageTable({ usage }: { usage: MonthUsage[] }) {
  if (usage.length === 0) return null
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs text-slate-500">
          <tr>
            <th className={CELL}>Month</th>
            <th className={CELL}>Questions</th>
            <th className={CELL}>Unanswered</th>
            <th className={CELL}>Errors</th>
            <th className={CELL}>Tokens in / out</th>
            <th className={CELL}>Cost</th>
            <th className={CELL}>👍 / 👎</th>
          </tr>
        </thead>
        <tbody>
          {usage.map((m) => (
            <tr key={m.month} className="border-t border-slate-100">
              <td className={`${CELL} font-medium`}>{m.month}</td>
              <td className={CELL}>{m.questions}</td>
              <td className={CELL}>{m.unanswered}</td>
              <td className={CELL}>{m.errors}</td>
              <td className={CELL}>
                {m.input_tokens.toLocaleString()} / {m.output_tokens.toLocaleString()}
              </td>
              <td className={CELL}>${m.cost_usd.toFixed(4)}</td>
              <td className={CELL}>
                {m.up} / {m.down}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LogItem({ entry }: { entry: LogEntry }) {
  const tokens = (entry.input_tokens ?? 0) + (entry.output_tokens ?? 0)
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>{formatDateTime(entry.at)}</span>
        {entry.error && <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">AI error</span>}
        {!entry.error && !entry.found && (
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">Unanswered</span>
        )}
        {entry.history_used > 0 && <span className="rounded bg-slate-100 px-1.5 py-0.5">Follow-up</span>}
        {entry.rating === 'up' && <span>👍</span>}
        {entry.rating === 'down' && <span>👎</span>}
        <span className="ml-auto">
          {tokens.toLocaleString()} tokens · ${entry.cost_usd.toFixed(4)} · {(entry.duration_ms / 1000).toFixed(1)}s
        </span>
      </div>

      <p className="mt-2 font-medium text-slate-800">{entry.question}</p>
      {entry.search_question && entry.search_question !== entry.question && (
        <span className="rounded bg-slate-100 px-1.5 py-0.5">Follow-up</span>
      )}

      {entry.answer && (
        <details className="mt-2 text-sm text-slate-600">
          <summary className="cursor-pointer text-xs text-slate-500">Answer</summary>
          <p className="mt-1 whitespace-pre-wrap">{entry.answer}</p>
          {entry.sources && entry.sources.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              Sources: {entry.sources.map((s) => `${s.source} (p. ${s.page})`).join(' · ')}
            </p>
          )}
        </details>
      )}
    </li>
  )
}