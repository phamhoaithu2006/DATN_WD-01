const moneyFormatter = new Intl.NumberFormat('vi-VN')

export const messageFrom = (error) =>
  Object.values(error.response?.data?.errors || {}).flat()[0] ||
  error.response?.data?.message ||
  'Không thể xử lý yêu cầu.'

export const getBookingList = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.bookings)) return payload.bookings
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

export const getStats = (payload) => payload?.data || payload || {}

export const getMeta = (payload) => payload?.meta || payload?.data?.meta || {}

export const formatMoney = (value) => `${moneyFormatter.format(Number(value || 0))}đ`

export const formatDate = (value) => {
  if (!value) return '--'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'

  return date.toLocaleDateString('vi-VN')
}

export const customerName = (booking) =>
  booking.contact?.contact_name ||
  booking.user?.full_name ||
  booking.customer_name ||
  'Khách hàng'

export const customerPhone = (booking) =>
  booking.contact?.contact_phone ||
  booking.user?.phone ||
  booking.customer_phone ||
  booking.user?.email ||
  ''

export const bookingDeparture = (booking) =>
  booking.tour_departure ||
  booking.tourDeparture ||
  booking.departure ||
  null

export const initialsFor = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
