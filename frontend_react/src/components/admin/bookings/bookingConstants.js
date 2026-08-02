export const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'departed', label: 'Đã khởi hành' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled_all', label: 'Đã hủy' },
]

export const paymentOptions = [
  { value: '', label: 'Tất cả thanh toán' },
  { value: 'unpaid', label: 'Chưa thanh toán' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'failed', label: 'Thất bại' },
  { value: 'refunded', label: 'Hoàn tiền' },
]

export const statusMeta = {
  pending: { label: 'Chờ xác nhận', className: 'waiting' },
  confirmed: { label: 'Đã xác nhận', className: 'confirmed' },
  departed: { label: 'Đã khởi hành', className: 'departed' },
  completed: { label: 'Hoàn thành', className: 'completed' },
  cancelled: { label: 'Đã hủy', className: 'cancelled' },
  cancelled_by_tour: { label: 'Đã hủy', className: 'cancelled' },
}

export const paymentMeta = {
  unpaid: { label: 'Chưa thanh toán', className: 'unpaid' },
  paid: { label: 'Đã thanh toán', className: 'paid' },
  failed: { label: 'Thất bại', className: 'failed' },
  refunded: { label: 'Hoàn tiền', className: 'refunded' },
}
