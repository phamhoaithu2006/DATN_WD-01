import { Navigate } from 'react-router-dom'
import { readSession, readToken } from '../../services/authStorage'

function ProtectedAdminRoute({ children }) {
  const session = readSession()
  const token = readToken()

  if (!token || session?.role !== 'admin') {
    return <Navigate to="/auth" replace />
  }

  return children
}

export default ProtectedAdminRoute
