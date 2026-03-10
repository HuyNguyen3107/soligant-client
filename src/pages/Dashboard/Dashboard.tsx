import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import {
  FiChevronLeft,
  FiLogOut,
  FiBell,
  FiMoon,
  FiSun,
  FiMenu,
  FiX,
} from "react-icons/fi";
import "react-toastify/dist/ReactToastify.css";
import { SEO } from "../../components/common";
import {
  ProfileModal,
  DashboardTab,
  UsersTab,
  RolesTab,
  CollectionsTab,
} from "./components";
import { sidebarSections, TAB_META } from "./config";
import type { UserInfo } from "./types";
import "./Dashboard.css";

// ─── TAB MAP ──────────────────────────────────────────────────────────────────
const tabMap: Record<string, React.ReactNode> = {
  dashboard: <DashboardTab />,
  users: <UsersTab />,
  roles: <RolesTab />,
  collections: <CollectionsTab />,
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const initialTab = (() => {
    const seg = pathname.split("/")[2] ?? "";
    return seg && TAB_META[seg] ? seg : "dashboard";
  })();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("db-theme") === "dark",
  );
  const [profileOpen, setProfileOpen] = useState(false);

  const toggleDark = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("db-theme", next ? "dark" : "light");
      return next;
    });
  };
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      navigate("/login");
      return;
    }
    try {
      setUser(JSON.parse(userData));
    } catch {
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const activeLabel =
    sidebarSections.flatMap((s) => s.items).find((i) => i.id === activeTab)
      ?.label ?? "Dashboard";

  useEffect(() => {
    const meta = TAB_META[activeTab] ?? TAB_META.dashboard;
    navigate(meta.path, { replace: true });
  }, [activeTab, navigate]);

  if (loading) {
    return (
      <div className="db-loading">
        <div className="db-spinner" />
        <p>Đang tải...</p>
      </div>
    );
  }

  return (
    <div className={`db-root${darkMode ? " dark" : ""}`}>
      <SEO
        title={(TAB_META[activeTab] ?? TAB_META.dashboard).title}
        description={(TAB_META[activeTab] ?? TAB_META.dashboard).description}
        keywords={(TAB_META[activeTab] ?? TAB_META.dashboard).keywords}
      />
      {mobileOpen && (
        <div className="db-overlay" onClick={() => setMobileOpen(false)} />
      )}
      {profileOpen && user && (
        <ProfileModal
          user={user}
          dark={darkMode}
          onClose={() => setProfileOpen(false)}
          onSaved={(updated) => {
            setUser(updated);
            setProfileOpen(false);
          }}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        className={`db-sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}
      >
        <div className="db-sidebar__logo">
          <div className="db-sidebar__brand-icon">S</div>
          {!collapsed && (
            <div className="db-sidebar__brand-text">
              <span className="db-sidebar__brand-name">Soligant</span>
              <span className="db-sidebar__brand-sub">DASHBOARD</span>
            </div>
          )}
          <button
            className="db-sidebar__collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Mở rộng" : "Thu gọn"}
          >
            <FiChevronLeft
              size={16}
              style={{
                transform: collapsed ? "rotate(180deg)" : "none",
                transition: "transform 0.3s",
              }}
            />
          </button>
          <button
            className="db-sidebar__close-mobile"
            onClick={() => setMobileOpen(false)}
          >
            <FiX size={20} />
          </button>
        </div>

        <nav className="db-sidebar__nav">
          {sidebarSections.map((section) => (
            <div key={section.group} className="db-sidebar__section">
              {!collapsed && (
                <p className="db-sidebar__group-label">{section.group}</p>
              )}
              <ul>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.path != null
                      ? location.pathname === item.path
                      : activeTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        className={`db-sidebar__item${isActive ? " active" : ""}`}
                        onClick={() => {
                          if (item.path) {
                            navigate(item.path);
                          } else {
                            setActiveTab(item.id);
                          }
                          setMobileOpen(false);
                        }}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon size={18} className="db-sidebar__item-icon" />
                        {!collapsed && (
                          <span className="db-sidebar__item-label">
                            {item.label}
                          </span>
                        )}
                        {item.badge != null && !collapsed && (
                          <span className="db-sidebar__badge">
                            {item.badge}
                          </span>
                        )}
                        {item.badge != null && collapsed && (
                          <span className="db-sidebar__badge-dot" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="db-sidebar__footer">
          <div className="db-sidebar__avatar-wrap">
            <div className="db-sidebar__avatar">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="db-sidebar__avatar-img"
                />
              ) : (
                (user?.name?.[0]?.toUpperCase() ?? "A")
              )}
            </div>
            {!collapsed && (
              <div className="db-sidebar__user-info">
                <span className="db-sidebar__user-name">{user?.name}</span>
                <span className="db-sidebar__user-role">
                  {user?.role === "admin" ? "Admin" : "User"}
                </span>
              </div>
            )}
          </div>
          <button
            className="db-sidebar__logout-btn"
            onClick={handleLogout}
            title="Đăng xuất"
          >
            <FiLogOut size={18} />
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="db-main">
        <header className="db-header">
          <div className="db-header__left">
            <button
              className="db-header__hamburger"
              onClick={() => setMobileOpen(true)}
            >
              <FiMenu size={20} />
            </button>
          </div>
          <div className="db-header__right">
            <button
              className="db-header__icon-btn db-header__icon-btn--theme"
              title={darkMode ? "Chế độ sáng" : "Chế độ tối"}
              onClick={toggleDark}
            >
              {darkMode ? <FiSun size={17} /> : <FiMoon size={17} />}
            </button>
            <button
              className="db-header__icon-btn db-header__icon-btn--notif"
              title="Thông báo"
            >
              <FiBell size={17} />
              <span className="db-header__notif-dot" />
            </button>
            <div
              className="db-header__user-avatar"
              onClick={() => setProfileOpen(true)}
              title="Thông tin cá nhân"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="db-header__avatar-img"
                />
              ) : (
                (user?.name?.[0]?.toUpperCase() ?? "A")
              )}
            </div>
          </div>
        </header>

        <main className="db-content">
          <div className="db-content__heading">
            <h1 className="db-content__title">{activeLabel}</h1>
          </div>
          {tabMap[activeTab]}
        </main>
      </div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss={false}
        pauseOnHover
        theme={darkMode ? "dark" : "light"}
        style={{ fontFamily: '"UTM-Avo", Arial, sans-serif', fontSize: 14 }}
      />
    </div>
  );
};

export default Dashboard;
