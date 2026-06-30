import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import AdminPageHeader from '../../components/admin/AdminPageHeader'
import apiClient from '../../services/apiClient'

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
    return { currentPage: 1, lastPage: 1, total: 0 }
  }

  return {
    currentPage: payload.current_page || 1,
    lastPage: payload.last_page || 1,
    total: payload.total || 0,
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

function GuideTrashPage() {
  const [guides, setGuides] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [forceDeleteTarget, setForceDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 })

  const fetchTrashedGuides = useCallback(
    async (page = pagination.currentPage) => {
      try {
        setLoading(true)
        setError('')

        const response = await apiClient.get('/admin/guides/trashed', {
          params: { page, per_page: 10 },
        })
        setGuides(unwrapList(response))
        setPagination(unwrapMeta(response))
      } catch (err) {
        if (err.response?.status === 404) {
          setGuides([])
          setPagination({ currentPage: 1, lastPage: 1, total: 0 })
          return
        }

        setError(getMessage(err, 'Không thể tải danh sách hướng dẫn viên đã xóa.'))
      } finally {
        setLoading(false)
      }
    },
    [pagination.currentPage],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTrashedGuides(1)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchTrashedGuides])

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
      setMessage(response.data?.message || 'Khôi phục hướng dẫn viên thành công.')
      setRestoreTarget(null)
      await fetchTrashedGuides(pagination.currentPage)
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
      await fetchTrashedGuides(pagination.currentPage)
    } catch (err) {
      setError(getMessage(err, 'Xóa vĩnh viễn hướng dẫn viên thất bại.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="guide-page guide-trash-page">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Quản Lý Hướng Dẫn Viên']}
        title="Hướng Dẫn Viên Đã Xóa"
        description="Khôi phục hoặc xóa vĩnh viễn các hướng dẫn viên đã được xóa mềm."
        actions={
          <Link className="guide-trash-button" to="/admin/guides">
            Quay lại danh sách
          </Link>
        }
      />

      {message ? <div className="guide-alert success">{message}</div> : null}
      {error ? <div className="guide-alert error">{error}</div> : null}

      <div className="guide-table-wrap">
        <table className="guide-table trash">
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
                <td colSpan="6">Đang tải dữ liệu...</td>
              </tr>
            ) : guides.length > 0 ? (
              guides.map((guide, index) => (
                <tr key={guide.id}>
                  <td>{(pagination.currentPage - 1) * 10 + index + 1}</td>
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
                  <td>
                    {guide.deleted_at
                      ? new Intl.DateTimeFormat('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        }).format(new Date(guide.deleted_at))
                      : '—'}
                  </td>
                  <td>
                    <div className="guide-actions trash-actions">
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
                <td colSpan="6">Chưa có hướng dẫn viên nào trong thùng rác.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination.lastPage > 1 ? (
        <div className="guide-pagination">
          <button
            type="button"
            disabled={pagination.currentPage <= 1 || loading}
            onClick={() => fetchTrashedGuides(pagination.currentPage - 1)}
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
            onClick={() => fetchTrashedGuides(pagination.currentPage + 1)}
            aria-label="Trang sau"
          >
            →
          </button>
        </div>
      ) : null}

      {restoreTarget ? (
        <div className="guide-modal-backdrop" role="presentation" onMouseDown={() => !busy && setRestoreTarget(null)}>
          <div className="guide-modal guide-delete-modal" onMouseDown={(event) => event.stopPropagation()}>
            <h3>Khôi phục hướng dẫn viên?</h3>
            <p>
              Bạn muốn khôi phục <strong>{getGuideName(restoreTarget)}</strong> về danh sách hoạt động?
            </p>
            <div className="guide-modal-actions">
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
        <div className="guide-modal-backdrop" role="presentation" onMouseDown={() => !busy && setForceDeleteTarget(null)}>
          <div className="guide-modal guide-delete-modal" onMouseDown={(event) => event.stopPropagation()}>
            <h3>Xóa vĩnh viễn hướng dẫn viên?</h3>
            <p>
              Thao tác này sẽ xóa hoàn toàn <strong>{getGuideName(forceDeleteTarget)}</strong> và không thể khôi phục.
            </p>
            <div className="guide-modal-actions">
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
