import { useEffect, useMemo, useState } from 'react'
import apiClient from '../../../services/apiClient'
import { mediaUrl } from '../../../utils/mediaUrl'

function unwrapGuides(response) {
  const payload = response?.data
  if (Array.isArray(payload?.data?.data)) return payload.data.data
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload)) return payload
  return []
}

function guideName(guide) {
  return guide?.user?.full_name || guide?.full_name || `HDV #${guide?.id || ''}`
}

export default function PendingGuideSelectionPanel({
  value,
  onChange,
  departureDate = '',
  returnDate = '',
}) {
  const [guides, setGuides] = useState([])
  const [keyword, setKeyword] = useState('')
  const [mode, setMode] = useState('available')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setFrom(departureDate)
    setTo(returnDate || departureDate)
  }, [departureDate, returnDate])

  useEffect(() => {
    let cancelled = false

    if (!from || !to) {
      setGuides([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    setError('')
    apiClient.get('/admin/tour-departures/preview-guide-candidates', {
      params: { from, to, keyword: keyword.trim() || undefined },
    })
      .then((response) => {
        if (!cancelled) setGuides(unwrapGuides(response))
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError?.response?.data?.message || 'Không tải được danh sách HDV.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [from, keyword, to])

  const visibleGuides = useMemo(() => {
    const search = keyword.trim().toLocaleLowerCase('vi')
    const modeGuides = mode === 'available'
      ? guides.filter((guide) => guide?.is_available !== false)
      : guides

    if (!search) return modeGuides

    return modeGuides.filter((guide) => {
      const text = [guideName(guide), guide?.guide_code, guide?.user?.email, guide?.user?.phone]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('vi')
      return text.includes(search)
    })
  }, [guides, keyword, mode])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <h3 className="font-black text-blue-950">Chọn HDV để phân công</h3>
        <p className="mt-1 text-sm text-blue-700">
          Việc chọn ở đây chưa tạo lịch. Khi bấm “Thêm mới”, hệ thống sẽ tạo lịch khởi hành rồi phân công HDV đã chọn.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[315px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-lg font-black text-slate-900">Lịch khởi hành</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Chọn khoảng thời gian dự kiến để đối chiếu lịch làm việc của HDV.
            </p>
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm font-bold text-blue-800">
              Lịch mới đang được chuẩn bị
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h4 className="font-black text-slate-900">Bộ lọc</h4>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <label className="text-xs font-bold text-slate-600">
                Từ ngày
                <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-2 text-sm" />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Đến ngày
                <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-2 text-sm" />
              </label>
            </div>
            <button type="button" className="mt-3 h-10 w-full rounded-lg bg-blue-600 text-sm font-black text-white">
              Lọc HDV
            </button>
          </div>
        </aside>

        <section className="min-h-[430px] rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900">Danh sách HDV</h3>
                  <p className="mt-1 text-sm text-slate-500">Chỉ HDV không trùng lịch với tour khác mới có thể được chọn.</p>
            </div>
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button type="button" onClick={() => setMode('available')} className={`rounded-lg px-3 py-2 text-xs font-black ${mode === 'available' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600'}`}>HDV đang hoạt động</button>
              <button type="button" onClick={() => setMode('all')} className={`rounded-lg px-3 py-2 text-xs font-black ${mode === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>Tất cả HDV</button>
            </div>
          </div>

          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm theo tên, mã HDV, SĐT, email..."
            className="mt-4 h-11 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />

          {error ? <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p> : null}
          {loading ? <p className="py-10 text-center text-sm text-slate-500">Đang tải danh sách HDV...</p> : null}
          {!loading && visibleGuides.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">Không có HDV phù hợp.</p> : null}

          <div className="mt-4 space-y-3">
            {visibleGuides.map((guide) => {
              const selected = String(value || '') === String(guide.id)
              const available = guide?.is_available !== false
              const avatar = mediaUrl(guide?.avatar_url || guide?.user?.avatar_url)
              return (
                <button key={guide.id} type="button" disabled={!available} onClick={() => onChange?.(selected ? '' : String(guide.id))} className={`flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition ${selected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : available ? 'border-slate-200 bg-white hover:border-blue-300' : 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-65'}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    {avatar ? (
                      <img src={avatar} alt={guideName(guide)} className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-slate-100" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-black text-blue-700">
                        {guideName(guide).split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                    <p className="truncate font-black text-slate-900">{guideName(guide)}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Mã HDV: {guide.guide_code || '—'}</span>
                      {guide?.user?.phone ? <span>SĐT: {guide.user.phone}</span> : null}
                      {guide?.user?.email ? <span>Email: {guide.user.email}</span> : null}
                    </div>
                    {!available ? <p className="mt-1 text-xs font-bold text-rose-600">Đã có tour khác trùng khoảng thời gian</p> : null}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-lg px-4 py-2 text-xs font-black ${selected ? 'bg-blue-600 text-white' : available ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-600'}`}>{selected ? 'Đã chọn' : available ? 'Chọn HDV' : 'Bận lịch'}</span>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
