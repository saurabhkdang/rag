import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import AdminLayout from './AdminLayout'
import DashboardPage from './DashboardPage'
import LoginPage from './LoginPage'

export default function AdminApp() {
  return (
    <BrowserRouter>
      <Routes>
        {/* public */}
        <Route path="/login" element={<LoginPage />} />

        {/* protected: AdminLayout checks login, then shows the page inside it */}
        <Route element={<AdminLayout />}>
          <Route path="/" element={<DashboardPage />} />
        </Route>

        {/* any unknown URL -> dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
