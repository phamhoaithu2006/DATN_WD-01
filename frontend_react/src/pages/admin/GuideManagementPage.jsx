import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../services/apiClient'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminGuideActivityModal from '../../components/admin/guides/AdminGuideActivityModal.jsx'
import { getGuideActivityHistory, getGuidePresence } from '../../services/adminGuideMonitoringApi.js'
import Icon from '../../components/customer/Icon'
import '../../styles/support-staff.css'

const DEFAULT_FORM = {
  user_id: '',
  full_name: '',
  email: '',
  phone: '',
  experience_years: '',
  status: '',
  languages: [],
  experiences: [],
}

const EMPTY_LANGUAGE_ROW = { language_id: '', level_id: '' }
const EMPTY_CERTIFICATE_ROW = { certificate_id: '', issued_year: '' }

const GUIDE_STATUSES = ['active', 'inactive', 'locked']
const PRESENCE_POLL_INTERVAL = 30000
const PRESENCE_CACHE_DURATION = 15000

const STATUS_LABELS = {
  active: 'Đang hoạt động',
  inactive: 'Ngừng hoạt động',
  locked: 'Tạm khóa',
}

const GUIDE_TIMELINE_FIELDS = {
  name: 'Họ tên', email: 'Email', phone: 'Số điện thoại', guide_code: 'Mã HDV', experience_years: 'Kinh nghiệm', status: 'Trạng thái', languages: 'Ngoại ngữ', certificates: 'Chứng chỉ',
}

function GuideAdminTimeline({ items, loading, onClose }) {
  const display = (field, value) => {
    if (Array.isArray(value)) return value.join(', ') || 'Trống'
    if (field === 'status') return STATUS_LABELS[value] || value || 'Trống'
    return value === null || value === undefined || value === '' ? 'Trống' : String(value)
  }
  const same = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null)

  return <div className="catalog-timeline-backdrop" role="presentation" onMouseDown={onClose}><section className="catalog-timeline-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
    <header><div><small>TIMELINE</small><h2>Thao tác quản lý hướng dẫn viên</h2></div><button type="button" onClick={onClose}>&times;</button></header>
    {loading ? <div className="catalog-timeline-empty">Đang tải timeline...</div> : items.length ? <div className="catalog-timeline-list">{items.map((item) => {
      const before = item.metadata?.before || {}; const after = item.metadata?.after || {}
      const changes = Object.keys(GUIDE_TIMELINE_FIELDS).filter((field) => !same(before[field], after[field]))
      return <article key={item.id}><i /><div><strong>{item.description}</strong><p><b>{item.actor?.name || 'Quản trị viên'}</b> · {item.target_name}</p>
        {changes.length ? <div className="catalog-timeline-changes">{changes.map((field) => <div key={field}><b>{GUIDE_TIMELINE_FIELDS[field]}</b><span>{display(field, before[field])}</span><em>→</em><span className="after">{display(field, after[field])}</span></div>)}</div> : null}
        <time>{item.created_at ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.created_at)) : '--'}</time>
      </div></article>
    })}</div> : <div className="catalog-timeline-empty">Chưa có thao tác quản trị nào.</div>}
  </section></div>
}

function unwrapList(response) {
  const payload = response?.data

  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data

  return []
}

function unwrapPagination(response) {
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

function buildPageNumbers(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)

  const pages = new Set([1, totalPages, currentPage])
  if (currentPage > 1) pages.add(currentPage - 1)
  if (currentPage < totalPages) pages.add(currentPage + 1)
  if (currentPage <= 3) [2, 3, 4].forEach((page) => pages.add(page))
  if (currentPage >= totalPages - 2) {
    [totalPages - 1, totalPages - 2, totalPages - 3].forEach((page) => pages.add(page))
  }

  return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b)
}

function getErrorMessage(error, fallback) {
  const errors = error?.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  return error?.response?.data?.message || fallback
}

function getUserName(guide) {
  return guide?.user?.full_name || guide?.user?.name || 'Chưa có tên'
}

function getAccountName(user) {
  return user?.full_name || user?.name || user?.email || 'Chưa có tên'
}

function getInitials(guide) {
  return getUserName(guide)
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function getLanguages(guide) {
  return Array.isArray(guide?.languages) ? guide.languages : []
}

function getLanguageLabel(language) {
  const languageName =
    language?.language?.name ||
    language?.language_name ||
    language?.language ||
    '-'

  const levelName =
    language?.level?.level_name ||
    language?.level?.name ||
    language?.level_name ||
    ''

  return levelName ? `${languageName} (${levelName})` : languageName
}

function getCertificateName(experience) {
  return experience?.certificate?.name || experience?.certificate_name || '-'
}

function getCertificateIssuer(experience) {
  return experience?.certificate?.issued_by || experience?.issued_by || ''
}

function getLanguageLevels(languages, languageId) {
  if (!languageId) return []

  const selected = languages.find(
    (item) => String(item.id) === String(languageId),
  )

  if (Array.isArray(selected?.levels)) {
    return Array.from(
      new Map(
        selected.levels.map((level) => [String(level.id), level]),
      ).values(),
    )
  }

  return []
}

function getAssignedTourCount(guide) {
  return (
    guide?.assigned_tours_count ||
    guide?.tours_count ||
    guide?.current_tours_count ||
    0
  )
}

function toLanguageRows(languages = []) {
  return languages.map((item) => ({
    language_id: String(item.language_id || item.language?.id || ''),
    level_id: String(item.level_id || item.level?.id || ''),
  }))
}

function toCertificateRows(experiences = []) {
  return experiences.map((item) => ({
    certificate_id: String(item.certificate_id || item.certificate?.id || ''),
    issued_year: item.issued_year ? String(item.issued_year) : '',
  }))
}

function makePayload(form) {
  return {
    user_id: form.user_id ? Number(form.user_id) : null,
    experience_years: Number(form.experience_years),
    status: form.status,
    full_name: form.full_name,
    email: form.email,
    phone: form.phone,
    languages: (form.languages || [])
      .filter((item) => item.language_id)
      .map((item) => ({
        language_id: Number(item.language_id),
        level_id: item.level_id ? Number(item.level_id) : null,
      })),
    experiences: (form.experiences || [])
      .filter((item) => item.certificate_id)
      .map((item) => ({
        certificate_id: Number(item.certificate_id),
        issued_year: item.issued_year ? Number(item.issued_year) : null,
      })),
  }
}

function formatPresenceDuration(value) {
  const seconds = Math.max(0, Number(value || 0))
  const minutes = Math.floor(seconds / 60)
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút`
  return `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`
}

function getGuidePresenceText(presence) {
  if (!presence?.last_seen_at) return { label: 'Chưa truy cập', detail: 'Chưa có dữ liệu online' }
  if (presence.is_online) return { label: 'Trực tuyến', detail: `Đã online ${formatPresenceDuration(presence.online_seconds)}` }
  return { label: 'Ngoại tuyến', detail: `Rời hệ thống ${formatPresenceDuration(presence.offline_seconds)} trước` }
}

function getExperienceYearsError(value) {
  const experienceYears = Number(value)

  if (
    value === '' ||
    !Number.isInteger(experienceYears) ||
    experienceYears < 0 ||
    experienceYears > 40
  ) {
    return 'Số năm kinh nghiệm phải là số nguyên từ 0 đến 40.'
  }

  return ''
}

function validateForm(form) {
  const errors = {}
  const currentYear = new Date().getFullYear()
  const languages = Array.isArray(form.languages)
    ? form.languages
    : []

  const experiences = Array.isArray(form.experiences)
    ? form.experiences
    : []

  if (!form.user_id) {
    errors.user_id = 'Vui lòng chọn tài khoản HDV.'
  }


  const experienceYearsError = getExperienceYearsError(form.experience_years)

  if (experienceYearsError) {
    errors.experience_years = experienceYearsError
  }

  if (!GUIDE_STATUSES.includes(form.status)) {
    errors.status = 'Vui lòng chọn trạng thái.'
  }

  if (languages.length === 0) {
    errors.languages = 'Vui lòng thêm ít nhất một ngoại ngữ.'
  } else {
    const invalidLanguage = languages.some(
      (item) => !item.language_id || !item.level_id,
    )

    const duplicateLanguage =
      new Set(
        languages
          .filter((item) => item.language_id)
          .map((item) => item.language_id),
      ).size !== languages.filter((item) => item.language_id).length

    if (invalidLanguage) {
      errors.languages = 'Mỗi dòng ngoại ngữ cần chọn ngôn ngữ và trình độ.'
    } else if (duplicateLanguage) {
      errors.languages = 'Không chọn trùng ngoại ngữ.'
    }
  }

  if (experiences.length === 0) {
    errors.experiences = 'Vui lòng thêm ít nhất một chứng chỉ.'
  } else {
    const invalidCertificate = experiences.some((item) => {
      const year = Number(item.issued_year)

      return (
        !item.certificate_id ||
        !item.issued_year ||
        !Number.isInteger(year) ||
        year < 1900 ||
        year > currentYear
      )
    })

    const duplicateCertificate =
      new Set(
        experiences
          .filter((item) => item.certificate_id)
          .map((item) => item.certificate_id),
      ).size !== experiences.filter((item) => item.certificate_id).length

    if (invalidCertificate) {
      errors.experiences =
        'Mỗi dòng chứng chỉ cần chọn chứng chỉ và năm cấp hợp lệ.'
    } else if (duplicateCertificate) {
      errors.experiences = 'Không chọn trùng chứng chỉ.'
    }
  }

  return errors
}

async function uploadAvatar(guideId, file) {
  const formData = new FormData()
  formData.append('avatar', file)

  return apiClient.post(`/admin/guides/${guideId}/avatar`, formData)
}

async function deleteAvatar(guideId) {
  return apiClient.delete(`/admin/guides/${guideId}/avatar`)
}

function GuideManagementPage() {
  const [guides, setGuides] = useState([])

  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    locked: 0,
  })

  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('all')

  const [presenceMap, setPresenceMap] = useState({})
  const [activityGuide, setActivityGuide] = useState(null)
  const [activityData, setActivityData] = useState(null)
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityTab, setActivityTab] = useState('activities')
  const [adminTimelineOpen, setAdminTimelineOpen] = useState(false)
  const [adminTimelineLoading, setAdminTimelineLoading] = useState(false)
  const [adminTimelineItems, setAdminTimelineItems] = useState([])

  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
  })
  const [pageSize, setPageSize] = useState(5)

  const [languages, setLanguages] = useState([])
  const [certificates, setCertificates] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [availableUsersLoading, setAvailableUsersLoading] = useState(false)

  const [form, setForm] = useState(DEFAULT_FORM)
  const [editingGuideId, setEditingGuideId] = useState(null)
  const [editingGuideCode, setEditingGuideCode] = useState('')
  const [editingUser, setEditingUser] = useState(null)

  const [avatarFile, setAvatarFile] = useState(null)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState('')
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState('')
  const [removeAvatarRequested, setRemoveAvatarRequested] = useState(false)

  const avatarInputRef = useRef(null)
  const presenceRequestRef = useRef(null)
  const lastPresenceLoadedAtRef = useRef(0)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [detailGuide, setDetailGuide] = useState(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [formErrors, setFormErrors] = useState({})

  const hasFilter =
    statusFilter !== 'all' ||
    leaveStatusFilter !== 'all'

  const filteredStatusStatistics = useMemo(
    () => ({
      active: statistics.active || 0,
      inactive: statistics.inactive || 0,
      locked: statistics.locked || 0,
    }),
    [statistics],
  )

  const selectableUsers = useMemo(() => {
    if (!editingGuideId || !editingUser?.id) {
      return availableUsers
    }

    const currentUserId = String(editingUser.id)

    return [
      editingUser,
      ...availableUsers.filter((user) => String(user.id) !== currentUserId),
    ]
  }, [availableUsers, editingGuideId, editingUser])

  const loadStatistics = useCallback(async () => {
    try {
      const response = await apiClient.get('/admin/guides/statistics')

      const next = {
        total: response.data?.total || 0,
        active: 0,
        inactive: 0,
        locked: 0,
      }

      if (Array.isArray(response.data?.data)) {
        response.data.data.forEach((item) => {
          next[item.status] = Number(item.total || 0)
        })
      }

      setStatistics(next)
    } catch {
      // Không chặn màn hình khi phần thống kê lỗi.
    }
  }, [])

  const loadCatalogs = useCallback(async () => {
    try {
      const [
        languageResponse,
        certificateResponse,
      ] = await Promise.all([
        apiClient.get('/admin/languages'),
        apiClient.get('/admin/certificates'),
      ])

      setLanguages(unwrapList(languageResponse))
      setCertificates(unwrapList(certificateResponse))
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          'Không tải được danh mục ngôn ngữ, chứng chỉ hoặc khu vực.',
        ),
      )
    }
  }, [])

  const loadAvailableUsers = useCallback(async () => {
    setAvailableUsersLoading(true)

    try {
      const response = await apiClient.get('/admin/guides/available-users')
      setAvailableUsers(unwrapList(response))
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          'Không tải được danh sách tài khoản HDV chưa có hồ sơ.',
        ),
      )
    } finally {
      setAvailableUsersLoading(false)
    }
  }, [])

  const loadGuides = useCallback(
    async (page = 1) => {
      setIsLoading(true)
      setError('')

      try {
        const params = { page, per_page: pageSize }

        let endpoint = '/admin/guides'

        if (keyword.trim() || hasFilter) {
          endpoint = hasFilter
            ? '/admin/guides/filter'
            : '/admin/guides/search'
        }

        if (keyword.trim()) {
          params.search = keyword.trim()
        }

        if (statusFilter !== 'all') {
          params.status = statusFilter
        }

        if (leaveStatusFilter !== 'all') {
          params.leave_status = leaveStatusFilter
        }

        const response = await apiClient.get(endpoint, { params })

        setGuides(unwrapList(response))
        setPagination(unwrapPagination(response))
      } catch (requestError) {
        setError(
          getErrorMessage(
            requestError,
            'Không tải được danh sách hướng dẫn viên.',
          ),
        )
      } finally {
        setIsLoading(false)
      }
    },
    [hasFilter, keyword, leaveStatusFilter, pageSize, statusFilter],
  )

  const loadGuidePresence = useCallback(
    async ({ force = false } = {}) => {
      if (document.visibilityState !== 'visible') {
        return null
      }

      const now = Date.now()

      if (
        !force &&
        now - lastPresenceLoadedAtRef.current < PRESENCE_CACHE_DURATION
      ) {
        return null
      }

      if (presenceRequestRef.current) {
        return presenceRequestRef.current
      }

      const request = getGuidePresence()
        .then((response) => {
          setPresenceMap(response?.data || {})
          lastPresenceLoadedAtRef.current = Date.now()
          return response
        })
        .catch(() => {
          // Không chặn màn hình khi trạng thái online chưa tải được.
          return null
        })
        .finally(() => {
          presenceRequestRef.current = null
        })

      presenceRequestRef.current = request
      return request
    },
    [],
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCatalogs()
      void loadStatistics()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadCatalogs, loadStatistics])

  useEffect(() => {
    function reloadGuideLeaveRequests() {
      void loadGuides(pagination.currentPage)
    }

    window.addEventListener(
      'admin-guide-leave-request:changed',
      reloadGuideLeaveRequests,
    )

    return () => {
      window.removeEventListener(
        'admin-guide-leave-request:changed',
        reloadGuideLeaveRequests,
      )
    }
  }, [loadGuides, pagination.currentPage])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadGuides(1)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [loadGuides])

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => {
      void loadGuidePresence({ force: true })
    }, 0)

    const intervalId = window.setInterval(() => {
      void loadGuidePresence()
    }, PRESENCE_POLL_INTERVAL)

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void loadGuidePresence({ force: true })
      }
    }

    function handleWindowFocus() {
      void loadGuidePresence()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      window.clearTimeout(initialLoadId)
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [loadGuidePresence])

  useEffect(() => {
    if (!notice && !error) return undefined

    const timer = window.setTimeout(() => {
      setNotice('')
      setError('')
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [error, notice])

  useEffect(() => {
    return () => {
      if (previewAvatarUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewAvatarUrl)
      }
    }
  }, [previewAvatarUrl])

  function resetAvatarState() {
    setAvatarFile(null)
    setCurrentAvatarUrl('')
    setPreviewAvatarUrl('')
    setRemoveAvatarRequested(false)

    if (avatarInputRef.current) {
      avatarInputRef.current.value = ''
    }
  }

  function updateForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    setFormErrors((current) => ({
      ...current,
      [field]: field === 'experience_years' && value !== ''
        ? getExperienceYearsError(value)
        : '',
    }))
  }

  function updateLanguage(index, field, value) {
    setForm((current) => ({
      ...current,
      languages: current.languages.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
              ...(field === 'language_id' ? { level_id: '' } : {}),
            }
          : item,
      ),
    }))

    setFormErrors((current) => ({
      ...current,
      languages: '',
    }))
  }

  function addLanguage() {
    setForm((current) => ({
      ...current,
      languages: [...current.languages, { ...EMPTY_LANGUAGE_ROW }],
    }))
  }

  function removeLanguage(index) {
    setForm((current) => ({
      ...current,
      languages: current.languages.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }))

    setFormErrors((current) => ({
      ...current,
      languages: '',
    }))
  }

  function updateCertificate(index, field, value) {
    setForm((current) => ({
      ...current,
      experiences: current.experiences.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item,
      ),
    }))

    setFormErrors((current) => ({
      ...current,
      experiences: '',
    }))
  }

  function addCertificate() {
    setForm((current) => ({
      ...current,
      experiences: [
        ...current.experiences,
        { ...EMPTY_CERTIFICATE_ROW },
      ],
    }))
  }

  function removeCertificate(index) {
    setForm((current) => ({
      ...current,
      experiences: current.experiences.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }))

    setFormErrors((current) => ({
      ...current,
      experiences: '',
    }))
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0] || null

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Ảnh đại diện phải là file hình ảnh.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Ảnh đại diện không được vượt quá 2 MB.')
      return
    }

    setAvatarFile(file)
    setRemoveAvatarRequested(false)

    setPreviewAvatarUrl((current) => {
      if (current.startsWith('blob:')) {
        URL.revokeObjectURL(current)
      }

      return URL.createObjectURL(file)
    })
  }

  function openAvatarPicker() {
    avatarInputRef.current?.click()
  }

  function clearSelectedAvatar() {
    setAvatarFile(null)
    setRemoveAvatarRequested(false)

    setPreviewAvatarUrl((current) => {
      if (current.startsWith('blob:')) {
        URL.revokeObjectURL(current)
      }

      return ''
    })

    if (avatarInputRef.current) {
      avatarInputRef.current.value = ''
    }
  }

  function requestAvatarDeletion() {
    setRemoveAvatarRequested(true)
    setAvatarFile(null)

    setPreviewAvatarUrl((current) => {
      if (current.startsWith('blob:')) {
        URL.revokeObjectURL(current)
      }

      return ''
    })

    if (avatarInputRef.current) {
      avatarInputRef.current.value = ''
    }
  }

  function openCreateForm() {
    setForm({
      ...DEFAULT_FORM,
      languages: [{ ...EMPTY_LANGUAGE_ROW }],
      experiences: [{ ...EMPTY_CERTIFICATE_ROW }],
    })

    resetAvatarState()
    setEditingGuideId(null)
    setEditingGuideCode('')
    setEditingUser(null)
    setFormErrors({})
    setError('')
    setNotice('')
    setIsFormOpen(true)

    void loadCatalogs()
    void loadAvailableUsers()
  }

  async function openEditForm(guide) {
    let sourceGuide = guide

    try {
      const response = await apiClient.get(`/admin/guides/${guide.id}`)
      sourceGuide = response.data?.data || guide
    } catch {
      // Dùng dữ liệu danh sách nếu API chi tiết tạm thời không tải được.
    }

    setForm({
      user_id: String(sourceGuide.user_id || sourceGuide.user?.id || ''),
      full_name: sourceGuide.user?.full_name || sourceGuide.user?.name || sourceGuide.full_name || sourceGuide.name || '',
      email: sourceGuide.user?.email || sourceGuide.email || '',
      phone: sourceGuide.user?.phone || sourceGuide.phone || '',
      experience_years: String(sourceGuide.experience_years ?? ''),
      status: sourceGuide.status || '',
      languages: toLanguageRows(sourceGuide.languages),
      experiences: toCertificateRows(sourceGuide.experiences),
    })

    setAvatarFile(null)
    setCurrentAvatarUrl(sourceGuide.user?.avatar_url || sourceGuide.avatar_url || '')
    setPreviewAvatarUrl('')
    setRemoveAvatarRequested(false)
    setEditingGuideId(sourceGuide.id)
    setEditingGuideCode(sourceGuide.guide_code || '')
    setEditingUser(sourceGuide.user || null)
    setFormErrors({})
    setError('')
    setNotice('')
    setIsFormOpen(true)

    void loadCatalogs()
    void loadAvailableUsers()
  }

  function closeForm() {
    setIsFormOpen(false)
  }

  async function openDetail(guide) {
    setIsDetailLoading(true)
    setDetailGuide(guide)
    setError('')

    try {
      const response = await apiClient.get(`/admin/guides/${guide.id}`)
      setDetailGuide(response.data?.data || guide)
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          'Không tải được chi tiết hướng dẫn viên.',
        ),
      )
    } finally {
      setIsDetailLoading(false)
    }
  }

  async function openActivityHistory(guide) {
    setActivityGuide(guide)
    setActivityData(null)
    setActivityTab('activities')
    setActivityLoading(true)
    try {
      const response = await getGuideActivityHistory(guide.id, { activity_limit: 150 })
      setActivityData(response?.data || null)
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Không tải được lịch sử hoạt động của HDV.'))
    } finally {
      setActivityLoading(false)
    }
  }

  async function saveGuide(event) {
    event.preventDefault()

    const nextErrors = validateForm(form)

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      return
    }

    setIsSaving(true)
    setError('')
    setNotice('')

    try {
      const payload = makePayload(form)

      const response = editingGuideId
        ? await apiClient.put(`/admin/guides/${editingGuideId}`, payload)
        : await apiClient.post('/admin/guides', payload)

      const guideId = response.data?.data?.id || editingGuideId
      let avatarFailed = false

      if (avatarFile && guideId) {
        try {
          await uploadAvatar(guideId, avatarFile)
        } catch {
          avatarFailed = true
        }
      } else if (
        editingGuideId &&
        removeAvatarRequested &&
        guideId
      ) {
        try {
          await deleteAvatar(guideId)
        } catch {
          avatarFailed = true
        }
      }

      await Promise.allSettled([
        loadGuides(pagination.currentPage),
        loadStatistics(),
        loadCatalogs(),
        loadAvailableUsers(),
      ])

      closeForm()

      const defaultMessage = editingGuideId
        ? 'Cập nhật hướng dẫn viên thành công.'
        : 'Thêm hướng dẫn viên thành công.'

      setNotice(
        `${response.data?.message || defaultMessage}${
          avatarFailed ? ' Ảnh đại diện chưa tải lên được.' : ''
        }`,
      )
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          'Không lưu được thông tin hướng dẫn viên.',
        ),
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return

    setError('')
    setNotice('')

    try {
      const response = await apiClient.delete(
        `/admin/guides/${deleteTarget.id}`,
      )

      setDeleteTarget(null)

      await Promise.all([
        loadGuides(pagination.currentPage),
        loadStatistics(),
        loadCatalogs(),
      ])

      setNotice(
        response.data?.message ||
          'Đã chuyển hướng dẫn viên vào thùng rác.',
      )
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          'Không xóa được hướng dẫn viên.',
        ),
      )
    }
  }

  async function openAdminTimeline() {
    setAdminTimelineOpen(true)
    setAdminTimelineLoading(true)
    try {
      const response = await apiClient.get('/admin/guides/admin-timeline')
      setAdminTimelineItems(Array.isArray(response.data?.data) ? response.data.data : [])
    } catch (requestError) {
      setAdminTimelineOpen(false)
      setError(getErrorMessage(requestError, 'Không tải được timeline thao tác của admin.'))
    } finally {
      setAdminTimelineLoading(false)
    }
  }

  function selectGuideAccount(event) {
    const userId = event.target.value
    const user = selectableUsers.find((item) => String(item.id) === String(userId))
    setForm((current) => ({
      ...current,
      user_id: userId,
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    }))
    setFormErrors((current) => ({ ...current, user_id: '' }))
  }

  function selectStatistic(status) {
    setStatusFilter(status)
    setLeaveStatusFilter('all')

    setPagination((current) => ({
      ...current,
      currentPage: 1,
    }))
  }

  const visibleStart = pagination.total > 0
    ? (pagination.currentPage - 1) * pageSize + 1
    : 0
  const visibleEnd = Math.min(pagination.currentPage * pageSize, pagination.total)
  const pageNumbers = buildPageNumbers(pagination.currentPage, pagination.lastPage)

  return (
    <section className="guide-page">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Hướng Dẫn Viên', 'Quản Lý Hướng Dẫn Viên']}
        title="Quản Lý Hướng Dẫn Viên"
        description="Quản lý thông tin, khu vực phụ trách và phân công hướng dẫn viên."
        showNotificationBell={false}
        actions={
          <div className="guide-header-actions-group">
            <div className="guide-header-actions-top-row">
              <div className="guide-header-actions-button-stack">
                <div className="guide-header-actions-primary-buttons">
                  <Link className="guide-trash-button" to="/admin/guides/trash">
                    <Icon name="trash" size={16} />
                    Thùng rác
                  </Link>

                  <button
                    className="guide-add-button"
                    type="button"
                    onClick={openCreateForm}
                  >
                    <Icon name="plus" size={16} />
                    Thêm HDV
                  </button>
                </div>

              </div>
            </div>
          </div>
        }
      />

      {notice ? (
        <div className="support-toast success">
          <div>
            <strong>Thành công</strong>
            <p>{notice}</p>
          </div>

          <button type="button" onClick={() => setNotice('')}>
            ×
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="support-toast error">
          <div>
            <strong>Có lỗi xảy ra</strong>
            <p>{error}</p>
          </div>

          <button type="button" onClick={() => setError('')}>
            ×
          </button>
        </div>
      ) : null}

      <div className="guide-stat-grid">
        <button
          className={`guide-stat-card blue ${
            statusFilter === 'all'
              ? 'is-active'
              : ''
          }`}
          type="button"
          onClick={() => selectStatistic('all')}
        >
          <strong>{statistics.total || pagination.total || guides.length}</strong>
          <span>Tổng HDV</span>
          <small>Toàn bộ HDV</small>
        </button>

        <button
          className={`guide-stat-card green ${
            statusFilter === 'active' ? 'is-active' : ''
          }`}
          type="button"
          onClick={() => selectStatistic('active')}
        >
          <strong>{filteredStatusStatistics.active}</strong>
          <span>Đang hoạt động</span>
          <small>Sẵn sàng nhận tour</small>
        </button>

        <button
          className={`guide-stat-card amber ${
            statusFilter === 'inactive' ? 'is-active' : ''
          }`}
          type="button"
          onClick={() => selectStatistic('inactive')}
        >
          <strong>{filteredStatusStatistics.inactive}</strong>
          <span>Ngừng hoạt động</span>
          <small>Tạm ngừng nhận tour</small>
        </button>

        <button
          className={`guide-stat-card purple ${
            statusFilter === 'locked' ? 'is-active' : ''
          }`}
          type="button"
          onClick={() => selectStatistic('locked')}
        >
          <strong>{filteredStatusStatistics.locked}</strong>
          <span>Tạm khóa</span>
          <small>Tạm ẩn HDV</small>
        </button>

      </div>


      <div className="guide-content-grid">
        <div className="guide-main-panel">
          <div className="guide-filter-bar">
            <label className="guide-search">
              <Icon name="search" size={18} />

              <input
                aria-label="Tìm kiếm HDV"
                value={keyword}
                placeholder="Tìm theo mã HDV, tên hoặc email"
                onChange={(event) => {
                  setKeyword(event.target.value)
                  setPagination((current) => ({
                    ...current,
                    currentPage: 1,
                  }))
                }}
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPagination((current) => ({
                  ...current,
                  currentPage: 1,
                }))
              }}
            >
              <option value="all">Tất cả trạng thái</option>

              {GUIDE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>

            <select
              value={leaveStatusFilter}
              onChange={(event) => {
                setLeaveStatusFilter(event.target.value)
                setPagination((current) => ({
                  ...current,
                  currentPage: 1,
                }))
              }}
            >
              <option value="all">Tất cả trạng thái nghỉ</option>
              <option value="resting">Đang nghỉ</option>
              <option value="waiting_leave">Đang chờ nghỉ</option>
              <option value="available_leave">Không có đơn nghỉ</option>
            </select>

            <button className="catalog-timeline-button guide-admin-timeline-button" type="button" onClick={openAdminTimeline}>
              Timeline <span>{adminTimelineItems.length}</span>
            </button>
          </div>

          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Avatar</th>
                  <th>Mã HDV</th>
                  <th>Họ và tên</th>
                  <th>Kinh nghiệm</th>
                  <th>Ngoại ngữ</th>
                  <th>Tour phụ trách</th>
                  <th>Trạng thái</th>
                  <th>Trực tuyến</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="support-empty-row" colSpan="10">
                      <div className="support-loading">
                        <span />
                        <p>Đang tải danh sách HDV...</p>
                      </div>
                    </td>
                  </tr>
                ) : null}

                {!isLoading && guides.length === 0 ? (
                  <tr>
                    <td colSpan="10">Chưa có hướng dẫn viên.</td>
                  </tr>
                ) : null}

                {!isLoading
                  ? guides.map((guide, index) => (
                      <tr key={guide.id}>
                        <td>{visibleStart + index}</td>
                        <td>
                          {guide.user?.avatar_url ? (
                            <img
                              alt={getUserName(guide)}
                              className="guide-avatar image"
                              src={guide.user.avatar_url}
                            />
                          ) : (
                            <span className="guide-avatar">
                              {getInitials(guide)}
                            </span>
                          )}
                        </td>

                        <td>
                          <strong className="guide-code">
                            {guide.guide_code || '-'}
                          </strong>
                        </td>

                        <td>
                          <strong>{getUserName(guide)}</strong>
                          <span>{guide.user?.email || 'Chưa có email'}</span>
                        </td>

                        <td>{guide.experience_years ?? 0} năm</td>

                        <td>
                          <div className="guide-language-list">
                            {getLanguages(guide).length > 0 ? (
                              getLanguages(guide)
                                .slice(0, 3)
                                .map((language) => (
                                  <span
                                    key={language.id || language.language_id}
                                  >
                                    {getLanguageLabel(language)}
                                  </span>
                                ))
                            ) : (
                              <span>Chưa có</span>
                            )}
                          </div>
                        </td>

                        <td>
                          <strong className="guide-tour-count">
                            {getAssignedTourCount(guide)} tour
                          </strong>
                        </td>

                        <td>
                          <span className={`guide-status ${guide.status}`}>
                            {STATUS_LABELS[guide.status] || guide.status}
                          </span>
                        </td>

                        <td>
                          {(() => {
                            const presence = presenceMap[String(guide.id)] || {}
                            const meta = getGuidePresenceText(presence)
                            return (
                              <div className={`support-presence-cell ${presence.is_online ? 'online' : 'offline'}`}>
                                <span className="support-presence-dot" />
                                <div><strong>{meta.label}</strong><small>{meta.detail}</small></div>
                              </div>
                            )
                          })()}
                        </td>

                        <td>
                          <div className="guide-actions">
                            <button
                              className="guide-action-icon"
                              type="button"
                              title="Xem chi tiết"
                              aria-label="Xem chi tiết"
                              onClick={() => void openDetail(guide)}
                            >
                              <Icon name="eye" size={16} />
                            </button>

                            <button
                              className="guide-action-icon"
                              type="button"
                              title="Chỉnh sửa"
                              aria-label="Chỉnh sửa"
                              onClick={() => openEditForm(guide)}
                            >
                              <Icon name="edit" size={16} />
                            </button>

                            <button
                              className="guide-action-icon"
                              type="button"
                              title="Lịch sử hoạt động"
                              aria-label="Lịch sử hoạt động"
                              onClick={() => void openActivityHistory(guide)}
                            >
                              <Icon name="clock" size={16} />
                            </button>

                            <button
                              className="guide-action-icon danger"
                              type="button"
                              title="Xóa"
                              aria-label="Xóa"
                              onClick={() => setDeleteTarget(guide)}
                            >
                              <Icon name="trash" size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span>Hiển thị <strong className="text-slate-900">{visibleStart}-{visibleEnd}</strong> trên <strong className="text-slate-900">{pagination.total}</strong> HDV</span>
              <label className="flex items-center gap-2">
                <span>Số dòng:</span>
                <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                  {[5, 10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <button type="button" disabled={pagination.currentPage <= 1 || isLoading} onClick={() => void loadGuides(1)} className="rounded-lg border border-slate-200 px-3 py-2 font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Đầu</button>
              <button type="button" disabled={pagination.currentPage <= 1 || isLoading} onClick={() => void loadGuides(pagination.currentPage - 1)} className="rounded-lg border border-slate-200 px-3 py-2 font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Trước</button>
              {pageNumbers.map((page, index) => (
                <span key={page} className="inline-flex items-center gap-1">
                  {pageNumbers[index - 1] && page - pageNumbers[index - 1] > 1 ? <span className="px-2 text-slate-400">...</span> : null}
                  <button type="button" disabled={isLoading} onClick={() => void loadGuides(page)} className={`rounded-lg border px-3 py-2 font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${pagination.currentPage === page ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{page}</button>
                </span>
              ))}
              <button type="button" disabled={pagination.currentPage >= pagination.lastPage || isLoading} onClick={() => void loadGuides(pagination.currentPage + 1)} className="rounded-lg border border-slate-200 px-3 py-2 font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Sau</button>
              <button type="button" disabled={pagination.currentPage >= pagination.lastPage || isLoading} onClick={() => void loadGuides(pagination.lastPage)} className="rounded-lg border border-slate-200 px-3 py-2 font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Cuối</button>
            </div>
          </div>
        </div>
      </div>

      {isFormOpen ? (
        <div className="guide-modal-backdrop">
          <form
            className="guide-modal"
            onSubmit={saveGuide}
            noValidate
          >
            <div className="guide-modal-header">
              <div>
                <h2>
                  {editingGuideId
                    ? 'Cập nhật HDV'
                    : 'Thêm hướng dẫn viên'}
                </h2>

                <p>
                  {editingGuideId
                    ? `Mã hiển thị: ${editingGuideCode || '-'}`
                    : 'Thông tin tài khoản hướng dẫn viên'}
                </p>
              </div>

              <button type="button" onClick={closeForm}>
                Đóng
              </button>
            </div>

            <div className="guide-form-grid">
              <label>
                <span className="guide-field-label-line">
                  Họ và tên <span className="guide-required-mark">*</span>
                </span>

                <select
                  required
                  value={form.user_id}
                  disabled={Boolean(editingGuideId)}
                  onChange={selectGuideAccount}
                >
                  <option value="" disabled>
                    {availableUsersLoading
                      ? 'Đang tải tài khoản...'
                      : 'Chọn tài khoản HDV chưa có hồ sơ'}
                  </option>

                  {selectableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {getAccountName(user)}
                    </option>
                  ))}
                </select>

                <small className="guide-field-hint">
                  Chỉ hiển thị tài khoản HDV chưa tạo hồ sơ hướng dẫn viên.
                </small>

                {formErrors.user_id ? (
                  <span className="guide-field-error">
                    {formErrors.user_id}
                  </span>
                ) : null}
              </label>

              <div className="guide-account-fields guide-form-wide">
                <label>
                  <span>Họ và tên</span>
                  <input value={form.full_name} readOnly={!editingGuideId} onChange={(event) => updateForm('full_name', event.target.value)} />
                </label>
                <label>
                  <span>Email</span>
                  <input type="email" value={form.email} readOnly={!editingGuideId} onChange={(event) => updateForm('email', event.target.value)} />
                  {formErrors.email ? <span className="guide-field-error">{formErrors.email}</span> : null}
                </label>
                <label>
                  <span>Số điện thoại</span>
                  <input value={form.phone} readOnly={!editingGuideId} onChange={(event) => updateForm('phone', event.target.value)} />
                </label>
              </div>

              <label>
                <span className="guide-field-label-line">
                  Số năm kinh nghiệm{' '}
                  <span className="guide-required-mark">*</span>
                </span>

                <input
                  required
                  type="number"
                  value={form.experience_years}
                  aria-invalid={Boolean(formErrors.experience_years)}
                  className={formErrors.experience_years ? 'guide-input-error' : ''}
                  onChange={(event) =>
                    updateForm('experience_years', event.target.value)
                  }
                />

                {formErrors.experience_years ? (
                  <span className="guide-field-error">
                    {formErrors.experience_years}
                  </span>
                ) : null}
              </label>

              <label className="guide-form-wide">
                <span className="guide-field-label-line">
                  Trạng thái <span className="guide-required-mark">*</span>
                </span>

                <select
                  value={form.status}
                  onChange={(event) =>
                    updateForm('status', event.target.value)
                  }
                >
                  <option value="" disabled>
                    Chọn trạng thái
                  </option>

                  {GUIDE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>

                {formErrors.status ? (
                  <span className="guide-field-error">
                    {formErrors.status}
                  </span>
                ) : null}
              </label>

              <label className="guide-form-wide">
                <span className="guide-field-label-line">
                  Ngoại ngữ <span className="guide-required-mark">*</span>
                </span>

                <div className="guide-repeat-list">
                  {form.languages.map((language, index) => {
                    const selectedLevels = getLanguageLevels(
                      languages,
                      language.language_id,
                    )

                    const selectedLanguageIds = form.languages
                      .filter((_, itemIndex) => itemIndex !== index)
                      .map((item) => item.language_id)

                    return (
                      <div
                        className="guide-repeat-row"
                        key={`language-${index}`}
                      >
                        <select
                          value={language.language_id}
                          onChange={(event) =>
                            updateLanguage(
                              index,
                              'language_id',
                              event.target.value,
                            )
                          }
                        >
                          <option value="" disabled>
                            Chọn ngôn ngữ
                          </option>

                          {languages
                            .filter(
                              (item) =>
                                !selectedLanguageIds.includes(
                                  String(item.id),
                                ),
                            )
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                        </select>

                        <select
                          disabled={!language.language_id}
                          value={language.level_id}
                          onChange={(event) =>
                            updateLanguage(
                              index,
                              'level_id',
                              event.target.value,
                            )
                          }
                        >
                          <option value="" disabled>
                            Chọn trình độ
                          </option>

                          {selectedLevels.map((level) => (
                            <option key={level.id} value={level.id}>
                              {level.level_name || level.name}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => removeLanguage(index)}
                        >
                          Xóa
                        </button>
                      </div>
                    )
                  })}

                  <button
                    className="guide-repeat-add"
                    type="button"
                    onClick={addLanguage}
                  >
                    Thêm ngôn ngữ
                  </button>
                </div>

                {formErrors.languages ? (
                  <span className="guide-field-error">
                    {formErrors.languages}
                  </span>
                ) : null}
              </label>

              <label className="guide-form-wide">
                <span className="guide-field-label-line">
                  Chứng chỉ <span className="guide-required-mark">*</span>
                </span>

                <div className="guide-repeat-list">
                  {form.experiences.map((experience, index) => {
                    const selectedCertificateIds = form.experiences
                      .filter((_, itemIndex) => itemIndex !== index)
                      .map((item) => item.certificate_id)

                    return (
                      <div
                        className="guide-repeat-row certificate"
                        key={`certificate-${index}`}
                      >
                        <select
                          value={experience.certificate_id}
                          onChange={(event) =>
                            updateCertificate(
                              index,
                              'certificate_id',
                              event.target.value,
                            )
                          }
                        >
                          <option value="" disabled>
                            Chọn chứng chỉ
                          </option>

                          {certificates
                            .filter(
                              (item) =>
                                !selectedCertificateIds.includes(
                                  String(item.id),
                                ),
                            )
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                        </select>

                        <input
                          min="1900"
                          max={new Date().getFullYear()}
                          placeholder="Năm cấp"
                          type="number"
                          value={experience.issued_year}
                          onChange={(event) =>
                            updateCertificate(
                              index,
                              'issued_year',
                              event.target.value,
                            )
                          }
                        />

                        <button
                          type="button"
                          onClick={() => removeCertificate(index)}
                        >
                          Xóa
                        </button>
                      </div>
                    )
                  })}

                  <button
                    className="guide-repeat-add"
                    type="button"
                    onClick={addCertificate}
                  >
                    Thêm chứng chỉ
                  </button>
                </div>

                {formErrors.experiences ? (
                  <span className="guide-field-error">
                    {formErrors.experiences}
                  </span>
                ) : null}
              </label>

              <label className="guide-form-wide">
                Ảnh đại diện

                <div className="guide-avatar-upload guide-avatar-upload-wide">
                  <div className="guide-avatar-upload-panel">
                    <input
                      ref={avatarInputRef}
                      accept="image/jpeg,image/png,image/webp"
                      className="guide-avatar-input"
                      type="file"
                      onChange={handleAvatarChange}
                    />

                  <button
                    className="guide-avatar-upload-btn"
                    type="button"
                    onClick={openAvatarPicker}
                  >
                    {currentAvatarUrl
                      ? 'Đổi ảnh đại diện'
                      : 'Chọn ảnh đại diện'}
                  </button>

                  <span className="guide-avatar-upload-meta">
                    {avatarFile
                      ? `Đã chọn: ${avatarFile.name}`
                      : currentAvatarUrl
                        ? 'Đang có ảnh đại diện hiện tại.'
                        : 'Chưa chọn ảnh.'}
                  </span>

                  {avatarFile ? (
                    <button
                      className="guide-avatar-action"
                      type="button"
                      onClick={clearSelectedAvatar}
                    >
                      Bỏ file đã chọn
                    </button>
                  ) : null}

                  {editingGuideId &&
                  currentAvatarUrl &&
                  !avatarFile ? (
                    <button
                      className="guide-avatar-action"
                      type="button"
                      onClick={requestAvatarDeletion}
                    >
                      {removeAvatarRequested
                        ? 'Đã chọn xóa avatar hiện tại'
                        : 'Xóa avatar hiện tại'}
                    </button>
                  ) : null}
                  </div>

                  <div className="guide-avatar-preview guide-avatar-preview-large">
                    {previewAvatarUrl || currentAvatarUrl ? (
                      <img
                        alt="Ảnh đại diện hướng dẫn viên"
                        src={previewAvatarUrl || currentAvatarUrl}
                      />
                    ) : (
                      <span>Chưa có ảnh</span>
                    )}
                  </div>
                </div>
              </label>
            </div>

            <div className="guide-modal-actions">
              <button disabled={isSaving} type="submit">
                {isSaving
                  ? 'Đang lưu...'
                  : editingGuideId
                    ? 'Lưu thay đổi'
                    : 'Thêm HDV'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {detailGuide ? (
        <div className="guide-modal-backdrop">
          <div className="guide-modal guide-detail-modal">
            <div className="guide-modal-header">
              <div>
                <h2>Chi tiết hướng dẫn viên</h2>

                <p>
                  {isDetailLoading
                    ? 'Đang tải dữ liệu mới nhất...'
                    : `Mã hiển thị: ${detailGuide.guide_code || '-'}`}
                </p>
              </div>

              <button type="button" onClick={() => setDetailGuide(null)}>
                Đóng
              </button>
            </div>

            <div className="guide-detail-head">
              {detailGuide.user?.avatar_url ? (
                <img
                  alt={getUserName(detailGuide)}
                  className="guide-avatar image large"
                  src={detailGuide.user.avatar_url}
                />
              ) : (
                <span className="guide-avatar large">
                  {getInitials(detailGuide)}
                </span>
              )}

              <div>
                <h3>{getUserName(detailGuide)}</h3>

                <div className="guide-detail-topline">
                  <span
                    className={`guide-status ${detailGuide.status || ''}`}
                  >
                    {STATUS_LABELS[detailGuide.status] ||
                      detailGuide.status ||
                      '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="guide-detail-grid">
              <div>
                <span>Email</span>
                <strong>{detailGuide.user?.email || '-'}</strong>
              </div>

              <div>
                <span>SĐT</span>
                <strong>{detailGuide.user?.phone || '-'}</strong>
              </div>

              <div>
                <span>Kinh nghiệm</span>
                <strong>{detailGuide.experience_years ?? 0} năm</strong>
              </div>

              <div>
                <span>Đánh giá</span>
                <strong>
                  {Number(detailGuide.average_rating || 0).toFixed(2)}
                </strong>
              </div>

              <div>
                <span>Lượt đánh giá</span>
                <strong>{detailGuide.review_count ?? 0}</strong>
              </div>

              <div>
                <span>Tour phụ trách</span>
                <strong>{getAssignedTourCount(detailGuide)} tour</strong>
              </div>
            </div>

            <div className="guide-detail-section">
              <h3>Ngoại ngữ</h3>

              <div className="guide-language-list">
                {getLanguages(detailGuide).length > 0 ? (
                  getLanguages(detailGuide).map((language) => (
                    <span key={language.id || language.language_id}>
                      {getLanguageLabel(language)}
                    </span>
                  ))
                ) : (
                  <span>Chưa có</span>
                )}
              </div>
            </div>

            <div className="guide-detail-section">
              <h3>Chứng chỉ</h3>

              {Array.isArray(detailGuide.experiences) &&
              detailGuide.experiences.length > 0 ? (
                <div className="guide-certificate-list">
                  {detailGuide.experiences.map((experience) => (
                    <div
                      key={experience.id || experience.certificate_id}
                    >
                      <strong>{getCertificateName(experience)}</strong>

                      <span>
                        {[
                          getCertificateIssuer(experience),
                          experience.issued_year,
                        ]
                          .filter(Boolean)
                          .join(' - ') || 'Chưa cập nhật năm cấp'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="guide-empty-text">Chưa có chứng chỉ.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activityGuide ? (
        <AdminGuideActivityModal
          guide={activityGuide}
          data={activityData}
          loading={activityLoading}
          activeTab={activityTab}
          onChangeTab={setActivityTab}
          onClose={() => { setActivityGuide(null); setActivityData(null) }}
        />
      ) : null}

      {adminTimelineOpen ? (
        <GuideAdminTimeline items={adminTimelineItems} loading={adminTimelineLoading} onClose={() => setAdminTimelineOpen(false)} />
      ) : null}

      {deleteTarget ? (
        <div
          className="support-modal-backdrop"
          role="presentation"
          onMouseDown={() => setDeleteTarget(null)}
        >
          <div
            className="support-delete-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="support-delete-icon">!</div>

            <h3>Xóa hướng dẫn viên?</h3>

            <p>
              Bạn có chắc muốn xóa{' '}
              <strong>{getUserName(deleteTarget)}</strong> khỏi hệ thống?
              Thao tác này sẽ chuyển hướng dẫn viên vào thùng rác.
            </p>

            <div className="support-modal-actions">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
              >
                Hủy
              </button>

              <button
                className="danger primary"
                type="button"
                onClick={() => void confirmDelete()}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default GuideManagementPage
