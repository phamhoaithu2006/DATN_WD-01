import { useCallback, useEffect, useState } from 'react'
import {
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { tourDepartureApi } from '../../../services/tourDepartureApi'
import TourDepartureForm from '../../../components/admin/tourDepartures/TourDepartureForm'
import { confirmAction } from '../../../components/common/AppConfirmDialog.jsx'
import { TourDetailCard } from './TourDepartureCreatePage.jsx'

const emptyForm = {
  departure_date: '',
  departure_location: '',
  base_price: '',
  discount_price: '',
  total_slots: '',
  status: 'open',
}

function getArrayFromResponse(res) {
  if (Array.isArray(res?.data?.data)) return res.data.data
  if (Array.isArray(res?.data?.data?.data)) return res.data.data.data
  if (Array.isArray(res?.data)) return res.data

  return []
}

function toDateInputValue(value) {
  if (!value) return ''

  return String(value).slice(0, 10)
}

function getDepartureBasePrice(departure) {
  const value =
    departure?.departure_base_price ??
    departure?.base_price ??
    departure?.price ??
    ''

  return value === null || value === undefined ? '' : value
}

function getDepartureDiscountPrice(departure) {
  const value =
    departure?.departure_discount_price ??
    departure?.discount_price ??
    ''

  return value === null || value === undefined ? '' : value
}

function isLockedDeparture(departure) {
  if (typeof departure?.is_locked === 'boolean') {
    return departure.is_locked
  }

  if (departure?.schedule_group === 'past') {
    return true
  }

  const rawDate = toDateInputValue(departure?.departure_date)

  if (!rawDate) return false

  const departureDate = new Date(`${rawDate}T00:00:00`)
  const today = new Date()

  today.setHours(0, 0, 0, 0)

  return departureDate < today
}

function getBookingCount(departure) {
  return Number(
    departure?.active_bookings_count ??
      departure?.bookings_count ??
      departure?.bookings?.length ??
      departure?.booked_slots ??
      0
  )
}

function hasActiveBookings(departure) {
  if (typeof departure?.has_bookings === 'boolean') {
    return departure.has_bookings
  }

  return getBookingCount(departure) > 0
}

function getErrorMessage(error, fallback) {
  const errors = error?.response?.data?.errors

  if (errors) {
    const firstError = Object.values(errors).flat()[0]

    if (firstError) return firstError
  }

  return error?.response?.data?.message || fallback
}

function getBackendFieldErrors(error) {
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

function validateTourDepartureEditForm(formData) {
  const errors = {}

  if (isBlank(formData.departure_date)) {
    errors.departure_date = 'Vui lòng chọn ngày khởi hành.'
  } else if (toDateInputValue(formData.departure_date) < todayKey()) {
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

export default function TourDepartureEditPage({
  embedded = false,
  tourId: tourIdProp = null,
  departureId: departureIdProp = null,
  confirmBookedChange = false,
  onClose,
  onSaved,
}) {
  const navigate = useNavigate()
  const routeParams = useParams()
  const tourId = tourIdProp || routeParams.tourId
  const departureId = departureIdProp || routeParams.departureId
  const [searchParams] = useSearchParams()

  const confirmedFromQuery =
    confirmBookedChange || searchParams.get('confirmBookedChange') === '1'

  const [formData, setFormData] = useState(emptyForm)
  const [tour, setTour] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [hasBookings, setHasBookings] = useState(false)
  const [bookingCount, setBookingCount] = useState(0)
  const [bookedChangeConfirmed, setBookedChangeConfirmed] = useState(
    confirmedFromQuery
  )

  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [notification, setNotification] = useState(null)

  const showNotification = (type, title, message, redirectTo = null) => {
    setNotification({ type, title, message, redirectTo })
  }

  const closeNotification = () => {
    const redirectTo = notification?.redirectTo
    setNotification(null)

    if (redirectTo) {
      if (embedded) {
        if (notification?.type === 'success') onSaved?.()
        else onClose?.()
        return
      }

      navigate(redirectTo)
    }
  }

  const fetchDeparture = useCallback(async () => {
    try {
      setLoading(true)

      const response = await tourDepartureApi.getByTour(tourId)
      const list = getArrayFromResponse(response)

      const departure = list.find(
        (item) => String(item.id) === String(departureId)
      )

      if (!departure) {
        showNotification(
          'error',
          'Không tìm thấy lịch khởi hành',
          'Lịch khởi hành này có thể đã bị xóa hoặc không còn tồn tại.',
          '/admin/tour-departures'
        )
        return
      }

      if (isLockedDeparture(departure)) {
        showNotification(
          'warning',
          'Không thể chỉnh sửa',
          'Lịch khởi hành đã qua nên không thể cập nhật thông tin.',
          '/admin/tour-departures'
        )
        return
      }

      const booked = hasActiveBookings(departure)
      const totalBookings = getBookingCount(departure)

      setHasBookings(booked)
      setBookingCount(totalBookings)

      if (booked && !confirmedFromQuery) {
        const confirmed = await confirmAction(
          `Lịch này đã có ${totalBookings} khách/đơn đặt tour.\n\n` +
            'Bạn có muốn tiếp tục chỉnh sửa không?'
        )

        if (!confirmed) {
          navigate('/admin/tour-departures')
          return
        }

        setBookedChangeConfirmed(true)
      } else {
        setBookedChangeConfirmed(confirmedFromQuery)
      }

      setFormData({
        departure_date: toDateInputValue(departure.departure_date),
        departure_location: departure.departure_location || '',

        base_price: getDepartureBasePrice(departure),

        discount_price: getDepartureDiscountPrice(departure),

        total_slots: departure.total_slots ?? '',
        status: departure.status === 'open' ? 'open' : 'closed',
      })

      setTour(
        departure.tour || {
          id: Number(tourId),
          title: departure.tour_title || `Tour #${tourId}`,
          base_price: departure.tour_base_price ?? null,
          discount_price: departure.tour_discount_price ?? null,
          duration_days: departure.duration_days ?? null,
          duration_nights: departure.duration_nights ?? null,
        }
      )

      try {
        const tourResponse = await tourDepartureApi.getTourDetail(tourId)
        const tourDetail = tourResponse?.data?.data?.tour || tourResponse?.data?.data || tourResponse?.data

        if (tourDetail && !Array.isArray(tourDetail)) {
          setTour(tourDetail)
        }
      } catch (tourError) {
        console.warn('Không tải được chi tiết tour, sử dụng thông tin từ lịch khởi hành.', tourError)
      }
    } catch (error) {
      console.error(error)

      showNotification(
        'error',
        'Tải dữ liệu thất bại',
        getErrorMessage(
          error,
          'Không tải được thông tin lịch khởi hành.'
        ),
        '/admin/tour-departures'
      )
    } finally {
      setLoading(false)
    }
  }, [
    confirmedFromQuery,
    departureId,
    navigate,
    tourId,
  ])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchDeparture()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchDeparture])

  const clearFieldError = (name) => {
    setFieldErrors((current) => {
      if (!current[name]) return current

      const next = { ...current }
      delete next[name]

      return next
    })
  }

  const scrollToFirstError = (errors) => {
    const firstFieldName = Object.keys(errors)[0]

    if (!firstFieldName) return

    const element = document.querySelector(`[name="${firstFieldName}"]`)

    element?.focus?.()
    element?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'center',
    })
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))

    clearFieldError(name)
    setFormError('')
  }

  const updateDeparture = async (confirmBookedChange) => {
    const payload = {
      departure_date: toDateInputValue(formData.departure_date),
      departure_location: String(formData.departure_location || '').trim() || null,

      base_price: Number(formData.base_price),

      discount_price:
        formData.discount_price === ''
          ? null
          : Number(formData.discount_price),

      total_slots: Number(formData.total_slots),
      status: formData.status,

      confirm_booked_change: confirmBookedChange,
    }

    return tourDepartureApi.update(departureId, payload)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const errors = validateTourDepartureEditForm(formData)

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setFormError('Vui lòng kiểm tra lại các trường bắt buộc.')
      scrollToFirstError(errors)
      return
    }

    let confirmBookedChange = false

    if (hasBookings) {
      confirmBookedChange = bookedChangeConfirmed

      if (!confirmBookedChange) {
        const confirmed = await confirmAction(
          `Lịch này đã có ${bookingCount} khách/đơn đặt tour.\n\n` +
            'Bạn xác nhận cập nhật lịch khởi hành chứ?'
        )

        if (!confirmed) return

        confirmBookedChange = true
        setBookedChangeConfirmed(true)
      }
    }

    try {
      setSaving(true)
      setFormError('')

      await updateDeparture(confirmBookedChange)

      showNotification(
        'success',
        'Cập nhật thành công',
        'Thông tin lịch khởi hành đã được cập nhật thành công.',
        '/admin/tour-departures'
      )
    } catch (error) {
      console.error(error)

      const needsConfirmation =
        error?.response?.status === 409 &&
        error?.response?.data?.requires_confirmation

      if (needsConfirmation) {
        const confirmed = await confirmAction(
          'Lịch này vừa có khách đặt tour. Bạn có xác nhận cập nhật lịch khởi hành không?'
        )

        if (!confirmed) return

        try {
          await updateDeparture(true)

          showNotification(
            'success',
            'Cập nhật thành công',
            'Thông tin lịch khởi hành đã được cập nhật thành công.',
            '/admin/tour-departures'
          )
          return
        } catch (retryError) {
          console.error(retryError)

          const backendFieldErrors = getBackendFieldErrors(retryError)

          if (Object.keys(backendFieldErrors).length > 0) {
            setFieldErrors(backendFieldErrors)
            setFormError('Vui lòng kiểm tra lại các trường bắt buộc.')
            scrollToFirstError(backendFieldErrors)
          } else {
            setFormError(
              getErrorMessage(
                retryError,
                'Cập nhật lịch khởi hành thất bại.'
              )
            )
          }

          return
        }
      }

      const backendFieldErrors = getBackendFieldErrors(error)

      if (Object.keys(backendFieldErrors).length > 0) {
        setFieldErrors(backendFieldErrors)
        setFormError('Vui lòng kiểm tra lại các trường bắt buộc.')
        scrollToFirstError(backendFieldErrors)
      } else {
        setFormError(
          getErrorMessage(
            error,
            'Cập nhật lịch khởi hành thất bại.'
          )
        )
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-slate-600">
        Đang tải thông tin lịch khởi hành...
      </div>
    )
  }

  return (
    <div className={embedded ? 'p-0' : 'p-6'}>
      {notification ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-[1px]">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="notification-title"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
          >
            <div className="p-6 text-center">
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                  notification.type === 'success'
                    ? 'bg-emerald-100 text-emerald-600'
                    : notification.type === 'warning'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-red-100 text-red-600'
                }`}
              >
                {notification.type === 'success' ? (
                  <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
                  </svg>
                ) : notification.type === 'warning' ? (
                  <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
                  </svg>
                )}
              </div>

              <h2 id="notification-title" className="mt-4 text-xl font-bold text-slate-900">
                {notification.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {notification.message}
              </p>

              <button
                type="button"
                onClick={closeNotification}
                className={`mt-6 inline-flex min-w-32 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-4 ${
                  notification.type === 'success'
                    ? 'bg-emerald-600 focus:ring-emerald-100'
                    : notification.type === 'warning'
                      ? 'bg-amber-500 focus:ring-amber-100'
                      : 'bg-red-600 focus:ring-red-100'
                }`}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        noValidate
        className={`mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl ${
          embedded ? 'max-h-[90vh] overflow-y-auto' : ''
        }`}
      >
        <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-5 sm:px-8">
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">
            Chỉnh sửa lịch khởi hành
          </p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">
            {tour?.title || `Tour #${tourId}`}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Cập nhật ngày khởi hành, giá, số chỗ và trạng thái lịch trong cùng một card.
          </p>
        </div>

        <div className="space-y-5 px-6 py-6 sm:px-8">

      {hasBookings ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-bold">
            Lịch này đã có {bookingCount} khách/đơn đặt tour.
          </p>

        </div>
      ) : null}

      {tour ? <TourDetailCard tour={tour} /> : null}

      {formError ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {formError}
        </div>
      ) : null}

      <TourDepartureForm
        formData={formData}
        tour={tour}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitText={saving ? 'Đang cập nhật...' : 'Cập nhật'}
        disabled={saving}
        fieldErrors={fieldErrors}
        onCancel={() => embedded ? onClose?.() : navigate('/admin/tour-departures')}
        hideWrapper
      />
        </div>
      </form>
    </div>
  )
}
