import { Link } from "react-router-dom";
import { FiMail, FiMapPin, FiPhone } from "react-icons/fi";
import "./Footer.css";

const pageLinks = [
  { label: "Trang chủ", href: "/" },
  { label: "Bộ sưu tập", href: "/bo-suu-tap" },
  { label: "Về chúng tôi", href: "/ve-chung-toi" },
  { label: "Liên hệ", href: "/lien-he" },
  { label: "Tra cứu đơn", href: "/tra-cuu-don-hang" },
];

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__container container">
        <div className="footer__brand">
          <Link to="/" className="footer__logo">
            <span className="footer__logo-text">Soligant</span>
          </Link>
          <p className="footer__description">
            Thương hiệu quà tặng theo phong cách hiện đại, giúp bạn gửi trao món quà
            tinh tế và đúng thông điệp cho từng khoảnh khắc.
          </p>
        </div>

        <div className="footer__links">
          <h4 className="footer__section-title">Điều hướng</h4>
          <ul className="footer__section-links">
            {pageLinks.map((link) => (
              <li key={link.href}>
                <Link to={link.href} className="footer__link">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__contact">
          <h4 className="footer__section-title">Thông tin liên hệ</h4>
          <ul className="footer__contact-list">
            <li>
              <FiMapPin size={16} />
              <span>123 Đường ABC, Quận 1, TP. Hồ Chí Minh</span>
            </li>
            <li>
              <FiPhone size={16} />
              <a href="tel:1900123456">1900 1234 56</a>
            </li>
            <li>
              <FiMail size={16} />
              <a href="mailto:info@soligant.vn">info@soligant.vn</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer__bottom">
        <div className="container footer__bottom-inner">
          <p className="footer__copyright">
            © {currentYear} Soligant. Tất cả quyền được bảo lưu.
          </p>
          <Link to="/tra-cuu-don-hang" className="footer__bottom-link">
            Tra cứu đơn hàng
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
