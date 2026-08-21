import { Navigate, useLocation } from 'react-router-dom'
import { readSession, readToken } from '../../services/authStorage'

function ProtectedAdminRoute({ children, allowedRoles = ['admin'] }) {
  const location = useLocation()
  const session = readSession()
  const token = readToken()
  const role = session?.role || ''

  if (!token || !allowedRoles.includes(role)) {
    return (
      <Navigate
        to="/auth/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    )
  }

  return children
}

export default ProtectedAdminRoute
