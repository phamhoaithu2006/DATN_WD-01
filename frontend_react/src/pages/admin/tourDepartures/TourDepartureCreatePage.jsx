import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { tourDepartureApi } from '../../../services/tourDepartureApi'
import TourDepartureForm from '../../../components/admin/tourDepartures/TourDepartureForm'

const emptyForm = {
  departure_date: '',
  price: '',
  base_price: '',
  discount_price: '',
  total_slots: '',
  status: 'open',
}

const getArrayFromResponse = (res) => {
  if (Array.isArray(res?.data?.data)) return res.data.data

  if (Array.isArray(res?.data?.data?.data)) {
    return res.data.data.data
  }

  if (Array.isArray(res?.data)) return res.data

  return []
}

const getTourName = (tour) => {
  return (
    tour?.title ||
    tour?.name ||
    tour?.tour_name ||
    tour?.name_tour ||
    `Tour #${tour?.id}`
  )
}

const getErrorMessage = (error, fallback) => {
  const errors = error?.response?.data?.errors

  if (errors) {
    return Object.values(errors).flat().join(' ')
  }

  return error?.response?.data?.message || fallback
}

const getBackendFieldErrors = (error) => {
  const errors = error?.response?.data?.errors

  if (!errors) return {}

  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? messages[0] : String(messages),
    ])
  )
}

function todayKey() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function isBlank(value) {
  return value === null || value === undefined || String(value).trim() === ''
}

function isNonNegativeNumber(value) {
  if (isBlank(value)) return true

  const number = Number(value)

  return Number.isFinite(number) && number >= 0
}

function validateTourDepartureForm(formData, selectedTourId) {
  const errors = {}

  if (isBlank(selectedTourId)) {
    errors.tour_id = 'Vui lòng chọn tour.'
  }

  if (isBlank(formData.departure_date)) {
    errors.departure_date = 'Vui lòng chọn ngày khởi hành.'
  } else if (formData.departure_date < todayKey()) {
    errors.departure_date = 'Ngày khởi hành không được nhỏ hơn ngày hiện tại.'
  }

  const totalSlots = Number(formData.total_slots)

  if (isBlank(formData.total_slots)) {
    errors.total_slots = 'Vui lòng nhập tổng số chỗ.'
  } else if (!Number.isInteger(totalSlots) || totalSlots <= 0) {
    errors.total_slots = 'Tổng số chỗ phải là số nguyên lớn hơn 0.'
  }

  if (isBlank(formData.status)) {
    errors.status = 'Vui lòng chọn trạng thái.'
  }

  if (isBlank(formData.base_price)) {
    errors.base_price = 'Vui lòng nhập giá gốc.'
  } else if (!isNonNegativeNumber(formData.base_price)) {
    errors.base_price = 'Giá gốc phải là số lớn hơn hoặc bằng 0.'
  }

  if (!isNonNegativeNumber(formData.discount_price)) {
    errors.discount_price = 'Giá giảm phải là số lớn hơn hoặc bằng 0.'
  }

  if (
    !errors.base_price &&
    !errors.discount_price &&
    !isBlank(formData.base_price) &&
    !isBlank(formData.discount_price) &&
    Number(formData.discount_price) >= Number(formData.base_price)
  ) {
    errors.discount_price = 'Giá giảm phải nhỏ hơn giá gốc.'
  }

  return errors
}

const TourDepartureCreatePage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tourSelectRef = useRef(null)

  const initialTourId = searchParams.get('tourId') || ''

  const [tours, setTours] = useState([])
  const [selectedTourId, setSelectedTourId] = useState(initialTourId)
  const [formData, setFormData] = useState(emptyForm)
  const [fieldErrors, setFieldErrors] = useState({})

  const [loadingTours, setLoadingTours] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const guideAssignmentUrl = useMemo(() => {
    if (!selectedTourId) {
      return '/admin/tour-departures/guide-assignments'
    }

    return `/admin/tour-departures/guide-assignments?tourId=${encodeURIComponent(
      selectedTourId
    )}`
  }, [selectedTourId])

  const selectedTour = tours.find(
    (tour) => String(tour.id) === String(selectedTourId)
  )

  useEffect(() => {
    const fetchTours = async () => {
      try {
        setLoadingTours(true)
        setError('')

        const res = await tourDepartureApi.getTours()
        const list = getArrayFromResponse(res)

        setTours(list)

        if (initialTourId) {
          setSelectedTourId(initialTourId)
        }
      } catch (err) {
        console.error(err)

        setError(getErrorMessage(err, 'Không tải được danh sách tour.'))
      } finally {
        setLoadingTours(false)
      }
    }

    fetchTours()
  }, [initialTourId])

  const clearFieldError = (name) => {
    setFieldErrors((current) => {
      if (!current[name]) return current

      const next = { ...current }
      delete next[name]

      return next
    })
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))

    clearFieldError(name)
    setError('')
    setMessage('')
  }

  const handleTourChange = (event) => {
    setSelectedTourId(event.target.value)
    clearFieldError('tour_id')
    setError('')
    setMessage('')
  }

  const scrollToFirstError = (errors) => {
    if (errors.tour_id) {
      tourSelectRef.current?.focus()
      tourSelectRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })

      return
    }

    const firstFieldName = Object.keys(errors)[0]

    if (!firstFieldName) return

    const element = document.querySelector(`[name="${firstFieldName}"]`)

    element?.focus?.()
    element?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'center',
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const errors = validateTourDepartureForm(formData, selectedTourId)

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError('Vui lòng kiểm tra lại các trường bắt buộc.')
      scrollToFirstError(errors)
      return
    }

    const payload = {
      departure_date: formData.departure_date,
      base_price: Number(formData.base_price),
      discount_price:
        formData.discount_price === '' ? null : Number(formData.discount_price),
      total_slots: Number(formData.total_slots),
      status: formData.status || 'open',
    }

    try {
      setSubmitting(true)
      setError('')
      setMessage('')

      const response = await tourDepartureApi.create(selectedTourId, payload)
      const createdDeparture =
        response?.data?.data || response?.data?.departure || response?.data || null

      setMessage('Thêm lịch khởi hành thành công.')

      setTimeout(() => {
        navigate('/admin/tour-departures', {
          state: {
            newDepartureId: createdDeparture?.id,
          },
        })
      }, 700)
    } catch (err) {
      console.error(err)

      const backendFieldErrors = getBackendFieldErrors(err)

      if (Object.keys(backendFieldErrors).length > 0) {
        setFieldErrors(backendFieldErrors)
        scrollToFirstError(backendFieldErrors)
      }

      setError(getErrorMessage(err, 'Thêm lịch khởi hành thất bại.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Lịch khởi hành
        </h1>

        <p className="mt-1 text-gray-500">
          Tạo lịch mới và phân công hướng dẫn viên cho từng lịch khởi hành.
        </p>
      </div>

      <div className="mb-6 flex gap-2 border-b border-slate-200">
        <NavLink
          to="/admin/tour-departures/create"
          className="border-b-2 border-blue-600 px-4 py-3 text-sm font-bold text-blue-600"
        >
          Thêm lịch khởi hành
        </NavLink>

        <NavLink
          to={guideAssignmentUrl}
          className="border-b-2 border-transparent px-4 py-3 text-sm font-bold text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
        >
          Phân công HDV
        </NavLink>
      </div>

      {message ? (
        <div className="mb-5 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
          <span>{message}</span>

          <button
            type="button"
            onClick={() => setMessage('')}
            className="text-lg font-bold"
          >
            ×
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="mb-5 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError('')}
            className="text-lg font-bold"
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="mb-6 rounded-xl bg-white p-5 shadow">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Chọn tour <span className="text-red-500">*</span>
        </label>

        <select
          ref={tourSelectRef}
          value={selectedTourId}
          onChange={handleTourChange}
          disabled={loadingTours || submitting}
          className={`w-full rounded-lg border px-3 py-2 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 ${
            fieldErrors.tour_id
              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
              : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
          }`}
        >
          <option value="">
            {loadingTours ? 'Đang tải danh sách tour...' : '-- Chọn tour --'}
          </option>

          {tours.map((tour) => (
            <option key={tour.id} value={tour.id}>
              {getTourName(tour)}
            </option>
          ))}
        </select>

        {fieldErrors.tour_id ? (
          <p className="mt-1 text-xs font-semibold text-red-600">
            {fieldErrors.tour_id}
          </p>
        ) : null}

        {!loadingTours && tours.length === 0 ? (
          <p className="mt-2 text-sm text-amber-600">
            Chưa có tour nào trong hệ thống.
          </p>
        ) : null}
      </div>

      <div className={submitting ? 'pointer-events-none opacity-60' : ''}>
        <TourDepartureForm
          formData={formData}
          tour={selectedTour}
          onChange={handleChange}
          onSubmit={handleSubmit}
          submitText={submitting ? 'Đang thêm...' : 'Thêm mới'}
          onCancel={() => navigate('/admin/tour-departures')}
          disabled={submitting}
          fieldErrors={fieldErrors}
        />
      </div>
    </div>
  )
}

export default TourDepartureCreatePage