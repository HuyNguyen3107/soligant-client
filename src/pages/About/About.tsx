import { Link } from "react-router-dom";
import { FiCompass, FiHeart, FiLayers, FiUsers } from "react-icons/fi";
import { PageBreadcrumb, SEO } from "../../components/common";
import aboutHeroImage from "../../assets/images/product-2.jpg";
import "./About.css";

const brandValues = [
  {
    title: "Tinh tế trong từng chi tiết",
    description:
      "Mỗi thiết kế đều được cân nhắc về chất liệu, màu sắc và cảm xúc để món quà vừa đẹp mắt vừa có chiều sâu.",
    icon: <FiHeart size={22} />,
  },
  {
    title: "Linh hoạt theo nhu cầu",
    description:
      "Từ quà cá nhân đến quà doanh nghiệp, Soligant xây dựng trải nghiệm chọn quà theo đúng dịp và ngân sách của bạn.",
    icon: <FiLayers size={22} />,
  },
  {
    title: "Đồng hành tận tâm",
    description:
      "Đội ngũ tư vấn không chỉ gợi ý sản phẩm, mà còn giúp bạn kể đúng câu chuyện bạn muốn gửi gắm.",
    icon: <FiUsers size={22} />,
  },
];

const About = () => {
  return (
    <>
      <SEO
        title="Về chúng tôi"
        description="Tìm hiểu về Soligant - thương hiệu quà tặng tinh tế, cá nhân hóa theo từng khoảnh khắc và cảm xúc."
        keywords="về soligant, thương hiệu quà tặng, quà tặng tinh tế"
      />

      <section className="about-page__hero">
        <div className="container about-page__hero-content">
          <PageBreadcrumb
            tone="dark"
            items={[{ label: "Trang chủ", to: "/" }, { label: "Về chúng tôi" }]}
          />
          <p className="about-page__eyebrow">Soligant Story</p>
          <h1>Chúng tôi không bán một món quà, chúng tôi giúp bạn gửi một thông điệp.</h1>
          <p>
            Soligant được xây dựng bởi tình yêu với cái đẹp và sự trân trọng những khoảnh khắc
            nhỏ trong đời sống. Mỗi bộ quà được chuẩn bị như một tác phẩm nhỏ, có ý tưởng rõ ràng
            và giữ được dấu ấn riêng của người tặng.
          </p>
        </div>
      </section>

      <section className="about-page__intro">
        <div className="container about-page__intro-grid">
          <div className="about-page__intro-media">
            <img src={aboutHeroImage} alt="Không gian sáng tạo quà tặng tại Soligant" />
          </div>
          <div className="about-page__intro-copy">
            <h2>Từ một ý tưởng nhỏ đến một thương hiệu quà tặng có phong cách riêng</h2>
            <p>
              Chúng tôi bắt đầu với một câu hỏi đơn giản: làm thế nào để một món quà trở nên có
              hồn? Câu trả lời nằm ở sự kết hợp giữa thẩm mỹ, sự chân thành và khả năng cá nhân hóa.
            </p>
            <p>
              Từ khâu chọn bộ sưu tập, đóng gói đến thông điệp đi kèm, Soligant giữ triết lý nhất
              quán là rõ ràng, gọn gàng và đầy cảm xúc. Đó là lý do khách hàng tìm đến chúng tôi
              mỗi khi cần một món quà thật sự có ý nghĩa.
            </p>
            <Link to="/bo-suu-tap" className="about-page__intro-link">
              Xem bộ sưu tập <FiCompass size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="about-page__values">
        <div className="container">
          <div className="about-page__section-head">
            <p>Giá trị cốt lõi</p>
            <h2>Những điều Soligant luôn giữ vững</h2>
          </div>

          <div className="about-page__value-grid">
            {brandValues.map((value) => (
              <article key={value.title} className="about-page__value-card">
                <div className="about-page__value-icon">{value.icon}</div>
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-page__numbers">
        <div className="container about-page__numbers-grid">
          <article>
            <strong>5000+</strong>
            <span>Khách hàng đã đặt quà</span>
          </article>
          <article>
            <strong>200+</strong>
            <span>Mẫu quà trong hệ thống</span>
          </article>
          <article>
            <strong>98%</strong>
            <span>Khách hàng quay lại đặt tiếp</span>
          </article>
        </div>
      </section>

      <section className="about-page__cta">
        <div className="container about-page__cta-content">
          <div>
            <p>Cần tư vấn bộ quà phù hợp cho dịp đặc biệt?</p>
            <h2>Đội ngũ Soligant sẵn sàng đồng hành cùng bạn.</h2>
          </div>
          <Link to="/lien-he" className="about-page__cta-btn">
            Liên hệ ngay
          </Link>
        </div>
      </section>
    </>
  );
};

export default About;
