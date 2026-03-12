import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiUser,
  FiShoppingBag,
  FiLogOut,
  FiLayout,
  FiChevronDown,
} from "react-icons/fi";
import { hasAnyPermission } from "../../../lib/permissions";
import "./Header.css";

interface NavLink {
  label: string;
  href: string;
  isRoute?: boolean;
}

interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  isSuperAdmin?: boolean;
  avatar?: string;
}

const DASHBOARD_PERMISSIONS = [
  "dashboard.view",
  "users.view",
  "roles.view",
  "collections.view",
  "lego-frames.view",
  "product-categories.view",
];

const navLinks: NavLink[] = [
  { label: "Trang chủ", href: "/", isRoute: true },
  { label: "Sản phẩm", href: "/#products" },
  { label: "Bộ sưu tập", href: "/bo-suu-tap", isRoute: true },
  { label: "Về chúng tôi", href: "/#about" },
  { label: "Liên hệ", href: "/#contact" },
];

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const readUser = () => {
    try {
      const token = localStorage.getItem("accessToken");
      const stored = localStorage.getItem("user");
      if (token && stored) setUser(JSON.parse(stored));
      else setUser(null);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    readUser();
    window.addEventListener("storage", readUser);
    return () => window.removeEventListener("storage", readUser);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
    setDropdownOpen(false);
    navigate("/");
  };

  const canAccessDashboard = hasAnyPermission(user, DASHBOARD_PERMISSIONS);

  return (
    <header className="header">
      <div className="header__container container">
        <Link to="/" className="header__logo">
          <span className="header__logo-text">Soligant</span>
        </Link>

        <nav className="header__nav">
          <ul className="header__nav-list">
            {navLinks.map((link) => (
              <li key={link.href} className="header__nav-item">
                {link.isRoute ? (
                  <Link to={link.href} className="header__nav-link">
                    {link.label}
                  </Link>
                ) : (
                  <a href={link.href} className="header__nav-link">
                    {link.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="header__actions">
          {user ? (
            <div className="header__user" ref={dropdownRef}>
              <button
                className="header__user-btn"
                onClick={() => setDropdownOpen((prev) => !prev)}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="header__user-avatar"
                  />
                ) : (
                  <div className="header__user-initials">
                    {user.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
                <span className="header__user-name">{user.name}</span>
                <FiChevronDown
                  size={14}
                  className={`header__chevron${dropdownOpen ? " header__chevron--open" : ""}`}
                />
              </button>

              {dropdownOpen && (
                <div className="header__dropdown">
                  <div className="header__dropdown-info">
                    <span className="header__dropdown-name">{user.name}</span>
                    <span className="header__dropdown-email">{user.email}</span>
                  </div>
                  <div className="header__dropdown-divider" />
                  {canAccessDashboard && (
                    <Link
                      to="/dashboard"
                      className="header__dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <FiLayout size={15} />
                      <span>Trang quản trị</span>
                    </Link>
                  )}
                  <button
                    className="header__dropdown-item header__dropdown-item--logout"
                    onClick={handleLogout}
                  >
                    <FiLogOut size={15} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="header__login">
              <FiUser size={20} />
              <span>Đăng nhập</span>
            </Link>
          )}

          <button className="header__cart" aria-label="Giỏ hàng">
            <FiShoppingBag size={24} />
            <span className="header__cart-badge">0</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
