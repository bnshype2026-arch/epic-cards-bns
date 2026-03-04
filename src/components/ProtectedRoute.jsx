import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const ProtectedRoute = ({ requireAdmin = false, requireStore = false, requireStaff = false }) => {
    const { user, isAdmin, isStore, isStaff, loading } = useAuth()

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }

    if (requireAdmin && !isAdmin) {
        return <Navigate to="/" replace />
    }

    if (requireStore && !isStore) {
        return <Navigate to="/" replace />
    }

    if (requireStaff && !isStaff) {
        return <Navigate to="/" replace />
    }

    return <Outlet />
}
