import AdminApp from './admin/AdminApp'
import ChatApp from './chat/ChatApp'
import { ADMIN_SUBDOMAIN, getSubdomain } from './config'

export default function App() {
  const subdomain = getSubdomain()

  if (subdomain === ADMIN_SUBDOMAIN) {
    return <AdminApp />
  }

  if (subdomain) {
    return <ChatApp />
  }

  return <NoSystemPage />
}

function NoSystemPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-800">RAG Platform</h1>
        <p className="mt-2 text-slate-500">
          Open a system's subdomain, e.g. <code>acme.localhost:5173</code>
        </p>
      </div>
    </div>
  )
}
