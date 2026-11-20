import Markdown from 'react-markdown'
import type { ChatMessage } from '../types'

export default function MessageBubble({ message }: { message: ChatMessage }) {
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
      </div>
    </div>
  )
}
