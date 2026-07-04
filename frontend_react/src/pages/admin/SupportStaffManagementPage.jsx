import { Link } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { getAccountRoles, getAccounts } from '../../services/adminAccountApi'
import {
  createSupportStaff,
  deleteSupportStaff,
  deleteSupportStaffAvatar,
  getSupportStaff,
  getSupportStaffStatistics,
  getSupportStaffs,
  updateSupportStaff,
  uploadSupportStaffAvatar,
} from '../../services/supportStaffApi'
import '../../styles/support-staff.css'

const SUPPORT_STAFF_ROLE_NAME = 'support staff'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'inactive', label: 'Ngừng hoạt động' },
  { value: 'hidden', label: 'Tạm khóa' },
]

const SPECIALIZATION_OPTIONS = [
  { value: 'noi_dia', label: 'Nội địa' },
  { value: 'quoc_te', label: 'Quốc tế' },
]

const EMPTY_FORM = {
  account_id: '',
  name: '',
  email: '',
  specialization: '',
  experience_years: '',
  status: '',
}

function initials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(-2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || 'NV'
  )
}

function formatDateTime(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getServerMessage(error, fallback) {
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

function getStatisticsData(payload) {
  return payload?.data || {}
}

function getStatusLabel(status) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || status
}

function getSpecializationLabel(value) {
  return SPECIALIZATION_OPTIONS.find((item) => item.value === value)?.label || value || '—'
}

function getAccountLabel(account) {
  return account?.full_name || account?.name || 'Chưa có tên'
}

function getCurrentAccountId(staff, accounts) {
  const staffName = (staff?.name || '').trim().toLowerCase()
  const staffEmail = (staff?.email || '').trim().toLowerCase()

  const match = accounts.find((account) => {
    const accountName = (account?.full_name || account?.name || '').trim().toLowerCase()
    const accountEmail = (account?.email || '').trim().toLowerCase()

    return (
      (staffName && accountName === staffName) ||
      (staffEmail && accountEmail === staffEmail)
    )
  })

  return match?.id ? String(match.id) : ''
}

function validateForm(form, editing) {
  const errors = {}

  if (editing) {
    if (!form.name.trim()) {
      errors.name = 'Vui lòng nhập họ tên.'
    } else if (form.name.trim().length > 255) {
      errors.name = 'Họ tên tối đa 255 ký tự.'
    }
  } else if (!form.account_id) {
    errors.account_id = 'Chọn NVHT'
  }

  if (!form.specialization) {
    errors.specialization = 'Vui lòng chọn chuyên môn.'
  }

  const experienceYears = Number(form.experience_years)

  if (
    form.experience_years === '' ||
    !Number.isInteger(experienceYears) ||
    experienceYears < 0
  ) {
    errors.experience_years = 'Số năm kinh nghiệm phải là số nguyên từ 0.'
  }

  if (!form.status || !STATUS_OPTIONS.some((item) => item.value === form.status)) {
    errors.status = 'Trạng thái không hợp lệ.'
  }

  return errors
}

function makeToast(type, text) {
  return { id: Date.now(), type, text }
}

function revokePreviewUrl(url) {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

function SupportAvatar({ avatarUrl, name, tone = 0, className = '' }) {
  return (
    <span
      className={`support-avatar ${avatarUrl ? 'is-image' : `tone-${tone % 5}`} ${className}`.trim()}
      title={name}
    >
      {avatarUrl ? <img src={avatarUrl} alt={name || 'Ảnh đại diện'} /> : initials(name)}
    </span>
  )
}

function ActionIcon({ type }) {
  if (type === 'detail') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12s3.5-6 8-6 8 6 8 6-3.5 6-8 6-8-6-8-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    )
  }

  if (type === 'edit') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0 0-3L16.5 4a2.1 2.1 0 0 0-3 0L3 14.5V20Z" />
        <path d="M13.5 6.5 17.5 10.5" />
      </svg>
    )
  }

  if (type === 'trash') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M6 7l1 13h10l1-13" />
        <path d="M9 7V4h6v3" />
      </svg>
    )
  }

  return null
}

function SupportStaffFormModal({
  form,
  errors,
  saving,
  accountOptions,
  avatarFile,
  avatarPreviewUrl,
  avatarCurrentUrl,
  avatarInputRef,
  avatarRemoveRequested,
  onChange,
  onPickAccount,
  onPickAvatar,
  onOpenAvatarPicker,
  onClearSelectedAvatar,
  onRequestRemoveCurrentAvatar,
  onClose,
  onSubmit,
  editing,
}) {
  const avatarDisplayUrl = avatarPreviewUrl || (avatarRemoveRequested ? '' : avatarCurrentUrl)

  return (
    <div className="support-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form
        className="support-modal"
        noValidate
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
      >
        <div className="support-modal-heading">
          <div>
            <h2>{editing ? 'Cập nhật nhân viên hỗ trợ' : 'Thêm nhân viên hỗ trợ'}</h2>
            <p>Thông tin được lưu trực tiếp.</p>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="support-form-grid">
          <label>
            Họ và tên
            {editing ? (
              <input value={form.name} onChange={onChange('name')} readOnly />
            ) : (
              <select value={form.account_id} onChange={onPickAccount}>
                <option value="">Chọn NVHT</option>
                {accountOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {getAccountLabel(account)}
                  </option>
                ))}
              </select>
            )}
            {errors.name ? <span className="support-field-error">{errors.name}</span> : null}
            {errors.account_id ? <span className="support-field-error">{errors.account_id}</span> : null}
          </label>

          <label>
            Chuyên môn
            <select value={form.specialization} onChange={onChange('specialization')}>
              <option value="" disabled>
                Chọn chuyên môn
              </option>
              {SPECIALIZATION_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {errors.specialization ? <span className="support-field-error">{errors.specialization}</span> : null}
          </label>

          <label>
            Số năm kinh nghiệm
            <input
              min="0"
              type="number"
              value={form.experience_years}
              onChange={onChange('experience_years')}
              placeholder="Nhập số năm kinh nghiệm"
            />
            {errors.experience_years ? (
              <span className="support-field-error">{errors.experience_years}</span>
            ) : null}
          </label>

          <label>
            Trạng thái
            <select value={form.status} onChange={onChange('status')}>
              <option value="" disabled>
                Chọn trạng thái
              </option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            {errors.status ? <span className="support-field-error">{errors.status}</span> : null}
          </label>

          <label className="support-form-wide">
            Ảnh đại diện
            <div className="guide-avatar-upload guide-avatar-upload-wide">
              <input
                ref={avatarInputRef}
                accept="image/*"
                className="guide-avatar-input"
                type="file"
                onChange={onPickAvatar}
              />
              <div className="guide-avatar-preview">
                {avatarDisplayUrl ? (
                  <img
                    alt={form.name || 'Ảnh đại diện nhân viên hỗ trợ'}
                    src={avatarDisplayUrl}
                  />
                ) : (
                  <span>Chưa có ảnh</span>
                )}
              </div>
              <div className="guide-avatar-upload-panel">
                <button className="guide-avatar-upload-btn" type="button" onClick={onOpenAvatarPicker}>
                  {avatarCurrentUrl ? 'Đổi ảnh đại diện' : 'Chọn ảnh đại diện'}
                </button>
                <span className="guide-avatar-upload-meta">
                  {avatarFile
                    ? `Đã chọn: ${avatarFile.name}`
                    : avatarRemoveRequested
                      ? 'Đã chọn xóa avatar hiện tại.'
                    : avatarCurrentUrl
                      ? 'Đang dùng ảnh đại diện hiện tại.'
                      : 'Hỗ trợ JPG, PNG hoặc WebP tối đa 2MB.'}
                </span>
                {avatarFile ? (
                  <button className="guide-avatar-action" type="button" onClick={onClearSelectedAvatar}>
                    Hủy ảnh đã chọn
                  </button>
                ) : null}
                {editing && (avatarCurrentUrl || avatarRemoveRequested) && !avatarFile ? (
                  <button
                    className="guide-avatar-action"
                    type="button"
                    onClick={onRequestRemoveCurrentAvatar}
                  >
                    {avatarRemoveRequested ? 'Hoàn tác xóa avatar' : 'Xóa avatar hiện tại'}
                  </button>
                ) : null}
              </div>
            </div>
          </label>
        </div>

        <div className="support-modal-actions">
          <button type="button" onClick={onClose}>
            Hủy
          </button>
          <button className="primary" disabled={saving} type="submit">
            {saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Thêm nhân viên'}
          </button>
        </div>
      </form>
    </div>
  )
}

function SupportStaffDetailModal({ staff, loading, deletingAvatar, onClose, onDeleteAvatar }) {
  return (
    <div className="support-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="support-modal support-detail-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="support-modal-heading">
          <div>
            <h2>Chi tiết nhân viên hỗ trợ</h2>
            <p>{staff ? `Mã hiển thị: NV${String(staff.id).padStart(3, '0')}` : 'Đang tải...'}</p>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        {loading ? (
          <div className="support-empty-state">Đang tải dữ liệu chi tiết...</div>
        ) : (
          <>
            <div className="support-detail-profile">
              <SupportAvatar
                avatarUrl={staff?.avatar_url}
                className="support-avatar-large"
                name={staff?.name}
              />
              <div>
                <h3>{staff?.name || '—'}</h3>
                <em className={`support-status ${staff?.status || 'inactive'}`}>
                  {getStatusLabel(staff?.status)}
                </em>
                {staff?.avatar_url ? (
                  <button
                    className="guide-avatar-action"
                    type="button"
                    disabled={deletingAvatar}
                    onClick={onDeleteAvatar}
                  >
                    {deletingAvatar ? 'Đang xóa avatar...' : 'Xóa avatar'}
                  </button>
                ) : null}
              </div>
            </div>

            <dl className="support-detail-grid">
              <div>
                <dt>Email</dt>
                <dd>{staff?.email || '—'}</dd>
              </div>
              <div>
                <dt>Chuyên môn</dt>
                <dd>{getSpecializationLabel(staff?.specialization)}</dd>
              </div>
              <div>
                <dt>Số năm kinh nghiệm</dt>
                <dd>{Number(staff?.experience_years || 0)} năm</dd>
              </div>
              <div>
                <dt>Ngày tạo</dt>
                <dd>{formatDateTime(staff?.created_at)}</dd>
              </div>
              <div>
                <dt>Cập nhật gần nhất</dt>
                <dd>{formatDateTime(staff?.updated_at)}</dd>
              </div>
            </dl>

            <div className="support-modal-actions">
              <button className="primary" type="button" onClick={onClose}>
                Đóng
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function SupportStaffManagementPage() {
  const [staffList, setStaffList] = useState([])
  const [accountOptions, setAccountOptions] = useState([])
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    hidden: 0,
    average_rating: 0,
    role_options: [],
  })
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [specializationFilter, setSpecializationFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 10,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [avatarDeleting, setAvatarDeleting] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [detailStaff, setDetailStaff] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarCurrentUrl, setAvatarCurrentUrl] = useState('')
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('')
  const [avatarRemoveRequested, setAvatarRemoveRequested] = useState(false)
  const avatarInputRef = useRef(null)

  function handleStatCardClick(status) {
    setStatusFilter(status)
    setPage(1)
  }

  function openToast(type, text) {
    setNotice(makeToast(type, text))
  }

  function closeToast() {
    setNotice(null)
  }

  function resetAvatarState(currentUrl = '') {
    revokePreviewUrl(avatarPreviewUrl)
    setAvatarFile(null)
    setAvatarPreviewUrl('')
    setAvatarCurrentUrl(currentUrl || '')
    setAvatarRemoveRequested(false)
  }

  function resetForm(nextEditing = null) {
    if (nextEditing) {
      setForm({
        account_id: getCurrentAccountId(nextEditing, accountOptions),
        name: nextEditing.name || '',
        email: nextEditing.email || '',
        specialization: nextEditing.specialization || '',
        experience_years: nextEditing.experience_years ?? '',
        status: nextEditing.status || '',
      })
      setEditingStaff(nextEditing)
      resetAvatarState(nextEditing.avatar_url || '')
    } else {
      const defaultAccount = accountOptions.length === 1 ? accountOptions[0] : null

      setForm(
        defaultAccount
          ? {
              ...EMPTY_FORM,
              account_id: String(defaultAccount.id),
              name: defaultAccount.full_name || defaultAccount.name || '',
              email: defaultAccount.email || '',
            }
          : EMPTY_FORM,
      )
      setEditingStaff(null)
      resetAvatarState(defaultAccount?.avatar_url || '')
    }

    setFormErrors({})
    setFormVisible(true)
  }

  function openCreateForm() {
    resetForm(null)
  }

  function openEditForm(staff) {
    resetForm(staff)
  }

  function closeForm() {
    setFormVisible(false)
    setEditingStaff(null)
    setFormErrors({})
    resetAvatarState('')
  }

  function changeField(field) {
    return (event) => {
      const value = event.target.value

      setForm((current) => ({
        ...current,
        [field]: value,
      }))

      setFormErrors((current) => ({
        ...current,
        [field]: '',
      }))
    }
  }

  function pickAccount(event) {
    const accountId = event.target.value
    const selectedAccount = accountOptions.find((account) => String(account.id) === String(accountId))

    setForm((current) => ({
      ...current,
      account_id: accountId,
      name: selectedAccount?.full_name || selectedAccount?.name || '',
      email: selectedAccount?.email || '',
    }))

    setAvatarCurrentUrl(selectedAccount?.avatar_url || '')
    setFormErrors((current) => ({
      ...current,
      account_id: '',
      name: '',
      email: '',
    }))
  }

  function openAvatarPicker() {
    avatarInputRef.current?.click()
  }

  function pickAvatar(event) {
    const file = event.target.files?.[0] || null

    if (!file) {
      return
    }

    revokePreviewUrl(avatarPreviewUrl)
    setAvatarFile(file)
    setAvatarPreviewUrl(file ? URL.createObjectURL(file) : '')
    setAvatarRemoveRequested(false)
  }

  function clearSelectedAvatar() {
    revokePreviewUrl(avatarPreviewUrl)
    setAvatarFile(null)
    setAvatarPreviewUrl('')
    setAvatarRemoveRequested(false)

    if (avatarInputRef.current) {
      avatarInputRef.current.value = ''
    }
  }

  function requestRemoveCurrentAvatar() {
    if (avatarRemoveRequested) {
      setAvatarRemoveRequested(false)
      return
    }

    revokePreviewUrl(avatarPreviewUrl)
    setAvatarFile(null)
    setAvatarPreviewUrl('')
    setAvatarRemoveRequested(true)

    if (avatarInputRef.current) {
      avatarInputRef.current.value = ''
    }
  }

  const loadStatistics = useCallback(async () => {
    try {
      const response = await getSupportStaffStatistics()
      setStatistics(getStatisticsData(response))
    } catch (error) {
      openToast('error', getServerMessage(error, 'Không tải được thống kê nhân viên hỗ trợ.'))
    }
  }, [])

  const loadList = useCallback(
    async (pageNumber = page) => {
      setLoading(true)

      try {
        const response = await getSupportStaffs({
          page: pageNumber,
          per_page: 10,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
          specialization: specializationFilter || undefined,
        })

        setStaffList(getListData(response))
        setPagination(getPaginationMeta(response))
      } catch (error) {
        openToast('error', getServerMessage(error, 'Không tải được danh sách nhân viên hỗ trợ.'))
      } finally {
        setLoading(false)
      }
    },
    [page, search, statusFilter, specializationFilter],
  )

  const loadAccounts = useCallback(async () => {
    try {
      const roleList = await getAccountRoles().catch(() => [])
      const supportRole = roleList.find((role) => role.name === SUPPORT_STAFF_ROLE_NAME) || {
        id: 1,
        name: SUPPORT_STAFF_ROLE_NAME,
      }

      const accounts = await getAccounts({
        role_id: supportRole.id,
        exclude_completed_support_staff: true,
      })

      setAccountOptions(Array.isArray(accounts) ? accounts : [])
    } catch (error) {
      setAccountOptions([])
      openToast('error', getServerMessage(error, 'Không tải được danh sách user NVHT.'))
    }
  }, [])

  const refreshAll = useCallback(async (pageNumber = page) => {
    await Promise.all([loadStatistics(), loadList(pageNumber)])
  }, [loadList, loadStatistics, page])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStatistics()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadStatistics])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccounts()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadAccounts])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadList(page)
    }, 280)

    return () => window.clearTimeout(timer)
  }, [loadList, page])

  useEffect(() => {
    if (!notice) return undefined

    const timer = window.setTimeout(() => {
      closeToast()
    }, 10000)

    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => () => revokePreviewUrl(avatarPreviewUrl), [avatarPreviewUrl])

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validateForm(form, Boolean(editingStaff))

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      return
    }

    setSaving(true)

    try {
      const payload = {
        role: 'customer_service',
        specialization: form.specialization,
        experience_years: Number(form.experience_years),
        status: form.status,
        ...(form.account_id ? { user_id: Number(form.account_id) } : {}),
      }

      const response = editingStaff
        ? await updateSupportStaff(editingStaff.id, payload)
        : await createSupportStaff(payload)

      const savedStaff = response?.data || response?.data?.data
      const savedStaffId = savedStaff?.id || editingStaff?.id
      let avatarUploadFailed = false

      if (avatarFile && savedStaffId) {
        try {
          await uploadSupportStaffAvatar(savedStaffId, avatarFile)
        } catch {
          avatarUploadFailed = true
        }
      } else if (editingStaff && avatarRemoveRequested && savedStaffId) {
        try {
          await deleteSupportStaffAvatar(savedStaffId)
        } catch {
          avatarUploadFailed = true
        }
      }

      openToast(
        'success',
        `${response.message || (editingStaff ? 'Đã cập nhật nhân viên.' : 'Đã thêm nhân viên.')} ${
          avatarUploadFailed ? 'Ảnh đại diện chưa tải lên được.' : ''
        }`.trim(),
      )
      closeForm()
      await refreshAll(page)
    } catch (error) {
      const serverErrors = error.response?.data?.errors

      if (serverErrors) {
        setFormErrors(
          Object.entries(serverErrors).reduce((accumulator, [field, messages]) => {
            accumulator[field] = Array.isArray(messages) ? messages[0] : String(messages)
            return accumulator
          }, {}),
        )
      } else {
        openToast('error', getServerMessage(error, 'Không lưu được thông tin nhân viên hỗ trợ.'))
      }
    } finally {
      setSaving(false)
    }
  }

  async function openDetail(staff) {
    setDetailStaff(staff)
    setDetailLoading(true)

    try {
      const response = await getSupportStaff(staff.id)
      setDetailStaff(response?.data?.data || response?.data || staff)
    } catch (error) {
      openToast('error', getServerMessage(error, 'Không tải được chi tiết nhân viên.'))
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleDeleteAvatar() {
    if (!detailStaff?.id) return

    setAvatarDeleting(true)

    try {
      const response = await deleteSupportStaffAvatar(detailStaff.id)
      const nextStaff = response?.data || detailStaff
      setDetailStaff(nextStaff)
      openToast('success', response.message || 'Đã xóa avatar nhân viên hỗ trợ.')
      await refreshAll(page)
    } catch (error) {
      openToast('error', getServerMessage(error, 'Không xóa được avatar nhân viên hỗ trợ.'))
    } finally {
      setAvatarDeleting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return

    setDeleting(true)

    try {
      const response = await deleteSupportStaff(deleteTarget.id)
      openToast('success', response.message || 'Đã xóa nhân viên hỗ trợ.')
      setDeleteTarget(null)
      await refreshAll(page)
    } catch (error) {
      openToast('error', getServerMessage(error, 'Không xóa được nhân viên hỗ trợ.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="support-page">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Quản Lý Nhân Viên Hỗ Trợ']}
        title="Quản Lý Nhân Viên Hỗ Trợ"
        description="Quản lý tài khoản nhân viên hỗ trợ khách hàng."
        actions={
          <div className="support-header-actions">
            <Link className="support-trash-button" to="/admin/support/trash">
              Thùng rác
            </Link>
            <button className="support-add-button" type="button" onClick={openCreateForm}>
              <span aria-hidden="true">+</span>
              Thêm nhân viên
            </button>
          </div>
        }
      />

      <div className="support-stat-grid">
        <button
          className={`support-stat-card blue ${statusFilter === '' ? 'is-active' : ''}`}
          type="button"
          onClick={() => handleStatCardClick('')}
        >
          <strong>{statistics.total || pagination.total || staffList.length}</strong>
          <span>Tổng nhân viên</span>
          <small>Toàn bộ nhân viên hỗ trợ</small>
        </button>
        <button
          className={`support-stat-card green ${statusFilter === 'active' ? 'is-active' : ''}`}
          type="button"
          onClick={() => handleStatCardClick('active')}
        >
          <strong>{statistics.active || 0}</strong>
          <span>Đang hoạt động</span>
          <small>Sẵn sàng xử lý yêu cầu</small>
        </button>
        <button
          className={`support-stat-card amber ${statusFilter === 'inactive' ? 'is-active' : ''}`}
          type="button"
          onClick={() => handleStatCardClick('inactive')}
        >
          <strong>{statistics.inactive || 0}</strong>
          <span>Ngừng hoạt động</span>
          <small>Tạm ngừng xử lý yêu cầu</small>
        </button>
        <button
          className={`support-stat-card purple ${statusFilter === 'hidden' ? 'is-active' : ''}`}
          type="button"
          onClick={() => handleStatCardClick('hidden')}
        >
          <strong>{statistics.hidden || 0}</strong>
          <span>Tạm khóa</span>
          <small>Tạm ẩn nhân viên hỗ trợ</small>
        </button>
      </div>

      <div className="support-content-grid">
        <div className="support-main-panel">
          <div className="support-filter-bar">
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
                placeholder="Tìm theo tên..."
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
            >
              <option value="">Tất cả trạng thái</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <select
              value={specializationFilter}
              onChange={(event) => {
                setSpecializationFilter(event.target.value)
                setPage(1)
              }}
            >
              <option value="">Tất cả chuyên môn</option>
              {SPECIALIZATION_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="support-table-wrap">
            <table className="support-table">
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Mã NV</th>
                  <th>Họ tên</th>
                  <th>Chuyên môn</th>
                  <th>Kinh nghiệm</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td className="support-empty-row" colSpan="7">
                      <div className="support-loading">
                        <span />
                        <p>Đang tải danh sách nhân viên hỗ trợ...</p>
                      </div>
                    </td>
                  </tr>
                ) : staffList.length === 0 ? (
                  <tr>
                    <td className="support-empty-row" colSpan="7">
                      <div className="support-empty-state">
                        <strong>Không tìm thấy nhân viên phù hợp</strong>
                        <span>Hãy thử đổi bộ lọc hoặc từ khóa tìm kiếm.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff, index) => (
                    <tr key={staff.id}>
                      <td>
                        <SupportAvatar avatarUrl={staff.avatar_url} name={staff.name} tone={index} />
                      </td>
                      <td>
                        <strong className="support-code">NV{String(staff.id).padStart(3, '0')}</strong>
                      </td>
                      <td>
                        <strong className="support-name">{staff.name}</strong>
                        <span className="support-email">{staff.email || '—'}</span>
                      </td>
                      <td>{getSpecializationLabel(staff.specialization)}</td>
                      <td>{Number(staff.experience_years || 0)} năm</td>
                      <td>
                        <span className={`support-status ${staff.status}`}>
                          {getStatusLabel(staff.status)}
                        </span>
                      </td>
                      <td>
                        <div className="support-actions">
                          <button
                            type="button"
                            title="Chi tiết"
                            aria-label={`Chi tiết ${staff.name}`}
                            onClick={() => openDetail(staff)}
                          >
                            <ActionIcon type="detail" />
                          </button>
                          <button
                            type="button"
                            title="Sửa"
                            aria-label={`Sửa ${staff.name}`}
                            onClick={() => openEditForm(staff)}
                          >
                            <ActionIcon type="edit" />
                          </button>
                          <button
                            className="danger"
                            type="button"
                            title="Xóa mềm"
                            aria-label={`Xóa mềm ${staff.name}`}
                            onClick={() => setDeleteTarget(staff)}
                          >
                            <ActionIcon type="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="support-pagination">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={pagination.currentPage <= 1 || loading}
              aria-label="Trang trước"
            >
              ←
            </button>
            <span>
              {pagination.currentPage} / {pagination.lastPage}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pagination.lastPage, current + 1))}
              disabled={pagination.currentPage >= pagination.lastPage || loading}
              aria-label="Trang sau"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {formVisible ? (
        <SupportStaffFormModal
          editing={editingStaff}
          errors={formErrors}
          form={form}
          accountOptions={accountOptions}
          avatarFile={avatarFile}
          avatarPreviewUrl={avatarPreviewUrl}
          avatarCurrentUrl={avatarCurrentUrl}
          avatarInputRef={avatarInputRef}
          avatarRemoveRequested={avatarRemoveRequested}
          onChange={changeField}
          onPickAccount={pickAccount}
          onPickAvatar={pickAvatar}
          onOpenAvatarPicker={openAvatarPicker}
          onClearSelectedAvatar={clearSelectedAvatar}
          onRequestRemoveCurrentAvatar={requestRemoveCurrentAvatar}
          onClose={closeForm}
          onSubmit={handleSubmit}
          saving={saving}
        />
      ) : null}

      {detailStaff ? (
        <SupportStaffDetailModal
          staff={detailStaff}
          loading={detailLoading}
          deletingAvatar={avatarDeleting}
          onDeleteAvatar={handleDeleteAvatar}
          onClose={() => setDetailStaff(null)}
        />
      ) : null}

      {deleteTarget ? (
        <div
          className="support-modal-backdrop"
          role="presentation"
          onMouseDown={() => {
            if (!deleting) setDeleteTarget(null)
          }}
        >
          <div className="support-delete-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="support-delete-icon">!</div>
            <h3>Xóa nhân viên hỗ trợ?</h3>
            <p>
              Bạn có chắc muốn xóa <strong>{deleteTarget.name}</strong> khỏi hệ thống?
              Thao tác này sẽ chuyển nhân viên vào thùng rác.
            </p>
            <div className="support-modal-actions">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Hủy
              </button>
              <button
                className="danger primary"
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className={`support-toast ${notice.type}`}>
          <div>
            <strong>{notice.type === 'success' ? 'Thành công' : 'Có lỗi xảy ra'}</strong>
            <p>{notice.text}</p>
          </div>
          <button type="button" onClick={closeToast}>
            ×
          </button>
        </div>
      ) : null}
    </section>
  )
}

export default SupportStaffManagementPage
