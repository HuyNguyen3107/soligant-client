import { Link } from "react-router-dom";
import {
  FiFacebook,
  FiInstagram,
  FiMail,
  FiMapPin,
  FiPhone,
} from "react-icons/fi";
import "./Footer.css";

const pageLinks = [
  { label: "Giới thiệu", href: "/ve-chung-toi" },
  { label: "Bộ sưu tập", href: "/bo-suu-tap" },
  { label: "Tìm đơn hàng", href: "/tra-cuu-don-hang" },
  { label: "Chính sách", href: "/chinh-sach" },
];

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__container container">
        <div className="footer__brand">
          <Link to="/" className="footer__logo">
            <span className="footer__logo-text">SOLIGANT.GIFTS</span>
          </Link>
          <p className="footer__description">
            Thương hiệu quà tặng tinh tế cho mọi dịp
          </p>
          <div className="footer__socials" aria-label="Mạng xã hội Soligant">
            <a
              href="https://www.facebook.com/profile.php?id=61567332901935"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook Soligant"
            >
              <FiFacebook size={20} />
            </a>
            <a
              href="https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.instagram.com%2Fsoligant.gifts%3Ffbclid%3DIwZXh0bgNhZW0CMTAAYnJpZBExbWJIYUxqcWMydjRJbGFnWHNydGMGYXBwX2lkEDIyMjAzOTE3ODgyMDA4OTIAAR7Nj6nt72LWM7i3k4eidUJ4QkcfIz6paPOp9gyvGpLIHXh7UbXA5eIg8V6-AA_aem_r2UbC4LzAA-ia1YmBkHokg&h=AT4OdC3wb8Tw9U4PB4U1RdBC1iG4_rlcgxL7z-vfLnu3ZZkNCZZIEkd5_UCcd14Chbr-eiFNxSgOYvo2TRPrJf0xrAhXgML_1c33Y7UBqNWB1LHrKGiO-iS6K7e9v41Ec6GzMmyMLOfv"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram Soligant"
            >
              <FiInstagram size={20} />
            </a>
          </div>
        </div>

        <div className="footer__links">
          <h4 className="footer__section-title">Liên kết</h4>
          <ul className="footer__section-links">
            {pageLinks.map((link) => (
              <li key={link.href ?? link.label}>
                {link.href ? (
                  <Link to={link.href} className="footer__link">
                    {link.label}
                  </Link>
                ) : (
                  <span className="footer__link footer__link--text">
                    {link.label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="footer__contact">
          <h4 className="footer__section-title">Liên hệ</h4>
          <ul className="footer__contact-list">
            <li>
              <FiPhone size={16} />
              <a href="tel:0989804006">0989804006</a>
            </li>
            <li>
              <FiMail size={16} />
              <a href="mailto:soligant.gifts@gmail.com">
                soligant.gifts@gmail.com
              </a>
            </li>
            <li>
              <FiMapPin size={16} />
              <span>Online tại Hà Nội</span>
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
