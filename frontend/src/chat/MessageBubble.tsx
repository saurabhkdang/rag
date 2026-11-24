import Markdown from 'react-markdown'
import type { ChatMessage, Rating } from '../types'

interface Props {
  message: ChatMessage
  onRate?: (rating: Rating) => void // only passed when feedback is possible
}

export default function MessageBubble({ message, onRate }: Props) {
  // ----- the visitor's question: right side, dark -----
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-slate-900 px-4 py-2.5 text-white">
          {message.text}
        </div>
      </div>
    )
  }

  // ----- something went wrong: left side, red -----
  if (message.role === 'error') {
    return (
      <div className="flex">
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {message.text}
        </div>
      </div>
    )
  }

  // ----- the AI's answer: left side, light, formatted -----
  return (
    <div className="flex">
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2.5 text-slate-800">
        <div className="markdown">
          <Markdown>{message.text}</Markdown>
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-500">
            <span className="font-medium">Sources:</span>{' '}
            {message.sources.map((s) => `${s.source} (p. ${s.page})`).join(' · ')}
          </div>
        )}

        {onRate && (
          <div className="mt-2 flex gap-1">
            <RateButton label="Helpful" active={message.rating === 'up'} onClick={() => onRate('up')}>
              👍
            </RateButton>
            <RateButton label="Not helpful" active={message.rating === 'down'} onClick={() => onRate('down')}>
              👎
            </RateButton>
          </div>
        )}
      </div>
    </div>
  )
}

interface RateButtonProps {
  label: string
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function RateButton({ label, active, onClick, children }: RateButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`rounded-md px-1.5 py-0.5 text-sm ${
        active ? 'bg-slate-300' : 'opacity-50 hover:bg-slate-200 hover:opacity-100'
      }`}
    >
      {children}
    </button>
  )
}