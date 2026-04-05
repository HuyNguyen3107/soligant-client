import { FiFacebook, FiInstagram, FiMail, FiMapPin, FiPhone } from "react-icons/fi";
import { PageBreadcrumb, SEO } from "../../components/common";
import "./Contact.css";

const Contact = () => {
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
          <h1>
            Cần đội ngũ tư vấn đồng hành? Chúng tôi luôn sẵn sàng nghe bạn.
          </h1>
          <p>
            Gửi thông tin cho Soligant để nhận gợi ý bộ quà phù hợp với dịp
            tặng, người nhận và ngân sách trong thời gian nhanh nhất.
          </p>
        </div>
      </section>

      <section className="contact-page__body">
        <div className="container contact-page__info-wrap">
          <h2>Thông tin liên hệ</h2>

          <div className="contact-page__info-grid">
            <article className="contact-page__info-item">
              <span className="contact-page__info-icon">
                <FiPhone size={18} />
              </span>
              <div>
                <h3>Hotline</h3>
                <a href="tel:0989804006">0989 804 006</a>
              </div>
            </article>

            <article className="contact-page__info-item">
              <span className="contact-page__info-icon">
                <FiMail size={18} />
              </span>
              <div>
                <h3>Email</h3>
                <a href="mailto:soligant.gifts@gmail.com">soligant.gifts@gmail.com</a>
              </div>
            </article>

            <article className="contact-page__info-item">
              <span className="contact-page__info-icon">
                <FiMapPin size={18} />
              </span>
              <div>
                <h3>Khu vực</h3>
                <span>Online tại Hà Nội</span>
              </div>
            </article>

            <article className="contact-page__info-item">
              <span className="contact-page__info-icon">
                <FiFacebook size={18} />
              </span>
              <div>
                <h3>Facebook</h3>
                <a
                  href="https://www.facebook.com/profile.php?id=61567332901935"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Soligant Gifts
                </a>
              </div>
            </article>

            <article className="contact-page__info-item">
              <span className="contact-page__info-icon">
                <FiInstagram size={18} />
              </span>
              <div>
                <h3>Instagram</h3>
                <a
                  href="https://www.instagram.com/soligant.gifts"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @soligant.gifts
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
};

export default Contact;
