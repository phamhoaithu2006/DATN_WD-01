import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { confirmAction } from '../../components/common/AppConfirmDialog.jsx'
import {
  getAdminTourReviews,
  updateAdminTourReviewStatus,
} from '../../services/adminReviewApi'

const STATUS_META = {
  visible: {
    label: 'Đang hiển thị',
    color: '#047857',
    background: '#ecfdf5',
    border: '#a7f3d0',
  },
  spam: {
    label: 'Đánh dấu rác',
    color: '#b91c1c',
    background: '#fef2f2',
    border: '#fecaca',
  },
}

function formatDate(value) {
  if (!value) return '—'

  const normalized = String(value).includes('T')
    ? value
    : String(value).replace(' ', 'T')

  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Stars({ rating = 0 }) {
  const value = Number(rating || 0)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: '#f59e0b', letterSpacing: 1, fontSize: 17 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star}>{star <= value ? '★' : '☆'}</span>
        ))}
      </span>
      <strong style={{ color: '#475569', fontSize: 13 }}>{value}/5</strong>
    </div>
  )
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.visible

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 11px',
        border: `1px solid ${meta.border}`,
        borderRadius: 999,
        background: meta.background,
        color: meta.color,
        fontSize: 12,
        fontWeight: 900,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: meta.color,
        }}
      />
      {meta.label}
    </span>
  )
}

function ActionButton({ children, tone = 'blue', disabled, onClick }) {
  const styles = {
    blue: {
      background: '#eff6ff',
      color: '#1d4ed8',
      border: '#bfdbfe',
      hover: '#dbeafe',
    },
    red: {
      background: '#fff1f2',
      color: '#be123c',
      border: '#fecdd3',
      hover: '#ffe4e6',
    },
  }

  const current = styles[tone]

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={(event) => {
        if (!disabled) event.currentTarget.style.background = current.hover
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = current.background
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 92,
        padding: '9px 13px',
        border: `1px solid ${current.border}`,
        borderRadius: 10,
        background: current.background,
        color: current.color,
        fontSize: 12,
        fontWeight: 900,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'all .18s ease',
      }}
    >
      {children}
    </button>
  )
}

export default function TourReviewDetailManagement() {
  const { tourId } = useParams()

  const [reviews, setReviews] = useState([])
  const [pagination, setPagination] = useState({})
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    rating: '',
    page: 1,
    per_page: 15,
  })
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState(null)
  const [error, setError] = useState('')
  const [tourTitle, setTourTitle] = useState('')

  const params = useMemo(() => {
    const next = {
      tour_id: Number(tourId),
      page: filters.page,
      per_page: filters.per_page,
    }

    if (filters.search.trim()) next.search = filters.search.trim()
    if (filters.rating) next.rating = Number(filters.rating)

    // Trang này chỉ quản lý đánh giá chưa bị ẩn.
    // Khi chọn trạng thái, chỉ cho phép visible hoặc spam.
    if (filters.status === 'visible' || filters.status === 'spam') {
      next.status = filters.status
    }

    return next
  }, [filters, tourId])

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const result = await getAdminTourReviews(params)
      const rawReviews = Array.isArray(result.reviews) ? result.reviews : []

      // Dù backend trả tất cả trạng thái, đánh giá hidden vẫn bị loại khỏi trang này.
      const activeReviews = rawReviews.filter(
        (review) => review.status !== 'hidden',
      )

      setReviews(activeReviews)
      setPagination(result.pagination || {})

      const firstTour = rawReviews.find((review) => review?.tour?.title)?.tour
      if (firstTour?.title) setTourTitle(firstTour.title)
    } catch (loadError) {
      setReviews([])
      setError(
        loadError?.response?.data?.message
          || 'Không thể tải đánh giá của tour.',
      )
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    void loadReviews()
  }, [loadReviews])

  function updateFilter(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: value,
      page: name === 'page' ? value : 1,
    }))
  }

  async function changeStatus(review, status) {
    if (!review?.id || review.status === status) return

    const message = status === 'hidden'
      ? 'Ẩn đánh giá này? Sau khi ẩn, đánh giá sẽ biến mất khỏi trang này và chỉ có thể hiện lại trong trang Đánh giá đã ẩn.'
      : 'Đánh dấu đánh giá này là rác?'

    if (!await confirmAction(message, { title: 'Xác nhận xử lý đánh giá', confirmLabel: status === 'hidden' ? 'Ẩn đánh giá' : 'Đánh dấu rác', tone: 'danger' })) return

    try {
      setActionId(review.id)
      setError('')

      await updateAdminTourReviewStatus(review.id, status)

      if (status === 'hidden') {
        // Ẩn khỏi giao diện ngay lập tức, không cần chờ tải lại.
        setReviews((current) => current.filter((item) => item.id !== review.id))
      } else {
        setReviews((current) => current.map((item) => (
          item.id === review.id ? { ...item, status } : item
        )))
      }
    } catch (actionError) {
      setError(
        actionError?.response?.data?.message
          || 'Không thể cập nhật trạng thái đánh giá.',
      )
    } finally {
      setActionId(null)
    }
  }

  const currentPage = Number(pagination.current_page || filters.page || 1)
  const lastPage = Math.max(Number(pagination.last_page || 1), 1)

  return (
    <div
      style={{
        minHeight: '100%',
        padding: 24,
        background: '#f8fafc',
      }}
    >
      <section
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 18,
          marginBottom: 18,
          padding: '24px 26px',
          border: '1px solid #dbeafe',
          borderRadius: 20,
          background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
          boxShadow: '0 12px 32px rgba(37,99,235,.07)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <span
            style={{
              color: '#2563eb',
              fontSize: 12,
              fontWeight: 950,
              letterSpacing: '.04em',
            }}
          >
            ĐÁNH GIÁ THEO TOUR
          </span>

          <h1
            style={{
              margin: '9px 0 0',
              color: '#0f172a',
              fontSize: 30,
              lineHeight: 1.25,
            }}
          >
            {tourTitle || `Tour #${tourId}`}
          </h1>

          <p style={{ margin: '8px 0 0', color: '#64748b' }}>
            Xem và kiểm duyệt các đánh giá đang hoạt động của tour.
          </p>
        </div>

        <Link
          to="/admin/reviews"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            border: '1px solid #bfdbfe',
            borderRadius: 11,
            background: '#fff',
            color: '#1d4ed8',
            fontSize: 13,
            fontWeight: 900,
            textDecoration: 'none',
          }}
        >
          ← Quay lại danh sách tour
        </Link>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 1fr) 190px 165px',
          gap: 12,
          marginBottom: 16,
          padding: 14,
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          background: '#fff',
          boxShadow: '0 8px 24px rgba(15,23,42,.04)',
        }}
      >
        <input
          value={filters.search}
          onChange={(event) => updateFilter('search', event.target.value)}
          placeholder="Tìm khách hàng, booking, nội dung..."
          style={inputStyle()}
        />

        <select
          value={filters.status}
          onChange={(event) => updateFilter('status', event.target.value)}
          style={inputStyle()}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="visible">Đang hiển thị</option>
          <option value="spam">Đánh dấu rác</option>
        </select>

        <select
          value={filters.rating}
          onChange={(event) => updateFilter('rating', event.target.value)}
          style={inputStyle()}
        >
          <option value="">Tất cả số sao</option>
          {[5, 4, 3, 2, 1].map((rating) => (
            <option key={rating} value={rating}>
              {rating} sao
            </option>
          ))}
        </select>
      </section>

      {error ? (
        <div
          style={{
            marginBottom: 16,
            padding: 14,
            border: '1px solid #fecaca',
            borderRadius: 13,
            background: '#fef2f2',
            color: '#b91c1c',
            fontWeight: 800,
          }}
        >
          {error}
        </div>
      ) : null}

      <section
        style={{
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          borderRadius: 18,
          background: '#fff',
          boxShadow: '0 12px 30px rgba(15,23,42,.05)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              minWidth: 1080,
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {[
                  'Khách hàng',
                  'Booking',
                  'Số sao',
                  'Nội dung',
                  'Trạng thái',
                  'Ngày gửi',
                  'Thao tác',
                ].map((heading) => (
                  <th key={heading} style={headCellStyle()}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={emptyCellStyle()}>
                    Đang tải đánh giá...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} style={emptyCellStyle()}>
                    Không có đánh giá đang hoạt động phù hợp.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => {
                  const reviewer = review.reviewer || review.user || review.customer || {}
                  const booking = review.booking || {}

                  return (
                    <tr key={review.id}>
                      <td style={cellStyle()}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span
                            style={{
                              display: 'grid',
                              placeItems: 'center',
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              background: '#eff6ff',
                              color: '#2563eb',
                              fontWeight: 950,
                              flex: '0 0 auto',
                            }}
                          >
                            {(reviewer.full_name || 'K').trim().charAt(0).toUpperCase()}
                          </span>

                          <div>
                            <strong style={{ color: '#0f172a' }}>
                              {reviewer.full_name || 'Khách hàng'}
                            </strong>
                            <div style={{ marginTop: 4, color: '#94a3b8', fontSize: 12 }}>
                              {reviewer.email || '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={cellStyle()}>
                        <span
                          style={{
                            display: 'inline-flex',
                            padding: '6px 9px',
                            borderRadius: 8,
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            fontSize: 12,
                            fontWeight: 950,
                          }}
                        >
                          {booking.booking_code || `#${review.booking_id || '—'}`}
                        </span>
                      </td>

                      <td style={cellStyle()}>
                        <Stars rating={review.rating} />
                      </td>

                      <td style={{ ...cellStyle(), maxWidth: 390 }}>
                        <p
                          style={{
                            margin: 0,
                            color: '#475569',
                            lineHeight: 1.65,
                          }}
                        >
                          {review.comment || 'Không có nội dung.'}
                        </p>
                      </td>

                      <td style={cellStyle()}>
                        <StatusBadge status={review.status} />
                      </td>

                      <td
                        style={{
                          ...cellStyle(),
                          color: '#64748b',
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDate(review.created_at)}
                      </td>

                      <td style={cellStyle()}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <ActionButton
                            disabled={actionId === review.id}
                            onClick={() => changeStatus(review, 'hidden')}
                          >
                            Ẩn đánh giá
                          </ActionButton>

                          {review.status !== 'spam' ? (
                            <ActionButton
                              tone="red"
                              disabled={actionId === review.id}
                              onClick={() => changeStatus(review, 'spam')}
                            >
                              Đánh dấu rác
                            </ActionButton>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <footer
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 14,
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
          }}
        >
          <span style={{ color: '#64748b', fontSize: 12 }}>
            Trang {currentPage}/{lastPage}
          </span>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              disabled={currentPage <= 1 || loading}
              onClick={() => updateFilter('page', currentPage - 1)}
              style={pageButtonStyle(currentPage <= 1 || loading)}
            >
              ← Trước
            </button>

            <button
              type="button"
              disabled={currentPage >= lastPage || loading}
              onClick={() => updateFilter('page', currentPage + 1)}
              style={pageButtonStyle(currentPage >= lastPage || loading)}
            >
              Sau →
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}

function inputStyle() {
  return {
    width: '100%',
    border: '1px solid #cbd5e1',
    borderRadius: 11,
    padding: '11px 13px',
    background: '#fff',
    color: '#334155',
    outline: 'none',
  }
}

function headCellStyle() {
  return {
    padding: '15px 16px',
    borderBottom: '1px solid #e2e8f0',
    color: '#64748b',
    fontSize: 11,
    textAlign: 'left',
    textTransform: 'uppercase',
    letterSpacing: '.05em',
    whiteSpace: 'nowrap',
  }
}

function cellStyle() {
  return {
    padding: 16,
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle',
  }
}

function emptyCellStyle() {
  return {
    padding: 52,
    textAlign: 'center',
    color: '#64748b',
  }
}

function pageButtonStyle(disabled) {
  return {
    border: '1px solid #bfdbfe',
    borderRadius: 9,
    padding: '8px 13px',
    background: '#fff',
    color: '#1d4ed8',
    fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }
}
