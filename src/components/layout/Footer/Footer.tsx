import { FaFacebookF, FaInstagram } from "react-icons/fa";
import { SiZalo } from "react-icons/si";
import "./Footer.css";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const footerSections: FooterSection[] = [
  {
    title: "Sản phẩm",
    links: [
      { label: "Quà sinh nhật", href: "#" },
      { label: "Quà cưới", href: "#" },
      { label: "Quà doanh nghiệp", href: "#" },
      { label: "Bộ quà tặng", href: "#" },
    ],
  },
  {
    title: "Hỗ trợ",
    links: [
      { label: "Hướng dẫn mua hàng", href: "#" },
      { label: "Chính sách đổi trả", href: "#" },
      { label: "Giao hàng", href: "#" },
      { label: "FAQ", href: "#" },
    ],
  },
  {
    title: "Công ty",
    links: [
      { label: "Về chúng tôi", href: "#about" },
      { label: "Liên hệ", href: "#contact" },
      { label: "Tuyển dụng", href: "#" },
      { label: "Blog", href: "#" },
    ],
  },
];

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__container container">
        <div className="footer__brand">
          <a href="#" className="footer__logo">
            <span className="footer__logo-text">Soligant</span>
          </a>
          <p className="footer__description">
            Quà tặng tinh tế cho mọi dịp. Chúng tôi mang đến những món quà đặc
            biệt để ghi nhớ những khoảnh khắc quan trọng trong cuộc sống.
          </p>
          <div className="footer__social">
            <a href="#" className="footer__social-link" aria-label="Facebook">
              <FaFacebookF size={18} />
            </a>
            <a href="#" className="footer__social-link" aria-label="Instagram">
              <FaInstagram size={18} />
            </a>
            <a href="#" className="footer__social-link" aria-label="Zalo">
              <SiZalo size={18} />
            </a>
          </div>
        </div>

        <div className="footer__links">
          {footerSections.map((section) => (
            <div key={section.title} className="footer__section">
              <h4 className="footer__section-title">{section.title}</h4>
              <ul className="footer__section-links">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="footer__link">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="footer__bottom">
        <div className="container">
          <p className="footer__copyright">
            © {currentYear} Soligant. Tất cả quyền được bảo lưu.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
