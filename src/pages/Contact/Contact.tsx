import { useState } from "react";
import type { FormEvent } from "react";
import { FiClock, FiMail, FiMapPin, FiPhone } from "react-icons/fi";
import { PageBreadcrumb, RichTextEditor, SEO } from "../../components/common";
import "./Contact.css";

const Contact = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.currentTarget.reset();
    setMessage("");
    setIsSubmitted(true);
  };

  return (
    <>
      <SEO
        title="Liên hệ"
        description="Liên hệ Soligant để được tư vấn chọn quà theo nhu cầu cá nhân hoặc doanh nghiệp."
        keywords="liên hệ soligant, tư vấn quà tặng, đặt quà theo yêu cầu"
      />

      <section className="contact-page__hero">
        <div className="container contact-page__hero-content">
          <PageBreadcrumb
            tone="dark"
            items={[{ label: "Trang chủ", to: "/" }, { label: "Liên hệ" }]}
          />
          <p className="contact-page__eyebrow">Talk To Soligant</p>
          <h1>Cần đội ngũ tư vấn đồng hành? Chúng tôi luôn sẵn sàng nghe bạn.</h1>
          <p>
            Gửi thông tin cho Soligant để nhận gợi ý bộ quà phù hợp với dịp tặng,
            người nhận và ngân sách trong thời gian nhanh nhất.
          </p>
        </div>
      </section>

      <section className="contact-page__body">
        <div className="container contact-page__grid">
          <aside className="contact-page__info">
            <h2>Thông tin liên hệ</h2>

            <article className="contact-page__info-item">
              <span className="contact-page__info-icon">
                <FiMapPin size={18} />
              </span>
              <div>
                <h3>Địa chỉ</h3>
                <p>123 Đường ABC, Quận 1, TP. Hồ Chí Minh</p>
              </div>
            </article>

            <article className="contact-page__info-item">
              <span className="contact-page__info-icon">
                <FiPhone size={18} />
              </span>
              <div>
                <h3>Hotline</h3>
                <p>
                  <a href="tel:1900123456">1900 1234 56</a>
                </p>
              </div>
            </article>

            <article className="contact-page__info-item">
              <span className="contact-page__info-icon">
                <FiMail size={18} />
              </span>
              <div>
                <h3>Email</h3>
                <p>
                  <a href="mailto:info@soligant.vn">info@soligant.vn</a>
                </p>
              </div>
            </article>

            <article className="contact-page__info-item">
              <span className="contact-page__info-icon">
                <FiClock size={18} />
              </span>
              <div>
                <h3>Giờ hỗ trợ</h3>
                <p>08:00 - 22:00 (Thứ 2 đến Chủ nhật)</p>
              </div>
            </article>
          </aside>

          <form className="contact-page__form" onSubmit={handleSubmit}>
            <h2>Gửi yêu cầu tư vấn</h2>

            <div className="contact-page__field-grid">
              <label className="contact-page__field">
                <span>Họ và tên *</span>
                <input type="text" name="name" placeholder="Nguyễn Văn A" required />
              </label>
              <label className="contact-page__field">
                <span>Số điện thoại *</span>
                <input type="tel" name="phone" placeholder="0901 234 567" required />
              </label>
            </div>

            <div className="contact-page__field-grid">
              <label className="contact-page__field">
                <span>Email</span>
                <input type="email" name="email" placeholder="email@example.com" />
              </label>
              <label className="contact-page__field">
                <span>Nhu cầu</span>
                <select name="topic" defaultValue="tu-van-qua-ca-nhan">
                  <option value="tu-van-qua-ca-nhan">Tư vấn quà cá nhân</option>
                  <option value="qua-doanh-nghiep">Quà doanh nghiệp</option>
                  <option value="dat-so-luong-lon">Đặt số lượng lớn</option>
                  <option value="khac">Khác</option>
                </select>
              </label>
            </div>

            <label className="contact-page__field">
              <span>Nội dung</span>
              <RichTextEditor
                value={message}
                onChange={setMessage}
                placeholder="Mô tả nhanh dịp tặng quà, đối tượng nhận quà và ngân sách dự kiến..."
                minHeight={150}
              />
            </label>

            <button type="submit" className="contact-page__submit-btn">
              Gửi thông tin
            </button>

            {isSubmitted && (
              <p className="contact-page__success">
                Cảm ơn bạn! Soligant đã nhận thông tin và sẽ liên hệ sớm nhất.
              </p>
            )}
          </form>
        </div>
      </section>
    </>
  );
};

export default Contact;
