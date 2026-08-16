function BookingPagination({ loading, meta, page, onPageChange }) {
  const lastPage = meta.last_page || 1
  const currentPage = meta.current_page || page
  const { perPage, onPerPageChange } = arguments[0]

  return (
    <footer className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        Số dòng
        <select value={perPage} onChange={(event) => onPerPageChange(Number(event.target.value))} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" aria-label="Số booking trên mỗi trang">
          {[10, 20, 30].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1 || loading}
          onClick={() => onPageChange(currentPage - 1)}
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Trước
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: lastPage }, (_, index) => index + 1).map((number) => (
            <button key={number} type="button" disabled={loading} onClick={() => onPageChange(number)} aria-current={number === currentPage ? 'page' : undefined} className={number === currentPage ? 'flex h-9 min-w-9 items-center justify-center rounded-lg bg-sky-600 px-2 text-xs font-extrabold text-white' : 'flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600 hover:bg-slate-50'}>{number}</button>
          ))}
        </div>
        <button
          type="button"
          disabled={currentPage >= lastPage || loading}
          onClick={() => onPageChange(currentPage + 1)}
          className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sau →
        </button>
      </div>
    </footer>
  )
}

export default BookingPagination
