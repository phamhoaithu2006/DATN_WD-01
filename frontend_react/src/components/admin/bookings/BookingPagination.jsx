function buildPageItems(currentPage, lastPage) {
  if (lastPage <= 7) {
    return Array.from({ length: lastPage }, (_, index) => index + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', lastPage]
  }

  if (currentPage >= lastPage - 3) {
    return [1, 'ellipsis', lastPage - 4, lastPage - 3, lastPage - 2, lastPage - 1, lastPage]
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', lastPage]
}

function BookingPagination({ loading, meta = {}, page, perPage, onPageChange, onPerPageChange }) {
  const lastPage = Math.max(Number(meta.last_page || 1), 1)
  const currentPage = Math.min(
    Math.max(Number(meta.current_page || page || 1), 1),
    lastPage,
  )
  const pageItems = buildPageItems(currentPage, lastPage)

  return (
    <footer className="flex w-full min-w-0 flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        Số dòng
        <select value={perPage} onChange={(event) => onPerPageChange(Number(event.target.value))} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" aria-label="Số booking trên mỗi trang">
          {[10, 20, 30].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <nav className="flex min-w-0 basis-full flex-wrap items-center justify-between gap-2 md:flex-1 md:basis-auto md:justify-end" aria-label="Phân trang booking">
        <button
          type="button"
          disabled={currentPage <= 1 || loading}
          onClick={() => onPageChange(currentPage - 1)}
          className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Trước
        </button>
        <div className="order-3 flex min-w-0 basis-full flex-wrap items-center justify-center gap-1 md:order-none md:flex-1 md:basis-auto md:justify-start">
          {pageItems.map((item, index) => item === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} aria-hidden="true" className="flex h-9 min-w-5 shrink-0 items-center justify-center px-1 text-xs font-bold text-slate-400">…</span>
          ) : (
            <button key={item} type="button" disabled={loading} onClick={() => onPageChange(item)} aria-current={item === currentPage ? 'page' : undefined} className={item === currentPage ? 'flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg bg-sky-600 px-2 text-xs font-extrabold text-white' : 'flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600 hover:bg-slate-50'}>{item}</button>
          ))}
        </div>
        <button
          type="button"
          disabled={currentPage >= lastPage || loading}
          onClick={() => onPageChange(currentPage + 1)}
          className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sau →
        </button>
      </nav>
    </footer>
  )
}

export default BookingPagination
