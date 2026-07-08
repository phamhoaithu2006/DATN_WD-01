import { Link } from 'react-router-dom'

function formatDate(value) {
  if (!value) return '—'

  const rawDate = String(value).slice(0, 10)
  const date = new Date(`${rawDate}T00:00:00`)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateTime(value) {
  if (!value) return '—'

  const normalized = String(value).replace(' ', 'T')
  const date = new Date(normalized)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMoney(value) {
  const amount = Number(value)

  if (Number.isNaN(amount)) return '—'

  return `${amount.toLocaleString('vi-VN')}đ`
}

function bookingStatusLabel(status) {
  const labels = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
    canceled: 'Đã hủy',
  }

  return labels[status] || status || 'Không rõ'
}

function paymentStatusLabel(status) {
  const labels = {
    unpaid: 'Chưa thanh toán',
    pending: 'Chờ thanh toán',
    paid: 'Đã thanh toán',
    partially_paid: 'Thanh toán một phần',
    refunded: 'Đã hoàn tiền',
  }

  return labels[status] || status || 'Không rõ'
}

function getParticipants(booking) {
  return Array.isArray(booking?.participants)
    ? booking.participants
    : []
}

export default function TourDepartureBookingModal({
  open,
  loading,
  error,
  payload,
  onClose,
  onPageChange,
}) {
  if (!open) return null

  const departure = payload?.departure
  const bookingsPagination = payload?.bookings || {}
  const bookings = Array.isArray(bookingsPagination?.data)
    ? bookingsPagination.data
    : []

  const currentPage = Number(bookingsPagination?.current_page || 1)
  const lastPage = Number(bookingsPagination?.last_page || 1)
  const totalBookings = Number(bookingsPagination?.total || 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Chi tiết lịch khởi hành
            </p>

            <h2 className="mt-1 text-xl font-black text-slate-900">
              {departure?.tour_title || 'Đang tải thông tin lịch'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-lg font-bold text-slate-600 transition hover:bg-slate-200"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-16 text-center text-slate-500">
              Đang tải chi tiết lịch khởi hành...
            </div>
          ) : error ? (
            <div className="rounded-xl bg-rose-50 p-4 text-rose-700">
              {error}
            </div>
          ) : departure ? (
            <>
              <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">
                    Ngày đi
                  </p>
                  <p className="mt-1 font-black text-slate-900">
                    {formatDate(departure.departure_date)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">
                    Ngày về
                  </p>
                  <p className="mt-1 font-black text-slate-900">
                    {formatDate(departure.return_date)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">
                    Giá hiện tại
                  </p>
                  <p className="mt-1 font-black text-blue-700">
                    {formatMoney(departure.price)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-500">
                    Chỗ còn lại
                  </p>
                  <p className="mt-1 font-black text-emerald-700">
                    {departure.available_slots} / {departure.total_slots}
                  </p>
                </div>
              </div>

              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div>
                  <p className="font-bold text-slate-900">
                    {departure.tour_title}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    Mã tour: {departure.tour_slug || '—'}
                  </p>
                </div>

                {departure.tour_id ? (
                  <Link
                    to={`/admin/tours/${departure.tour_id}`}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    Xem chi tiết tour
                  </Link>
                ) : null}
              </div>

              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Danh sách khách đã đặt
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Có {totalBookings} đơn đặt tour cho lịch này.
                  </p>
                </div>
              </div>

              {bookings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
                  Chưa có khách đặt tour cho lịch khởi hành này.
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((booking) => {
                    const participants = getParticipants(booking)

                    return (
                      <details
                        key={booking.booking_id}
                        className="rounded-xl border border-slate-200 bg-white"
                      >
                        <summary className="cursor-pointer list-none p-4">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                              <p className="font-black text-slate-900">
                                {booking.booking_code}
                              </p>

                              <p className="mt-1 text-sm text-slate-600">
                                {booking.customer?.full_name || 'Khách vãng lai'} ·{' '}
                                {booking.customer?.phone || 'Chưa có số điện thoại'}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                                {bookingStatusLabel(booking.status)}
                              </span>

                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                {paymentStatusLabel(booking.payment_status)}
                              </span>

                              <span className="font-black text-slate-900">
                                {formatMoney(booking.total_amount)}
                              </span>
                            </div>
                          </div>
                        </summary>

                        <div className="border-t border-slate-100 p-4">
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div>
                              <p className="text-xs font-bold uppercase text-slate-500">
                                Người đặt
                              </p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {booking.customer?.full_name || '—'}
                              </p>
                              <p className="text-sm text-slate-600">
                                {booking.customer?.email || '—'}
                              </p>
                              <p className="text-sm text-slate-600">
                                {booking.customer?.phone || '—'}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase text-slate-500">
                                Người liên hệ
                              </p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {booking.contact?.contact_name || '—'}
                              </p>
                              <p className="text-sm text-slate-600">
                                {booking.contact?.contact_email || '—'}
                              </p>
                              <p className="text-sm text-slate-600">
                                {booking.contact?.contact_phone || '—'}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase text-slate-500">
                                Thông tin đơn
                              </p>
                              <p className="mt-1 text-sm text-slate-700">
                                Số khách: {booking.number_of_people}
                              </p>
                              <p className="text-sm text-slate-700">
                                Đơn giá: {formatMoney(booking.unit_price)}
                              </p>
                              <p className="text-sm text-slate-700">
                                Ngày đặt: {formatDateTime(booking.created_at)}
                              </p>
                            </div>
                          </div>

                          {booking.contact?.address ? (
                            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                              <strong>Địa chỉ:</strong> {booking.contact.address}
                            </div>
                          ) : null}

                          {booking.contact?.special_request ? (
                            <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                              <strong>Yêu cầu đặc biệt:</strong>{' '}
                              {booking.contact.special_request}
                            </div>
                          ) : null}

                          <div className="mt-5">
                            <p className="mb-2 text-sm font-black text-slate-900">
                              Danh sách người tham gia ({participants.length})
                            </p>

                            {participants.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                Chưa có thông tin người tham gia.
                              </p>
                            ) : (
                              <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-slate-50 text-left text-slate-500">
                                    <tr>
                                      <th className="p-3">Họ tên</th>
                                      <th className="p-3">Số điện thoại</th>
                                      <th className="p-3">Ngày sinh</th>
                                      <th className="p-3">Giới tính</th>
                                      <th className="p-3">Loại khách</th>
                                      <th className="p-3 text-right">Đơn giá</th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {participants.map((participant) => (
                                      <tr
                                        key={participant.id}
                                        className="border-t border-slate-100"
                                      >
                                        <td className="p-3 font-semibold text-slate-900">
                                          {participant.full_name || '—'}
                                        </td>
                                        <td className="p-3">
                                          {participant.phone || '—'}
                                        </td>
                                        <td className="p-3">
                                          {formatDate(participant.birth_date)}
                                        </td>
                                        <td className="p-3">
                                          {participant.gender || '—'}
                                        </td>
                                        <td className="p-3">
                                          {participant.participant_type || '—'}
                                        </td>
                                        <td className="p-3 text-right font-semibold">
                                          {formatMoney(participant.unit_price)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      </details>
                    )
                  })}
                </div>
              )}

              {lastPage > 1 ? (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange?.(currentPage - 1)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Trước
                  </button>

                  <span className="text-sm font-semibold text-slate-600">
                    Trang {currentPage} / {lastPage}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= lastPage}
                    onClick={() => onPageChange?.(currentPage + 1)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="py-16 text-center text-slate-500">
              Không có dữ liệu lịch khởi hành.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}