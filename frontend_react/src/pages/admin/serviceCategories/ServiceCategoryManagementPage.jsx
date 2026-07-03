import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import AdminPageHeader from '../../../components/admin/AdminPageHeader'
import ServiceCategoryDetailModal from '../../../components/admin/serviceCategories/ServiceCategoryDetailModal'
import ServiceCategoryForm from '../../../components/admin/serviceCategories/ServiceCategoryForm'
import ServiceCategoryTable from '../../../components/admin/serviceCategories/ServiceCategoryTable'
import {
  createServiceCategory,
  deleteServiceCategory,
  getServiceCategories,
  getServiceCategory,
  updateServiceCategory,
} from '../../../services/serviceCategoryApi'
import '../../../styles/service-categories.css'

const EMPTY_FORM = {
  name: '',
  description: '',
  status: true,
}

const EMPTY_PAGINATION = {
  currentPage: 1,
  lastPage: 1,
  perPage: 10,
  total: 0,
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: '1', label: 'Đang hoạt động' },
  { value: '0', label: 'Ngừng hoạt động' },
]

function statusFilterToApi(value) {
  if (value === '1') return true
  if (value === '0') return false
  return undefined
}

function firstErrorMessage(errors) {
  return Object.values(errors || {}).flat().find(Boolean)
}

function getErrorMessage(error, fallback) {
  return (
    firstErrorMessage(error.response?.data?.errors) ||
    error.response?.data?.message ||
    fallback
  )
}

function mapServerErrors(errors = {}) {
  return Object.entries(errors).reduce((result, [field, messages]) => {
    result[field] = Array.isArray(messages) ? messages[0] : String(messages)
    return result
  }, {})
}

function validateForm(form) {
  const errors = {}
  const name = form.name.trim()

  if (!name) {
    errors.name = 'Vui lòng nhập tên loại dịch vụ.'
  } else if (name.length > 255) {
    errors.name = 'Tên loại dịch vụ tối đa 255 ký tự.'
  }

  if (typeof form.status !== 'boolean') {
    errors.status = 'Vui lòng chọn trạng thái.'
  }

  return errors
}

function formFromCategory(category) {
  return {
    name: category?.name || '',
    description: category?.description || '',
    status: Boolean(category?.status),
  }
}

function ServiceCategoryManagementPage() {
  const [categories, setCategories] = useState([])
  const [pagination, setPagination] = useState(EMPTY_PAGINATION)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formVisible, setFormVisible] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [detailCategory, setDetailCategory] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const hasFilters = Boolean(search || statusFilter)

  const tablePagination = useMemo(
    () => ({
      currentPage: pagination.currentPage || 1,
      lastPage: Math.max(1, pagination.lastPage || 1),
      perPage: pagination.perPage || perPage,
      total: pagination.total || 0,
    }),
    [pagination, perPage],
  )

  const loadList = useCallback(
    async (pageNumber) => {
      setLoading(true)
      setError('')

      try {
        const response = await getServiceCategories({
          search,
          status: statusFilterToApi(statusFilter),
          page: pageNumber,
          per_page: perPage,
        })

        setCategories(response.items)
        setPagination(response.pagination)
      } catch (requestError) {
        setCategories([])
        setError(
          getErrorMessage(
            requestError,
            'Không tải được danh sách loại dịch vụ.',
          ),
        )
      } finally {
        setLoading(false)
      }
    },
    [perPage, search, statusFilter],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 400)

    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadList(page)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadList, page])

  function openCreateForm() {
    setForm(EMPTY_FORM)
    setFormErrors({})
    setEditingCategory(null)
    setFormMode('create')
    setFormVisible(true)
  }

  function openEditForm(category) {
    setForm(formFromCategory(category))
    setFormErrors({})
    setEditingCategory(category)
    setFormMode('edit')
    setFormVisible(true)
  }

  function closeForm() {
    if (saving) return
    setFormVisible(false)
    setEditingCategory(null)
    setFormErrors({})
  }

  function changeFormField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
    setFormErrors((current) => ({
      ...current,
      [field]: '',
    }))
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
      const response =
        formMode === 'edit' && editingCategory
          ? await updateServiceCategory(editingCategory.id, form)
          : await createServiceCategory(form)

      toast.success(
        response.message ||
          (formMode === 'edit'
            ? 'Đã cập nhật loại dịch vụ.'
            : 'Đã thêm loại dịch vụ.'),
      )
      setFormVisible(false)
      setEditingCategory(null)
      await loadList(page)
    } catch (requestError) {
      const serverErrors = requestError.response?.data?.errors

      if (serverErrors) {
        setFormErrors(mapServerErrors(serverErrors))
      }

      toast.error(
        getErrorMessage(
          requestError,
          'Không lưu được loại dịch vụ. Vui lòng kiểm tra lại thông tin.',
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  async function openDetail(category) {
    setDetailCategory(category)
    setDetailLoading(true)

    try {
      const response = await getServiceCategory(category.id)
      setDetailCategory(response.item)
    } catch (requestError) {
      const isMissing = requestError.response?.status === 404

      toast.error(
        isMissing
          ? 'Loại dịch vụ không còn tồn tại.'
          : getErrorMessage(
              requestError,
              'Không tải được chi tiết loại dịch vụ.',
            ),
      )
      setDetailCategory(null)

      if (isMissing) {
        await loadList(page)
      }
    } finally {
      setDetailLoading(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return

    setDeleting(true)

    try {
      const response = await deleteServiceCategory(deleteTarget.id)
      const nextPage = categories.length === 1 && page > 1 ? page - 1 : page

      toast.success(response.message || 'Đã xóa mềm loại dịch vụ.')
      setDeleteTarget(null)

      if (nextPage === page) {
        await loadList(page)
      } else {
        setPage(nextPage)
      }
    } catch (requestError) {
      toast.error(
        getErrorMessage(requestError, 'Không xóa được loại dịch vụ.'),
      )
    } finally {
      setDeleting(false)
    }
  }

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setStatusFilter('')
    setPage(1)
  }

  return (
    <section className="service-category-page">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Quản Lý Loại Dịch Vụ']}
        title="Quản Lý Loại Dịch Vụ"
        description="Quản lý nhóm dịch vụ dùng cho đối tác và các quy trình vận hành."
        actions={
          <button
            className="service-category-primary-button"
            type="button"
            onClick={openCreateForm}
          >
            <span aria-hidden="true">+</span>
            Thêm loại dịch vụ
          </button>
        }
      />

      <div className="service-category-filter-panel">
        <label className="service-category-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Tìm theo tên, slug hoặc mô tả..."
          />
        </label>

        <select
          aria-label="Lọc trạng thái"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value)
            setPage(1)
          }}
        >
          {STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          className="service-category-secondary-button"
          type="button"
          disabled={!hasFilters || loading}
          onClick={clearFilters}
        >
          Xóa lọc
        </button>
      </div>

      <ServiceCategoryTable
        error={error}
        hasFilters={hasFilters}
        items={categories}
        loading={loading}
        pagination={tablePagination}
        onDelete={setDeleteTarget}
        onEdit={openEditForm}
        onPageChange={setPage}
        onPerPageChange={(value) => {
          setPerPage(value)
          setPage(1)
        }}
        onRetry={() => loadList(page)}
        onView={openDetail}
      />

      {formVisible ? (
        <ServiceCategoryForm
          errors={formErrors}
          mode={formMode}
          saving={saving}
          values={form}
          onChange={changeFormField}
          onClose={closeForm}
          onSubmit={handleSubmit}
        />
      ) : null}

      {detailCategory ? (
        <ServiceCategoryDetailModal
          category={detailCategory}
          loading={detailLoading}
          onClose={() => setDetailCategory(null)}
        />
      ) : null}

      {deleteTarget ? (
        <div
          className="service-category-modal-backdrop"
          role="presentation"
          onMouseDown={() => {
            if (!deleting) setDeleteTarget(null)
          }}
        >
          <div
            className="service-category-delete-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="service-category-delete-icon">!</div>
            <h3>Xóa mềm loại dịch vụ?</h3>
            <p>
              Bạn có chắc muốn xóa <strong>{deleteTarget.name}</strong> khỏi
              danh sách đang quản lý?
            </p>
            <div className="service-category-modal-actions">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Hủy
              </button>
              <button
                className="danger primary"
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
              >
                {deleting ? 'Đang xóa...' : 'Xóa mềm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default ServiceCategoryManagementPage
