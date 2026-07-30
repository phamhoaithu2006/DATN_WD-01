import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminTourReviews } from '../../services/adminReviewApi'

const BLUE = {
  primary: '#2563eb',
  dark: '#1d4ed8',
  navy: '#0f172a',
  soft: '#eff6ff',
  softer: '#f8fbff',
  border: '#dbeafe',
  muted: '#64748b',
  green: '#059669',
  orange: '#ea580c',
  red: '#dc2626',
}

function Stars({ rating = 0 }) {
  const value = Number(rating || 0)

  return (
    <span
      title={`${value.toFixed(1)} sao`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          color: '#f59e0b',
          fontSize: 16,
          letterSpacing: 1,
        }}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star}>
            {star <= Math.round(value) ? '★' : '☆'}
          </span>
        ))}
      </span>

      <strong
        style={{
          color: '#334155',
          fontSize: 13,
        }}
      >
        {value.toFixed(2)}
      </strong>
    </span>
  )
}

function TourThumb({ title }) {
  return (
    <span
      style={{
        display: 'grid',
        flex: '0 0 auto',
        placeItems: 'center',
        width: 74,
        height: 54,
        borderRadius: 12,
        background:
          'linear-gradient(135deg, #bfdbfe 0%, #dbeafe 50%, #e0e7ff 100%)',
        color: BLUE.dark,
        fontSize: 23,
        fontWeight: 900,
        boxShadow: 'inset 0 0 0 1px rgba(37,99,235,.12)',
      }}
      title={title}
    >
      🗺
    </span>
  )
}

export default function ReviewManagement() {
  const [activeTab, setActiveTab] = useState('tour')
  const [reviews, setReviews] = useState([])
  const [summary, setSummary] = useState({})
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('reviews_desc')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadReviews = useCallback(async () => {
    if (activeTab !== 'tour') return

    try {
      setLoading(true)
      setError('')

      const result = await getAdminTourReviews({
        per_page: 100,
      })

      setReviews(Array.isArray(result.reviews) ? result.reviews : [])
      setSummary(result.summary || {})
    } catch (loadError) {
      setReviews([])
      setSummary({})
      setError(
        loadError?.response?.data?.message
          || 'Không thể tải danh sách đánh giá tour.',
      )
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    void loadReviews()
  }, [loadReviews])

  const groupedTours = useMemo(() => {
    const map = new Map()

    reviews.forEach((review) => {
      const tour = review.tour || {}
      const id = Number(tour.id || review.tour_id)

      if (!id) return

      if (!map.has(id)) {
        map.set(id, {
          id,
          title: tour.title || `Tour #${id}`,
          code: tour.code || tour.slug || `TOUR-${id}`,
          total: 0,
          visible: 0,
          hidden: 0,
          spam: 0,
          ratingTotal: 0,
        })
      }

      const item = map.get(id)
      item.total += 1
      item.ratingTotal += Number(review.rating || 0)

      if (review.status === 'visible') item.visible += 1
      if (review.status === 'hidden') item.hidden += 1
      if (review.status === 'spam') item.spam += 1
    })

    const keyword = search.trim().toLowerCase()

    const list = Array.from(map.values())
      .map((item) => ({
        ...item,
        average: item.total ? item.ratingTotal / item.total : 0,
      }))
      .filter((item) => {
        if (!keyword) return true

        return (
          item.title.toLowerCase().includes(keyword)
          || item.code.toLowerCase().includes(keyword)
        )
      })

    return list.sort((a, b) => {
      if (sort === 'reviews_asc') return a.total - b.total
      if (sort === 'rating_desc') return b.average - a.average
      if (sort === 'rating_asc') return a.average - b.average
      if (sort === 'name_asc') return a.title.localeCompare(b.title, 'vi')

      return b.total - a.total
    })
  }, [reviews, search, sort])

  const totalTours = groupedTours.length

  return (
    <div
      style={{
        minHeight: '100%',
        padding: 24,
        background:
          'linear-gradient(180deg, #f8fbff 0%, #f8fafc 48%, #f1f5f9 100%)',
        color: BLUE.navy,
      }}
    >
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 22,
          padding: '28px 30px',
          border: '1px solid #dbeafe',
          borderRadius: 22,
          background:
            'linear-gradient(135deg, #ffffff 0%, #eff6ff 58%, #dbeafe 100%)',
          boxShadow: '0 16px 40px rgba(37, 99, 235, 0.08)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: -90,
            top: -115,
            width: 310,
            height: 310,
            borderRadius: '50%',
            background: 'rgba(96,165,250,.12)',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 32,
                lineHeight: 1.2,
                fontWeight: 950,
                letterSpacing: '-0.03em',
              }}
            >
              Quản lý đánh giá
            </h1>

            <p
              style={{
                margin: '9px 0 0',
                color: BLUE.muted,
                fontSize: 14,
              }}
            >
              Theo dõi và quản lý đánh giá của khách hàng theo từng tour.
            </p>
          </div>

          <Link
            to="/admin/reviews/hidden"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              padding: '11px 15px',
              border: '1px solid #bfdbfe',
              borderRadius: 11,
              background: '#fff',
              color: BLUE.dark,
              fontSize: 13,
              fontWeight: 900,
              textDecoration: 'none',
              boxShadow: '0 8px 20px rgba(37, 99, 235, 0.08)',
            }}
          >
            ◌ Đánh giá đã ẩn
          </Link>
        </div>
      </section>

      <div
        style={{
          display: 'inline-flex',
          gap: 6,
          marginBottom: 20,
          padding: 6,
          border: '1px solid #dbeafe',
          borderRadius: 14,
          background: '#fff',
          boxShadow: '0 8px 24px rgba(37, 99, 235, 0.06)',
        }}
      >
        {[
          { key: 'tour', label: 'Đánh giá tour', icon: '🗺' },
          { key: 'guide', label: 'Đánh giá HDV', icon: '🧭' },
        ].map((tab) => {
          const active = activeTab === tab.key

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                border: 0,
                borderRadius: 10,
                padding: '11px 17px',
                background: active ? BLUE.soft : 'transparent',
                color: active ? BLUE.dark : BLUE.muted,
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: active ? 'inset 0 0 0 1px #bfdbfe' : 'none',
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'guide' ? (
        <section
          style={{
            display: 'grid',
            placeItems: 'center',
            minHeight: 370,
            padding: 36,
            border: '1px solid #dbeafe',
            borderRadius: 20,
            background: '#fff',
            textAlign: 'center',
            boxShadow: '0 12px 34px rgba(37, 99, 235, 0.06)',
          }}
        >
          <div>
            <div
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 76,
                height: 76,
                margin: '0 auto',
                borderRadius: 22,
                background: BLUE.soft,
                color: BLUE.dark,
                fontSize: 34,
              }}
            >
              🧭
            </div>

            <h2
              style={{
                margin: '18px 0 8px',
                fontSize: 22,
              }}
            >
              Quản lý đánh giá hướng dẫn viên
            </h2>

            <p
              style={{
                maxWidth: 540,
                margin: '0 auto',
                color: BLUE.muted,
                lineHeight: 1.65,
              }}
            >
              Tab quản lý đánh giá HDV được giữ nguyên. Bạn có thể gắn API danh
              sách đánh giá HDV vào khu vực này khi backend đã trả dữ liệu.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section
            style={{
              overflow: 'hidden',
              border: '1px solid #dbeafe',
              borderRadius: 20,
              background: '#fff',
              boxShadow: '0 14px 36px rgba(37, 99, 235, 0.06)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: 16,
                borderBottom: '1px solid #e2e8f0',
                flexWrap: 'wrap',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  minWidth: 280,
                  flex: '1 1 380px',
                  padding: '0 13px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 11,
                  background: '#fff',
                }}
              >
                <span style={{ color: '#94a3b8' }}>⌕</span>

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm kiếm tour..."
                  style={{
                    width: '100%',
                    border: 0,
                    outline: 0,
                    padding: '11px 0',
                    background: 'transparent',
                    color: BLUE.navy,
                  }}
                />
              </label>

              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                style={{
                  minWidth: 190,
                  border: '1px solid #cbd5e1',
                  borderRadius: 11,
                  padding: '11px 13px',
                  background: '#fff',
                  color: '#334155',
                  fontWeight: 700,
                }}
              >
                <option value="reviews_desc">Nhiều đánh giá nhất</option>
                <option value="reviews_asc">Ít đánh giá nhất</option>
                <option value="rating_desc">Điểm cao nhất</option>
                <option value="rating_asc">Điểm thấp nhất</option>
                <option value="name_asc">Tên tour A-Z</option>
              </select>
            </div>

            {error ? (
              <div
                role="alert"
                style={{
                  margin: 16,
                  padding: 14,
                  border: '1px solid #fecaca',
                  borderRadius: 12,
                  background: '#fef2f2',
                  color: '#b91c1c',
                  fontWeight: 800,
                }}
              >
                {error}
              </div>
            ) : null}

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
                      'Tour',
                      'Tổng đánh giá',
                      'Điểm trung bình',
                      'Đang hiển thị',
                      'Đã ẩn',
                      'Đánh dấu rác',
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
                          whiteSpace: 'nowrap',
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
                        colSpan={7}
                        style={{
                          padding: 52,
                          textAlign: 'center',
                          color: BLUE.muted,
                        }}
                      >
                        Đang tải danh sách tour...
                      </td>
                    </tr>
                  ) : groupedTours.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          padding: 52,
                          textAlign: 'center',
                          color: BLUE.muted,
                        }}
                      >
                        Chưa có tour phù hợp.
                      </td>
                    </tr>
                  ) : (
                    groupedTours.map((tour) => {
                      const visiblePercent = tour.total
                        ? ((tour.visible / tour.total) * 100).toFixed(1)
                        : '0.0'
                      const hiddenPercent = tour.total
                        ? ((tour.hidden / tour.total) * 100).toFixed(1)
                        : '0.0'
                      const spamPercent = tour.total
                        ? ((tour.spam / tour.total) * 100).toFixed(1)
                        : '0.0'

                      return (
                        <tr key={tour.id}>
                          <td style={cellStyle()}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                              }}
                            >
                              <TourThumb title={tour.title} />

                              <div>
                                <strong
                                  style={{
                                    display: 'block',
                                    maxWidth: 320,
                                    color: BLUE.navy,
                                    fontSize: 14,
                                    lineHeight: 1.45,
                                  }}
                                >
                                  {tour.title}
                                </strong>

                                <span
                                  style={{
                                    display: 'block',
                                    marginTop: 4,
                                    color: '#94a3b8',
                                    fontSize: 11,
                                  }}
                                >
                                  Mã tour: {tour.code}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td style={cellStyle()}>
                            <strong
                              style={{
                                display: 'block',
                                color: BLUE.navy,
                                fontSize: 16,
                              }}
                            >
                              {tour.total}
                            </strong>

                            <span
                              style={{
                                color: '#94a3b8',
                                fontSize: 11,
                              }}
                            >
                              đánh giá
                            </span>
                          </td>

                          <td style={cellStyle()}>
                            <Stars rating={tour.average} />
                          </td>

                          <td style={cellStyle()}>
                            <strong style={{ color: BLUE.green }}>
                              {tour.visible}
                            </strong>

                            <div
                              style={{
                                marginTop: 4,
                                color: BLUE.green,
                                fontSize: 11,
                              }}
                            >
                              ({visiblePercent}%)
                            </div>
                          </td>

                          <td style={cellStyle()}>
                            <strong style={{ color: BLUE.orange }}>
                              {tour.hidden}
                            </strong>

                            <div
                              style={{
                                marginTop: 4,
                                color: BLUE.orange,
                                fontSize: 11,
                              }}
                            >
                              ({hiddenPercent}%)
                            </div>
                          </td>

                          <td style={cellStyle()}>
                            <strong style={{ color: BLUE.red }}>
                              {tour.spam}
                            </strong>

                            <div
                              style={{
                                marginTop: 4,
                                color: BLUE.red,
                                fontSize: 11,
                              }}
                            >
                              ({spamPercent}%)
                            </div>
                          </td>

                          <td style={cellStyle()}>
                            <Link
                              to={`/admin/reviews/tours/${tour.id}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 9,
                                padding: '9px 12px',
                                border: '1px solid #bfdbfe',
                                borderRadius: 10,
                                background: BLUE.soft,
                                color: BLUE.dark,
                                fontSize: 12,
                                fontWeight: 900,
                                textDecoration: 'none',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Xem đánh giá
                              <span>›</span>
                            </Link>
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
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '14px 16px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  color: BLUE.muted,
                  fontSize: 12,
                }}
              >
                Hiển thị {totalTours} tour có đánh giá
              </span>

              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 34,
                  height: 34,
                  borderRadius: 9,
                  background: BLUE.primary,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                1
              </span>
            </footer>
          </section>
        </>
      )}
    </div>
  )
}

function cellStyle() {
  return {
    padding: 16,
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle',
  }
}