import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AuthLayout from "../../layouts/AuthLayout";
import { forgotPassword, resetPassword } from "../../services/authApi";
import {
  validateForgotRequest,
  validateResetPassword,
} from "../../utils/authValidators";

import "../../styles/auth.css";

function EyeIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10.6 5.4A9.5 9.5 0 0 1 12 5.5C18 5.5 21.5 12 21.5 12a17.6 17.6 0 0 1-2.9 4.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.1 6.8C3.7 8.7 2.5 12 2.5 12S6 18.5 12 18.5c1 0 2-.2 2.9-.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

const THROTTLE_MESSAGE = "Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau ít phút.";

function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    identifier: "",
    otp: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [noticeVariant, setNoticeVariant] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;

    const timeoutId = window.setTimeout(() => {
      setCooldown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [cooldown]);

  const setAmberNotice = (message) => {
    setNotice(message);
    setNoticeVariant("");
  };

  const setSuccessNotice = (message) => {
    setNotice(message);
    setNoticeVariant("success");
  };

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleBlur = (field) => {
    const validator = step === 1 ? validateForgotRequest : validateResetPassword;
    const fieldErrors = validator(form);

    setErrors((current) => {
      const next = { ...current };
      if (fieldErrors[field]) {
        next[field] = fieldErrors[field];
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const requestOtp = async () => {
    const data = await forgotPassword(form.identifier.trim());
    return (
      data?.message ||
      "Nếu thông tin khớp với tài khoản, mã xác nhận đã được gửi tới email của bạn."
    );
  };

  const handleSendCode = async (event) => {
    event.preventDefault();

    const validationErrors = validateForgotRequest(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setAmberNotice("Vui lòng kiểm tra lại thông tin.");
      return;
    }

    setIsSubmitting(true);
    try {
      const message = await requestOtp();
      setErrors({});
      setStep(2);
      setCooldown(60);
      setSuccessNotice(message);
    } catch (error) {
      if (error.response?.status === 429) {
        setAmberNotice(THROTTLE_MESSAGE);
      } else {
        setAmberNotice(
          error.response?.data?.message || "Không thể gửi mã. Vui lòng thử lại.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await requestOtp();
      setCooldown(60);
      setSuccessNotice("Đã gửi lại mã xác nhận.");
    } catch (error) {
      if (error.response?.status === 429) {
        setAmberNotice(THROTTLE_MESSAGE);
      } else {
        setAmberNotice(
          error.response?.data?.message || "Không thể gửi mã. Vui lòng thử lại.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validateResetPassword(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setAmberNotice("Vui lòng kiểm tra lại thông tin.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({
        identifier: form.identifier.trim(),
        otp: form.otp,
        password: form.password,
        password_confirmation: form.confirmPassword,
      });

      navigate("/auth/login", {
        state: {
          notice: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.",
          noticeVariant: "success",
        },
      });
    } catch (error) {
      const status = error.response?.status;

      if (status === 422) {
        const apiErrors = error.response?.data?.errors || {};
        const mapped = {};
        Object.entries(apiErrors).forEach(([field, messages]) => {
          const key = field === "password_confirmation" ? "confirmPassword" : field;
          mapped[key] = messages?.[0];
        });
        setErrors(mapped);
        setAmberNotice(
          mapped.identifier ||
            error.response?.data?.message ||
            "Vui lòng kiểm tra lại thông tin.",
        );
      } else if (status === 400) {
        setAmberNotice(
          error.response?.data?.message || "Mã xác nhận không đúng hoặc đã hết hạn.",
        );
        setForm((current) => ({ ...current, otp: "" }));
      } else if (status === 429) {
        setAmberNotice(THROTTLE_MESSAGE);
      } else {
        setAmberNotice("Đặt lại mật khẩu thất bại. Vui lòng thử lại.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setForm((current) => ({
      ...current,
      otp: "",
      password: "",
      confirmPassword: "",
    }));
    setErrors({});
    setNotice("");
    setNoticeVariant("");
  };

  return (
    <AuthLayout>
      <div className="form-card">
        <div className="status-pill">Quên mật khẩu</div>
        <h2>Khôi phục mật khẩu</h2>
        <p className="helper-text">
          {step === 1
            ? "Nhập email hoặc số điện thoại đã đăng ký, chúng tôi sẽ gửi mã xác nhận tới email của bạn."
            : "Mã xác nhận gồm 6 chữ số, có hiệu lực trong 10 phút. Vui lòng kiểm tra hộp thư (kể cả mục Spam)."}
        </p>

        {notice ? (
          <p className={noticeVariant ? `notice ${noticeVariant}` : "notice"}>
            {notice}
          </p>
        ) : null}

        {step === 1 ? (
          <form className="auth-form" onSubmit={handleSendCode} noValidate>
            <label>
              Email hoặc SĐT
              <input
                type="text"
                value={form.identifier}
                autoComplete="username"
                inputMode="text"
                onChange={(event) => handleChange("identifier", event.target.value)}
                onBlur={() => handleBlur("identifier")}
              />
              {errors.identifier ? <span>{errors.identifier}</span> : null}
            </label>

            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang gửi mã..." : "Gửi mã xác nhận"}
            </button>

            <p className="helper-text">
              Đã nhớ mật khẩu? <Link to="/auth/login">Quay lại đăng nhập</Link>
            </p>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleResetSubmit} noValidate>
            <label>
              Mã xác nhận
              <input
                className="otp-input"
                type="text"
                value={form.otp}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                onChange={(event) =>
                  handleChange("otp", event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                onBlur={() => handleBlur("otp")}
              />
              {errors.otp ? <span>{errors.otp}</span> : null}
            </label>

            <label>
              Mật khẩu mới
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  autoComplete="new-password"
                  onChange={(event) => handleChange("password", event.target.value)}
                  onBlur={() => handleBlur("password")}
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? (
                    <EyeOffIcon className="password-toggle-icon" />
                  ) : (
                    <EyeIcon className="password-toggle-icon" />
                  )}
                </button>
              </div>
              {errors.password ? <span>{errors.password}</span> : null}
            </label>

            <label>
              Xác nhận mật khẩu
              <div className="password-field">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  autoComplete="new-password"
                  onChange={(event) =>
                    handleChange("confirmPassword", event.target.value)
                  }
                  onBlur={() => handleBlur("confirmPassword")}
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowConfirm((current) => !current)}
                  aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showConfirm ? (
                    <EyeOffIcon className="password-toggle-icon" />
                  ) : (
                    <EyeIcon className="password-toggle-icon" />
                  )}
                </button>
              </div>
              {errors.confirmPassword ? <span>{errors.confirmPassword}</span> : null}
            </label>

            <div className="auth-links-row">
              <button
                type="button"
                className="link-button"
                onClick={handleBackToStep1}
              >
                Nhập lại email/SĐT
              </button>
              <button
                type="button"
                className="link-button"
                onClick={handleResend}
                disabled={cooldown > 0 || isSubmitting}
              >
                {cooldown > 0 ? `Gửi lại mã (${cooldown}s)` : "Gửi lại mã"}
              </button>
            </div>

            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang xử lý..." : "Đặt lại mật khẩu"}
            </button>

            <p className="helper-text">
              Đã nhớ mật khẩu? <Link to="/auth/login">Quay lại đăng nhập</Link>
            </p>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
