import { Link } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";

function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <div className="form-card">
        <div className="status-pill">Quên mật khẩu</div>
        <h2 style={{ marginTop: 0 }}>Khôi phục mật khẩu</h2>
        <p>
          Tính năng này đang được chuẩn bị. Nếu bạn cần hỗ trợ ngay, vui lòng liên hệ
          đội ngũ chăm sóc khách hàng hoặc quay lại màn đăng nhập.
        </p>
        <Link className="primary-button" to="/auth/login" style={{ display: "inline-grid", placeItems: "center", textAlign: "center" }}>
          Quay lại đăng nhập
        </Link>
      </div>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
