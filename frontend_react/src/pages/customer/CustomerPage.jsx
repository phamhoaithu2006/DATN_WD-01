import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import ChatBox from '../../components/customer/ChatBox'
import Footer from '../../components/customer/Footer'
import Header from '../../components/customer/Header'
import { demoTours } from '../../data/customerDemoData'
import { addWishlist, fetchBookings, fetchProfileSummary, fetchTours, fetchWishlist, removeWishlist } from '../../services/customerApi'
import { logout as logoutApi } from '../../services/authApi'
import { clearSession, readSession, readToken } from '../../services/authStorage'
import '../../styles/customer.css'
import DestinationsPage from './DestinationsPage'
import HomePage from './HomePage'
import ProfileDashboard from './ProfileDashboard'
import ProfileForm from './ProfileForm'
import ToursPage from './ToursPage'

const fallbackProfile = {
  full_name: 'Khách hàng ViVuGo',
  email: 'khachhang@vivugo.vn',
  phone: 'Chưa cập nhật',
  avatar_url: '',
}

function CustomerPage() {
  const location = useLocation()
  const token = readToken()
  const [user, setUser] = useState(readSession)
  const [tours, setTours] = useState(demoTours)
  const [favorites, setFavorites] = useState([])
  const [bookings, setBookings] = useState([])
  const [summary, setSummary] = useState({ bookings_count: 0, wishlist_count: 0 })
  const [profile, setProfile] = useState(() => ({ ...fallbackProfile, ...readSession() }))

  useEffect(() => {
    let active = true
    fetchTours().then((items) => {
      if (active && items.length) {
        setTours(items.map((item, index) => ({ ...demoTours[index % demoTours.length], ...item, image: item.image || demoTours[index % demoTours.length].image })))
      }
    }).catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!token) {
      setFavorites(JSON.parse(localStorage.getItem('vivugo_favorites') || '[]'))
      return undefined
    }

    let active = true
    Promise.all([fetchWishlist(), fetchProfileSummary(), fetchBookings()]).then(([wishlist, account, accountBookings]) => {
      if (!active) return
      setFavorites(wishlist.map((item) => item.id))
      setSummary(account || {})
      setBookings(accountBookings)
      setProfile((current) => ({ ...current, ...account }))
      setUser((current) => ({ ...current, ...account }))
    }).catch(() => {})
    return () => { active = false }
  }, [token])

  async function toggleFavorite(tour) {
    const exists = favorites.includes(tour.id)
    const next = exists ? favorites.filter((id) => id !== tour.id) : [...favorites, tour.id]
    setFavorites(next)
    localStorage.setItem('vivugo_favorites', JSON.stringify(next))
    if (!token) return
    try {
      if (exists) await removeWishlist(tour.id)
      else await addWishlist(tour.id)
    } catch {
      // Giữ trạng thái cục bộ nếu API tạm thời không khả dụng.
    }
  }

  async function logout() {
    try { await logoutApi() } catch { /* Token có thể đã hết hạn. */ }
    clearSession()
    setUser(null)
  }

  const favoriteTours = tours.filter((tour) => favorites.includes(tour.id))
  const route = location.pathname
  const accountRoutes = ['/customer/profile', '/customer/bookings', '/customer/favorites', '/customer/settings']
  let content = <HomePage tours={tours} favorites={favorites} onFavorite={toggleFavorite} />

  if (route === '/tours' || route === '/deals' || route === '/customer/search') content = <ToursPage tours={tours} favorites={favorites} onFavorite={toggleFavorite} />
  else if (route === '/destinations') content = <DestinationsPage />
  else if (accountRoutes.includes(route)) content = user ? <ProfileDashboard route={route} profile={profile} summary={summary} bookings={bookings} favoriteTours={favoriteTours} onFavorite={toggleFavorite} /> : <Navigate to="/auth" replace />
  else if (route === '/customer/profile/edit') content = user ? <ProfileForm profile={profile} setProfile={setProfile} /> : <Navigate to="/auth" replace />
  else if (route === '/customer/password') content = user ? <ProfileForm profile={profile} setProfile={setProfile} password /> : <Navigate to="/auth" replace />

  return <div className="vg-app"><Header user={user} onLogout={logout} />{content}<Footer /><ChatBox /></div>
}

export default CustomerPage
