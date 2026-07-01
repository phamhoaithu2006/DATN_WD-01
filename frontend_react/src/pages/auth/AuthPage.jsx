import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import AuthCard from "../../components/auth/AuthCard";
import AuthLayout from "../../layouts/AuthLayout";
import {
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
} from "../../services/authApi";
import {
  clearSession,
  readSession,
  readToken,
  saveSession,
  saveToken,
} from "../../services/authStorage";
import { validateLogin, validateRegister } from "../../utils/authValidators";
import "../../styles/auth.css";

const emptyRegisterForm = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  terms: false,
};

function normalizeUser(user) {
  if (!user) return null;

  return {
    ...user,
    full_name: user.full_name || user.name || user.email || "",
    email: user.email || "",
    phone: user.phone || "",
    role: user.role?.name || user.role || "",
  };
}

function resolveRole(user) {
  return user?.role?.name || user?.role || user?.role_name || "";
}

function getLoginFieldError(field, values) {
  if (field === "password") {
    if (!values.password) {
      return "Vui lòng nhập mật khẩu.";
    }

    if (values.password.length < 8) {
      return "Mật khẩu cần ít nhất 8 ký tự.";
    }

    return "";
  }

  if (field === "identifier") {
    const rawValue = values.identifier.trim();
    const normalizedPhone = rawValue.replace(/\s+/g, "");

    if (!rawValue) {
      return "Vui lòng nhập email hoặc SĐT.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawValue) &&
      !/^(0|\+84)?[0-9]{9,10}$/.test(normalizedPhone)
    ) {
      return "Email hoặc SĐT chưa đúng định dạng.";
    }

    return "";
  }

  return "";
}

function getRegisterFieldError(field, values, { live = false } = {}) {
  const normalizedName = values.full_name.trim();
  const normalizedEmail = values.email.trim().toLowerCase();
  const normalizedPhone = values.phone.trim();

  if (field === "full_name") {
    if (!normalizedName) {
      return "Vui lòng nhập họ và tên.";
    }

    if (!/^[\p{L}\s.'-]+$/u.test(normalizedName)) {
      return "Họ tên chỉ nên gồm chữ cái và khoảng trắng.";
    }

    return "";
  }

  if (field === "email") {
    if (!normalizedEmail) {
      return "Vui lòng nhập email.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return "Email chưa đúng định dạng.";
    }

    return "";
  }

  if (field === "phone") {
    if (!normalizedPhone) {
      return "Vui lòng nhập số điện thoại.";
    }

    if (!/^\d{10}$/.test(normalizedPhone)) {
      return "Số điện thoại phải đủ 10 số.";
    }

    return "";
  }

  if (field === "password") {
    if (!values.password) {
      return "Vui lòng nhập mật khẩu.";
    }

    if (values.password.length < 8) {
      return "Mật khẩu cần ít nhất 8 ký tự.";
    }

    return "";
  }

  if (field === "confirmPassword") {
    if (live && !values.confirmPassword) {
      return "";
    }

    if (!values.confirmPassword) {
      return "Vui lòng xác nhận mật khẩu.";
    }

    if (values.confirmPassword !== values.password) {
      return "Mật khẩu xác nhận không khớp.";
    }

    return "";
  }

  if (field === "terms") {
    return values.terms ? "" : "Bạn cần đồng ý điều khoản để tiếp tục.";
  }

  return "";
}

function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginData, setLoginData] = useState({
    identifier: "",
    password: "",
    remember: false,
  });
  const [registerData, setRegisterData] = useState(emptyRegisterForm);
  const [loginErrors, setLoginErrors] = useState({});
  const [registerErrors, setRegisterErrors] = useState({});

  const currentUser = normalizeUser(readSession());
  const token = readToken();
  const isRegisterPath = location.pathname === "/auth/register";

  useEffect(() => {
    if (!token || !currentUser) return;

    if (currentUser.role === "admin") {
      navigate("/admin", { replace: true });
      return;
    }

    if (currentUser.role === "tour guide") {
      navigate("/guide", { replace: true });
      return;
    }

    navigate("/", { replace: true });
  }, [currentUser, navigate, token]);

  useEffect(() => {
    setMode(isRegisterPath ? "register" : "login");
    setNotice("");
  }, [isRegisterPath]);

  if (token && currentUser) {
    return currentUser.role === "admin" ? (
      <Navigate to="/admin" replace />
    ) : currentUser.role === "tour guide" ? (
      <Navigate to="/guide" replace />
    ) : (
      <Navigate to="/" replace />
    );
  }

  function handleModeChange(nextMode) {
    setMode(nextMode);
    setNotice("");
    navigate(nextMode === "register" ? "/auth/register" : "/auth/login", {
      replace: true,
    });
  }

  function handleLoginChange(nextValues) {
    setLoginData(nextValues);
    if (Object.prototype.hasOwnProperty.call(nextValues, "password")) {
      setLoginErrors((current) => {
        const nextErrors = { ...current };
        if (!nextValues.password) {
          delete nextErrors.password;
        } else if (nextValues.password.length < 8) {
          nextErrors.password = "Mật khẩu cần ít nhất 8 ký tự.";
        } else {
          delete nextErrors.password;
        }
        return nextErrors;
      });
    }
    setNotice("");
  }

  function handleLoginBlur(field) {
    setLoginErrors((current) => {
      const nextErrors = { ...current };
      const error = getLoginFieldError(field, loginData);

      if (error) {
        nextErrors[field] = error;
      } else {
        delete nextErrors[field];
      }

      return nextErrors;
    });
  }

  function handleRegisterChange(nextValues) {
    setRegisterData(nextValues);
    setRegisterErrors((current) => {
      const nextErrors = { ...current };

      if (Object.prototype.hasOwnProperty.call(nextValues, "password")) {
        if (!nextValues.password) {
          delete nextErrors.password;
        } else if (nextValues.password.length < 8) {
          nextErrors.password = "Mật khẩu cần ít nhất 8 ký tự.";
        } else {
          delete nextErrors.password;
        }
      }

      if (Object.prototype.hasOwnProperty.call(nextValues, "confirmPassword")) {
        if (nextValues.confirmPassword && nextValues.confirmPassword !== nextValues.password) {
          nextErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";
        } else if (nextValues.confirmPassword) {
          delete nextErrors.confirmPassword;
        }
      }

      return nextErrors;
    });
    setNotice("");
  }

  function handleRegisterBlur(field) {
    setRegisterErrors((current) => {
      const nextErrors = { ...current };
      const error = getRegisterFieldError(field, registerData);

      if (error) {
        nextErrors[field] = error;
      } else {
        delete nextErrors[field];
      }

      return nextErrors;
    });
  }

  async function handleLogin(event) {
    event.preventDefault();
    const errors = validateLogin(loginData);
    setLoginErrors(errors);

    if (Object.keys(errors).length > 0) {
      setNotice("Vui lòng kiểm tra lại các trường đăng nhập.");
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await loginApi(
        loginData.identifier.trim(),
        loginData.password,
        loginData.remember,
      );
      const roleName = resolveRole(data.user);
      const sessionUser = normalizeUser({
        id: data.user?.id,
        full_name: data.user?.full_name || data.user?.name || data.user?.email,
        email: data.user?.email,
        phone: data.user?.phone,
        role: roleName,
      });

      if (!roleName) {
        clearSession();
        setNotice("Tài khoản chưa được gán vai trò hợp lệ.");
        return;
      }

      saveToken(data.token, loginData.remember);
      saveSession(sessionUser, loginData.remember);

      if (roleName === "admin") {
        navigate("/admin", { replace: true });
        return;
      }

      if (roleName === "customer") {
        navigate("/", { replace: true });
        return;
      }

      if (roleName === "tour guide") {
        navigate("/guide", { replace: true });
        return;
      }

      clearSession();
      setNotice("Tài khoản không có quyền truy cập phù hợp.");
    } catch (error) {
      setNotice(
        error.response?.data?.message ||
          "Không đăng nhập được. Vui lòng kiểm tra lại thông tin đăng nhập.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    const errors = validateRegister(registerData);
    setRegisterErrors(errors);

    if (Object.keys(errors).length > 0) {
      setNotice("Vui lòng kiểm tra lại các trường đăng ký.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        full_name: registerData.full_name.trim(),
        email: registerData.email.trim().toLowerCase(),
        phone: registerData.phone.trim(),
        password: registerData.password,
        password_confirmation: registerData.confirmPassword,
      };

      await registerApi(payload);

      setMode("login");
      navigate("/auth/login", { replace: true });
      setLoginData({ email: payload.email, password: "", remember: false });
      setRegisterData(emptyRegisterForm);
      setRegisterErrors({});
      setNotice("Đăng ký thành công. Vui lòng đăng nhập để tiếp tục.");
    } catch (error) {
      const apiErrors = error.response?.data?.errors || {};
      const nextErrors = {};

      if (apiErrors.full_name) nextErrors.full_name = apiErrors.full_name[0];
      if (apiErrors.email) nextErrors.email = apiErrors.email[0];
      if (apiErrors.phone) nextErrors.phone = apiErrors.phone[0];
      if (apiErrors.password) nextErrors.password = apiErrors.password[0];
      if (apiErrors.confirmPassword) {
        nextErrors.confirmPassword = apiErrors.confirmPassword[0];
      }
      if (apiErrors.terms) nextErrors.terms = apiErrors.terms[0];

      setRegisterErrors(nextErrors);
      setNotice(
        error.response?.data?.message ||
          "Không tạo được tài khoản. Vui lòng kiểm tra lại thông tin.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutApi();
    } catch {
      // Token có thể đã hết hạn.
    }

    clearSession();
    setNotice("");
    setMode("login");
  }

  return (
    <AuthLayout onLogout={handleLogout}>
      <AuthCard
        mode={mode}
        notice={notice}
        loginData={loginData}
        loginErrors={loginErrors}
        registerData={registerData}
        registerErrors={registerErrors}
        isSubmitting={isSubmitting}
        onModeChange={handleModeChange}
        onLoginChange={handleLoginChange}
        onLoginBlur={handleLoginBlur}
        onRegisterChange={handleRegisterChange}
        onRegisterBlur={handleRegisterBlur}
        onLoginSubmit={handleLogin}
        onRegisterSubmit={handleRegister}
      />
    </AuthLayout>
  );
}

export default AuthPage;
