import { FiGift, FiEdit3, FiTruck, FiMessageCircle } from "react-icons/fi";
import "./About.css";
import aboutImage from "../../../assets/images/product-2.jpg";

interface Service {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const services: Service[] = [
  {
    icon: <FiGift size={32} />,
    title: "Đóng Gói Tinh Tế",
    description:
      "Món quà được đóng gói cẩn thận với hộp cao cấp và ribbon đẹp mắt, sẵn sàng để tặng.",
  },
  {
    icon: <FiEdit3 size={32} />,
    title: "Thiệp Viết Tay",
    description:
      "Miễn phí thiếp viết tay với lời chúc cá nhân hóa cho người nhận.",
  },
  {
    icon: <FiTruck size={32} />,
    title: "Giao Hàng Nhanh",
    description:
      "Giao hàng toàn quốc trong 2-4 ngày. Hỗ trợ giao hỏa tốc tại TP.HCM.",
  },
  {
    icon: <FiMessageCircle size={32} />,
    title: "Tư Vấn Tận Tâm",
    description:
      "Đội ngũ tư vấn chuyên nghiệp giúp bạn chọn món quà phù hợp nhất.",
  },
];

const About = () => {
  return (
    <section id="about" className="about section">
      <div className="container">
        <div className="about__header">
          <div className="about__intro">
            <h2>Về Soligant</h2>
            <p className="about__tagline">
              Nơi cảm xúc được gói ghém trong từng món quà
            </p>
          </div>
          <div className="about__content">
            <p>
              Soligant được thành lập với sứ mệnh mang đến những món quà tinh
              tế, đầy ý nghĩa cho mọi dịp đặc biệt trong cuộc sống. Chúng tôi
              tin rằng mỗi món quà đều là một câu chuyện, một thông điệp yêu
              thương được gửi trao từ trái tim này đến trái tim khác.
            </p>
            <p>
              Với đội ngũ tận tâm và gu thẩm mỹ tinh tế, chúng tôi luôn chọn lọc
              những sản phẩm chất lượng cao nhất, từ các thương hiệu uy tín
              trong và ngoài nước. Mỗi bộ quà tặng đều được thiết kế riêng biệt,
              tạo nên sự độc đáo và khác biệt cho món quà của bạn.
            </p>
          </div>
        </div>

        <div className="about__image-section">
          <div className="about__image-wrapper">
            <img
              src={aboutImage}
              alt="Soligant Store"
              className="about__image"
            />
          </div>
          <div className="about__stats">
            <div className="about__stat">
              <span className="about__stat-number">5000+</span>
              <span className="about__stat-label">Khách hàng hài lòng</span>
            </div>
            <div className="about__stat">
              <span className="about__stat-number">200+</span>
              <span className="about__stat-label">Sản phẩm đa dạng</span>
            </div>
            <div className="about__stat">
              <span className="about__stat-number">5+</span>
              <span className="about__stat-label">Năm kinh nghiệm</span>
            </div>
          </div>
        </div>
      </div>

      <div className="about__services">
        <div className="container">
          <div className="section-title">
            <h2>Dịch Vụ Của Chúng Tôi</h2>
            <p>Những dịch vụ đặc biệt giúp món quà của bạn thêm trọn vẹn</p>
          </div>

          <div className="about__services-grid">
            {services.map((service, index) => (
              <div key={index} className="service-card">
                <div className="service-card__icon">{service.icon}</div>
                <h3 className="service-card__title">{service.title}</h3>
                <p className="service-card__description">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
