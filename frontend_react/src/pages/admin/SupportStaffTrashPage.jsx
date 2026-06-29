import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  forceDeleteSupportStaff,
  getTrashedSupportStaffs,
  restoreSupportStaff,
} from '../../services/supportStaffApi'
import '../../styles/support-staff.css'

function getListData(payload) {
  const page = payload?.data?.data

  if (Array.isArray(page)) {
    return page
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  if (Array.isArray(payload)) {
    return payload
  }

  return []
}

function getPaginationMeta(payload) {
  const page = payload?.data?.data && !Array.isArray(payload.data.data)
    ? payload.data.data
    : payload?.data

  if (!page || Array.isArray(page)) {
    return { currentPage: 1, lastPage: 1, total: 0, perPage: 10 }
  }

  return {
    currentPage: page.current_page || 1,
    lastPage: page.last_page || 1,
    total: page.total || 0,
    perPage: page.per_page || 10,
  }
}

function getServerMessage(error, fallback) {
  const errors = error.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  return error.response?.data?.message || fallback
}

function getStaffCode(staff) {
  return `NV${String(staff.id).padStart(3, '0')}`
}

function formatDateTime(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getStaffName(staff) {
  return staff.name || '—'
}

function SupportStaffTrashPage() {
  const [staffList, setStaffList] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 10,
  })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [forceDeleteTarget, setForceDeleteTarget] = useState(null)

  const loadTrash = useCallback(
    async (pageNumber = page) => {
      setLoading(true)

      try {
        const response = await getTrashedSupportStaffs({
          page: pageNumber,
          per_page: 10,
          search: search.trim() || undefined,
        })

        setStaffList(getListData(response))
        setPagination(getPaginationMeta(response))
      } catch (err) {
        if (err.response?.status === 404) {
          setStaffList([])
          setPagination({ currentPage: 1, lastPage: 1, total: 0, perPage: 10 })
          return
        }

        setError(getServerMessage(err, 'Không tải được thùng rác nhân viên hỗ trợ.'))
      } finally {
        setLoading(false)
      }
    },
    [page, search],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTrash(page)
    }, 120)

    return () => window.clearTimeout(timer)
  }, [loadTrash, page])

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
      const response = await restoreSupportStaff(restoreTarget.id)
      setMessage(response.message || 'Đã khôi phục nhân viên hỗ trợ.')
      setRestoreTarget(null)
      await loadTrash(page)
    } catch (err) {
      setError(getServerMessage(err, 'Khôi phục nhân viên hỗ trợ thất bại.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleForceDelete() {
    if (!forceDeleteTarget) return

    try {
      setBusy(true)
      const response = await forceDeleteSupportStaff(forceDeleteTarget.id)
      setMessage(response.message || 'Đã xóa vĩnh viễn nhân viên hỗ trợ.')
      setForceDeleteTarget(null)
      await loadTrash(page)
    } catch (err) {
      setError(getServerMessage(err, 'Xóa vĩnh viễn nhân viên hỗ trợ thất bại.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="support-page support-trash-page">
      <div className="support-heading compact">
        <div>
          <div className="support-breadcrumb">ViVuGo / Quản Lý Nhân Viên Hỗ Trợ</div>
          <h1>Thùng rác nhân viên hỗ trợ</h1>
          <p>Khôi phục hoặc xóa vĩnh viễn các nhân viên đã bị xóa mềm.</p>
        </div>

        <Link className="support-trash-button" to="/admin/support">
          Quay lại danh sách
        </Link>
      </div>

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
                <th>Mã NV</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Ngày xóa</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="support-empty-row" colSpan="6">
                    <div className="support-loading">
                      <span />
                      <p>Đang tải dữ liệu thùng rác...</p>
                    </div>
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td className="support-empty-row" colSpan="6">
                    <div className="support-empty-state">
                      <strong>Chưa có nhân viên nào trong thùng rác</strong>
                      <span>Những nhân viên bị xóa mềm sẽ xuất hiện tại đây.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                staffList.map((staff, index) => (
                  <tr key={staff.id}>
                    <td>{(pagination.currentPage - 1) * pagination.perPage + index + 1}</td>
                    <td>
                      <strong className="support-code">{getStaffCode(staff)}</strong>
                    </td>
                    <td>
                      <strong className="support-name">{getStaffName(staff)}</strong>
                    </td>
                    <td>{staff.email || '—'}</td>
                    <td>{formatDateTime(staff.deleted_at)}</td>
                    <td>
                      <div className="support-actions trash-actions">
                        <button
                          type="button"
                          onClick={() => setRestoreTarget(staff)}
                          disabled={busy}
                        >
                          Khôi phục
                        </button>
                        <button
                          className="danger"
                          type="button"
                          onClick={() => setForceDeleteTarget(staff)}
                          disabled={busy}
                        >
                          Xóa vĩnh viễn
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

      {restoreTarget ? (
        <div className="support-modal-backdrop" role="presentation" onMouseDown={() => !busy && setRestoreTarget(null)}>
          <div className="support-delete-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="support-delete-icon">↺</div>
            <h3>Khôi phục nhân viên hỗ trợ?</h3>
            <p>
              Bạn muốn khôi phục <strong>{getStaffName(restoreTarget)}</strong> trở lại danh sách hoạt động?
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
            <h3>Xóa vĩnh viễn nhân viên hỗ trợ?</h3>
            <p>
              Thao tác này sẽ xóa hoàn toàn <strong>{getStaffName(forceDeleteTarget)}</strong> và không thể khôi phục.
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

export default SupportStaffTrashPage
