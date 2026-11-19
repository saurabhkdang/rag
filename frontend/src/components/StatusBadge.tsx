import type { SystemStatus } from '../types'

export default function StatusBadge({ status }: { status: SystemStatus }) {
  const running = status === 'running'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        running ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${running ? 'bg-green-500' : 'bg-slate-400'}`} />
      {running ? 'Running' : 'Stopped'}
    </span>
  )
}
