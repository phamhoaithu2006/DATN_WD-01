import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import AuthCard from "../../components/auth/AuthCard";
import UserDashboard from "../../components/auth/UserDashboard";
import AuthLayout from "../../layouts/AuthLayout";
import {
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
} from "../../services/authApi";
import {
  clearSession,
  readSession,
  readUsers,
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
    role: user.role || "",
  };
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [users] = useState(readUsers);
  const [currentUser, setCurrentUser] = useState(() =>
    normalizeUser(readSession()),
  );
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "",  remember: false });
  const [registerData, setRegisterData] = useState(emptyRegisterForm);
  const [loginErrors, setLoginErrors] = useState({});
  const [registerErrors, setRegisterErrors] = useState({});

  useEffect(() => {
    if (currentUser?.role === "admin") {
      navigate("/admin", { replace: true });
    }
  }, [currentUser, navigate]);
  if (currentUser?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }
  const welcomeName = currentUser?.full_name
    ? currentUser.full_name.split(" ")[0]
    : "";

  function handleModeChange(nextMode) {
    setMode(nextMode);
    setNotice("");
  }

  async function handleLogin(event) {
    event.preventDefault();
    const errors = validateLogin(loginData);
    setLoginErrors(errors);
    setNotice("");

    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);

    try {
      const data = await loginApi(loginData.email.trim(), loginData.password, loginData.remember)
      const roleName = data.user?.role?.name

      if (roleName !== 'admin') {
        clearSession()
        setNotice('Tài khoản này không có quyền truy cập admin.')
        return
      }

      const sessionUser = {
        id: data.user.id,
        full_name: data.user.full_name || data.user.name || data.user.email,
        email: data.user.email,
        phone: data.user.phone,
        role: roleName,
      };

      saveToken(data.token, loginData.remember)
      saveSession(sessionUser, loginData.remember)
      setCurrentUser(sessionUser)
      setNotice('Đăng nhập thành công.')
      navigate('/admin', { replace: true })
    } catch (error) {
      setNotice(
        error.response?.data?.message ||
          'Không đăng nhập được. Vui lòng kiểm tra lại thông tin đăng nhập.',
      )
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    const errors = validateRegister(registerData, users);
    setRegisterErrors(errors);
    setNotice("");

    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);

    try {
      const payload = {
        full_name: registerData.full_name.trim(),
        email: registerData.email.trim().toLowerCase(),
        phone: registerData.phone.trim(),
        password: registerData.password,
        password_confirmation: registerData.confirmPassword,
      };
      const data = await registerApi(payload);
      const sessionUser = normalizeUser({
        id: data.user?.id,
        full_name: data.user?.full_name || payload.full_name,
        email: data.user?.email || payload.email,
        phone: data.user?.phone || payload.phone,
        role: data.user?.role?.name || data.user?.role || "customer",
      });

      saveToken(data.token, true);
      saveSession(sessionUser, true);
      setCurrentUser(sessionUser);
      setLoginData({ email: payload.email, password: "", remember: false });
      setRegisterData(emptyRegisterForm);
      setRegisterErrors({});
      setNotice("Đăng ký thành công.");
    } catch (error) {
      const apiErrors = error.response?.data?.errors || {};
      const nextErrors = {};

      if (apiErrors.full_name) nextErrors.full_name = apiErrors.full_name[0];
      if (apiErrors.email) nextErrors.email = apiErrors.email[0];
      if (apiErrors.phone) nextErrors.phone = apiErrors.phone[0];
      if (apiErrors.password) nextErrors.password = apiErrors.password[0];

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
      // Token có thể đã hết hạn; vẫn cần đăng xuất phía trình duyệt.
    }

    setCurrentUser(null);
    clearSession();
    setNotice("Bạn đã đăng xuất thành công.");
    setMode("login");
  }

  return (
    <AuthLayout currentUser={currentUser} onLogout={handleLogout}>
      {currentUser ? (
        <UserDashboard
          user={currentUser}
          welcomeName={welcomeName}
          onLogout={handleLogout}
        />
      ) : (
        <AuthCard
          mode={mode}
          notice={notice}
          loginData={loginData}
          loginErrors={loginErrors}
          registerData={registerData}
          registerErrors={registerErrors}
          isSubmitting={isSubmitting}
          onModeChange={handleModeChange}
          onLoginChange={setLoginData}
          onRegisterChange={setRegisterData}
          onLoginSubmit={handleLogin}
          onRegisterSubmit={handleRegister}
        />
      )}
    </AuthLayout>
  );
}

export default AuthPage;
