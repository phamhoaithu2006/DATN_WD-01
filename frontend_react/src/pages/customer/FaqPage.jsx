import FaqBrowser from '../../components/customer/faq/FaqBrowser'
import Icon from '../../components/customer/Icon'

function FaqPage() {
  return (
    <main className="vg-faq-page">
      <section className="vg-faq-hero">
        <div className="vg-container">
          <span className="vg-faq-hero-icon" aria-hidden="true">
            <Icon name="sparkle" size={28} />
          </span>
          <p>Trung tâm trợ giúp ViVuGo</p>
          <h1>Câu hỏi thường gặp</h1>
          <span>Tìm câu trả lời nhanh cho các vấn đề về đặt tour, thanh toán và hành trình.</span>
        </div>
      </section>
      <div className="vg-container vg-faq-page-content">
        <FaqBrowser />
      </div>
    </main>
  )
}

export default FaqPage
