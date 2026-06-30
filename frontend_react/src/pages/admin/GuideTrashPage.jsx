import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import AdminPageHeader from '../../components/admin/AdminPageHeader'
import apiClient from '../../services/apiClient'
import '../../styles/support-staff.css'

function unwrapList(response) {
  const payload = response?.data
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  return []
}

function unwrapMeta(response) {
  const payload = response?.data?.data
  if (!payload || Array.isArray(payload)) {
    return { currentPage: 1, lastPage: 1, total: 0, perPage: 10 }
  }

  return {
    currentPage: payload.current_page || 1,
    lastPage: payload.last_page || 1,
    total: payload.total || 0,
    perPage: payload.per_page || 10,
  }
}

function getMessage(error, fallback) {
  const errors = error.response?.data?.errors
  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  return error.response?.data?.message || fallback
}

function getGuideName(guide) {
  return guide.user?.full_name || guide.user?.name || '—'
}

function getGuideCode(guide) {
  return guide.guide_code || `HDV${String(guide.id).padStart(3, '0')}`
}

function getSpecializationText(guide) {
  const specializations = Array.isArray(guide.specializations) ? guide.specializations : []
  if (specializations.length === 0) return 'Chưa cập nhật'
  return specializations
    .map((item) => item.name || item.specialization_name || item.title || '-')
    .join(', ')
}

function formatDate(value) {
  if (!value) return '—'

  const parsed = new Date(String(value).trim())
  if (Number.isNaN(parsed.getTime())) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

function GuideTrashPage() {
  const [guides, setGuides] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0, perPage: 10 })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [forceDeleteTarget, setForceDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const fetchTrashedGuides = useCallback(async (pageNumber = page) => {
    try {
      setLoading(true)
      setError('')

      const response = await apiClient.get('/admin/guides/trashed', {
        params: { page: pageNumber, per_page: 10, keyword: search.trim() || undefined },
      })

      setGuides(unwrapList(response))
      setPagination(unwrapMeta(response))
    } catch (err) {
      if (err.response?.status === 404) {
        setGuides([])
        setPagination({ currentPage: 1, lastPage: 1, total: 0, perPage: 10 })
        return
      }

      setError(getMessage(err, 'Không tải được danh sách hướng dẫn viên đã xóa.'))
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTrashedGuides(page)
    }, 120)

    return () => window.clearTimeout(timer)
  }, [fetchTrashedGuides, page])

  useEffect(() => {
    if (!message && !error) return undefined

    const timer = window.setTimeout(() => {
      setMessage('')
      setError('')
    }, 3500)

    return () => window.clearTimeout(timer)
  }, [message, error])

  async function handleRestore() {
    if (!restoreTarget) return

    try {
      setBusy(true)
      setMessage('')
      setError('')

      const response = await apiClient.patch(`/admin/guides/${restoreTarget.id}/restore`)
      setMessage(response.data?.message || 'Đã khôi phục hướng dẫn viên.')
      setRestoreTarget(null)
      await fetchTrashedGuides(page)
    } catch (err) {
      setError(getMessage(err, 'Khôi phục hướng dẫn viên thất bại.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleForceDelete() {
    if (!forceDeleteTarget) return

    try {
      setBusy(true)
      setMessage('')
      setError('')

      const response = await apiClient.delete(`/admin/guides/${forceDeleteTarget.id}/force`)
      setMessage(response.data?.message || 'Đã xóa vĩnh viễn hướng dẫn viên.')
      setForceDeleteTarget(null)
      await fetchTrashedGuides(page)
    } catch (err) {
      setError(getMessage(err, 'Xóa vĩnh viễn hướng dẫn viên thất bại.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="support-page support-trash-page">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Quản Lý Hướng Dẫn Viên']}
        title="Thùng rác hướng dẫn viên"
        description="Khôi phục hoặc xóa vĩnh viễn các hướng dẫn viên đã bị xóa mềm."
        actions={
          <Link className="support-trash-button" to="/admin/guides">
            Quay lại danh sách
          </Link>
        }
      />

      {message ? <div className="support-alert success">{message}</div> : null}
      {error ? <div className="support-alert error">{error}</div> : null}

      <div className="support-main-panel">
        <div className="support-filter-bar trash">
          <label className="support-search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Tìm theo tên, email..."
            />
          </label>
        </div>

        <div className="support-table-wrap">
          <table className="support-table trash">
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã HDV</th>
                <th>Họ và tên</th>
                <th>Chuyên môn</th>
                <th>Ngày xóa</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="support-empty-row">
                    <div className="support-loading">
                      <span />
                      <p>Đang tải dữ liệu...</p>
                    </div>
                  </td>
                </tr>
              ) : guides.length > 0 ? (
                guides.map((guide, index) => (
                  <tr key={guide.id}>
                    <td>{(pagination.currentPage - 1) * pagination.perPage + index + 1}</td>
                    <td>
                      <strong className="guide-code">{getGuideCode(guide)}</strong>
                    </td>
                    <td>
                      <strong>{getGuideName(guide)}</strong>
                      <span>{guide.user?.email || '—'}</span>
                    </td>
                    <td>
                      <span>{getSpecializationText(guide)}</span>
                    </td>
                    <td>{formatDate(guide.deleted_at)}</td>
                    <td>
                      <div className="support-actions trash-actions">
                        <button type="button" onClick={() => setRestoreTarget(guide)} disabled={busy}>
                          Khôi phục
                        </button>
                        <button
                          className="danger"
                          type="button"
                          onClick={() => setForceDeleteTarget(guide)}
                          disabled={busy}
                        >
                          Xóa vĩnh viễn
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="support-empty-row">
                    <div className="support-empty-state">
                      <strong>Chưa có hướng dẫn viên nào trong thùng rác</strong>
                      <span>Những hướng dẫn viên bị xóa mềm sẽ xuất hiện tại đây.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination.lastPage > 1 ? (
          <div className="support-pagination">
            <button
              type="button"
              disabled={pagination.currentPage <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              aria-label="Trang trước"
            >
              ←
            </button>
            <span>
              {pagination.currentPage} / {pagination.lastPage}
            </span>
            <button
              type="button"
              disabled={pagination.currentPage >= pagination.lastPage || loading}
              onClick={() => setPage((current) => Math.min(pagination.lastPage, current + 1))}
              aria-label="Trang sau"
            >
              →
            </button>
          </div>
        ) : null}
      </div>

      {restoreTarget ? (
        <div className="support-modal-backdrop" role="presentation" onMouseDown={() => !busy && setRestoreTarget(null)}>
          <div className="support-delete-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="support-delete-icon">↺</div>
            <h3>Khôi phục hướng dẫn viên?</h3>
            <p>
              Bạn muốn khôi phục <strong>{getGuideName(restoreTarget)}</strong> về danh sách hoạt động?
            </p>
            <div className="support-modal-actions">
              <button type="button" onClick={() => setRestoreTarget(null)} disabled={busy}>
                Hủy
              </button>
              <button className="primary" type="button" onClick={handleRestore} disabled={busy}>
                {busy ? 'Đang khôi phục...' : 'Khôi phục'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {forceDeleteTarget ? (
        <div className="support-modal-backdrop" role="presentation" onMouseDown={() => !busy && setForceDeleteTarget(null)}>
          <div className="support-delete-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="support-delete-icon">!</div>
            <h3>Xóa vĩnh viễn hướng dẫn viên?</h3>
            <p>
              Thao tác này sẽ xóa hoàn toàn <strong>{getGuideName(forceDeleteTarget)}</strong> và không thể khôi phục.
            </p>
            <div className="support-modal-actions">
              <button type="button" onClick={() => setForceDeleteTarget(null)} disabled={busy}>
                Hủy
              </button>
              <button className="danger primary" type="button" onClick={handleForceDelete} disabled={busy}>
                {busy ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default GuideTrashPage
