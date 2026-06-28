import { Navigate } from 'react-router-dom'
import { readSession, readToken } from '../../services/authStorage'

function ProtectedAdminRoute({ children, allowedRoles = ['admin'] }) {
  const session = readSession()
  const token = readToken()
  const role = session?.role || ''

  if (!token || !allowedRoles.includes(role)) {
    return <Navigate to="/auth/login" replace />
  }

  return children
}

export default ProtectedAdminRoute
