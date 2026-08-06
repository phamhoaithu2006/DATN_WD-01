import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { tourDepartureApi } from '../../../services/tourDepartureApi'
import TourDepartureForm from '../../../components/admin/tourDepartures/TourDepartureForm'

const emptyForm = {
  departure_date: '',
  departure_location: '',
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

  if (String(formData.departure_location || '').trim().length > 150) {
    errors.departure_location = 'Điểm khởi hành không được vượt quá 150 ký tự.'
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


const getObjectFromResponse = (res) => {
  const payload = res?.data?.data ?? res?.data

  if (!payload || Array.isArray(payload)) return null

  return payload?.tour || payload
}

const getFirstValue = (...values) => {
  return values.find(
    (value) =>
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ''
  )
}

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'Chưa cập nhật'
  }

  const number = Number(value)

  if (!Number.isFinite(number)) return String(value)

  return `${number.toLocaleString('vi-VN')} VNĐ`
}

const stripHtml = (value) => {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const getDestinationNames = (tour) => {
  const destinations = Array.isArray(tour?.destinations)
    ? tour.destinations
        .map((destination) =>
          typeof destination === 'string'
            ? destination
            : destination?.name || destination?.title
        )
        .filter(Boolean)
    : []

  return (
    destinations.join(', ') ||
    tour?.destination?.name ||
    tour?.destination_name ||
    tour?.location ||
    'Chưa cập nhật'
  )
}

const getTourDuration = (tour) => {
  const rawDuration = getFirstValue(tour?.duration, tour?.duration_text)

  if (rawDuration) {
    return /^\d+$/.test(String(rawDuration))
      ? `${rawDuration} ngày`
      : String(rawDuration)
  }

  const days = getFirstValue(
    tour?.duration_days,
    tour?.number_of_days,
    tour?.days
  )
  const nights = getFirstValue(
    tour?.duration_nights,
    tour?.number_of_nights,
    tour?.nights
  )

  if (days && nights) return `${days} ngày ${nights} đêm`
  if (days) return `${days} ngày`
  if (nights) return `${nights} đêm`

  return 'Chưa cập nhật'
}

const getTourStatus = (status) => {
  const normalizedStatus = String(status || '').toLowerCase()

  const statusMap = {
    active: {
      label: 'Đang hoạt động',
      className: 'bg-emerald-100 text-emerald-700',
    },
    published: {
      label: 'Đã xuất bản',
      className: 'bg-emerald-100 text-emerald-700',
    },
    open: {
      label: 'Đang mở',
      className: 'bg-emerald-100 text-emerald-700',
    },
    inactive: {
      label: 'Ngừng hoạt động',
      className: 'bg-slate-100 text-slate-600',
    },
    hidden: {
      label: 'Đang ẩn',
      className: 'bg-slate-100 text-slate-600',
    },
    draft: {
      label: 'Bản nháp',
      className: 'bg-amber-100 text-amber-700',
    },
    closed: {
      label: 'Đã đóng',
      className: 'bg-rose-100 text-rose-700',
    },
  }

  return (
    statusMap[normalizedStatus] || {
      label: status ? String(status) : 'Chưa cập nhật',
      className: 'bg-slate-100 text-slate-600',
    }
  )
}

const resolveTourImage = (tour) => {
  const image = getFirstValue(
    tour?.thumbnail_url,
    tour?.image_url,
    tour?.cover_image_url,
    tour?.banner_url,
    tour?.thumbnail,
    tour?.image,
    tour?.cover_image,
    tour?.banner,
    tour?.images?.[0]?.url,
    tour?.images?.[0]?.image_url,
    tour?.images?.[0]?.path,
    tour?.images?.[0]?.image,
    tour?.media?.[0]?.original_url,
    tour?.media?.[0]?.url,
    tour?.media?.[0]?.path
  )

  if (!image) return ''

  const value = String(image).trim()

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  ) {
    return value
  }

  const apiOrigin = String(
    import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      'http://127.0.0.1:8000'
  )
    .replace(/\/api\/?$/, '')
    .replace(/\/$/, '')

  if (value.startsWith('/storage/')) return `${apiOrigin}${value}`
  if (value.startsWith('storage/')) return `${apiOrigin}/${value}`
  if (value.startsWith('/')) return `${apiOrigin}${value}`

  return `${apiOrigin}/storage/${value}`
}

function TourDetailCard({ tour, loading = false }) {
  if (!tour) return null

  const title = getTourName(tour)
  const imageUrl = resolveTourImage(tour)
  const categoryName =
    tour?.category?.name ||
    tour?.category_name ||
    tour?.tour_category?.name ||
    'Chưa cập nhật'
  const tourCode =
    tour?.code || tour?.tour_code || tour?.slug || `TOUR-${tour?.id || ''}`
  const originalPrice = getFirstValue(
    tour?.base_price,
    tour?.original_price,
    tour?.price,
    tour?.adult_price,
    tour?.selling_price
  )
  const discountPrice = getFirstValue(
    tour?.discount_price,
    tour?.sale_price,
    tour?.promotional_price,
    tour?.price_after_discount
  )
  const description = stripHtml(
    getFirstValue(
      tour?.short_description,
      tour?.summary,
      tour?.overview,
      tour?.description
    )
  )
  const status = getTourStatus(tour?.status)

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-blue-200 bg-blue-50/60">
      <div className="flex flex-col lg:flex-row">
        <div className="h-52 w-full shrink-0 bg-slate-100 lg:h-auto lg:w-72">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = 'none'
                event.currentTarget.nextElementSibling?.classList.remove('hidden')
              }}
            />
          ) : null}

          <div
            className={`flex h-full min-h-52 items-center justify-center px-6 text-center text-sm font-semibold text-slate-400 ${
              imageUrl ? 'hidden' : ''
            }`}
          >
            Tour chưa có hình ảnh
          </div>
        </div>

        <div className="min-w-0 flex-1 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Thông tin tour đã chọn
              </p>

              <h3 className="mt-1 break-words text-lg font-black text-slate-900">
                {title}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Mã tour: {tourCode}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${status.className}`}
            >
              {status.label}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs font-semibold text-slate-500">Danh mục</p>
              <p className="mt-1 font-bold text-slate-800">{categoryName}</p>
            </div>

            <div className="rounded-lg bg-white p-3">
              <p className="text-xs font-semibold text-slate-500">Điểm đến</p>
              <p className="mt-1 font-bold text-slate-800">
                {getDestinationNames(tour)}
              </p>
            </div>

            <div className="rounded-lg bg-white p-3">
              <p className="text-xs font-semibold text-slate-500">Thời lượng</p>
              <p className="mt-1 font-bold text-slate-800">
                {getTourDuration(tour)}
              </p>
            </div>

            <div className="rounded-lg bg-white p-3">
              <p className="text-xs font-semibold text-slate-500">Giá tour gốc</p>
              <p className="mt-1 font-bold text-slate-800">
                {formatCurrency(originalPrice)}
              </p>
            </div>

            <div className="rounded-lg bg-white p-3">
              <p className="text-xs font-semibold text-slate-500">
                Giá khuyến mãi
              </p>
              <p className="mt-1 font-bold text-rose-600">
                {discountPrice !== undefined && discountPrice !== null
                  ? formatCurrency(discountPrice)
                  : 'Không có'}
              </p>
            </div>

            <div className="rounded-lg bg-white p-3">
              <p className="text-xs font-semibold text-slate-500">
                Điểm khởi hành mặc định
              </p>
              <p className="mt-1 font-bold text-slate-800">
                {getFirstValue(
                  tour?.departure_location,
                  tour?.start_location,
                  tour?.meeting_point
                ) || 'Chưa cập nhật'}
              </p>
            </div>
          </div>

          {description ? (
            <div className="mt-4 rounded-lg border border-blue-100 bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Mô tả ngắn
              </p>
              <p className="mt-1 max-h-20 overflow-hidden text-sm leading-6 text-slate-600">
                {description}
              </p>
            </div>
          ) : null}

          {loading ? (
            <p className="mt-3 text-xs font-semibold text-blue-600">
              Đang tải thêm thông tin chi tiết của tour...
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
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

  const selectedTourFromList = useMemo(
    () =>
      tours.find(
        (tour) => String(tour.id) === String(selectedTourId)
      ) || null,
    [tours, selectedTourId]
  )

  const [selectedTourDetail, setSelectedTourDetail] = useState(null)
  const [loadingTourDetail, setLoadingTourDetail] = useState(false)

  const selectedTour = selectedTourDetail || selectedTourFromList

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

  useEffect(() => {
    let cancelled = false

    if (!selectedTourId) {
      setSelectedTourDetail(null)
      setLoadingTourDetail(false)
      return undefined
    }

    setSelectedTourDetail(selectedTourFromList)

    const loadTourDetail =
      tourDepartureApi.getTourDetail ||
      tourDepartureApi.getTourById ||
      tourDepartureApi.getTour

    if (typeof loadTourDetail !== 'function') {
      setLoadingTourDetail(false)
      return undefined
    }

    const fetchTourDetail = async () => {
      try {
        setLoadingTourDetail(true)

        const response = await loadTourDetail.call(
          tourDepartureApi,
          selectedTourId
        )
        const detail = getObjectFromResponse(response)

        if (!cancelled && detail) {
          setSelectedTourDetail({
            ...selectedTourFromList,
            ...detail,
          })
        }
      } catch (err) {
        console.warn('Không tải được chi tiết tour, sử dụng dữ liệu danh sách.', err)
      } finally {
        if (!cancelled) {
          setLoadingTourDetail(false)
        }
      }
    }

    fetchTourDetail()

    return () => {
      cancelled = true
    }
  }, [selectedTourId, selectedTourFromList])

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
      departure_location: String(formData.departure_location || '').trim() || null,
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

        {selectedTour ? (
          <TourDetailCard
            tour={selectedTour}
            loading={loadingTourDetail}
          />
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Chọn một tour để xem thông tin chi tiết ngay tại đây.
          </div>
        )}
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