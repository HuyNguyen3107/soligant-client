import { FiMapPin, FiPhone, FiMail } from "react-icons/fi";
import { FaFacebookF, FaInstagram } from "react-icons/fa";
import { SiZalo } from "react-icons/si";
import "./Contact.css";

const Contact = () => {
  return (
    <section id="contact" className="contact section">
      <div className="container">
        <div className="section-title">
          <h2>Liên Hệ Với Chúng Tôi</h2>
          <p>Hãy để lại thông tin, chúng tôi sẽ tư vấn miễn phí cho bạn</p>
        </div>

        <div className="contact__wrapper">
          <div className="contact__info">
            <h3 className="contact__info-title">Thông tin liên hệ</h3>

            <div className="contact__item">
              <div className="contact__item-icon">
                <FiMapPin size={24} />
              </div>
              <div className="contact__item-content">
                <h4>Địa chỉ</h4>
                <p>
                  123 Đường ABC, Quận 1<br />
                  TP. Hồ Chí Minh
                </p>
              </div>
            </div>

            <div className="contact__item">
              <div className="contact__item-icon">
                <FiPhone size={24} />
              </div>
              <div className="contact__item-content">
                <h4>Hotline</h4>
                <p>
                  1900 1234 56
                  <br />
                  (8:00 - 22:00 hàng ngày)
                </p>
              </div>
            </div>

            <div className="contact__item">
              <div className="contact__item-icon">
                <FiMail size={24} />
              </div>
              <div className="contact__item-content">
                <h4>Email</h4>
                <p>
                  info@soligant.vn
                  <br />
                  support@soligant.vn
                </p>
              </div>
            </div>

            <div className="contact__social">
              <h4>Theo dõi chúng tôi</h4>
              <div className="contact__social-links">
                <a
                  href="#"
                  className="contact__social-link"
                  aria-label="Facebook"
                >
                  <FaFacebookF size={18} />
                </a>
                <a
                  href="#"
                  className="contact__social-link"
                  aria-label="Instagram"
                >
                  <FaInstagram size={18} />
                </a>
                <a href="#" className="contact__social-link" aria-label="Zalo">
                  <SiZalo size={18} />
                </a>
              </div>
            </div>
          </div>

          <form className="contact__form">
            <div className="contact__form-group">
              <label htmlFor="name" className="contact__label">
                Họ và tên *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                className="contact__input"
                placeholder="Nhập họ và tên của bạn"
                required
              />
            </div>

            <div className="contact__form-row">
              <div className="contact__form-group">
                <label htmlFor="email" className="contact__label">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="contact__input"
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div className="contact__form-group">
                <label htmlFor="phone" className="contact__label">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="contact__input"
                  placeholder="0901 234 567"
                />
              </div>
            </div>

            <div className="contact__form-group">
              <label htmlFor="subject" className="contact__label">
                Chủ đề *
              </label>
              <select
                id="subject"
                name="subject"
                className="contact__select"
                required
              >
                <option value="">Chọn chủ đề</option>
                <option value="consultation">Tư vấn chọn quà</option>
                <option value="order">Đặt hàng</option>
                <option value="corporate">Quà doanh nghiệp</option>
                <option value="feedback">Góp ý</option>
                <option value="other">Khác</option>
              </select>
            </div>

            <div className="contact__form-group">
              <label htmlFor="message" className="contact__label">
                Nội dung *
              </label>
              <textarea
                id="message"
                name="message"
                className="contact__textarea"
                placeholder="Nhập nội dung tin nhắn..."
                rows={5}
                required
              ></textarea>
            </div>

            <button type="submit" className="btn btn-primary contact__submit">
              Gửi tin nhắn
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Contact;
