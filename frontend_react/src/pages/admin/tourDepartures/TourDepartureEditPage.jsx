import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { tourDepartureApi } from '../../../services/tourDepartureApi'
import TourDepartureForm from '../../../components/admin/tourDepartures/TourDepartureForm'

const emptyForm = {
  departure_date: '',
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

function validateTourDepartureEditForm(formData, changeReason) {
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

  if (changeReason.trim().length < 3) {
    errors.change_reason = 'Vui lòng nhập lý do thay đổi ít nhất 3 ký tự.'
  }

  return errors
}

export default function TourDepartureEditPage() {
  const navigate = useNavigate()
  const reasonRef = useRef(null)
  const { tourId, departureId } = useParams()
  const [searchParams] = useSearchParams()

  const confirmedFromQuery =
    searchParams.get('confirmBookedChange') === '1'

  const [formData, setFormData] = useState(emptyForm)
  const [tour, setTour] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [hasBookings, setHasBookings] = useState(false)
  const [bookingCount, setBookingCount] = useState(0)
  const [bookedChangeConfirmed, setBookedChangeConfirmed] = useState(
    confirmedFromQuery
  )

  const [changeReason, setChangeReason] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')

  const fetchDeparture = useCallback(async () => {
    try {
      setLoading(true)

      const response = await tourDepartureApi.getByTour(tourId)
      const list = getArrayFromResponse(response)

      const departure = list.find(
        (item) => String(item.id) === String(departureId)
      )

      if (!departure) {
        alert('Không tìm thấy lịch khởi hành.')
        navigate('/admin/tour-departures')
        return
      }

      if (isLockedDeparture(departure)) {
        alert('Lịch khởi hành đã qua nên không thể chỉnh sửa.')
        navigate('/admin/tour-departures')
        return
      }

      const booked = hasActiveBookings(departure)
      const totalBookings = getBookingCount(departure)

      setHasBookings(booked)
      setBookingCount(totalBookings)

      if (booked && !confirmedFromQuery) {
        const confirmed = window.confirm(
          `Lịch này đã có ${totalBookings} khách/đơn đặt tour.\n\n` +
            'Bạn có muốn tiếp tục chỉnh sửa không?\n\n' +
            'Sau khi lưu, hệ thống sẽ gửi thông báo cho khách hàng và HDV phụ trách.'
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

        base_price: getDepartureBasePrice(departure),

        discount_price: getDepartureDiscountPrice(departure),

        total_slots: departure.total_slots ?? '',
        status: departure.status || 'open',
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
    } catch (error) {
      console.error(error)

      alert(
        getErrorMessage(
          error,
          'Không tải được thông tin lịch khởi hành.'
        )
      )

      navigate('/admin/tour-departures')
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

    const element =
      firstFieldName === 'change_reason'
        ? reasonRef.current
        : document.querySelector(`[name="${firstFieldName}"]`)

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

      base_price: Number(formData.base_price),

      discount_price:
        formData.discount_price === ''
          ? null
          : Number(formData.discount_price),

      total_slots: Number(formData.total_slots),
      status: formData.status,

      confirm_booked_change: confirmBookedChange,
      change_reason: changeReason.trim(),
    }

    return tourDepartureApi.update(departureId, payload)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const errors = validateTourDepartureEditForm(formData, changeReason)

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
        const confirmed = window.confirm(
          `Lịch này đã có ${bookingCount} khách/đơn đặt tour.\n\n` +
            'Bạn xác nhận cập nhật và gửi thông báo cho khách hàng, HDV chứ?'
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

      alert(
        hasBookings
          ? 'Cập nhật thành công. Thông báo đã được gửi cho khách hàng và HDV.'
          : 'Cập nhật lịch khởi hành thành công.'
      )

      navigate('/admin/tour-departures')
    } catch (error) {
      console.error(error)

      const needsConfirmation =
        error?.response?.status === 409 &&
        error?.response?.data?.requires_confirmation

      if (needsConfirmation) {
        const confirmed = window.confirm(
          'Lịch này vừa có khách đặt tour. Bạn có xác nhận cập nhật và gửi thông báo không?'
        )

        if (!confirmed) return

        try {
          await updateDeparture(true)

          alert(
            'Cập nhật thành công. Thông báo đã được gửi cho khách hàng và HDV.'
          )

          navigate('/admin/tour-departures')
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Sửa lịch khởi hành
        </h1>

        <p className="mt-1 text-slate-500">
          Cập nhật ngày khởi hành, giá, số chỗ và trạng thái lịch.
        </p>
      </div>

      {hasBookings ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="font-bold">
            Lịch này đã có {bookingCount} khách/đơn đặt tour.
          </p>

          <p className="mt-1 text-sm">
            Khi lưu thay đổi, hệ thống sẽ gửi thông báo đến khách hàng
            và HDV phụ trách.
          </p>
        </div>
      ) : null}

      {formError ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {formError}
        </div>
      ) : null}

      <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-5">
        <label className="mb-2 block text-sm font-bold text-slate-800">
          Lý do thay đổi lịch <span className="text-red-500">*</span>
        </label>

        <textarea
          ref={reasonRef}
          value={changeReason}
          onChange={(event) => {
            setChangeReason(event.target.value)
            clearFieldError('change_reason')
            setFormError('')
          }}
          disabled={saving}
          rows={4}
          maxLength={1000}
          placeholder="Ví dụ: Điều chỉnh lịch do thay đổi chuyến bay hoặc yêu cầu vận hành..."
          className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 ${
            fieldErrors.change_reason
              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
              : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
          }`}
        />

        {fieldErrors.change_reason ? (
          <p className="mt-1 text-xs font-semibold text-red-600">
            {fieldErrors.change_reason}
          </p>
        ) : null}

        <p className="mt-2 text-xs text-slate-500">
          Tên tour, thông tin cũ và thông tin mới sẽ do hệ thống tự động lấy.
        </p>
      </div>

      <TourDepartureForm
        formData={formData}
        tour={tour}
        onChange={handleChange}
        onSubmit={handleSubmit}
        submitText={saving ? 'Đang cập nhật...' : 'Cập nhật'}
        disabled={saving}
        fieldErrors={fieldErrors}
        onCancel={() => navigate('/admin/tour-departures')}
      />
    </div>
  )
}
