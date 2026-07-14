import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import GuideLeaveRequestWidget from "../components/guide/GuideLeaveRequestWidget";
import GuideNotificationBell from "../components/guide/GuideNotificationBell";
import GuideSidebar from "../components/guide/GuideSidebar";
import { logout as logoutApi } from "../services/authApi";
import { clearSession, readSession } from "../services/authStorage";
import "../styles/guide.css";

function getInitials(name) {
  return String(name || "HDV")
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function GuideLayout({ children }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const guide = readSession();
  const guideName = guide?.full_name || guide?.name || "Hướng dẫn viên";
  const guideAvatar = guide?.avatar_url || guide?.avatar || "";

  useEffect(() => {
    function closeAccountMenu(event) {
      if (!accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeAccountMenu);
    return () => document.removeEventListener("mousedown", closeAccountMenu);
  }, []);

  async function handleLogout() {
    try {
      await logoutApi();
    } catch {
      // Token có thể đã hết hạn, vẫn cần xóa phiên local.
    }

    clearSession();
    navigate("/auth/login", { replace: true });
  }

  function goToProfile() {
    setAccountMenuOpen(false);
    navigate("/guide/profile");
  }

  return (
    <div className={collapsed ? "guide-shell sidebar-collapsed" : "guide-shell"}>
      <GuideSidebar
        collapsed={collapsed}
        guide={guide}
        onLogout={handleLogout}
        onToggle={() => setCollapsed((current) => !current)}
      />

      <main className="guide-main">
        <div className="guide-topbar">
          <div className="guide-topbar-left-section">
            <button
              type="button"
              className="guide-sidebar-toggle-btn"
              onClick={() => setCollapsed((current) => !current)}
              title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div className="guide-topbar-title">
              <span>Trang chủ</span>
              <strong>Chào mừng trở lại, {guideName}</strong>
            </div>
          </div>

          <div className="guide-topbar-right-section">
            <div className="guide-topbar-search">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="search-icon"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input type="text" placeholder="Tìm kiếm tour, khách hàng..." />
            </div>

            <GuideLeaveRequestWidget />

            <GuideNotificationBell />

            <div className="guide-account-menu" ref={accountMenuRef}>
              <button
                type="button"
                className="guide-topbar-user"
                title="Tài khoản"
                aria-label="Mở menu tài khoản hướng dẫn viên"
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen((current) => !current)}
              >
                <span className="guide-topbar-avatar">
                  {guideAvatar ? (
                    <img src={guideAvatar} alt={guideName} />
                  ) : (
                    getInitials(guideName)
                  )}
                </span>
                <div className="guide-topbar-meta">
                  <strong>{guideName}</strong>
                  <span>Hướng dẫn viên</span>
                </div>
                <svg className="guide-account-caret" viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {accountMenuOpen && (
                <div className="guide-account-dropdown" role="menu">
                  <div className="guide-account-summary">
                    <span className="guide-account-avatar">
                      {guideAvatar ? (
                        <img src={guideAvatar} alt={guideName} />
                      ) : (
                        getInitials(guideName)
                      )}
                    </span>
                    <div>
                      <strong>{guideName}</strong>
                      <span>{guide?.email || "Hướng dẫn viên"}</span>
                    </div>
                  </div>

                  <button type="button" role="menuitem" onClick={goToProfile}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20 21a8 8 0 0 0-16 0" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Hồ sơ cá nhân
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}

export default GuideLayout;