export const READ_ONLY_BOOKING_STATUSES = [
  'departed',
  'cancelled',
  'cancelled_by_tour',
  'completed',
]

export const isBookingReadOnly = (booking) => (
  READ_ONLY_BOOKING_STATUSES.includes(booking?.status)
)

export const canDeleteBooking = (booking) => (
  ['cancelled', 'cancelled_by_tour'].includes(booking?.status)
)
