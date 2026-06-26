import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { partnerApi } from '../../../services/partnerApi'
import '../../../styles/partner-management.css'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Hoạt động' },
  { value: 'inactive', label: 'Tạm ẩn' },
  { value: 'hidden', label: 'Đã ẩn' },
]

const EMPTY_FORM = {
  name: '',
  partner_code: '',
  service_type: 'flight',
  contact_name: '',
  phone: '',
  email: '',
  website: '',
  rating: '4.50',
  contract_start: '',
  contract_end: '',
  status: 'active',
  is_visible: true,
  logo_url: '',
  description: '',
}

const SERVICE_LABELS = {
  flight: 'Chuyến bay',
  hotel: 'Khách sạn',
  restaurant: 'Nhà hàng',
  transport: 'Vận chuyển',
  train: 'Tàu hỏa',
  cruise: 'Du thuyền',
  insurance: 'Bảo hiểm',
  attraction: 'Điểm tham quan',
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

function getPaginationMeta(payload) {
  const page = payload?.data?.data

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
  return payload?.data?.data || payload?.data || {}
}

function formatDate(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

function formatDateRange(start, end) {
  if (!start && !end) return '—'
  return [formatDate(start), formatDate(end)].filter(Boolean).join(' - ')
}

function formatRating(value) {
  const rating = Number(value ?? 0)

  return Number.isFinite(rating) ? rating.toFixed(1) : '0.0'
}

function initials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'DT'
  )
}

function getPartnerName(partner) {
  return partner.name || partner.partner_name || partner.company_name || partner.title || '—'
}

function getPartnerCode(partner) {
  return partner.partner_code || partner.code || partner.partner_id || `DT${String(partner.id).padStart(3, '0')}`
}

function getPartnerType(partner) {
  return partner.service_type || partner.type || partner.partner_type || 'flight'
}

function getPartnerTypeLabel(partner) {
  const type = getPartnerType(partner)
  return SERVICE_LABELS[type] || partner.service_type_label || partner.type_label || type
}

function getPartnerContact(partner) {
  return {
    name: partner.contact_name || partner.contact_person || partner.contact || '',
    phone: partner.phone || partner.contact_phone || '',
    email: partner.email || partner.contact_email || '',
    website: partner.website || partner.website_url || '',
  }
}

function getPartnerStatus(partner) {
  return partner.status || (partner.deleted_at ? 'hidden' : 'active')
}

function getPartnerVisible(partner) {
  if (typeof partner.is_visible === 'boolean') return partner.is_visible
  if (typeof partner.visible === 'boolean') return partner.visible
  if (typeof partner.show_on_homepage === 'boolean') return partner.show_on_homepage
  return getPartnerStatus(partner) === 'active'
}

function normalizePartner(partner) {
  return {
    ...partner,
    displayName: getPartnerName(partner),
    displayCode: getPartnerCode(partner),
    displayType: getPartnerType(partner),
    displayTypeLabel: getPartnerTypeLabel(partner),
    displayContact: getPartnerContact(partner),
    displayStatus: getPartnerStatus(partner),
    displayVisible: getPartnerVisible(partner),
    displayRating: Number(partner.rating ?? partner.average_rating ?? partner.score ?? 0),
    displayLogo: partner.logo_url || partner.logo || partner.avatar_url || '',
    displayContractStart: partner.contract_start || partner.contract_from || partner.start_date || '',
    displayContractEnd: partner.contract_end || partner.contract_to || partner.end_date || '',
    displayCreatedAt: partner.created_at || partner.createdAt || '',
    displayUpdatedAt: partner.updated_at || partner.updatedAt || '',
    displayDeletedAt: partner.deleted_at || partner.deletedAt || '',
  }
}

function buildPayload(form) {
  return {
    name: form.name.trim(),
    partner_code: form.partner_code.trim() || null,
    service_type: form.service_type,
    contact_name: form.contact_name.trim() || null,
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    website: form.website.trim() || null,
    rating: Number(form.rating),
    contract_start: form.contract_start || null,
    contract_end: form.contract_end || null,
    status: form.status,
    is_visible: Boolean(form.is_visible),
    logo_url: form.logo_url.trim() || null,
    description: form.description.trim() || null,
  }
}

function validateForm(form) {
  const errors = {}
  const rating = Number(form.rating)

  if (!form.name.trim()) {
    errors.name = 'Vui lòng nhập tên đối tác.'
  } else if (form.name.trim().length > 255) {
    errors.name = 'Tên đối tác tối đa 255 ký tự.'
  }

  if (!form.service_type.trim()) {
    errors.service_type = 'Vui lòng chọn loại dịch vụ.'
  }

  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Email không hợp lệ.'
  }

  if (
    form.rating === '' ||
    !Number.isFinite(rating) ||
    rating < 0 ||
    rating > 5
  ) {
    errors.rating = 'Đánh giá phải từ 0 đến 5.'
  }

  if (form.contract_start && form.contract_end) {
    const start = new Date(form.contract_start)
    const end = new Date(form.contract_end)

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
      errors.contract_end = 'Ngày kết thúc phải lớn hơn ngày bắt đầu.'
    }
  }

  if (!STATUS_OPTIONS.some((item) => item.value === form.status)) {
    errors.status = 'Trạng thái không hợp lệ.'
  }

  return errors
}

function makeOptionList(statistics, partners) {
  const source = Array.isArray(statistics.service_types)
    ? statistics.service_types
    : Array.isArray(statistics.types)
      ? statistics.types
      : Array.isArray(statistics.type_options)
        ? statistics.type_options
        : []

  const fromApi = source
    .map((item) => {
      if (!item) return null

      if (typeof item === 'string') {
        return { value: item, label: SERVICE_LABELS[item] || item }
      }

      const value = item.value || item.key || item.slug || item.type || item.name
      if (!value) return null

      return {
        value,
        label: item.label || item.name || SERVICE_LABELS[value] || value,
        count: item.count ?? item.total ?? 0,
      }
    })
    .filter(Boolean)

  const fallback = Array.from(new Set(partners.map((partner) => partner.displayType))).map((value) => ({
    value,
    label: SERVICE_LABELS[value] || value,
  }))

  const merged = [...fromApi, ...fallback]
  const seen = new Set()

  return merged.filter((item) => {
    if (seen.has(item.value)) return false
    seen.add(item.value)
    return true
  })
}

function PartnerBadge({ label, tone = 'blue' }) {
  return <span className={`partner-badge ${tone}`}>{label}</span>
}

function PartnerFormModal({
  editingPartner,
  form,
  formErrors,
  saving,
  onChange,
  onClose,
  onSubmit,
  typeOptions,
}) {
  return (
    <div className="partner-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form
        className="partner-modal"
        noValidate
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
      >
        <div className="partner-modal-header">
          <div>
            <p>{editingPartner ? 'Cập nhật đối tác' : 'Thêm đối tác'}</p>
            <h2>{editingPartner ? getPartnerName(editingPartner) : 'Đối tác dịch vụ mới'}</h2>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="partner-form-grid">
          <label>
            Tên đối tác
            <input
              value={form.name}
              onChange={onChange('name')}
              placeholder="Vietnam Airlines"
            />
            {formErrors.name ? <span className="partner-error">{formErrors.name}</span> : null}
          </label>

          <label>
            Mã đối tác
            <input
              value={form.partner_code}
              onChange={onChange('partner_code')}
              placeholder="DT001"
            />
          </label>

          <label>
            Loại dịch vụ
            <select value={form.service_type} onChange={onChange('service_type')}>
              <option value="">Chọn loại dịch vụ</option>
              {typeOptions.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {formErrors.service_type ? (
              <span className="partner-error">{formErrors.service_type}</span>
            ) : null}
          </label>

          <label>
            Người liên hệ
            <input
              value={form.contact_name}
              onChange={onChange('contact_name')}
              placeholder="Nguyễn Văn A"
            />
          </label>

          <label>
            Số điện thoại
            <input value={form.phone} onChange={onChange('phone')} placeholder="1900 1100" />
          </label>

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={onChange('email')}
              placeholder="partner@vivugo.vn"
            />
            {formErrors.email ? <span className="partner-error">{formErrors.email}</span> : null}
          </label>

          <label>
            Website
            <input
              value={form.website}
              onChange={onChange('website')}
              placeholder="https://..."
            />
          </label>

          <label>
            Đánh giá
            <input
              min="0"
              max="5"
              step="0.1"
              type="number"
              value={form.rating}
              onChange={onChange('rating')}
              placeholder="4.5"
            />
            {formErrors.rating ? <span className="partner-error">{formErrors.rating}</span> : null}
          </label>

          <label>
            Ngày bắt đầu hợp đồng
            <input type="date" value={form.contract_start} onChange={onChange('contract_start')} />
          </label>

          <label>
            Ngày kết thúc hợp đồng
            <input type="date" value={form.contract_end} onChange={onChange('contract_end')} />
            {formErrors.contract_end ? (
              <span className="partner-error">{formErrors.contract_end}</span>
            ) : null}
          </label>

          <label>
            Trạng thái
            <select value={form.status} onChange={onChange('status')}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            {formErrors.status ? <span className="partner-error">{formErrors.status}</span> : null}
          </label>

          <label>
            Hiển thị
            <select
              value={String(form.is_visible)}
              onChange={onChange('is_visible')}
            >
              <option value="true">Có</option>
              <option value="false">Không</option>
            </select>
          </label>

          <label className="partner-form-wide">
            Logo URL
            <input
              value={form.logo_url}
              onChange={onChange('logo_url')}
              placeholder="https://cdn..."
            />
          </label>

          <label className="partner-form-wide">
            Mô tả
            <textarea
              rows="4"
              value={form.description}
              onChange={onChange('description')}
              placeholder="Thông tin giới thiệu, điểm mạnh, phạm vi hợp tác..."
            />
          </label>
        </div>

        <div className="partner-modal-actions">
          <button type="button" onClick={onClose}>
            Hủy
          </button>
          <button className="primary" disabled={saving} type="submit">
            {saving ? 'Đang lưu...' : editingPartner ? 'Lưu thay đổi' : 'Thêm đối tác'}
          </button>
        </div>
      </form>
    </div>
  )
}

function PartnerDetailModal({ partner, loading, onClose }) {
  const contact = partner ? getPartnerContact(partner) : {}

  return (
    <div className="partner-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="partner-modal partner-detail-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="partner-modal-header">
          <div>
            <p>Chi tiết đối tác</p>
            <h2>{partner ? getPartnerName(partner) : 'Đang tải...'}</h2>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        {loading ? (
          <div className="partner-empty-state">Đang tải dữ liệu chi tiết...</div>
        ) : (
          <>
            <div className="partner-detail-head">
              <div className="partner-avatar large">
                {partner?.displayLogo ? (
                  <img alt={getPartnerName(partner)} src={partner.displayLogo} />
                ) : (
                  <span>{initials(getPartnerName(partner))}</span>
                )}
              </div>
              <div>
                <h3>{getPartnerName(partner)}</h3>
                <p>
                  {getPartnerCode(partner)} · {getPartnerTypeLabel(partner)}
                </p>
                <div className="partner-detail-tags">
                  <PartnerBadge
                    label={partner?.displayStatus === 'active' ? 'Hoạt động' : partner?.displayStatus || '—'}
                    tone={partner?.displayStatus === 'active' ? 'green' : 'amber'}
                  />
                  <PartnerBadge
                    label={partner?.displayVisible ? 'Hiển thị' : 'Đang ẩn'}
                    tone={partner?.displayVisible ? 'blue' : 'amber'}
                  />
                </div>
              </div>
            </div>

            <dl className="partner-detail-grid">
              <div>
                <dt>Người liên hệ</dt>
                <dd>{contact.name || '—'}</dd>
              </div>
              <div>
                <dt>Số điện thoại</dt>
                <dd>{contact.phone || '—'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{contact.email || '—'}</dd>
              </div>
              <div>
                <dt>Website</dt>
                <dd>{contact.website || '—'}</dd>
              </div>
              <div>
                <dt>Đánh giá</dt>
                <dd>{formatRating(partner?.displayRating)} / 5</dd>
              </div>
              <div>
                <dt>Hợp đồng</dt>
                <dd>{formatDateRange(partner?.displayContractStart, partner?.displayContractEnd)}</dd>
              </div>
              <div>
                <dt>Ngày tạo</dt>
                <dd>{formatDate(partner?.displayCreatedAt)}</dd>
              </div>
              <div>
                <dt>Cập nhật gần nhất</dt>
                <dd>{formatDate(partner?.displayUpdatedAt)}</dd>
              </div>
              <div>
                <dt>Ngày xóa mềm</dt>
                <dd>{formatDate(partner?.displayDeletedAt)}</dd>
              </div>
            </dl>

            <div className="partner-detail-section">
              <h3>Mô tả</h3>
              <p>{partner?.description || 'Chưa có mô tả.'}</p>
            </div>

            <div className="partner-modal-actions">
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

function PartnerManagementPage() {
  const [partners, setPartners] = useState([])
  const [statistics, setStatistics] = useState({})
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterVisible, setFilterVisible] = useState('all')
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
  const [formVisible, setFormVisible] = useState(false)
  const [editingPartner, setEditingPartner] = useState(null)
  const [detailPartner, setDetailPartner] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})

  const normalizedPartners = useMemo(
    () => partners.map(normalizePartner),
    [partners],
  )

  const typeOptions = useMemo(
    () => makeOptionList(statistics, normalizedPartners),
    [normalizedPartners, statistics],
  )

  const serviceCards = useMemo(() => {
    const counts = statistics.counts_by_type || statistics.by_type || statistics.service_counts || {}
    const cards = typeOptions.map((type) => ({
      value: type.value,
      label: type.label,
      count: Number(
        counts[type.value] ??
          counts[type.label] ??
          type.count ??
          normalizedPartners.filter((partner) => partner.displayType === type.value).length,
      ),
    }))

    return cards
  }, [normalizedPartners, statistics, typeOptions])

  const visiblePartners = useMemo(() => {
    const keyword = normalizeText(search.trim())

    return normalizedPartners.filter((partner) => {
      const matchesKeyword =
        !keyword ||
        normalizeText(
          [
            partner.displayName,
            partner.displayCode,
            partner.displayTypeLabel,
            partner.displayContact.name,
            partner.displayContact.phone,
            partner.displayContact.email,
            partner.description,
          ].join(' '),
        ).includes(keyword)

      const matchesType = filterType === 'all' || partner.displayType === filterType
      const matchesStatus = filterStatus === 'all' || partner.displayStatus === filterStatus
      const matchesVisible =
        filterVisible === 'all' ||
        (filterVisible === 'visible' && partner.displayVisible) ||
        (filterVisible === 'hidden' && !partner.displayVisible)

      return matchesKeyword && matchesType && matchesStatus && matchesVisible
    })
  }, [filterStatus, filterType, filterVisible, normalizedPartners, search])

  const activeFilters = [filterType !== 'all', filterStatus !== 'all', filterVisible !== 'all', search.trim()].filter(Boolean).length

  const loadData = useCallback(
    async (pageNumber = page) => {
      setLoading(true)

      try {
        const [listResponse, statisticsResponse] = await Promise.all([
          partnerApi.getAll({
            page: pageNumber,
            per_page: 10,
            search: search.trim() || undefined,
            service_type: filterType !== 'all' ? filterType : undefined,
            status: filterStatus !== 'all' ? filterStatus : undefined,
            visible:
              filterVisible === 'all'
                ? undefined
                : filterVisible === 'visible'
                  ? 1
                  : 0,
          }),
          partnerApi.getStatistics().catch(() => null),
        ])

        setPartners(getListData(listResponse))
        setPagination(getPaginationMeta(listResponse))
        setStatistics(getStatisticsData(statisticsResponse))
      } catch (error) {
        const status = error.response?.status

        if (status === 404) {
          setPartners([])
          setPagination({ currentPage: 1, lastPage: 1, total: 0, perPage: 10 })
          setStatistics({})
          return
        }

        setNotice({ type: 'error', text: getMessage(error, 'Không tải được danh sách đối tác.') })
      } finally {
        setLoading(false)
      }
    },
    [filterStatus, filterType, filterVisible, page, search],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData(page)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [loadData, page])

  useEffect(() => {
    if (!notice) return undefined

    const timer = window.setTimeout(() => {
      setNotice(null)
    }, 3500)

    return () => window.clearTimeout(timer)
  }, [notice])

  function openToast(type, text) {
    setNotice({ type, text })
  }

  function resetForm(nextPartner = null) {
    if (nextPartner) {
      setForm({
        name: nextPartner.name || nextPartner.partner_name || nextPartner.company_name || '',
        partner_code: nextPartner.partner_code || nextPartner.code || '',
        service_type: nextPartner.service_type || nextPartner.type || nextPartner.partner_type || 'flight',
        contact_name: nextPartner.contact_name || nextPartner.contact_person || '',
        phone: nextPartner.phone || nextPartner.contact_phone || '',
        email: nextPartner.email || nextPartner.contact_email || '',
        website: nextPartner.website || nextPartner.website_url || '',
        rating: String(nextPartner.rating ?? nextPartner.average_rating ?? 4.5),
        contract_start: nextPartner.contract_start || nextPartner.contract_from || '',
        contract_end: nextPartner.contract_end || nextPartner.contract_to || '',
        status: nextPartner.status || 'active',
        is_visible: getPartnerVisible(nextPartner),
        logo_url: nextPartner.logo_url || nextPartner.logo || '',
        description: nextPartner.description || '',
      })
      setEditingPartner(nextPartner)
    } else {
      setForm(EMPTY_FORM)
      setEditingPartner(null)
    }

    setFormErrors({})
    setFormVisible(true)
  }

  function closeForm() {
    setFormVisible(false)
    setEditingPartner(null)
    setFormErrors({})
  }

  function changeField(field) {
    return (event) => {
      const rawValue = event.target.value

      setForm((current) => ({
        ...current,
        [field]: field === 'is_visible' ? rawValue === 'true' : rawValue,
      }))

      setFormErrors((current) => ({
        ...current,
        [field]: '',
      }))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = validateForm(form)
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      return
    }

    setSaving(true)

    try {
      const payload = buildPayload(form)
      const response = editingPartner
        ? await partnerApi.update(editingPartner.id, payload)
        : await partnerApi.create(payload)

      openToast('success', response.data?.message || response.message || (editingPartner ? 'Đã cập nhật đối tác.' : 'Đã thêm đối tác.'))
      closeForm()
      await loadData(page)
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
        openToast('error', getMessage(error, 'Không lưu được thông tin đối tác.'))
      }
    } finally {
      setSaving(false)
    }
  }

  async function openDetail(partner) {
    setDetailPartner(partner)
    setDetailLoading(true)

    try {
      const response = await partnerApi.getOne(partner.id)
      setDetailPartner(normalizePartner(response?.data?.data || response?.data || partner))
    } catch (error) {
      openToast('error', getMessage(error, 'Không tải được chi tiết đối tác.'))
    } finally {
      setDetailLoading(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return

    setDeleting(true)

    try {
      const response = await partnerApi.remove(deleteTarget.id)
      openToast('success', response.data?.message || response.message || 'Đã xóa mềm đối tác.')
      setDeleteTarget(null)
      await loadData(page)
    } catch (error) {
      openToast('error', getMessage(error, 'Không xóa được đối tác.'))
    } finally {
      setDeleting(false)
    }
  }

  const totalPartners = statistics.total ?? pagination.total ?? normalizedPartners.length
  const activeCount = statistics.active ?? normalizedPartners.filter((item) => item.displayStatus === 'active').length
  const hiddenCount = statistics.hidden ?? normalizedPartners.filter((item) => !item.displayVisible).length
  const averageRating = statistics.average_rating ?? statistics.avg_rating ?? 0

  return (
    <section className="partner-page">
      <div className="partner-header">
        <div>
          <div className="partner-breadcrumb">ViVuGo / Dịch Vụ Đối Tác</div>
          <h1>Dịch vụ đối tác</h1>
          <p>Quản lý danh sách đối tác, thống kê theo loại dịch vụ và thao tác trực tiếp qua API Backend.</p>
        </div>

        <div className="partner-header-actions">
          <Link className="partner-secondary-button" to="/admin/partners/trash">
            Thùng rác
          </Link>
          <button className="partner-primary-button" type="button" onClick={() => resetForm(null)}>
            <span aria-hidden="true">+</span>
            Thêm đối tác
          </button>
        </div>
      </div>

      <div className="partner-stat-grid">
        <article className="partner-stat-card blue">
          <strong>{totalPartners}</strong>
          <span>Tổng đối tác</span>
          <small>Toàn bộ dữ liệu từ BE</small>
        </article>
        <article className="partner-stat-card green">
          <strong>{activeCount}</strong>
          <span>Đang hoạt động</span>
          <small>Sẵn sàng hợp tác</small>
        </article>
        <article className="partner-stat-card amber">
          <strong>{formatRating(averageRating)}</strong>
          <span>Đánh giá trung bình</span>
          <small>Thống kê tự động</small>
        </article>
        <article className="partner-stat-card purple">
          <strong>{hiddenCount}</strong>
          <span>Đang ẩn</span>
          <small>Tạm ngưng hiển thị</small>
        </article>
      </div>

      <div className="partner-service-strip">
        {serviceCards.map((item) => (
          <button
            key={item.value}
            className={`partner-service-card ${filterType === item.value ? 'active' : ''}`}
            type="button"
            onClick={() => {
              setFilterType((current) => (current === item.value ? 'all' : item.value))
              setPage(1)
            }}
          >
            <span>{item.label}</span>
            <strong>{item.count}</strong>
          </button>
        ))}
      </div>

      <div className="partner-filter-panel">
        <div className="partner-search">
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
            placeholder="Tìm kiếm theo tên, mã, email, số điện thoại..."
          />
        </div>

        <select
          value={filterStatus}
          onChange={(event) => {
            setFilterStatus(event.target.value)
            setPage(1)
          }}
        >
          <option value="all">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>

        <select
          value={filterVisible}
          onChange={(event) => {
            setFilterVisible(event.target.value)
            setPage(1)
          }}
        >
          <option value="all">Tất cả hiển thị</option>
          <option value="visible">Đang hiển thị</option>
          <option value="hidden">Đang ẩn</option>
        </select>

        <button
          className="partner-clear-button"
          type="button"
          onClick={() => {
            setSearch('')
            setFilterType('all')
            setFilterStatus('all')
            setFilterVisible('all')
            setPage(1)
          }}
          disabled={activeFilters === 0}
        >
          Xóa bộ lọc
        </button>
      </div>

      <div className="partner-table-wrap">
        <table className="partner-table">
          <thead>
            <tr>
              <th>Logo</th>
              <th>Tên đối tác</th>
              <th>Loại dịch vụ</th>
              <th>Liên hệ</th>
              <th>Đánh giá</th>
              <th>Hợp đồng</th>
              <th>Trạng thái</th>
              <th>Hiển thị</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="partner-empty-row" colSpan="9">
                  <div className="partner-loading">
                    <span />
                    <p>Đang tải danh sách đối tác...</p>
                  </div>
                </td>
              </tr>
            ) : visiblePartners.length === 0 ? (
              <tr>
                <td className="partner-empty-row" colSpan="9">
                  <div className="partner-empty-state">
                    <strong>Không tìm thấy đối tác phù hợp</strong>
                    <span>Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</span>
                  </div>
                </td>
              </tr>
            ) : (
              visiblePartners.map((partner, index) => (
                <tr key={partner.id}>
                  <td>
                    <div className="partner-avatar">
                      {partner.displayLogo ? (
                        <img alt={getPartnerName(partner)} src={partner.displayLogo} />
                      ) : (
                        <span>{initials(getPartnerName(partner))}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <strong>{getPartnerName(partner)}</strong>
                    <div className="partner-meta">
                      <span>{getPartnerCode(partner)}</span>
                      <span>#{index + 1}</span>
                    </div>
                  </td>
                  <td>
                    <PartnerBadge
                      label={getPartnerTypeLabel(partner)}
                      tone="blue"
                    />
                  </td>
                  <td>
                    <div className="partner-contact">
                      <strong>{partner.displayContact.phone || '—'}</strong>
                      <small>{partner.displayContact.email || '—'}</small>
                    </div>
                  </td>
                  <td>
                    <div className="partner-rating">
                      <span>★</span>
                      <strong>{formatRating(partner.displayRating)}</strong>
                    </div>
                  </td>
                  <td>
                    <div className="partner-contract">
                      <strong>{formatDate(partner.displayContractStart)}</strong>
                      <small>{formatDate(partner.displayContractEnd)}</small>
                    </div>
                  </td>
                  <td>
                    <PartnerBadge
                      label={partner.displayStatus === 'active' ? 'Hoạt động' : partner.displayStatus || '—'}
                      tone={partner.displayStatus === 'active' ? 'green' : 'amber'}
                    />
                  </td>
                  <td>
                    <PartnerBadge
                      label={partner.displayVisible ? 'Có' : 'Không'}
                      tone={partner.displayVisible ? 'blue' : 'amber'}
                    />
                  </td>
                  <td>
                    <div className="partner-actions">
                      <button type="button" onClick={() => openDetail(partner)}>
                        Chi tiết
                      </button>
                      <button type="button" onClick={() => resetForm(partner)}>
                        Sửa
                      </button>
                      <button
                        className="danger"
                        type="button"
                        onClick={() => setDeleteTarget(partner)}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="partner-pagination">
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={pagination.currentPage <= 1 || loading}
        >
          Trước
        </button>
        <span>
          Trang {pagination.currentPage} / {pagination.lastPage}
        </span>
        <button
          type="button"
          onClick={() => setPage((current) => Math.min(pagination.lastPage, current + 1))}
          disabled={pagination.currentPage >= pagination.lastPage || loading}
        >
          Sau
        </button>
      </div>

      {formVisible ? (
        <PartnerFormModal
          editingPartner={editingPartner}
          form={form}
          formErrors={formErrors}
          onChange={changeField}
          onClose={closeForm}
          onSubmit={handleSubmit}
          saving={saving}
          typeOptions={typeOptions}
        />
      ) : null}

      {detailPartner ? (
        <PartnerDetailModal
          loading={detailLoading}
          onClose={() => setDetailPartner(null)}
          partner={detailPartner}
        />
      ) : null}

      {deleteTarget ? (
        <div
          className="partner-modal-backdrop"
          role="presentation"
          onMouseDown={() => {
            if (!deleting) setDeleteTarget(null)
          }}
        >
          <div
            className="partner-delete-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="partner-delete-icon">!</div>
            <h3>Xóa mềm đối tác?</h3>
            <p>
              Bạn có chắc muốn xóa <strong>{getPartnerName(deleteTarget)}</strong> khỏi hệ thống?
            </p>
            <div className="partner-modal-actions">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Hủy
              </button>
              <button
                className="danger primary"
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Đang xóa...' : 'Xóa mềm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className={`partner-toast ${notice.type}`}>
          <div>
            <strong>{notice.type === 'success' ? 'Thành công' : 'Có lỗi xảy ra'}</strong>
            <p>{notice.text}</p>
          </div>
          <button type="button" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      ) : null}
    </section>
  )
}

export default PartnerManagementPage

