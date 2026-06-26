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

function getListData(payload) {
  const page = payload?.data?.data

  if (Array.isArray(page)) return page
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload)) return payload
  return []
}

function getPartnerName(partner) {
  return partner.name || partner.partner_name || partner.company_name || partner.title || '—'
}

function getPartnerCode(partner) {
  return partner.partner_code || partner.code || `DT${String(partner.id).padStart(3, '0')}`
}

function PartnerTrashPage() {
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [forceDeleteTarget, setForceDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const fetchTrashedPartners = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const response = await partnerApi.getTrashed()
      setPartners(getListData(response))
    } catch (err) {
      setError(getMessage(err, 'Không thể tải danh sách đối tác đã xóa.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTrashedPartners()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [fetchTrashedPartners])

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
      await fetchTrashedPartners()
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
      await fetchTrashedPartners()
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
          <div className="partner-breadcrumb">ViVuGo / Dịch Vụ Đối Tác</div>
          <h1>Đối tác đã xóa mềm</h1>
          <p>Khôi phục hoặc xóa vĩnh viễn các đối tác đã được đưa vào thùng rác.</p>
        </div>

        <Link className="partner-secondary-button" to="/admin/partners">
          Quay lại danh sách
        </Link>
      </div>

      {message ? <div className="partner-alert success">{message}</div> : null}
      {error ? <div className="partner-alert error">{error}</div> : null}

      <div className="partner-table-wrap">
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
                  <td>{index + 1}</td>
                  <td>
                    <strong>{getPartnerName(partner)}</strong>
                  </td>
                  <td>{getPartnerCode(partner)}</td>
                  <td>{partner.service_type || partner.type || '—'}</td>
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
              Thao tác này sẽ xóa hoàn toàn{' '}
              <strong>{getPartnerName(forceDeleteTarget)}</strong> và không thể khôi phục.
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
