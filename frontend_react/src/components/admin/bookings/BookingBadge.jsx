import { paymentMeta, statusMeta } from './bookingConstants'

function BookingBadge({ type, value }) {
  const meta = type === 'payment' ? paymentMeta[value] : statusMeta[value]

  return (
    <span className={`booking-badge ${meta?.className || 'neutral'}`}>
      {meta?.label || value || '--'}
    </span>
  )
}

export default BookingBadge