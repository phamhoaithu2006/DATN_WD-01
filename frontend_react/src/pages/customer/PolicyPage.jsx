import { Link, useLocation } from 'react-router-dom'
import '../../styles/policy-page.css'

const policies = {
  general: { title: 'Quy định chung', intro: 'Các nguyên tắc áp dụng khi sử dụng nền tảng đặt tour ViVuGo.', sections: [['Phạm vi áp dụng', ['ViVuGo cung cấp thông tin tour và hỗ trợ khách hàng đặt dịch vụ du lịch.', 'Khách hàng cần cung cấp thông tin chính xác khi đăng ký và đặt tour.']], ['Trách nhiệm khách hàng', ['Kiểm tra kỹ lịch trình, số lượng khách, giá và điều kiện tour trước khi thanh toán.', 'Tuân thủ thời gian tập trung, quy định an toàn và hướng dẫn của hướng dẫn viên.']]] },
  terms: { title: 'Điều khoản sử dụng', intro: 'Việc tiếp tục sử dụng website đồng nghĩa khách hàng chấp thuận các điều khoản dưới đây.', sections: [['Tài khoản', ['Khách hàng chịu trách nhiệm bảo mật thông tin đăng nhập và hoạt động từ tài khoản của mình.']], ['Nội dung và dịch vụ', ['Thông tin tour có thể được cập nhật để phù hợp với điều kiện vận hành thực tế.', 'ViVuGo có quyền từ chối các yêu cầu vi phạm pháp luật hoặc quy định dịch vụ.']]] },
  payment: { title: 'Chính sách thanh toán', intro: 'Hướng dẫn thanh toán an toàn cho booking trên ViVuGo.', sections: [['Phương thức thanh toán', ['Khách hàng thanh toán trực tuyến qua cổng VNPAY hoặc theo phương thức được hiển thị tại thời điểm đặt tour.']], ['Thời hạn thanh toán', ['Booking chờ thanh toán được giữ chỗ trong thời hạn hiển thị trên hệ thống.', 'Quá thời hạn, booking có thể tự hủy và chỗ được hoàn lại cho lịch khởi hành.']]] },
  booking: { title: 'Chính sách đặt tour', intro: 'Quy trình xác nhận thông tin và giữ chỗ cho chuyến đi.', sections: [['Xác nhận booking', ['Booking được tạo sau khi khách hàng hoàn thành thông tin liên hệ và hành khách.', 'Booking chỉ được xác nhận theo trạng thái thanh toán và điều kiện vận hành của tour.']], ['Thông tin hành khách', ['Khách hàng cần cung cấp đúng họ tên, ngày sinh và giấy tờ theo yêu cầu của tour.']]] },
  cancellation: { title: 'Chính sách hoàn hủy', intro: 'Quy định hủy booking và quản lý số lần hủy trên ViVuGo.', sections: [['Giới hạn hủy booking', ['Mỗi khách hàng được tự hủy tối đa 2 booking trên toàn hệ thống.', 'Chỉ các lần khách hàng chủ động hủy booking chờ thanh toán được tính vào giới hạn.', 'Lần hủy do hệ thống hết hạn thanh toán hoặc do nhân viên xử lý không tính vào giới hạn này.']], ['Lịch sử và xử lý', ['Mỗi lần hủy được ghi nhận kèm thời điểm, booking và người thực hiện.', 'Khi đã dùng hết 2 lần hủy, khách hàng không thể tự hủy thêm; vui lòng liên hệ bộ phận hỗ trợ nếu cần.']]] },
}

policies.booking.sections.splice(1, 0, ['Điều kiện khởi hành', [
  'Mỗi lịch khởi hành cần tối thiểu 10 hành khách hợp lệ; số khách được tính theo hành khách, không theo số booking.',
  'Hệ thống chốt số lượng trước giờ khởi hành 72 giờ. Nếu đủ điều kiện tour được xác nhận; nếu không đủ, tour bị hủy và đóng nhận booking mới.',
]])
policies.cancellation.sections.unshift(['Tour bị hủy bởi hệ thống', [
  'Khi tour bị hủy do không đủ khách hoặc điều kiện thời tiết, khách không bị áp dụng phí hủy.',
  'Khách có thể đổi ngày khởi hành, đổi tour, nhận hoàn tiền hoặc chuyển thành số dư/voucher nếu hệ thống hỗ trợ. Khoản hoàn tiền không vượt quá số tiền thực tế đã thanh toán.',
]])

const links = [['general', 'Quy định chung'], ['terms', 'Điều khoản sử dụng'], ['payment', 'Chính sách thanh toán'], ['booking', 'Chính sách đặt tour'], ['cancellation', 'Chính sách hoàn hủy']]

function PolicyPage() {
  const key = useLocation().pathname.split('/')[2] || 'general'
  const policy = policies[key] || policies.general

  return <main className="policy-page"><div className="vg-container policy-layout"><aside><div className="policy-sidebar-heading"><span>ViVuGo care</span><h1>Chính sách</h1><p>Thông tin rõ ràng để bạn an tâm cho mọi hành trình.</p></div>{links.map(([id, label], index) => <Link key={id} className={id === key ? 'active' : ''} to={`/policies/${id}`}><span className="policy-nav-index">0{index + 1}</span><span>{label}</span></Link>)}</aside><article><div className="policy-article-header"><p className="policy-eyebrow">VIVUGO · THÔNG TIN DỊCH VỤ</p><h2>{policy.title}</h2><p className="policy-intro">{policy.intro}</p></div>{policy.sections.map(([heading, items], index) => <section key={heading}><span className="policy-section-number">0{index + 1}</span><div><h3>{heading}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div></section>)}</article></div></main>
}

export default PolicyPage
