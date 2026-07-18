import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import apiClient from '../../services/apiClient'
import adminGuideLeaveRequestApi from '../../services/adminGuideLeaveRequestApi.js'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminGuideLeaveRequestsPanel from '../../components/admin/guides/AdminGuideLeaveRequestsPanel.jsx'
import Icon from '../../components/customer/Icon'
import '../../styles/support-staff.css'

const DEFAULT_FORM = {
  user_id: '',
  destination_ids: [],
  experience_years: '',
  status: '',
  languages: [],
  experiences: [],
}

const EMPTY_LANGUAGE_ROW = { language_id: '', level_id: '' }
const EMPTY_CERTIFICATE_ROW = { certificate_id: '', issued_year: '' }

const GUIDE_STATUSES = ['active', 'inactive', 'locked']

const STATUS_LABELS = {
  active: 'Đang hoạt động',
  inactive: 'Ngừng hoạt động',
  locked: 'Tạm khóa',
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

function getDestinationLabel(destination) {
  const name =
    destination?.name ||
    destination?.destination_name ||
    destination?.title ||
    ''

  const provinceCity =
    destination?.province_city ||
    destination?.province ||
    ''

  return [name, provinceCity].filter(Boolean).join(' - ') || '-'
}

function getGuideDestinationLabel(guide, fallback = 'Chưa cập nhật khu vực') {
  const destinations = Array.isArray(guide?.destinations)
    ? guide.destinations
    : []

  if (destinations.length === 0) {
    return fallback
  }

  return destinations.map(getDestinationLabel).join(', ')
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

function toDestinationIds(destinations = []) {
  return destinations
    .map((item) => String(item.destination_id || item.id || ''))
    .filter(Boolean)
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
    destination_ids: (form.destination_ids || [])
      .filter(Boolean)
      .map(Number),
    experience_years: Number(form.experience_years),
    status: form.status,
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

function validateForm(form) {
  const errors = {}
  const currentYear = new Date().getFullYear()
  const experienceYears = Number(form.experience_years)
  const languages = Array.isArray(form.languages)
    ? form.languages
    : []

  const experiences = Array.isArray(form.experiences)
    ? form.experiences
    : []

  if (!form.user_id) {
    errors.user_id = 'Vui lòng chọn tài khoản HDV.'
  }

  if (
    form.experience_years === '' ||
    !Number.isInteger(experienceYears) ||
    experienceYears < 0
  ) {
    errors.experience_years = 'Số năm kinh nghiệm phải là số nguyên từ 0.'
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
  const [searchParams] = useSearchParams()
  const [guides, setGuides] = useState([])

  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    locked: 0,
  })

  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [destinationFilter, setDestinationFilter] = useState('all')
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('all')

  const [leavePanelOpen, setLeavePanelOpen] = useState(
    searchParams.get('openLeaveRequests') === '1',
  )
  const [leaveSummary, setLeaveSummary] = useState({
    pending_count: 0,
    processed_count: 0,
    resting_guides_count: 0,
    busy_guides_count: 0,
  })

  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
  })

  const [languages, setLanguages] = useState([])
  const [certificates, setCertificates] = useState([])
  const [destinations, setDestinations] = useState([])
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

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [detailGuide, setDetailGuide] = useState(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [formErrors, setFormErrors] = useState({})

  const highlightedLeaveRequestId = searchParams.get('leaveRequestId') || ''
  const leavePendingCount = Number(leaveSummary.pending_count || 0)

  const hasFilter =
    statusFilter !== 'all' ||
    destinationFilter !== 'all' ||
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

  const loadLeaveSummary = useCallback(async () => {
    try {
      const response = await adminGuideLeaveRequestApi.list({
        status: 'all',
        per_page: 1,
      })

      setLeaveSummary(response?.summary || {
        pending_count: 0,
        processed_count: 0,
        resting_guides_count: 0,
        busy_guides_count: 0,
      })
    } catch {
      // Không chặn màn hình khi thống kê đơn nghỉ lỗi.
    }
  }, [])

  const loadCatalogs = useCallback(async () => {
    try {
      const [
        languageResponse,
        certificateResponse,
        destinationResponse,
      ] = await Promise.all([
        apiClient.get('/admin/languages'),
        apiClient.get('/admin/certificates'),
        apiClient.get('/admin/guides/destination-options'),
      ])

      setLanguages(unwrapList(languageResponse))
      setCertificates(unwrapList(certificateResponse))
      setDestinations(unwrapList(destinationResponse))
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
        const params = { page, per_page: 10 }

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

        if (destinationFilter !== 'all') {
          params.destination_id = destinationFilter
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
    [destinationFilter, hasFilter, keyword, leaveStatusFilter, statusFilter],
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCatalogs()
      void loadStatistics()
      void loadLeaveSummary()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadCatalogs, loadLeaveSummary, loadStatistics])

  useEffect(() => {
    function reloadGuideLeaveRequests() {
      void loadLeaveSummary()
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
  }, [loadGuides, loadLeaveSummary, pagination.currentPage])

  useEffect(() => {
    if (searchParams.get('openLeaveRequests') === '1') {
      const timeoutId = window.setTimeout(() => {
        setLeavePanelOpen(true)
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }

    return undefined
  }, [searchParams])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadGuides(1)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [loadGuides])

  useEffect(() => {
    if (!notice && !error) return undefined

    const timer = window.setTimeout(() => {
      setNotice('')
      setError('')
    }, 10000)

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
      [field]: '',
    }))
  }

  function updateDestination(index, value) {
    setForm((current) => ({
      ...current,
      destination_ids: current.destination_ids.map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    }))

    setFormErrors((current) => ({
      ...current,
      destination_ids: '',
    }))
  }

  function addDestination() {
    setForm((current) => ({
      ...current,
      destination_ids: [...current.destination_ids, ''],
    }))
  }

  function removeDestination(index) {
    setForm((current) => ({
      ...current,
      destination_ids: current.destination_ids.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }))

    setFormErrors((current) => ({
      ...current,
      destination_ids: '',
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
      destination_ids: [''],
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

  function openEditForm(guide) {
    const destinationRows = toDestinationIds(guide.destinations)

    setForm({
      user_id: String(guide.user_id || guide.user?.id || ''),
      destination_ids: destinationRows.length > 0 ? destinationRows : [''],
      experience_years: String(guide.experience_years ?? ''),
      status: guide.status || '',
      languages: toLanguageRows(guide.languages),
      experiences: toCertificateRows(guide.experiences),
    })

    setAvatarFile(null)
    setCurrentAvatarUrl(guide.user?.avatar_url || '')
    setPreviewAvatarUrl('')
    setRemoveAvatarRequested(false)
    setEditingGuideId(guide.id)
    setEditingGuideCode(guide.guide_code || '')
    setEditingUser(guide.user || null)
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

  function selectStatistic(status) {
    setStatusFilter(status)
    setDestinationFilter('all')
    setLeaveStatusFilter('all')

    setPagination((current) => ({
      ...current,
      currentPage: 1,
    }))
  }

  function selectLeaveStatistic(status) {
    setStatusFilter('all')
    setDestinationFilter('all')
    setLeaveStatusFilter(status)

    setPagination((current) => ({
      ...current,
      currentPage: 1,
    }))
  }

  return (
    <section className="guide-page">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Quản Lý Hướng Dẫn Viên']}
        title="Quản Lý Hướng Dẫn Viên"
        description="Quản lý thông tin, khu vực phụ trách và phân công hướng dẫn viên."
        showNotificationBell={false}
        actions={
          <div className="guide-header-actions-group">
            <div className="guide-header-links">
              <Link
                className="guide-section-link guide-section-link-primary"
                to="/admin/languages"
              >
                <Icon name="globe" size={16} />
                Ngôn ngữ
              </Link>

              <Link
                className="guide-section-link guide-section-link-primary"
                to="/admin/certificates"
              >
                <Icon name="shield" size={16} />
                Chứng chỉ
              </Link>
            </div>

            <button
              type="button"
              className={`admin-guide-leave-menu-button ${leavePanelOpen ? 'active' : ''}`}
              onClick={() => setLeavePanelOpen((current) => !current)}
            >
              Đơn xin nghỉ

              {leavePendingCount > 0 ? (
                <span>{leavePendingCount > 99 ? '99+' : leavePendingCount}</span>
              ) : null}
            </button>

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
            statusFilter === 'all' && destinationFilter === 'all'
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

        <button
          className={`guide-stat-card blue ${
            leaveStatusFilter === 'resting' ? 'is-active' : ''
          }`}
          type="button"
          onClick={() => selectLeaveStatistic('resting')}
        >
          <strong>{leaveSummary.resting_guides_count || 0}</strong>
          <span>HDV đang nghỉ</span>
          <small>Đơn đã duyệt trong hôm nay</small>
        </button>

        <button
          className={`guide-stat-card amber ${
            leaveStatusFilter === 'busy_leave' ? 'is-active' : ''
          }`}
          type="button"
          onClick={() => selectLeaveStatistic('busy_leave')}
        >
          <strong>{leaveSummary.busy_guides_count || 0}</strong>
          <span>Bận vì đơn nghỉ</span>
          <small>Đơn chờ duyệt hoặc đã duyệt</small>
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
                placeholder="Tìm theo mã HDV, tên, email hoặc SĐT"
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
              <option value="busy_leave">Bận vì đơn nghỉ</option>
              <option value="available_leave">Không có đơn nghỉ</option>
            </select>
          </div>

          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Mã HDV</th>
                  <th>Họ và tên</th>
                  <th>Kinh nghiệm</th>
                  <th>Ngoại ngữ</th>
                  <th>Tour phụ trách</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="support-empty-row" colSpan="8">
                      <div className="support-loading">
                        <span />
                        <p>Đang tải danh sách HDV...</p>
                      </div>
                    </td>
                  </tr>
                ) : null}

                {!isLoading && guides.length === 0 ? (
                  <tr>
                    <td colSpan="8">Chưa có hướng dẫn viên.</td>
                  </tr>
                ) : null}

                {!isLoading
                  ? guides.map((guide) => (
                      <tr key={guide.id}>
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

          <div className="guide-pagination">
            <button
              disabled={pagination.currentPage <= 1 || isLoading}
              type="button"
              onClick={() =>
                void loadGuides(pagination.currentPage - 1)
              }
              aria-label="Trang trước"
            >
              ←
            </button>

            <span>
              {pagination.currentPage} / {pagination.lastPage}
            </span>

            <button
              disabled={
                pagination.currentPage >= pagination.lastPage ||
                isLoading
              }
              type="button"
              onClick={() =>
                void loadGuides(pagination.currentPage + 1)
              }
              aria-label="Trang sau"
            >
              →
            </button>
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
                Họ và tên

                <select
                  required
                  value={form.user_id}
                  disabled={Boolean(editingGuideId)}
                  onChange={(event) =>
                    updateForm('user_id', event.target.value)
                  }
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

              <label>
                Số năm kinh nghiệm

                <input
                  min="0"
                  required
                  type="number"
                  value={form.experience_years}
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

              <label>
                Trạng thái

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
                Ngoại ngữ

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
                Chứng chỉ

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

      {leavePanelOpen ? (
        <div
          className="admin-guide-leave-card-backdrop"
          role="presentation"
          onMouseDown={() => setLeavePanelOpen(false)}
        >
          <div
            className="admin-guide-leave-card-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Quản lý đơn xin nghỉ HDV"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <AdminGuideLeaveRequestsPanel
              open={leavePanelOpen}
              highlightRequestId={highlightedLeaveRequestId}
              onClose={() => setLeavePanelOpen(false)}
            />
          </div>
        </div>
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