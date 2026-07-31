import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getAdminTourReviews,
  updateAdminTourReviewStatus,
} from '../../services/adminReviewApi'

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

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
    <span
      title={`${value} sao`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: '#f59e0b', letterSpacing: 1 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star}>{star <= value ? '★' : '☆'}</span>
        ))}
      </span>

      <strong style={{ color: '#64748b', fontSize: 12 }}>
        {value}/5
      </strong>
    </span>
  )
}

export default function HiddenTourReviews() {
  const [reviews, setReviews] = useState([])
  const [pagination, setPagination] = useState({})
  const [search, setSearch] = useState('')
  const [rating, setRating] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [restoringId, setRestoringId] = useState(null)
  const [error, setError] = useState('')

  const params = useMemo(() => {
    const next = {
      status: 'hidden',
      page,
      per_page: 15,
    }

    if (search.trim()) next.search = search.trim()
    if (rating) next.rating = Number(rating)

    return next
  }, [page, rating, search])

  const loadHiddenReviews = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const result = await getAdminTourReviews(params)

      setReviews(Array.isArray(result.reviews) ? result.reviews : [])
      setPagination(result.pagination || {})
    } catch (loadError) {
      setReviews([])
      setError(
        loadError?.response?.data?.message
          || 'Không thể tải danh sách đánh giá đã ẩn.',
      )
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    void loadHiddenReviews()
  }, [loadHiddenReviews])

  async function handleRestore(review) {
    if (!review?.id) return

    const accepted = window.confirm(
      'Bạn có chắc muốn hiển thị lại đánh giá này?',
    )

    if (!accepted) return

    try {
      setRestoringId(review.id)
      setError('')

      await updateAdminTourReviewStatus(review.id, 'visible')
      await loadHiddenReviews()
    } catch (restoreError) {
      setError(
        restoreError?.response?.data?.message
          || 'Không thể hiển thị lại đánh giá.',
      )
    } finally {
      setRestoringId(null)
    }
  }

  const currentPage = Number(pagination.current_page || page || 1)
  const lastPage = Math.max(Number(pagination.last_page || 1), 1)

  return (
    <div
      style={{
        minHeight: '100%',
        padding: 24,
        background: 'linear-gradient(180deg, #f8fbff, #f1f5f9)',
        color: '#0f172a',
      }}
    >
      <section
        style={{
          marginBottom: 20,
          padding: '24px 26px',
          borderRadius: 22,
          background: 'linear-gradient(135deg, #334155, #475569)',
          color: '#fff',
          boxShadow: '0 18px 40px rgba(15, 23, 42, 0.16)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            padding: '6px 10px',
            borderRadius: 999,
            background: 'rgba(255,255,255,.12)',
            fontSize: 12,
            fontWeight: 900,
          }}
        >
          ĐÁNH GIÁ ĐÃ ẨN
        </span>

        <h1 style={{ margin: '13px 0 0', fontSize: 30 }}>
          Danh sách đánh giá đã ẩn
        </h1>

        <p style={{ margin: '9px 0 0', color: '#e2e8f0' }}>
          Các đánh giá ở đây không hiển thị trên trang chi tiết tour.
        </p>
      </section>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <Link
          to="/admin/reviews"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '10px 14px',
            border: '1px solid #cbd5e1',
            borderRadius: 12,
            background: '#fff',
            color: '#334155',
            fontWeight: 900,
            textDecoration: 'none',
          }}
        >
          ← Quay lại quản lý đánh giá
        </Link>

        <strong style={{ color: '#64748b' }}>
          Tổng: {Number(pagination.total || reviews.length)} đánh giá đã ẩn
        </strong>
      </div>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 1fr) 180px auto',
          gap: 12,
          marginBottom: 16,
          padding: 16,
          border: '1px solid #e2e8f0',
          borderRadius: 18,
          background: '#fff',
        }}
      >
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder="Tìm khách hàng, tour, booking, nội dung..."
          style={{
            width: '100%',
            border: '1px solid #cbd5e1',
            borderRadius: 12,
            padding: '11px 13px',
            outline: 'none',
            background: '#f8fafc',
          }}
        />

        <select
          value={rating}
          onChange={(event) => {
            setRating(event.target.value)
            setPage(1)
          }}
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 12,
            padding: '11px 13px',
            background: '#fff',
            fontWeight: 700,
          }}
        >
          <option value="">Tất cả số sao</option>
          {[5, 4, 3, 2, 1].map((item) => (
            <option key={item} value={item}>
              {item} sao
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => {
            setSearch('')
            setRating('')
            setPage(1)
          }}
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 12,
            padding: '11px 15px',
            background: '#f8fafc',
            color: '#334155',
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          Đặt lại
        </button>
      </section>

      {error ? (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: 14,
            border: '1px solid #fecaca',
            borderRadius: 14,
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
          borderRadius: 20,
          background: '#fff',
          boxShadow: '0 14px 36px rgba(15, 23, 42, 0.05)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              minWidth: 1050,
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {[
                  'Khách hàng',
                  'Tour / Booking',
                  'Số sao',
                  'Nội dung',
                  'Ngày gửi',
                  'Thao tác',
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: '15px 16px',
                      borderBottom: '1px solid #e2e8f0',
                      color: '#64748b',
                      fontSize: 11,
                      textAlign: 'left',
                      textTransform: 'uppercase',
                      letterSpacing: '.05em',
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 48,
                      textAlign: 'center',
                      color: '#64748b',
                    }}
                  >
                    Đang tải đánh giá đã ẩn...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 48,
                      textAlign: 'center',
                      color: '#64748b',
                    }}
                  >
                    Chưa có đánh giá nào bị ẩn.
                  </td>
                </tr>
              ) : (
                reviews.map((review) => {
                  const user = review.user || review.customer || {}
                  const tour = review.tour || {}
                  const booking = review.booking || {}

                  return (
                    <tr key={review.id}>
                      <td style={cellStyle()}>
                        <strong>{user.full_name || 'Khách hàng'}</strong>
                        <div
                          style={{
                            marginTop: 4,
                            color: '#94a3b8',
                            fontSize: 12,
                          }}
                        >
                          {user.email || '—'}
                        </div>
                      </td>

                      <td style={cellStyle()}>
                        <strong>{tour.title || 'Tour chưa cập nhật'}</strong>
                        <div
                          style={{
                            marginTop: 6,
                            color: '#2563eb',
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {booking.booking_code
                            || `Booking #${review.booking_id || '—'}`}
                        </div>
                      </td>

                      <td style={cellStyle()}>
                        <Stars rating={review.rating} />
                      </td>

                      <td style={{ ...cellStyle(), maxWidth: 380 }}>
                        <p
                          style={{
                            margin: 0,
                            color: '#475569',
                            lineHeight: 1.6,
                          }}
                        >
                          {review.comment || 'Không có nội dung.'}
                        </p>
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
                        <button
                          type="button"
                          disabled={restoringId === review.id}
                          onClick={() => handleRestore(review)}
                          style={{
                            border: '1px solid #a7f3d0',
                            borderRadius: 10,
                            padding: '9px 12px',
                            background: '#ecfdf5',
                            color: '#047857',
                            fontSize: 12,
                            fontWeight: 900,
                            cursor: restoringId === review.id
                              ? 'not-allowed'
                              : 'pointer',
                            opacity: restoringId === review.id ? 0.55 : 1,
                          }}
                        >
                          {restoringId === review.id
                            ? 'Đang hiện lại...'
                            : 'Hiện lại'}
                        </button>
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
            gap: 12,
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
              onClick={() => setPage(currentPage - 1)}
              style={pageButtonStyle(currentPage <= 1 || loading)}
            >
              ← Trước
            </button>

            <button
              type="button"
              disabled={currentPage >= lastPage || loading}
              onClick={() => setPage(currentPage + 1)}
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

function cellStyle() {
  return {
    padding: 16,
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
  }
}

function pageButtonStyle(disabled) {
  return {
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    padding: '8px 13px',
    background: '#fff',
    color: '#334155',
    fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }
}