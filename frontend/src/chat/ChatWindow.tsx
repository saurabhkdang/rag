import { useEffect, useRef, useState } from 'react'
import { askQuestion, getErrorMessage } from '../api'
import type { ChatMessage } from '../types'
import ChatInput from './ChatInput'
import MessageBubble from './MessageBubble'

let nextId = 1 // simple unique id per message (React needs a stable "key")

interface Props {
  systemName: string
  welcomeMessage: string
}

export default function ChatWindow({ systemName, welcomeMessage }: Props) {
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
    addMessage({ role: 'user', text: question })
    setWaiting(true)
    try {
      const response = await askQuestion(question)
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
