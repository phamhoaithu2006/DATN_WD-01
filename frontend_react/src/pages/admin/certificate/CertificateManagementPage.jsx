import { useCallback, useEffect, useState } from 'react'
import AdminPageHeader from '../../../components/admin/AdminPageHeader'
import { certificateApi } from '../../../services/certificateApi'

// ─── Helpers ───────────────────────────────────────────────
function getErrorMessage(error, fallback) {
  const errors = error?.response?.data?.errors
  if (errors) return Object.values(errors).flat().join(' ')
  return error?.response?.data?.message || fallback
}

// ─── ConfirmModal ──────────────────────────────────────────
function ConfirmModal({ title, desc, onConfirm, onCancel, loading }) {
  return (
    <div
      className="support-modal-backdrop"
      role="presentation"
      onMouseDown={onCancel}
    >
      <div
        className="support-delete-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="support-delete-icon">!</div>
        <h3>{title}</h3>
        <p>{desc}</p>
        <div className="support-modal-actions">
          <button type="button" onClick={onCancel} disabled={loading}>Hủy</button>
          <button
            className="danger primary"
            type="button"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Đang xóa...' : 'Xóa'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────
function CertificateManagementPage() {
  const [certificates, setCertificates] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)

  // Thêm chứng chỉ
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addIssuedBy, setAddIssuedBy] = useState('')
  const [saving, setSaving] = useState(false)
  const [addErrors, setAddErrors] = useState({})

  // Sửa chứng chỉ
  const [editCert, setEditCert] = useState(null)
  const [editName, setEditName] = useState('')
  const [editIssuedBy, setEditIssuedBy] = useState('')
  const [editErrors, setEditErrors] = useState({})

  // Xóa chứng chỉ
  const [deleteCert, setDeleteCert] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const openToast = useCallback((type, text) => {
    setNotice({ type, text })
  }, [])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(t)
  }, [notice])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await certificateApi.getAll()
      setCertificates(res.data?.data || [])
    } catch (e) {
      openToast('error', getErrorMessage(e, 'Không tải được danh sách chứng chỉ.'))
    } finally { setLoading(false) }
  }, [openToast])

  useEffect(() => { load() }, [load])

  async function handleAdd(e) {
    e.preventDefault()
    const errors = {}
    if (!addName.trim()) errors.name = 'Vui lòng nhập tên chứng chỉ.'
    if (!addIssuedBy.trim()) errors.issued_by = 'Vui lòng nhập tổ chức cấp.'
    if (Object.keys(errors).length > 0) { setAddErrors(errors); return }

    setSaving(true)
    try {
      await certificateApi.create({ 
        name: addName.trim(), 
        issued_by: addIssuedBy.trim() 
      })
      openToast('success', 'Thêm chứng chỉ thành công.')
      setAddName(''); setAddIssuedBy(''); setShowAdd(false); setAddErrors({})
      load()
    } catch (e) {
      const serverErrors = e?.response?.data?.errors
      if (serverErrors) {
        setAddErrors(Object.entries(serverErrors).reduce((acc, [k, v]) => {
          acc[k] = Array.isArray(v) ? v[0] : String(v); return acc
        }, {}))
      } else {
        openToast('error', getErrorMessage(e, 'Thêm chứng chỉ thất bại.'))
      }
    } finally { setSaving(false) }
  }

  async function handleEdit(e) {
    e.preventDefault()
    const errors = {}
    if (!editName.trim()) errors.name = 'Vui lòng nhập tên chứng chỉ.'
    if (!editIssuedBy.trim()) errors.issued_by = 'Vui lòng nhập tổ chức cấp.'
    if (Object.keys(errors).length > 0) { setEditErrors(errors); return }

    setSaving(true)
    try {
      await certificateApi.update(editCert.id, { 
        name: editName.trim(), 
        issued_by: editIssuedBy.trim() 
      })
      openToast('success', 'Cập nhật thành công.')
      setEditCert(null); setEditErrors({})
      load()
    } catch (e) {
      const serverErrors = e?.response?.data?.errors
      if (serverErrors) {
        setEditErrors(Object.entries(serverErrors).reduce((acc, [k, v]) => {
          acc[k] = Array.isArray(v) ? v[0] : String(v); return acc
        }, {}))
      } else {
        openToast('error', getErrorMessage(e, 'Cập nhật thất bại.'))
      }
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await certificateApi.remove(deleteCert.id)
      openToast('success', 'Xóa chứng chỉ thành công.')
      setDeleteCert(null)
      load()
    } catch (e) {
      openToast('error', getErrorMessage(e, 'Xóa thất bại.'))
    } finally { setDeleting(false) }
  }

  // Đếm số lượng tổ chức phát hành duy nhất để hiển thị thống kê
  const uniqueIssuers = new Set(certificates.map(c => c.issued_by?.trim()).filter(Boolean)).size

  return (
    <section className="support-page">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Hướng Dẫn Viên', 'Chứng Chỉ']}
        title="Quản Lý Chứng Chỉ"
        description="Quản lý các loại chứng chỉ nghề nghiệp của hướng dẫn viên."
        actions={
          <div className="support-header-actions">
            <button
              className="support-add-button"
              type="button"
              onClick={() => { setShowAdd(true); setAddName(''); setAddIssuedBy(''); setAddErrors({}) }}
            >
              <span aria-hidden="true">+</span>
              Thêm chứng chỉ
            </button>
          </div>
        }
      />

      {/* Thống kê */}
      <div className="support-stat-grid">
        <div className="support-stat-card blue">
          <strong>{certificates.length}</strong>
          <span>Tổng chứng chỉ</span>
          <small>Toàn bộ loại chứng chỉ</small>
        </div>
        <div className="support-stat-card green">
          <strong>{uniqueIssuers}</strong>
          <span>Tổ chức cấp</span>
          <small>Các đơn vị phát hành</small>
        </div>
      </div>

      {/* Bảng */}
      <div className="support-content-grid">
        <div className="support-main-panel">
          <div className="support-table-wrap">
            <table className="support-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên chứng chỉ</th>
                  <th>Tổ chức cấp (Issued By)</th>
                  <th style={{ textAlign: 'center' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="support-empty-row" colSpan={4}>
                      <div className="support-loading">
                        <span />
                        <p>Đang tải danh sách chứng chỉ...</p>
                      </div>
                    </td>
                  </tr>
                ) : certificates.length === 0 ? (
                  <tr>
                    <td className="support-empty-row" colSpan={4}>
                      <div className="support-empty-state">
                        <strong>Chưa có chứng chỉ nào</strong>
                        <span>Nhấn "+ Thêm chứng chỉ" để bắt đầu.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  certificates.map((cert, idx) => (
                    <tr key={cert.id}>
                      <td>{idx + 1}</td>
                      <td><strong className="support-name">{cert.name}</strong></td>
                      <td>
                        <span style={{ fontSize: 13, color: '#4b5563' }}>
                          {cert.issued_by}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                          <button
                            className="guide-action-icon"
                            type="button"
                            title="Chỉnh sửa"
                            aria-label="Chỉnh sửa"
                            onClick={() => { 
                              setEditCert(cert); 
                              setEditName(cert.name); 
                              setEditIssuedBy(cert.issued_by); 
                              setEditErrors({}) 
                            }}
                            style={{ 
                              display: 'inline-flex', justifyContent: 'center', alignItems: 'center',
                              width: '32px', height: '32px', borderRadius: '8px',
                              border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer'
                            }}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="guide-action-icon danger"
                            type="button"
                            title="Xóa"
                            aria-label="Xóa"
                            onClick={() => setDeleteCert(cert)}
                            style={{ 
                              display: 'inline-flex', justifyContent: 'center', alignItems: 'center',
                              width: '32px', height: '32px', borderRadius: '8px',
                              border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer'
                            }}
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
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
      </div>

      {/* Modal thêm chứng chỉ */}
      {showAdd && (
        <div
          className="support-modal-backdrop"
          role="presentation"
          onMouseDown={() => setShowAdd(false)}
        >
          <form
            className="support-modal"
            noValidate
            onMouseDown={e => e.stopPropagation()}
            onSubmit={handleAdd}
          >
            <div className="support-modal-heading">
              <div>
                <h2>Thêm chứng chỉ mới</h2>
                <p>Nhập tên chứng chỉ và tổ chức cấp.</p>
              </div>
              <button type="button" onClick={() => setShowAdd(false)}>×</button>
            </div>

            <div className="support-form-grid">
              <label style={{ gridColumn: '1 / -1' }}>
                Tên chứng chỉ <span style={{ color: '#dc2626' }}>*</span>
                <input
                  value={addName}
                  onChange={e => { setAddName(e.target.value); setAddErrors(p => ({ ...p, name: '' })) }}
                  placeholder="VD: Chứng chỉ Hướng dẫn viên Quốc tế"
                  autoFocus
                />
                {addErrors.name && <span className="support-field-error">{addErrors.name}</span>}
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                Tổ chức cấp <span style={{ color: '#dc2626' }}>*</span>
                <input
                  value={addIssuedBy}
                  onChange={e => { setAddIssuedBy(e.target.value); setAddErrors(p => ({ ...p, issued_by: '' })) }}
                  placeholder="VD: Tổng cục Du lịch"
                />
                {addErrors.issued_by && <span className="support-field-error">{addErrors.issued_by}</span>}
              </label>
            </div>

            <div className="support-modal-actions">
              <button type="button" onClick={() => setShowAdd(false)} disabled={saving}>Hủy</button>
              <button className="primary" type="submit" disabled={saving || !addName.trim() || !addIssuedBy.trim()}>
                {saving ? 'Đang lưu...' : 'Thêm chứng chỉ'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal sửa chứng chỉ */}
      {editCert && (
        <div
          className="support-modal-backdrop"
          role="presentation"
          onMouseDown={() => setEditCert(null)}
        >
          <form
            className="support-modal"
            noValidate
            onMouseDown={e => e.stopPropagation()}
            onSubmit={handleEdit}
          >
            <div className="support-modal-heading">
              <div>
                <h2>Sửa chứng chỉ</h2>
                <p>Cập nhật tên và tổ chức cấp chứng chỉ.</p>
              </div>
              <button type="button" onClick={() => setEditCert(null)}>×</button>
            </div>

            <div className="support-form-grid">
              <label style={{ gridColumn: '1 / -1' }}>
                Tên chứng chỉ <span style={{ color: '#dc2626' }}>*</span>
                <input
                  value={editName}
                  onChange={e => { setEditName(e.target.value); setEditErrors(p => ({ ...p, name: '' })) }}
                  autoFocus
                />
                {editErrors.name && <span className="support-field-error">{editErrors.name}</span>}
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                Tổ chức cấp <span style={{ color: '#dc2626' }}>*</span>
                <input
                  value={editIssuedBy}
                  onChange={e => { setEditIssuedBy(e.target.value); setEditErrors(p => ({ ...p, issued_by: '' })) }}
                />
                {editErrors.issued_by && <span className="support-field-error">{editErrors.issued_by}</span>}
              </label>
            </div>

            <div className="support-modal-actions">
              <button type="button" onClick={() => setEditCert(null)} disabled={saving}>Hủy</button>
              <button className="primary" type="submit" disabled={saving || !editName.trim() || !editIssuedBy.trim()}>
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm xóa chứng chỉ */}
      {deleteCert && (
        <ConfirmModal
          title="Xóa chứng chỉ?"
          desc={`Bạn có chắc chắn muốn xóa chứng chỉ "${deleteCert.name}"? Thao tác này không thể hoàn tác.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteCert(null)}
          loading={deleting}
        />
      )}

      {/* Toast */}
      {notice && (
        <div className={`support-toast ${notice.type}`}>
          <div>
            <strong>{notice.type === 'success' ? 'Thành công' : 'Có lỗi xảy ra'}</strong>
            <p>{notice.text}</p>
          </div>
          <button type="button" onClick={() => setNotice(null)}>×</button>
        </div>
      )}
    </section>
  )
}

export default CertificateManagementPage