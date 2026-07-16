function getCustomerNote(customer) {
  return (
    customer.note ||
    customer.customer_note ||
    customer.booking_note ||
    customer.special_request ||
    customer.booking?.note ||
    customer.booking?.special_request ||
    customer.attendance?.note ||
    ''
  )
}

function CustomerNotesPanel({ customers, openCustomerHistory }) {
  return (
    <div className="guide-schedule-panel guide-schedule-notes-panel">
      <div className="guide-schedule-panel-head">
        <div>
          <span>Ghi chú khách hàng</span>
          <h3>Theo dõi yêu cầu và lưu ý riêng</h3>
        </div>
      </div>

      {customers.length > 0 ? (
        <div className="guide-schedule-note-list">
          {customers.map((customer) => {
            const note = getCustomerNote(customer)

            return (
              <article key={customer.id} className="guide-schedule-note-card">
                <div>
                  <strong>{customer.full_name || 'Khách hàng'}</strong>
                  <span>{customer.booking_code || 'Chưa có mã booking'}</span>
                </div>

                <p>{note || 'Chưa có ghi chú cho khách hàng này.'}</p>

                <button type="button" onClick={() => openCustomerHistory(customer)}>
                  Xem lịch sử
                </button>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="guide-schedule-empty">Chưa có khách hàng trong tour này.</div>
      )}
    </div>
  )
}

export default CustomerNotesPanel
