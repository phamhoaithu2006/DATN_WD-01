import { paymentOptions, statusOptions } from './bookingConstants'
import { FilterIcon, SearchIcon } from './BookingIcons'

function BookingFilters({
  advancedOpen,
  date,
  paymentStatus,
  search,
  sortBy,
  sortDir,
  status,
  onAdvancedToggle,
  onClear,
  onDateChange,
  onPaymentStatusChange,
  onSearchChange,
  onSortByChange,
  onSortDirChange,
  onStatusChange,
}) {
  return (
    <>
      <div className="booking-toolbar">
        <label className="booking-search">
          <SearchIcon />
          <input
            value={search}
            placeholder="Tìm theo mã booking, khách hàng, tour..."
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <select value={status} onChange={(event) => onStatusChange(event.target.value)}>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
        <button className="booking-filter-button" type="button" onClick={onAdvancedToggle}>
          <FilterIcon />
          Lọc Nâng Cao
        </button>
      </div>

      {advancedOpen ? (
        <div className="booking-advanced-filter">
          <label>
            Thanh toán
            <select value={paymentStatus} onChange={(event) => onPaymentStatusChange(event.target.value)}>
              {paymentOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            Sắp xếp
            <select value={sortBy} onChange={(event) => onSortByChange(event.target.value)}>
              <option value="created_at">Ngày đặt</option>
              <option value="total_amount">Tổng tiền</option>
              <option value="booking_code">Mã booking</option>
            </select>
          </label>
          <label>
            Thứ tự
            <select value={sortDir} onChange={(event) => onSortDirChange(event.target.value)}>
              <option value="desc">Mới nhất</option>
              <option value="asc">Cũ nhất</option>
            </select>
          </label>
          <button type="button" onClick={onClear}>Xóa bộ lọc</button>
        </div>
      ) : null}
    </>
  )
}

export default BookingFilters