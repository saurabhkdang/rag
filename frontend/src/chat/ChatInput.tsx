import { useState } from 'react'

const MAX_LENGTH = 2000 // same limit as the backend (AskRequest)

interface Props {
  onSend: (question: string) => void
  disabled: boolean // true while waiting for an answer
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('')

  function send() {
    const question = text.trim()
    if (!question || disabled) return
    onSend(question)
    setText('')
  }

  return (
    <div className="border-t border-slate-200 bg-white">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="mx-auto flex max-w-3xl items-end gap-2 px-4 py-3"
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter = send, Shift+Enter = new line
            // (isComposing: don't send while typing with an input method, e.g. Hindi/Japanese keyboards)
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send()
            }
          }}
          rows={1}
          maxLength={MAX_LENGTH}
          placeholder="Type your question..."
          autoFocus
          className="max-h-40 min-h-11 flex-1 resize-none rounded-xl border border-slate-300 px-4 py-2.5 text-sm [field-sizing:content] focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
