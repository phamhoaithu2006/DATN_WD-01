export const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'awaiting_payment', label: 'Chờ thanh toán' },
  { value: 'upcoming', label: 'Sắp diễn ra' },
  { value: 'departed', label: 'Đang diễn ra' },
  { value: 'completed', label: 'Đã kết thúc' },
  { value: 'cancelled_all', label: 'Đã hủy' },
]

export const paymentOptions = [
  { value: '', label: 'Tất cả thanh toán' },
  { value: 'unpaid', label: 'Chưa thanh toán' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'failed', label: 'Thất bại' },
  { value: 'refund_pending', label: 'Chờ hoàn tiền' },
  { value: 'refunded', label: 'Đã hoàn tiền' },
]

export const statusMeta = {
  awaiting_payment: { label: 'Chờ thanh toán', className: 'waiting' },
  confirmed: { label: 'Sắp diễn ra', className: 'upcoming' },
  upcoming: { label: 'Sắp diễn ra', className: 'upcoming' },
  departed: { label: 'Đang diễn ra', className: 'departed' },
  completed: { label: 'Đã kết thúc', className: 'completed' },
  cancelled: { label: 'Đã hủy', className: 'cancelled' },
  cancelled_by_tour: { label: 'Đã hủy', className: 'cancelled' },
  cancelled_all: { label: 'Đã hủy', className: 'cancelled' },
}

export const paymentMeta = {
  unpaid: { label: 'Chưa thanh toán', className: 'unpaid' },
  paid: { label: 'Đã thanh toán', className: 'paid' },
  failed: { label: 'Thất bại', className: 'failed' },
  refund_pending: { label: 'Chờ hoàn tiền', className: 'failed' },
  refunded: { label: 'Đã hoàn tiền', className: 'refunded' },
}
