import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DefaultLayout } from './components/DefaultLayout'
import { Navigate as RouterNavigate } from 'react-router-dom'

import { UserDashboard } from './pages/UserDashboard'
import { UserCollection } from './pages/UserCollection'
import { UserInstructions } from './pages/UserInstructions'
import { UserLogs } from './pages/UserLogs'

import { AdminDashboard } from './pages/admin/AdminDashboard'
import { AdminTemplates } from './pages/admin/AdminTemplates'
import { AdminGrant } from './pages/admin/AdminGrant'
import { AdminActivate } from './pages/admin/AdminActivate'
import { AdminActivatedCards } from './pages/admin/AdminActivatedCards'
import { AdminCardLibrary } from './pages/admin/AdminCardLibrary'
import { AdminLogs } from './pages/admin/AdminLogs'
import { AdminDropLogs } from './pages/admin/AdminDropLogs'
import { HistoricalAnalytics } from './pages/admin/HistoricalAnalytics'



// Helper to redirect based on role
const RoleBasedRedirect = () => {
  const { isStaff } = useAuth()
  return isStaff ? <RouterNavigate to="/admin" replace /> : <UserDashboard />
}

const RoleBasedAdminIndex = () => {
  const { isAdmin } = useAuth()
  return isAdmin ? <AdminDashboard /> : <RouterNavigate to="/admin/grant" replace />
}

const DefaultLayoutWrapper = () => {
  return (
    <DefaultLayout>
      <Outlet />
    </DefaultLayout>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected Routes (User & Admin Mixed depending on requirements) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DefaultLayoutWrapper />}>
          {/* User Routes (Default Layout acts on these) */}
          <Route path="/" element={<RoleBasedRedirect />} />
          <Route path="/collection" element={<UserCollection />} />
          <Route path="/instructions" element={<UserInstructions />} />
          <Route path="/logs" element={<UserLogs />} />

          {/* Staff Routes (Admin & Store) */}
          <Route path="/admin" element={<ProtectedRoute requireStaff={true} />}>
            <Route index element={<RoleBasedAdminIndex />} />

            <Route path="grant" element={<AdminGrant />} />
            <Route path="activate" element={<AdminActivate />} />
            <Route path="activated" element={<AdminActivatedCards />} />
            <Route path="logs" element={<AdminLogs />} />

            {/* Pure Admin Routes */}
            <Route element={<ProtectedRoute requireAdmin={true} />}>
              <Route path="templates" element={<AdminTemplates />} />
              <Route path="library" element={<AdminCardLibrary />} />
              <Route path="analytics" element={<HistoricalAnalytics />} />
              <Route path="live-drops" element={<AdminDropLogs />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
