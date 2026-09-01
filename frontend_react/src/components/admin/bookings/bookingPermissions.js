export const READ_ONLY_BOOKING_STATUSES = [
  'upcoming',
  'departed',
  'cancelled',
  'cancelled_by_tour',
  'completed',
]

export const isBookingReadOnly = (booking) => (
  booking?.capabilities?.read_only === true
  || READ_ONLY_BOOKING_STATUSES.includes(booking?.display_status || booking?.status)
)

export const canDeleteBooking = (booking) => (
  ['cancelled', 'cancelled_by_tour'].includes(booking?.status)
)
