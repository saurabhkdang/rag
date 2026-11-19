import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

export default function AdminApp() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white px-6 py-4">
          <h1 className="text-lg font-semibold">RAG Platform · Super Admin</h1>
        </header>

        <main className="p-6">
          <Routes>
            <Route path="/" element={<p>Dashboard coming in Module 4.</p>} />
            {/* any unknown URL -> back to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
