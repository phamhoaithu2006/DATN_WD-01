import { useState } from 'react'
const CalendarIcon = ({ className = 'h-4 w-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect x="3" y="4" width="18" height="18" rx="3" />
    <path d="M3 10h18" />
  </svg>
)

const MoneyIcon = ({ className = 'h-4 w-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="6" width="18" height="12" rx="3" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 10v4" />
    <path d="M18 10v4" />
  </svg>
)

const UsersIcon = ({ className = 'h-4 w-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
    <path d="M16 3.1a4 4 0 0 1 0 7.8" />
  </svg>
)

const StatusIcon = ({ className = 'h-4 w-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 12l2 2 4-5" />
    <circle cx="12" cy="12" r="10" />
  </svg>
)

const FieldIcon = ({ children, tone = 'blue' }) => {
  const toneClass = {
    blue: 'border-blue-100 bg-blue-50 text-blue-600',
    green: 'border-emerald-100 bg-emerald-50 text-emerald-600',
    yellow: 'border-amber-100 bg-amber-50 text-amber-600',
    purple: 'border-violet-100 bg-violet-50 text-violet-600',
  }[tone]

  return (
    <span
      className={`pointer-events-none absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border ${toneClass}`}
    >
      {children}
    </span>
  )
}

const baseInputClass =
  'h-11 w-full rounded-lg border bg-white pl-14 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500'

const baseSelectClass =
  'h-11 w-full rounded-lg border bg-white pl-14 pr-9 text-sm text-slate-800 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500'

function getInputClass(error, extraClass = '') {
  const stateClass = error
    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
    : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

  return [baseInputClass, stateClass, extraClass].filter(Boolean).join(' ')
}

function getSelectClass(error, extraClass = '') {
  const stateClass = error
    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
    : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

  return [baseSelectClass, stateClass, extraClass].filter(Boolean).join(' ')
}

function FieldError({ message }) {
  if (!message) return null

  return <p className="mt-1 text-xs font-semibold text-red-600">{message}</p>
}

function formatDateInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function toDateInputValue(value) {
  if (!value) return ''

  return String(value).slice(0, 10)
}

function addDaysToDate(dateString, days) {
  const normalizedDate = toDateInputValue(dateString)

  if (!normalizedDate) return ''

  const [year, month, day] = normalizedDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  if (Number.isNaN(date.getTime())) return ''

  date.setDate(date.getDate() + Number(days || 0))

  return formatDateInput(date)
}

function getDurationDays(tour) {
  return Number(tour?.duration_days || 0)
}

function getDurationNights(tour) {
  const nights = Number(tour?.duration_nights)

  if (Number.isFinite(nights) && nights >= 0) {
    return nights
  }

  return Math.max(getDurationDays(tour) - 1, 0)
}

function normalizeMoney(value) {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(Math.round(value)) : ''
  }

  const text = String(value).trim()

  /*
   * Xử lý dữ liệu API như:
   * 3500000.00
   */
  if (/^\d+(\.\d+)?$/.test(text)) {
    const amount = Number(text)

    return Number.isFinite(amount) ? String(Math.round(amount)) : ''
  }

  /*
   * Xử lý dữ liệu đã format:
   * 3.500.000
   * 3,500,000
   */
  return text.replace(/\D/g, '')
}

function formatMoneyInput(value) {
  const rawValue = normalizeMoney(value)

  if (!rawValue) return ''

  return Number(rawValue).toLocaleString('vi-VN')
}

function formatCurrency(value) {
  const rawValue = normalizeMoney(value)

  if (rawValue === '') return '-'

  return `${Number(rawValue).toLocaleString('vi-VN')} VNĐ`
}

function CurrencyInput({
  name,
  value,
  onChange,
  disabled = false,
  placeholder,
  error = '',
}) {
  const [isFocused, setIsFocused] = useState(false)

  const rawValue = normalizeMoney(value)

  const handleChange = (event) => {
    const nextValue = event.target.value.replace(/\D/g, '')

    onChange?.({
      target: {
        name,
        value: nextValue,
      },
    })
  }

  return (
    <div className="relative">
      <FieldIcon tone="yellow">
        <MoneyIcon />
      </FieldIcon>

      <input
        type="text"
        name={name}
        value={isFocused ? rawValue : formatMoneyInput(rawValue)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={handleChange}
        inputMode="numeric"
        disabled={disabled}
        className={getInputClass(error, 'pr-16')}
        placeholder={placeholder}
      />

      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
        VNĐ
      </span>
    </div>
  )
}

export default function TourDepartureForm({
  formData = {},
  tour,
  onChange,
  onSubmit,
  submitText = 'Lưu',
  onCancel,
  hideWrapper = false,
  hideActions = false,
  disabled = false,
  fieldErrors = {},
}) {
  const durationDays = getDurationDays(tour)
  const durationNights = getDurationNights(tour)

  const departureDate = toDateInputValue(formData.departure_date)

  const calculatedReturnDate = departureDate
    ? addDaysToDate(departureDate, durationNights)
    : ''

  const inheritedBasePrice = tour?.base_price ?? tour?.price ?? null
  const inheritedDiscountPrice = tour?.discount_price ?? null
  const getError = (name) => fieldErrors?.[name] || ''

  const formFields = (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Ngày khởi hành <span className="text-red-500">*</span>
          </label>

          <div className="relative">
            <FieldIcon tone="blue">
              <CalendarIcon />
            </FieldIcon>

            <input
              type="date"
              name="departure_date"
              value={departureDate}
              onChange={onChange}
              disabled={disabled}
              className={getInputClass(getError('departure_date'))}
            />
          </div>
          <FieldError message={getError('departure_date')} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Ngày về
          </label>

          <div className="relative">
            <FieldIcon tone="green">
              <CalendarIcon />
            </FieldIcon>

            <input
              type="date"
              value={calculatedReturnDate}
              readOnly
              className={getInputClass('', 'cursor-not-allowed bg-slate-50 text-slate-500')}
            />
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Tự động tính theo thời lượng tour gốc.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Giá gốc riêng của lịch <span className="text-red-500">*</span>
          </label>

          <CurrencyInput
            name="base_price"
            value={formData.base_price}
            onChange={onChange}
            disabled={disabled}
            placeholder="Nhập giá gốc của lịch"
            error={getError('base_price')}
          />
          <FieldError message={getError('base_price')} />

          <p className="mt-1 text-xs text-slate-500">
            Giá tour gốc: {formatCurrency(inheritedBasePrice)}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Giá giảm riêng của lịch
          </label>

          <CurrencyInput
            name="discount_price"
            value={formData.discount_price}
            onChange={onChange}
            disabled={disabled}
            placeholder="Không bắt buộc"
            error={getError('discount_price')}
          />
          <FieldError message={getError('discount_price')} />

          <p className="mt-1 text-xs text-slate-500">
            Giá giảm tour gốc: {formatCurrency(inheritedDiscountPrice)}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Tổng số chỗ <span className="text-red-500">*</span>
          </label>

          <div className="relative">
            <FieldIcon tone="purple">
              <UsersIcon />
            </FieldIcon>

            <input
              type="number"
              name="total_slots"
              value={formData.total_slots ?? ''}
              onChange={onChange}
              min="1"
              disabled={disabled}
              className={getInputClass(getError('total_slots'))}
              placeholder="VD: 30"
            />
          </div>
          <FieldError message={getError('total_slots')} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Trạng thái <span className="text-red-500">*</span>
          </label>

          <div className="relative">
            <FieldIcon tone="blue">
              <StatusIcon />
            </FieldIcon>

            <select
              name="status"
              value={formData.status || 'open'}
              onChange={onChange}
              disabled={disabled}
              className={getSelectClass(getError('status'))}
            >
              <option value="open">Đang mở</option>
              <option value="closed">Đã đóng</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>

            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              ▾
            </span>
          </div>
          <FieldError message={getError('status')} />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-semibold">
          {durationDays > 0
            ? `${durationDays} ngày ${durationNights} đêm`
            : 'Chưa có thời lượng tour'}
        </p>

        <p className="mt-1 text-blue-700">
          Ngày khởi hành: {departureDate || 'Chưa chọn'} · Ngày về dự kiến:{' '}
          {calculatedReturnDate || 'Chưa xác định'}
        </p>
      </div>

      {!hideActions ? (
        <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-5">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={disabled}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>
          ) : null}

          <button
            type="submit"
            disabled={disabled}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {submitText}
          </button>
        </div>
      ) : null}
    </>
  )

  if (hideWrapper) {
    return <div>{formFields}</div>
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="mb-5 border-b border-slate-100 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Thông tin lịch khởi hành
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Nhập ngày khởi hành, giá tour, số chỗ và trạng thái lịch. Ngày về
          được tự động tính theo thời lượng tour.
        </p>
      </div>

      {formFields}
    </form>
  )
}