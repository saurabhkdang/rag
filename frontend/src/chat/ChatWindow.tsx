import { useEffect, useRef, useState } from 'react'
import { askQuestion, getErrorMessage } from '../api'
import type { ChatMessage, HistoryMessage } from '../types'
import ChatInput from './ChatInput'
import MessageBubble from './MessageBubble'

let nextId = 1 // simple unique id per message (React needs a stable "key")

const MAX_HISTORY = 6 // same as the backend

interface Props {
  systemName: string
  welcomeMessage: string
}

interface Props {
  systemName: string
  welcomeMessage: string
  memoryEnabled: boolean
}

// Chat bubbles -> conversation for the AI (error bubbles are not part of the conversation)
function toHistory(messages: ChatMessage[]): HistoryMessage[] {
  const history: HistoryMessage[] = []
  for (const message of messages) {
    // Inside this "if", TypeScript knows role is 'user' or 'assistant' (not 'error')
    if (message.role === 'user' || message.role === 'assistant') {
      history.push({ role: message.role, content: message.text })
    }
  }
  return history.slice(-MAX_HISTORY) // only the most recent ones
}

export default function ChatWindow({ systemName, welcomeMessage, memoryEnabled }: Props) {

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [waiting, setWaiting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to the newest message whenever something is added
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, waiting])

  // Omit<ChatMessage, 'id'> = a ChatMessage without the id field (we add it here)
  function addMessage(message: Omit<ChatMessage, 'id'>) {
    setMessages((list) => [...list, { ...message, id: nextId++ }])
  }

    async function handleSend(question: string) {
    // `messages` here is still the list BEFORE this new question,
    // which is exactly the history we want to send
    const history = memoryEnabled ? toHistory(messages) : []

    addMessage({ role: 'user', text: question })
    setWaiting(true)
    try {
      const response = await askQuestion(question, history)
      addMessage({ role: 'assistant', text: response.answer, sources: response.sources })
    } catch (err) {
      addMessage({ role: 'error', text: getErrorMessage(err) })
    } finally {
      setWaiting(false)
    }
  }

  return (
    // min-h-0: lets this area shrink so ONLY the messages scroll, not the whole page
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
          {messages.length === 0 && (
            <div className="py-16 text-center">
              <h2 className="text-xl font-semibold text-slate-800">Hi! How can I help?</h2>
              <p className="mt-2 text-slate-500">
                {welcomeMessage || `Ask me anything about ${systemName}.`}
              </p>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {waiting && <TypingIndicator />}

          {/* invisible marker at the bottom; we scroll to it */}
          <div ref={bottomRef} />
          {memoryEnabled && messages.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={() => setMessages([])}
                disabled={waiting}
                className="text-xs text-slate-500 hover:text-slate-900 disabled:opacity-50"
              >
                + New chat
              </button>
            </div>
          )}
        </div>
      </div>

      <ChatInput onSend={handleSend} disabled={waiting} />
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex">
      <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3">
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
      </div>
    </div>
  )
}
