import { useEffect, useState } from 'react'
import { ApiError, getChatInfo } from '../api'
import type { ChatInfo } from '../types'
import ChatWindow from './ChatWindow'

export default function ChatApp() {
  const [info, setInfo] = useState<ChatInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Runs once when the page opens
  useEffect(() => {
    getChatInfo()
      .then((data) => {
        setInfo(data)
        document.title = data.name // browser tab shows client name
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 503) {
          setError('This service is currently unavailable.')
        } else if (err instanceof ApiError && err.status === 404) {
          setError('No assistant found at this address.')
        } else {
          setError('Could not connect to the server.')
        }
      })
  }, [])

  if (error) return <CenteredMessage text={error} />
  if (!info) return <CenteredMessage text="Loading..." />

  return (
    // h-dvh = exactly the screen height (also correct on mobile browsers)
    <div className="flex h-dvh flex-col bg-white">
      <header className="border-b border-slate-200 px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-800">{info.name}</h1>
      </header>

      <ChatWindow systemName={info.name} />
    </div>
  )
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
      {text}
    </div>
  )
}
