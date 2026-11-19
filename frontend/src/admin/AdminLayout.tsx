import { Navigate, Outlet, useNavigate } from 'react-router'
import { clearToken, getToken } from '../api'

export default function AdminLayout() {
  const navigate = useNavigate()

  // Not logged in -> go to login page
  if (!getToken()) {
    return <Navigate to="/login" replace />
  }

  function logout() {
    clearToken()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold">RAG Platform · Super Admin</h1>
        <button onClick={logout} className="text-sm text-slate-600 hover:text-slate-900">
          Log out
        </button>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        {/* the current page (e.g. DashboardPage) renders here */}
        <Outlet />
      </main>
    </div>
  )
}
