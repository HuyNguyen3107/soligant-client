import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  FiMenu,
  FiUser,
  FiShoppingBag,
  FiLogOut,
  FiLayout,
  FiChevronDown,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { ImageWithFallback } from "../../../components/common";
import { getStaticAssetUrl } from "../../../lib/http";
import { hasAnyPermission } from "../../../lib/permissions";
import { getCustomizedCartItemSubtotal } from "../../../lib/custom-cart";
import { useCustomCartStore } from "../../../store/custom-cart.store";
import "./Header.css";

interface NavigationLink {
  label: string;
  href: string;
  end?: boolean;
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
  "inventory.view",
  "product-categories.view",
  "lego-customizations.view",
  "promotions.view",
  "orders.view",
  "addon-options.view",
  "customer-order-fields.view",
  "background-themes.view",
  "backgrounds.view",
];

const navLinks: NavigationLink[] = [
  { label: "Trang chủ", href: "/", end: true },
  { label: "Bộ sưu tập", href: "/bo-suu-tap" },
  { label: "Về chúng tôi", href: "/ve-chung-toi" },
  { label: "Liên hệ", href: "/lien-he" },
  { label: "Tra cứu đơn", href: "/tra-cuu-don-hang" },
];

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cartItems = useCustomCartStore((state) => state.items);
  const storedSelectedItemIds = useCustomCartStore((state) => state.selectedItemIds);
  const isDrawerOpen = useCustomCartStore((state) => state.isDrawerOpen);
  const toggleDrawer = useCustomCartStore((state) => state.toggleDrawer);
  const closeDrawer = useCustomCartStore((state) => state.closeDrawer);
  const toggleItemSelection = useCustomCartStore((state) => state.toggleItemSelection);
  const setSelectedItemIds = useCustomCartStore((state) => state.setSelectedItemIds);
  const removeItem = useCustomCartStore((state) => state.removeItem);

  const selectedItemIds = storedSelectedItemIds.filter((itemId) =>
    cartItems.some((item) => item.id === itemId),
  );

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

  useEffect(() => {
    setDropdownOpen(false);
    setMobileNavOpen(false);
    closeDrawer();
  }, [closeDrawer, location.pathname]);

  useEffect(() => {
    if (!isDrawerOpen && !mobileNavOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen, mobileNavOpen]);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
    setDropdownOpen(false);
    setMobileNavOpen(false);
    navigate("/");
  };

  const handleGoToReview = () => {
    if (selectedItemIds.length === 0) {
      return;
    }

    closeDrawer();
    navigate("/thong-tin-khach-hang", {
      state: { selectedItemIds },
    });
  };

  const canAccessDashboard = hasAnyPermission(user, DASHBOARD_PERMISSIONS);

  const selectedCount = selectedItemIds.length;

  const handleCartToggle = () => {
    setMobileNavOpen(false);
    toggleDrawer();
  };

  const handleMobileMenuToggle = () => {
    if (isDrawerOpen) {
      closeDrawer();
    }
    setMobileNavOpen((prev) => !prev);
  };

  const getNavLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `header__nav-link${isActive ? " is-active" : ""}`;

  const getMobileNavLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `header__mobile-nav-link${isActive ? " is-active" : ""}`;

  return (
    <>
      <header className="header">
        <div className="header__container container">
          <Link to="/" className="header__logo">
            <span className="header__logo-text">Soligant</span>
          </Link>

          <nav className="header__nav">
            <ul className="header__nav-list">
              {navLinks.map((link) => (
                <li key={link.href} className="header__nav-item">
                  <NavLink to={link.href} end={link.end} className={getNavLinkClassName}>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="header__actions">
            <button
              type="button"
              className="header__menu-toggle"
              aria-label={mobileNavOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={mobileNavOpen}
              onClick={handleMobileMenuToggle}
            >
              {mobileNavOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>

            {user ? (
              <div className="header__user" ref={dropdownRef}>
                <button
                  className="header__user-btn"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                >
                  {user.avatar ? (
                    <ImageWithFallback
                      src={getStaticAssetUrl(user.avatar)}
                      alt={user.name}
                      className="header__user-avatar"
                      fallback={
                        <div className="header__user-initials">
                          {user.name?.[0]?.toUpperCase() ?? "U"}
                        </div>
                      }
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

            <button
              type="button"
              className="header__cart"
              aria-label="Giỏ hàng"
              aria-expanded={isDrawerOpen}
              onClick={handleCartToggle}
            >
              <FiShoppingBag size={24} />
              <span className="header__cart-badge">{cartItems.length}</span>
            </button>
          </div>
        </div>
      </header>

      {mobileNavOpen && (
        <button
          type="button"
          className="header__mobile-overlay"
          aria-label="Đóng menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside className={`header__mobile-nav${mobileNavOpen ? " is-open" : ""}`}>
        <nav aria-label="Điều hướng di động">
          <ul className="header__mobile-nav-list">
            {navLinks.map((link) => (
              <li key={`mobile-${link.href}`}>
                <NavLink
                  to={link.href}
                  end={link.end}
                  className={getMobileNavLinkClassName}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="header__mobile-user-actions">
          {user ? (
            <>
              {canAccessDashboard && (
                <Link
                  to="/dashboard"
                  className="header__mobile-action"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <FiLayout size={16} />
                  <span>Trang quản trị</span>
                </Link>
              )}
              <button type="button" className="header__mobile-action" onClick={handleLogout}>
                <FiLogOut size={16} />
                <span>Đăng xuất</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="header__mobile-action"
              onClick={() => setMobileNavOpen(false)}
            >
              <FiUser size={16} />
              <span>Đăng nhập</span>
            </Link>
          )}
        </div>
      </aside>

      {isDrawerOpen && (
        <button
          type="button"
          className="header__drawer-overlay"
          aria-label="Đóng giỏ hàng"
          onClick={closeDrawer}
        />
      )}

      <aside className={`header__drawer${isDrawerOpen ? " is-open" : ""}`}>
        <div className="header__drawer-header">
          <div>
            <p className="header__drawer-eyebrow">Giỏ hàng</p>
            <h2 className="header__drawer-title">Sản phẩm đã tùy chỉnh</h2>
          </div>
          <button
            type="button"
            className="header__drawer-close"
            onClick={closeDrawer}
            aria-label="Đóng giỏ hàng"
          >
            <FiX size={18} />
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="header__drawer-empty">
            <FiShoppingBag size={34} />
            <p>Chưa có sản phẩm nào trong giỏ hàng.</p>
            <Link to="/bo-suu-tap" className="header__drawer-link" onClick={closeDrawer}>
              Khám phá bộ sưu tập
            </Link>
          </div>
        ) : (
          <>
            <div className="header__drawer-toolbar">
              <span>{selectedCount}/{cartItems.length} sản phẩm được chọn</span>
              <div className="header__drawer-toolbar-actions">
                <button
                  type="button"
                  onClick={() => setSelectedItemIds(cartItems.map((item) => item.id))}
                >
                  Chọn tất cả
                </button>
                <button type="button" onClick={() => setSelectedItemIds([])}>
                  Bỏ chọn
                </button>
              </div>
            </div>

            <div className="header__drawer-list">
              {cartItems.map((item) => {
                const imageUrl = getStaticAssetUrl(item.product.image);
                const isSelected = selectedItemIds.includes(item.id);
                const selectedAddonCount = item.additionalOptions?.length ?? 0;

                return (
                  <article key={item.id} className={`header__drawer-item${isSelected ? " is-selected" : ""}`}>
                    <label className="header__drawer-check">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItemSelection(item.id)}
                      />
                    </label>

                    <div className="header__drawer-thumb">
                      <ImageWithFallback
                        src={imageUrl}
                        alt={item.product.name}
                        fallback={
                        <div className="header__drawer-thumb-placeholder">
                          <FiShoppingBag size={20} />
                        </div>
                        }
                      />
                    </div>

                    <div className="header__drawer-item-body">
                      <strong>{item.product.name}</strong>
                      <span>{item.collectionName}</span>
                      <span>Nền: {item.background.name}</span>
                      {selectedAddonCount > 0 && (
                        <span>Mua thêm: {selectedAddonCount} option</span>
                      )}
                      <span>
                        Tạm tính: {getCustomizedCartItemSubtotal(item).toLocaleString("vi-VN")} đ
                      </span>
                    </div>

                    <button
                      type="button"
                      className="header__drawer-remove"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Xóa ${item.product.name} khỏi giỏ hàng`}
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </article>
                );
              })}
            </div>

            <div className="header__drawer-footer">
              <button
                type="button"
                className="header__drawer-cta"
                onClick={handleGoToReview}
                disabled={selectedCount === 0}
              >
                Điền thông tin khách hàng
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
};

export default Header;
