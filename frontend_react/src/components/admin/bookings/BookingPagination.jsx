function BookingPagination({ loading, meta, page, onPageChange }) {
  const lastPage = meta.last_page || 1
  const currentPage = meta.current_page || page

  return (
    <footer className="booking-pagination">
      <span>
        Trang {currentPage} / {lastPage}
      </span>
      <div>
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
          aria-label="Trang trước"
        >
          ←
        </button>
        <button
          type="button"
          disabled={page >= lastPage || loading}
          onClick={() => onPageChange(page + 1)}
          aria-label="Trang sau"
        >
          →
        </button>
      </div>
    </footer>
  )
}

export default BookingPagination
