import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminPageHeader from '../../../components/admin/AdminPageHeader'
import Icon from '../../../components/customer/Icon'
import { languageApi } from '../../../services/languageApi'

// ─── helpers ───────────────────────────────────────────────
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

// ─── LevelPanel ────────────────────────────────────────────
function LevelPanel({ language, onToast }) {
  const [levels, setLevels]       = useState(language.levels || [])
  const [newLevel, setNewLevel]   = useState('')
  const [editId, setEditId]       = useState(null)
  const [editName, setEditName]   = useState('')
  const [deleteTarget, setDel]    = useState(null)
  const [busy, setBusy]           = useState(false)
  const langId = language.id

  async function addLevel() {
    if (!newLevel.trim()) return
    setBusy(true)
    try {
      const res = await languageApi.createLevel(langId, { level_name: newLevel.trim() })
      setLevels(prev => [...prev, res.data.data])
      setNewLevel('')
      onToast('success', 'Thêm cấp độ thành công.')
    } catch (e) {
      onToast('error', getErrorMessage(e, 'Thêm cấp độ thất bại.'))
    } finally { setBusy(false) }
  }

  async function saveEdit() {
    if (!editName.trim()) return
    setBusy(true)
    try {
      const res = await languageApi.updateLevel(langId, editId, { level_name: editName.trim() })
      setLevels(prev => prev.map(l => l.id === editId ? res.data.data : l))
      setEditId(null)
      onToast('success', 'Cập nhật cấp độ thành công.')
    } catch (e) {
      onToast('error', getErrorMessage(e, 'Cập nhật thất bại.'))
    } finally { setBusy(false) }
  }

  async function deleteLevel() {
    setBusy(true)
    try {
      await languageApi.removeLevel(langId, deleteTarget.id)
      setLevels(prev => prev.filter(l => l.id !== deleteTarget.id))
      setDel(null)
      onToast('success', 'Xóa cấp độ thành công.')
    } catch (e) {
      onToast('error', getErrorMessage(e, 'Xóa thất bại.'))
    } finally { setBusy(false) }
  }

  return (
    <tr>
      <td colSpan={4} style={{ padding: 0, background: '#f8fafc' }}>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ margin: '0 0 12px', fontWeight: 600, fontSize: 13, color: '#374151' }}>
            Cấp độ của {language.name} ({levels.length})
          </p>

          {/* Danh sách level */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {levels.length === 0 && (
              <span style={{ color: '#9ca3af', fontSize: 13 }}>Chưa có cấp độ nào.</span>
            )}
            {levels.map(lv => (
              <div
                key={lv.id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#fff', border: '1px solid #e5e7eb',
                  borderRadius: 20, padding: '4px 8px 4px 12px',
                }}
              >
                {editId === lv.id ? (
                  <>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit()}
                      autoFocus
                      style={{
                        width: 80, padding: '2px 6px', border: '1px solid #d1d5db',
                        borderRadius: 4, fontSize: 12, outline: 'none',
                      }}
                    />
                    <button
                      onClick={saveEdit}
                      disabled={busy}
                      style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}
                    >✓</button>
                    <button
                      onClick={() => setEditId(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#6b7280' }}
                    >✕</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 13, fontWeight: 500, marginRight: '4px' }}>{lv.level_name}</span>
                    <button
                      onClick={() => { setEditId(lv.id); setEditName(lv.level_name) }}
                      title="Sửa"
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, background: '#f3f4f6', borderRadius: '50%', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 0 }}
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button
                      onClick={() => setDel(lv)}
                      title="Xóa"
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, background: '#fef2f2', borderRadius: '50%', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 0 }}
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Thêm level mới */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newLevel}
              onChange={e => setNewLevel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addLevel()}
              placeholder="Nhập cấp độ mới (VD: B2, N1, HSK3...)"
              style={{
                flex: 1, padding: '8px 12px', border: '1px solid #d1d5db',
                borderRadius: 6, fontSize: 13, outline: 'none',
              }}
            />
            <button
              onClick={addLevel}
              disabled={busy || !newLevel.trim()}
              className="support-add-button"
              type="button"
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              + Thêm
            </button>
          </div>
        </div>

        {deleteTarget && (
          <ConfirmModal
            title="Xóa cấp độ?"
            desc={`Xóa cấp độ "${deleteTarget.level_name}" khỏi ${language.name}?`}
            onConfirm={deleteLevel}
            onCancel={() => setDel(null)}
            loading={busy}
          />
        )}
      </td>
    </tr>
  )
}

// ─── Main Page ─────────────────────────────────────────────
function LanguageManagementPage() {
  const [languages, setLanguages]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [expandedId, setExpanded]   = useState(null)
  const [notice, setNotice]         = useState(null)

  // Thêm ngôn ngữ
  const [showAdd, setShowAdd]       = useState(false)
  const [addName, setAddName]       = useState('')
  const [addLevels, setAddLevels]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [addErrors, setAddErrors]   = useState({})

  // Sửa ngôn ngữ
  const [editLang, setEditLang]     = useState(null)
  const [editName, setEditName]     = useState('')
  const [editErrors, setEditErrors] = useState({})

  // Xóa ngôn ngữ
  const [deleteLang, setDeleteLang] = useState(null)
  const [deleting, setDeleting]     = useState(false)

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
      const res = await languageApi.getAll()
      setLanguages(res.data?.data || [])
    } catch (e) {
      openToast('error', getErrorMessage(e, 'Không tải được danh sách ngôn ngữ.'))
    } finally { setLoading(false) }
  }, [openToast])

  useEffect(() => { load() }, [load])

  async function handleAdd(e) {
    e.preventDefault()
    const errors = {}
    if (!addName.trim()) errors.name = 'Vui lòng nhập tên ngôn ngữ.'
    if (Object.keys(errors).length > 0) { setAddErrors(errors); return }

    setSaving(true)
    try {
      const levels = addLevels.split(',').map(s => s.trim()).filter(Boolean)
      await languageApi.create({ name: addName.trim(), levels: levels.length ? levels : undefined })
      openToast('success', 'Thêm ngôn ngữ thành công.')
      setAddName(''); setAddLevels(''); setShowAdd(false); setAddErrors({})
      load()
    } catch (e) {
      const serverErrors = e?.response?.data?.errors
      if (serverErrors) {
        setAddErrors(Object.entries(serverErrors).reduce((acc, [k, v]) => {
          acc[k] = Array.isArray(v) ? v[0] : String(v); return acc
        }, {}))
      } else {
        openToast('error', getErrorMessage(e, 'Thêm ngôn ngữ thất bại.'))
      }
    } finally { setSaving(false) }
  }

  async function handleEdit(e) {
    e.preventDefault()
    const errors = {}
    if (!editName.trim()) errors.name = 'Vui lòng nhập tên ngôn ngữ.'
    if (Object.keys(errors).length > 0) { setEditErrors(errors); return }

    setSaving(true)
    try {
      await languageApi.update(editLang.id, { name: editName.trim() })
      openToast('success', 'Cập nhật thành công.')
      setEditLang(null); setEditErrors({})
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
      await languageApi.remove(deleteLang.id)
      openToast('success', 'Xóa ngôn ngữ thành công.')
      setDeleteLang(null)
      load()
    } catch (e) {
      openToast('error', getErrorMessage(e, 'Xóa thất bại.'))
    } finally { setDeleting(false) }
  }

  return (
    <section className="support-page">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Hướng Dẫn Viên', 'Ngôn Ngữ']}
        title="Quản Lý Ngôn Ngữ"
        description="Quản lý ngôn ngữ và cấp độ cho hướng dẫn viên."
        actions={
          <div className="support-header-actions">
            <Link className="support-back-button" to="/admin/guides">
              <Icon name="chevronRight" size={16} />
              Quay lại danh sách HDV
            </Link>
            <button
              className="support-add-button"
              type="button"
              onClick={() => { setShowAdd(true); setAddName(''); setAddLevels(''); setAddErrors({}) }}
            >
              <span aria-hidden="true">+</span>
              Thêm ngôn ngữ
            </button>
          </div>
        }
      />

      {/* Thống kê */}
      <div className="support-stat-grid centered">
        <div className="support-stat-card blue">
          <strong>{languages.length}</strong>
          <span>Tổng ngôn ngữ</span>
          <small>Toàn bộ ngôn ngữ</small>
        </div>
        <div className="support-stat-card green">
          <strong>{languages.reduce((s, l) => s + (l.levels?.length || 0), 0)}</strong>
          <span>Tổng cấp độ</span>
          <small>Tất cả cấp độ</small>
        </div>
      </div>

      {/* Bảng */}
      <div className="support-content-grid">
        <div className="support-main-panel">
          <div className="support-table-wrap">
            <table className="support-table language-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên ngôn ngữ</th>
                  <th>Số cấp độ</th>
                  <th style={{ textAlign: 'center' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="support-empty-row" colSpan={4}>
                      <div className="support-loading">
                        <span />
                        <p>Đang tải danh sách ngôn ngữ...</p>
                      </div>
                    </td>
                  </tr>
                ) : languages.length === 0 ? (
                  <tr>
                    <td className="support-empty-row" colSpan={4}>
                      <div className="support-empty-state">
                        <strong>Chưa có ngôn ngữ nào</strong>
                        <span>Nhấn "+ Thêm ngôn ngữ" để bắt đầu.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  languages.map((lang, idx) => (
                    <>
                      <tr key={lang.id}>
                        <td>{idx + 1}</td>
                        <td><strong className="support-name">{lang.name}</strong></td>
                        <td>
                          <span className="support-status active" style={{ borderRadius: 20, padding: '3px 12px' }}>
                            {lang.levels?.length || 0} cấp độ
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%' }}>
                            {/* Nút Xem/Ẩn Cấp độ */}
                            <button
                              className={`guide-action-icon ${expandedId === lang.id ? 'active' : ''}`}
                              type="button"
                              title={expandedId === lang.id ? 'Ẩn cấp độ' : 'Xem cấp độ'}
                              onClick={() => setExpanded(expandedId === lang.id ? null : lang.id)}
                              style={{ 
                                display: 'inline-flex', justifyContent: 'center', alignItems: 'center',
                                width: '32px', height: '32px', borderRadius: '8px',
                                border: expandedId === lang.id ? '1px solid #3b82f6' : '1px solid #d1d5db', 
                                background: expandedId === lang.id ? '#eff6ff' : '#fff', 
                                color: expandedId === lang.id ? '#2563eb' : '#374151', cursor: 'pointer'
                              }}
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                {expandedId === lang.id ? (
                                  <polyline points="18 15 12 9 6 15"></polyline>
                                ) : (
                                  <polyline points="6 9 12 15 18 9"></polyline>
                                )}
                              </svg>
                            </button>

                            {/* Nút Sửa */}
                            <button
                              className="guide-action-icon"
                              type="button"
                              title="Sửa"
                              onClick={() => { setEditLang(lang); setEditName(lang.name); setEditErrors({}) }}
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

                            {/* Nút Xóa */}
                            <button
                              className="guide-action-icon danger"
                              type="button"
                              title="Xóa"
                              onClick={() => setDeleteLang(lang)}
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

                      {expandedId === lang.id && (
                        <LevelPanel key={`lv-${lang.id}`} language={lang} onToast={openToast} />
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal thêm ngôn ngữ */}
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
                <h2>Thêm ngôn ngữ mới</h2>
                <p>Nhập tên và cấp độ ban đầu.</p>
              </div>
              <button type="button" onClick={() => setShowAdd(false)}>×</button>
            </div>

            <div className="support-form-grid">
              <label style={{ gridColumn: '1 / -1' }}>
                Tên ngôn ngữ <span style={{ color: '#dc2626' }}>*</span>
                <input
                  value={addName}
                  onChange={e => { setAddName(e.target.value); setAddErrors(p => ({ ...p, name: '' })) }}
                  placeholder="VD: Tiếng Anh"
                  autoFocus
                />
                {addErrors.name && <span className="support-field-error">{addErrors.name}</span>}
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                Cấp độ ban đầu{' '}
                <span style={{ color: '#9ca3af', fontWeight: 400 }}>(tùy chọn, cách nhau bằng dấu phẩy)</span>
                <input
                  value={addLevels}
                  onChange={e => setAddLevels(e.target.value)}
                  placeholder="VD: A1, A2, B1, B2, C1, C2"
                />
                <small style={{ color: '#9ca3af', fontSize: 12 }}>Có thể thêm cấp độ sau khi tạo.</small>
              </label>
            </div>

            <div className="support-modal-actions">
              <button type="button" onClick={() => setShowAdd(false)} disabled={saving}>Hủy</button>
              <button className="primary" type="submit" disabled={saving || !addName.trim()}>
                {saving ? 'Đang lưu...' : 'Thêm ngôn ngữ'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal sửa ngôn ngữ */}
      {editLang && (
        <div
          className="support-modal-backdrop"
          role="presentation"
          onMouseDown={() => setEditLang(null)}
        >
          <form
            className="support-modal"
            noValidate
            onMouseDown={e => e.stopPropagation()}
            onSubmit={handleEdit}
          >
            <div className="support-modal-heading">
              <div>
                <h2>Sửa ngôn ngữ</h2>
                <p>Cập nhật tên ngôn ngữ.</p>
              </div>
              <button type="button" onClick={() => setEditLang(null)}>×</button>
            </div>

            <div className="support-form-grid">
              <label style={{ gridColumn: '1 / -1' }}>
                Tên ngôn ngữ
                <input
                  value={editName}
                  onChange={e => { setEditName(e.target.value); setEditErrors(p => ({ ...p, name: '' })) }}
                  autoFocus
                />
                {editErrors.name && <span className="support-field-error">{editErrors.name}</span>}
              </label>
            </div>

            <div className="support-modal-actions">
              <button type="button" onClick={() => setEditLang(null)} disabled={saving}>Hủy</button>
              <button className="primary" type="submit" disabled={saving || !editName.trim()}>
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm xóa ngôn ngữ */}
      {deleteLang && (
        <ConfirmModal
          title="Xóa ngôn ngữ?"
          desc={`Xóa "${deleteLang.name}" sẽ xóa luôn toàn bộ ${deleteLang.levels?.length || 0} cấp độ. Không thể hoàn tác.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteLang(null)}
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

export default LanguageManagementPage
