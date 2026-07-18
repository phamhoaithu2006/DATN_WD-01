import { useState } from "react";
import {
  createCustomerSupportRequest,
} from "../../services/supportRequestApi";

const initialForm = {
  full_name: "",
  email: "",
  phone: "",
  category: "general",
  subject: "",
  description: "",
  attachments: [],
};

function CustomerSupportPage({ profile }) {
  const [form, setForm] = useState({
    ...initialForm,
    full_name: profile?.full_name || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState("");

  function change(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function changeFiles(event) {
    setForm((current) => ({
      ...current,
      attachments: Array.from(event.target.files || []),
    }));
  }

  async function submit(event) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      const response = await createCustomerSupportRequest(form);

      setSuccess(response.data);

      setForm((current) => ({
        ...initialForm,
        full_name: current.full_name,
        email: current.email,
        phone: current.phone,
      }));
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "Không thể gửi yêu cầu hỗ trợ.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="vg-support-page">
      <div className="vg-container">
        <section className="vg-support-heading">
          <span>TRUNG TÂM HỖ TRỢ</span>

          <h1>ViVuGo luôn sẵn sàng hỗ trợ bạn</h1>

          <p>
            Hãy cung cấp thông tin chi tiết để đội ngũ ViVuGo
            có thể hỗ trợ bạn nhanh nhất.
          </p>
        </section>

        {success ? (
          <div className="vg-support-success">
            <strong>Yêu cầu đã được gửi thành công!</strong>

            <p>
              Mã yêu cầu:{" "}
              <b>{success.ticket_code}</b>
            </p>

            <p>
              Đội ngũ hỗ trợ sẽ tiếp nhận yêu cầu của bạn
              trong thời gian sớm nhất.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="vg-support-error">
            {error}
          </div>
        ) : null}

        <form
          className="vg-support-form"
          onSubmit={submit}
        >
          {/* =====================================================
              01. THÔNG TIN ĐỊNH DANH
          ====================================================== */}
          <section>
            <div className="vg-support-section-title">
              <span>01</span>

              <div>
                <h2>Thông tin định danh</h2>
                <p>
                  Thông tin để chúng tôi liên hệ với bạn.
                </p>
              </div>
            </div>

            <div className="vg-support-grid">
              <label>
                Họ và tên *
                <input
                  name="full_name"
                  value={form.full_name}
                  onChange={change}
                  placeholder="Nhập họ và tên"
                  required
                />
              </label>

              <label>
                Email *
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={change}
                  placeholder="example@gmail.com"
                  required
                />
              </label>

              <label>
                Số điện thoại
                <input
                  name="phone"
                  value={form.phone}
                  onChange={change}
                  placeholder="Nhập số điện thoại"
                />
              </label>
            </div>
          </section>

          {/* =====================================================
              02. PHÂN LOẠI VẤN ĐỀ
          ====================================================== */}
          <section>
            <div className="vg-support-section-title">
              <span>02</span>

              <div>
                <h2>Phân loại vấn đề</h2>
                <p>
                  Giúp chúng tôi chuyển yêu cầu tới đúng bộ phận.
                </p>
              </div>
            </div>

            <div className="vg-support-category-field">
              <label>
                Chủ đề *
                <select
                  name="category"
                  value={form.category}
                  onChange={change}
                  required
                >
                  <option value="technical">
                    Lỗi kỹ thuật
                  </option>

                  <option value="payment">
                    Thanh toán
                  </option>

                  <option value="account">
                    Tài khoản
                  </option>

                  <option value="feedback">
                    Góp ý
                  </option>

                  <option value="general">
                    Câu hỏi chung
                  </option>
                </select>
              </label>
            </div>
          </section>

          {/* =====================================================
              03. CHI TIẾT SỰ VIỆC
          ====================================================== */}
          <section>
            <div className="vg-support-section-title">
              <span>03</span>

              <div>
                <h2>Chi tiết sự việc</h2>
                <p>
                  Mô tả càng rõ, chúng tôi càng hỗ trợ nhanh.
                </p>
              </div>
            </div>

            <label>
              Tiêu đề vấn đề *
              <input
                name="subject"
                value={form.subject}
                onChange={change}
                placeholder="Ví dụ: Không thể thanh toán tour Đà Nẵng"
                required
              />
            </label>

            <label>
              Mô tả chi tiết *
              <textarea
                name="description"
                rows="8"
                value={form.description}
                onChange={change}
                placeholder="Hãy mô tả vấn đề bạn đang gặp phải..."
                required
              />
            </label>

            <label>
              Ảnh chụp màn hình / Tài liệu
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
                onChange={changeFiles}
              />
            </label>

            {form.attachments.length > 0 ? (
              <div className="vg-support-file-list">
                {form.attachments.map((file) => (
                  <p key={`${file.name}-${file.size}`}>
                    📎 {file.name}
                  </p>
                ))}
              </div>
            ) : null}
          </section>

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Đang gửi yêu cầu..."
              : "Gửi yêu cầu hỗ trợ"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default CustomerSupportPage;