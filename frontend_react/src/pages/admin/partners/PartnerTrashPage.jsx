import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { partnerApi } from '../../../services/partnerApi'
import '../../../styles/partner-management.css'

function formatDate(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getMessage(error, fallback) {
  const errors = error.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  return error.response?.data?.message || fallback
}

function unwrapApiData(payload) {
  return payload?.data ?? payload
}

function getListData(payload) {
  const root = unwrapApiData(payload)

  if (Array.isArray(root)) return root
  if (Array.isArray(root?.data)) return root.data
  if (Array.isArray(root?.data?.data)) return root.data.data
  return []
}

function getPaginationMeta(payload) {
  const root = unwrapApiData(payload)
  const meta = root?.data && !Array.isArray(root.data) ? root.data : root

  if (!meta || Array.isArray(meta)) {
    return { currentPage: 1, lastPage: 1, total: 0, perPage: 10 }
  }

  return {
    currentPage: meta.current_page || 1,
    lastPage: meta.last_page || 1,
    total: meta.total || 0,
    perPage: meta.per_page || 10,
  }
}

function getPartnerName(partner) {
  return partner.name || partner.partner_name || partner.company_name || partner.title || '—'
}

function getPartnerCode(partner) {
  return partner.partner_code || partner.code || `DT${String(partner.id).padStart(3, '0')}`
}

function getPartnerType(partner) {
  return (
    partner.service_type_label ||
    partner.serviceType?.name ||
    partner.serviceType?.slug ||
    partner.service_type ||
    partner.type ||
    '—'
  )
}

function PartnerTrashPage() {
  const [partners, setPartners] = useState([])
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 10,
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [forceDeleteTarget, setForceDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const fetchTrashedPartners = useCallback(
    async (pageNumber = page) => {
      try {
        setLoading(true)
        setError('')

        const response = await partnerApi.getTrashed({ page: pageNumber, per_page: 10 })
        setPartners(getListData(response))
        setPagination(getPaginationMeta(response))
      } catch (err) {
        if (err.response?.status === 404) {
          setPartners([])
          setPagination({ currentPage: 1, lastPage: 1, total: 0, perPage: 10 })
          return
        }

        setError(getMessage(err, 'Không thể tải danh sách đối tác đã xóa.'))
      } finally {
        setLoading(false)
      }
    },
    [page],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTrashedPartners(page)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchTrashedPartners, page])

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

      const response = await partnerApi.restore(restoreTarget.id)
      setMessage(response.data?.message || response.message || 'Khôi phục đối tác thành công.')
      setRestoreTarget(null)
      await fetchTrashedPartners(page)
    } catch (err) {
      setError(getMessage(err, 'Khôi phục đối tác thất bại.'))
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

      const response = await partnerApi.forceDelete(forceDeleteTarget.id)
      setMessage(response.data?.message || response.message || 'Đã xóa vĩnh viễn đối tác.')
      setForceDeleteTarget(null)
      await fetchTrashedPartners(page)
    } catch (err) {
      setError(getMessage(err, 'Xóa vĩnh viễn đối tác thất bại.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="partner-trash-page">
      <div className="partner-header compact">
        <div>
          <div className="partner-breadcrumb">ViVuGo / Quản Lý Dịch Vụ Đối Tác</div>
          <h1>Đối tác đã xóa</h1>
          <p>Khôi phục hoặc xóa vĩnh viễn các đối tác đã được đưa vào thùng rác.</p>
        </div>

        <Link className="partner-secondary-button" to="/admin/partners">
          Quay lại danh sách
        </Link>
      </div>

      {message ? <div className="partner-alert success">{message}</div> : null}
      {error ? <div className="partner-alert error">{error}</div> : null}

      <div className="partner-table-wrap">
        <div className="partner-table-scroll">
          <table className="partner-table trash">
            <thead>
              <tr>
                <th>STT</th>
                <th>Tên đối tác</th>
                <th>Mã</th>
                <th>Loại dịch vụ</th>
                <th>Ngày xóa</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="partner-empty-row">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : partners.length > 0 ? (
                partners.map((partner, index) => (
                  <tr key={partner.id}>
                    <td>{(pagination.currentPage - 1) * pagination.perPage + index + 1}</td>
                    <td>
                      <strong>{getPartnerName(partner)}</strong>
                    </td>
                    <td>{getPartnerCode(partner)}</td>
                    <td>{getPartnerType(partner)}</td>
                    <td>{formatDate(partner.deleted_at)}</td>
                    <td>
                      <div className="partner-actions trash-actions">
                        <button
                          type="button"
                          onClick={() => setRestoreTarget(partner)}
                          disabled={busy}
                        >
                          Khôi phục
                        </button>
                        <button
                          className="danger"
                          type="button"
                          onClick={() => setForceDeleteTarget(partner)}
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
                  <td colSpan="6" className="partner-empty-row">
                    Không có đối tác nào đã xóa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination.lastPage > 1 ? (
          <div className="partner-pagination">
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
        <div className="partner-modal-backdrop" role="presentation" onMouseDown={() => !busy && setRestoreTarget(null)}>
          <div className="partner-delete-modal" onMouseDown={(event) => event.stopPropagation()}>
            <h3>Khôi phục đối tác?</h3>
            <p>
              Bạn muốn khôi phục <strong>{getPartnerName(restoreTarget)}</strong> về danh sách hoạt động?
            </p>
            <div className="partner-modal-actions">
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
        <div className="partner-modal-backdrop" role="presentation" onMouseDown={() => !busy && setForceDeleteTarget(null)}>
          <div className="partner-delete-modal" onMouseDown={(event) => event.stopPropagation()}>
            <h3>Xóa vĩnh viễn đối tác?</h3>
            <p>
              Thao tác này sẽ xóa hoàn toàn <strong>{getPartnerName(forceDeleteTarget)}</strong> và không thể khôi phục.
            </p>
            <div className="partner-modal-actions">
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

export default PartnerTrashPage
