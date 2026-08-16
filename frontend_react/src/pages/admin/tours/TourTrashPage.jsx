import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminPageHeader from '../../../components/admin/AdminPageHeader'
import tourApi from '../../../services/toursApi'
import { mediaUrl } from '../../../utils/mediaUrl'

function SearchIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
}

function RestoreIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
}

function TrashIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
}

function EyeIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
}

function TourTrashPage() {
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [tours, setTours] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState('')
  const [detailTour, setDetailTour] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadTours = useCallback(async () => {
    setLoading(true)
    setNotice('')

    try {
      const response = await tourApi.getTrashed({
        search: appliedKeyword || undefined,
        per_page: 100,
      })
      const page = response?.data?.data || {}
      setTours(Array.isArray(page.data) ? page.data : [])
    } catch (error) {
      setTours([])
      setNotice(
        error?.response?.data?.message ||
          'Không thể tải danh sách tour đã xóa.',
      )
    } finally {
      setLoading(false)
    }
  }, [appliedKeyword])

  useEffect(() => {
    void loadTours()
  }, [loadTours])

  const runAction = async (tour, action) => {
    const permanently = action === 'forceDelete'
    const question = permanently
      ? `Xóa vĩnh viễn tour “${tour.title}”? Thao tác này không thể hoàn tác.`
      : `Khôi phục tour “${tour.title}” về danh sách quản lý?`

    if (!window.confirm(question)) return

    setBusyId(tour.id)
    setNotice('')

    try {
      await tourApi[action](tour.id)
      setTours((current) => current.filter((item) => item.id !== tour.id))
    } catch (error) {
      setNotice(
        error?.response?.data?.message || 'Không thể thực hiện thao tác này.',
      )
    } finally {
      setBusyId(null)
    }
  }

  const showDetail = async (tour) => {
    setDetailTour(tour)
    setDetailLoading(true)
    setNotice('')

    try {
      const response = await tourApi.getTrashedById(tour.id)
      setDetailTour(response?.data?.data || tour)
    } catch (error) {
      setDetailTour(null)
      setNotice(error?.response?.data?.message || 'Không thể tải chi tiết tour đã xóa.')
    } finally {
      setDetailLoading(false)
    }
  }

  const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`

  const formatDate = (value) => {
    if (!value) return '-'

    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value))
  }

  return (
    <div className="relative min-h-full bg-slate-50/70 px-8 py-8">
      <AdminPageHeader
        breadcrumb={['ViVuGo', 'Tour', 'Tour đã xóa']}
        title="Tour đã xóa"
        description="Các tour đã xóa mềm có thể được khôi phục hoặc xóa vĩnh viễn."
        actions={
          <Link
            to="/admin/tours"
            className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:border-sky-300 hover:text-sky-700"
          >
            Danh sách tour
          </Link>
        }
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex gap-3 border-b border-slate-200 p-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><SearchIcon /></span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') setAppliedKeyword(keyword.trim())
              }}
              placeholder="Tìm theo tên tour..."
              className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-sky-400"
            />
          </div>
          <button
            type="button"
            onClick={() => setAppliedKeyword(keyword.trim())}
            className="h-10 rounded-lg bg-sky-500 px-4 text-sm font-semibold text-white hover:bg-sky-600"
          >
            Tìm kiếm
          </button>
        </div>

        {notice ? (
          <div className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {notice}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">STT</th>
                <th className="px-4 py-3">Ảnh</th>
                <th className="px-4 py-3">Tên tour</th>
                <th className="px-4 py-3">Danh mục</th>
                <th className="px-4 py-3">Ngày xóa</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
              ) : null}
              {!loading && tours.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Chưa có tour nào trong danh sách đã xóa.</td></tr>
              ) : null}
              {!loading && tours.map((tour, index) => (
                <tr key={tour.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-4 text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="h-12 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                      {tour.thumbnail_url ? <img src={mediaUrl(tour.thumbnail_url)} alt={tour.title || 'Ảnh tour'} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center px-1 text-center text-[10px] text-slate-400">Chưa có ảnh</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-900">{tour.title || `Tour #${tour.id}`}</td>
                  <td className="px-4 py-4 text-slate-600">{typeof tour.category === 'string' ? tour.category : tour.category?.name || '-'}</td>
                  <td className="px-4 py-4 text-slate-600">{formatDate(tour.deleted_at)}</td>
                  <td className="px-4 py-4"><span className="inline-flex rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">Đã xóa</span></td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button disabled={busyId === tour.id} onClick={() => void showDetail(tour)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-sky-200 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-50"><EyeIcon />Chi tiết</button>
                      <button disabled={busyId === tour.id} onClick={() => void runAction(tour, 'restore')} className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"><RestoreIcon />Khôi phục</button>
                      <button disabled={busyId === tour.id} onClick={() => void runAction(tour, 'forceDelete')} className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><TrashIcon />Xóa vĩnh viễn</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {detailTour ? (
        <div className="absolute inset-0 z-40 flex items-start justify-center bg-slate-950/40 p-4 pt-36" role="dialog" aria-modal="true" aria-labelledby="trashed-tour-detail-title">
          <section className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div><p className="text-xs font-semibold uppercase text-rose-600">Tour đã xóa</p><h2 id="trashed-tour-detail-title" className="mt-1 text-xl font-bold text-slate-900">{detailTour.title}</h2></div>
              <button type="button" onClick={() => setDetailTour(null)} className="h-9 w-9 rounded-lg border border-slate-200 text-xl text-slate-500 hover:bg-slate-50" aria-label="Đóng">×</button>
            </header>
            <div className="overflow-y-auto p-5">
              {detailLoading ? <p className="py-12 text-center text-sm text-slate-500">Đang tải chi tiết...</p> : (
                <div className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-[240px_1fr]">
                    <div className="aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">{detailTour.thumbnail_url ? <img src={mediaUrl(detailTour.thumbnail_url)} alt={detailTour.title} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-sm text-slate-400">Chưa có ảnh</span>}</div>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-xs text-slate-500">Danh mục</dt><dd className="mt-1 font-semibold text-slate-800">{typeof detailTour.category === 'string' ? detailTour.category : detailTour.category?.name || '-'}</dd></div>
                      <div><dt className="text-xs text-slate-500">Điểm đến</dt><dd className="mt-1 font-semibold text-slate-800">{detailTour.province?.name || detailTour.destination || '-'}</dd></div>
                      <div><dt className="text-xs text-slate-500">Thời lượng</dt><dd className="mt-1 font-semibold text-slate-800">{detailTour.duration || '-'}</dd></div>
                      <div><dt className="text-xs text-slate-500">Giá gốc</dt><dd className="mt-1 font-semibold text-slate-800">{formatMoney(detailTour.base_price)}</dd></div>
                      <div><dt className="text-xs text-slate-500">Trạng thái trước khi xóa</dt><dd className="mt-1 font-semibold text-slate-800">{detailTour.status || '-'}</dd></div>
                      <div><dt className="text-xs text-slate-500">Ngày xóa</dt><dd className="mt-1 font-semibold text-slate-800">{formatDate(detailTour.deleted_at)}</dd></div>
                    </dl>
                  </div>
                  <div><h3 className="text-sm font-bold text-slate-900">Mô tả</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{detailTour.summary || detailTour.description || 'Chưa có mô tả.'}</p></div>
                  <div><h3 className="text-sm font-bold text-slate-900">Lịch trình ({detailTour.itineraries?.length || 0})</h3><div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">{detailTour.itineraries?.length ? detailTour.itineraries.map((item) => <div key={item.id} className="px-4 py-3 text-sm"><span className="font-semibold text-sky-700">Ngày {item.day_number}</span><span className="ml-3 font-semibold text-slate-800">{item.title}</span></div>) : <p className="px-4 py-5 text-sm text-slate-500">Chưa có lịch trình.</p>}</div></div>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default TourTrashPage
