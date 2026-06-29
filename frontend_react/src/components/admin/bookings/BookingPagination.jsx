function BookingPagination({ loading, meta, page, onPageChange }) {
  const lastPage = meta.last_page || 1

  return (
    <footer className="booking-pagination">
      <span>
        Trang {meta.current_page || page} / {lastPage}
      </span>
      <div>
        <button type="button" disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)}>
          Trước
        </button>
        <button
          type="button"
          disabled={page >= lastPage || loading}
          onClick={() => onPageChange(page + 1)}
        >
          Sau
        </button>
      </div>
    </footer>
  )
}

export default BookingPagination