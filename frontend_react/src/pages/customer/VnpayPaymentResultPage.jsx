import { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Icon from '../../components/customer/Icon'
import { fetchVnpayReturnStatus } from '../../services/customerApi'

function VnpayPaymentResultPage() {
  const [searchParams] = useSearchParams()
  const [payment, setPayment] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef(null)

  const paymentId = searchParams.get('vnp_TxnRef')
  const returnQuery = searchParams.toString()
  const missingPaymentId = !paymentId

  useEffect(() => {
    if (!paymentId) return undefined

    let cancelled = false
    const loadPayment = async () => {
      try {
        const result = await fetchVnpayReturnStatus(Object.fromEntries(new URLSearchParams(returnQuery)))

        if (cancelled) return

        setPayment(result)
        setError('')
        setLoading(false)
      } catch (requestError) {
        if (cancelled) return

        setError(requestError.response?.data?.message || 'Không thể lấy trạng thái thanh toán. Vui lòng đăng nhập lại và kiểm tra đơn đặt tour.')
        setLoading(false)
      }
    }

    loadPayment()

    return () => {
      cancelled = true
    }
  }, [paymentId, returnQuery])

  const isSuccessful = payment?.status === 'success' && payment?.payment_status === 'paid'
  const isFailed = payment?.status === 'failed' || payment?.booking_status === 'cancelled'
  const displayError = missingPaymentId ? 'Không tìm thấy mã thanh toán VNPAY.' : error
  const isLoading = !missingPaymentId && loading

  // Confetti particles cascading down on successful payment
  useEffect(() => {
    if (!isSuccessful) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationFrameId

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const colors = ['#f43f5e', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
    const particles = []

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * canvas.height,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0,
        speed: Math.random() * 3 + 2,
      })
    }

    let active = true
    const draw = () => {
      if (!active) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let finished = true
      particles.forEach((p) => {
        p.tiltAngle += p.tiltAngleIncremental
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2 * p.speed
        p.x += Math.sin(p.tiltAngle)
        p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 15

        if (p.y < canvas.height) {
          finished = false
        }

        ctx.beginPath()
        ctx.lineWidth = p.r
        ctx.strokeStyle = p.color
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y)
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2)
        ctx.stroke()
      })

      if (finished) {
        active = false
      } else {
        animationFrameId = requestAnimationFrame(draw)
      }
    }

    draw()

    const timer = setTimeout(() => {
      active = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }, 6000)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationFrameId)
      clearTimeout(timer)
    }
  }, [isSuccessful])

  const formatVND = (value) => {
    if (!value) return '0 ₫'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa xác định'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .receipt-grid {
          background-image: radial-gradient(#e2e8f0 1.2px, transparent 1.2px);
          background-size: 20px 20px;
        }
      `}</style>

      <main className="min-h-screen w-full grid place-items-center p-6 bg-slate-50 receipt-grid relative overflow-hidden">
        {/* Confetti canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none w-full h-full z-50" />

        {isLoading ? (
          <div className="w-full max-w-[480px] bg-white border border-slate-200/80 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.06)] rounded-2xl animate-pulse">
            <div className="w-20 h-20 bg-slate-200 mx-auto mb-6 rounded-full"></div>
            <div className="h-6 bg-slate-200 w-3/4 mx-auto mb-4 rounded-lg"></div>
            <div className="h-4 bg-slate-200 w-5/6 mx-auto mb-8 rounded-lg"></div>
            <div className="border-t border-slate-100 my-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-slate-200 w-1/3 rounded-lg"></div>
              <div className="h-16 bg-slate-100 w-full rounded-xl"></div>
              <div className="h-4 bg-slate-200 w-2/3 rounded-lg"></div>
            </div>
            <div className="border-t border-slate-100 my-6"></div>
            <div className="flex gap-3">
              <div className="h-12 bg-slate-200 flex-1 rounded-xl"></div>
              <div className="h-12 bg-slate-200 flex-1 rounded-xl"></div>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-[480px] bg-white border border-slate-200/80 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.06)] rounded-2xl relative overflow-hidden z-10 animate-fade-in">
            
            {/* Status Header */}
            <div className="text-center mb-6">
              <div className={`w-20 h-20 mx-auto mb-4 flex items-center justify-center rounded-full border shadow-inner transition-all duration-300
                ${isSuccessful ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-emerald-100/30' : 
                  isFailed || displayError ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-rose-100/30' : 
                  'bg-amber-50 border-amber-200 text-amber-600 shadow-amber-100/30'}`}
              >
                <Icon name={isSuccessful ? 'shield' : isFailed || displayError ? 'close' : 'clock'} size={36} />
              </div>

              <h1 className="text-xl font-bold text-slate-900 uppercase tracking-wide">
                {displayError ? 'Không thể xác nhận' : 
                 isSuccessful ? 'Thanh toán thành công' : 
                 isFailed ? 'Thanh toán chưa hoàn tất' : 
                 'Đang chờ xác nhận'}
              </h1>
              
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                {displayError || (
                  isSuccessful ? `Cảm ơn quý khách! Đơn hàng của bạn đã được thanh toán an toàn.` :
                  isFailed ? 'Giao dịch chưa hoàn thành. Quý khách vui lòng kiểm tra lại.' :
                  'Hệ thống đang kiểm tra kết quả giao dịch từ VNPAY.'
                )}
              </p>
            </div>

            {/* Receipt Divider with Side Cutouts */}
            <div className="relative my-6">
              <div className="absolute -left-[44px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-50 border-r border-slate-200/80 z-20" />
              <div className="absolute -right-[44px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-50 border-l border-slate-200/80 z-20" />
              <div className="border-t-2 border-dashed border-slate-200" />
            </div>

            {/* Tour Details section (If success or details available) */}
            {payment?.tour_title && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Thông tin chuyến đi</h3>
                <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-3">
                  <p className="text-sm font-semibold text-slate-950 leading-snug">{payment.tour_title}</p>
                  <div className="flex justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                    <span>Khởi hành: <strong className="text-slate-700">{formatDate(payment.departure_date)}</strong></span>
                    <span>Số khách: <strong className="text-slate-700">{payment.number_of_people} khách</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Details section */}
            <div className="mb-6 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Biên lai thanh toán</h3>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Mã đơn đặt tour</span>
                <span className="font-mono font-bold text-slate-900">{payment?.booking_code || 'N/A'}</span>
              </div>

              {payment?.transaction_code && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Mã giao dịch VNPAY</span>
                  <span className="font-mono text-slate-700">{payment.transaction_code}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Phương thức</span>
                <span className="text-slate-700 font-semibold">Cổng thanh toán VNPAY</span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Trạng thái</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider border
                  ${isSuccessful ? 'text-emerald-800 bg-emerald-100/70 border-emerald-200' :
                    isFailed || displayError ? 'text-rose-800 bg-rose-100/70 border-rose-200' :
                    'text-amber-800 bg-amber-100/70 border-amber-200'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isSuccessful ? 'bg-emerald-500 animate-pulse' :
                    isFailed || displayError ? 'bg-rose-500' :
                    'bg-amber-500 animate-pulse'
                  }`} />
                  {isSuccessful ? 'Đã thanh toán' :
                   isFailed || displayError ? 'Thất bại' :
                   'Chờ xác nhận'}
                </span>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-900">Tổng thanh toán</span>
                <span className="text-lg font-mono font-bold text-slate-950">
                  {formatVND(payment?.amount)}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 my-6"></div>

            {/* Next Steps / Contact Support */}
            <p className="text-xs text-center text-slate-400 italic leading-relaxed mb-6">
              {isSuccessful 
                ? 'Vé điện tử và hóa đơn đã được gửi qua email của bạn. Xin chúc quý khách một chuyến đi vui vẻ!' 
                : 'Nếu tài khoản của bạn đã bị trừ tiền nhưng giao dịch báo thất bại, vui lòng liên hệ Ban quản trị để được đối soát và xử lý.'}
            </p>

            {/* Navigation Links */}
            <div className="flex gap-3">
              <Link 
                className="flex-1 text-center font-bold px-5 py-3.5 bg-slate-900 hover:bg-slate-800 !text-white transition-all duration-200 rounded-xl text-sm shadow-sm hover:shadow shadow-slate-900/10" 
                to="/customer/bookings"
              >
                Đơn đặt tour của tôi
              </Link>
              <Link 
                className="flex-1 text-center font-bold px-5 py-3.5 bg-slate-50 hover:bg-slate-100 !text-slate-800 border border-slate-200 transition-all duration-200 rounded-xl text-sm" 
                to="/tours"
              >
                Khám phá tour khác
              </Link>
            </div>

          </div>
        )}
      </main>
    </>
  )
}

export default VnpayPaymentResultPage
