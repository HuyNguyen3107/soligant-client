import { useEffect, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
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
  LegoFramesTab,
  LegoCategoriesTab,
  LegoCustomizationsTab,
} from "./components";
import { sidebarSections, TAB_META } from "./config";
import { useAuthStore } from "../../store/auth.store";
import { hasPermission } from "../../lib/permissions";
import { http } from "../../lib/http";
import type { AuthUser } from "../../store/auth.store";
import "./Dashboard.css";

// ─── TAB MAP ──────────────────────────────────────────────────────────────────
const tabMap: Record<string, React.ReactNode> = {
  dashboard: <DashboardTab />,
  users: <UsersTab />,
  roles: <RolesTab />,
  collections: <CollectionsTab />,
  "lego-frames": <LegoFramesTab />,
  "lego-categories": <LegoCategoriesTab />,
  "lego-customizations": <LegoCustomizationsTab />,
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setUser = useAuthStore((state) => state.setUser);
  const isHydrated = useAuthStore((state) => state.isHydrated);
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
  // Whether the initial /auth/me refresh has completed
  const [meLoaded, setMeLoaded] = useState(false);
  const meFetched = useRef(false);

  const visibleSidebarSections = useMemo(
    () =>
      sidebarSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => {
            // Always show "Trang chủ" (home) and "Dashboard" regardless of permissions
            if (item.id === "home" || item.id === "dashboard") {
              return true;
            }
            // For other items, check permissions
            return !item.permission || hasPermission(user, item.permission);
          }),
        }))
        .filter((section) => section.items.length > 0),
    [user],
  );

  const availableTabs = useMemo(
    () =>
      visibleSidebarSections
        .flatMap((section) => section.items)
        .filter((item) => item.path == null)
        .map((item) => item.id),
    [visibleSidebarSections],
  );

  // True when user has no meaningful permissions (not superAdmin, not legacy admin fallback)
  const noPermissions = useMemo(() => {
    if (!user) return false;
    if (user.isSuperAdmin) return false;
    // Legacy admin fallback: role=admin, no customRoleName assigned
    if (user.role === "admin" && !user.customRoleName) return false;
    return (user.permissions ?? []).length === 0;
  }, [user]);

  // ── Refresh user permissions from server once on mount ─────────────────────
  useEffect(() => {
    if (!isHydrated) return;
    if (!accessToken || !user) {
      setMeLoaded(true);
      return;
    }
    if (meFetched.current) return;
    meFetched.current = true;

    http
      .get<AuthUser>("/auth/me")
      .then((res) => setUser(res.data))
      .catch((error: unknown) => {
        const status = isAxiosError(error) ? error.response?.status : undefined;

        // Fallback: force logout if server rejects current session.
        if (status === 401 || status === 403 || status === 404) {
          clearSession();
          navigate("/login", { replace: true });
        }
      })
      .finally(() => setMeLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

  const toggleDark = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("db-theme", next ? "dark" : "light");
      return next;
    });
  };
  useEffect(() => {
    if (!isHydrated || !meLoaded) return;

    if (!accessToken || !user) {
      navigate("/login");
      return;
    }

    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
      return;
    }

    setLoading(false);
  }, [accessToken, activeTab, availableTabs, isHydrated, meLoaded, navigate, user]);

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  const activeLabel =
    visibleSidebarSections
      .flatMap((section) => section.items)
      .find((item) => item.id === activeTab)?.label ?? "Dashboard";

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      return;
    }

    const meta = TAB_META[activeTab] ?? TAB_META.dashboard;
    if (pathname !== meta.path) {
      navigate(meta.path, { replace: true });
    }
  }, [activeTab, availableTabs, navigate, pathname]);

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
          {visibleSidebarSections.map((section) => (
            <div key={section.group} className="db-sidebar__section">
              {!collapsed && (
                <p className="db-sidebar__group-label">{section.group}</p>
              )}
              <ul>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.path != null
                      ? pathname === item.path
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
                  {user?.customRoleName ??
                    (user?.role === "admin" ? "Admin" : "User")}
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
          {noPermissions ? (
            <div className="ut-empty" style={{ textAlign: "center", padding: "60px 20px" }}>
              <h2 style={{ fontSize: "28px", marginBottom: "16px", color: "#333" }}>
                Xin chào, {user?.name || "người dùng"}!
              </h2>
              <p style={{ fontSize: "16px", color: "#666", marginBottom: "24px" }}>
                Bạn chưa được cấp quyền truy cập vào các chức năng Dashboard.
              </p>
              <p style={{ fontSize: "14px", color: "#999" }}>
                Vui lòng liên hệ với quản trị viên để được cấp quyền truy cập.
              </p>
            </div>
          ) : availableTabs.includes(activeTab) ? (
            tabMap[activeTab]
          ) : null}
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
