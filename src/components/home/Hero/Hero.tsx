import { FiGift, FiTruck, FiHeart } from "react-icons/fi";
import "./Hero.css";

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero__background">
        <img
          src="/src/assets/images/product-1.jpg"
          alt="Background"
          className="hero__background-image"
        />
        <div className="hero__overlay"></div>
      </div>

      <div className="hero__content container">
        <div className="hero__text">
          <h1 className="hero__title animate-fade-in-down">
            Quà Tặng Tinh Tế
            <span className="hero__title-highlight">Cho Mọi Dịp</span>
          </h1>
          <p className="hero__subtitle animate-fade-in-up">
            Khám phá bộ sưu tập quà tặng độc đáo tại Soligant. Những món quà
            được tuyển chọn kỹ lưỡng để mang lại niềm vui và tạo nên những
            khoảnh khắc đáng nhớ.
          </p>
          <div className="hero__actions animate-fade-in-up delay-300">
            <a href="#products" className="btn btn-primary hero__btn">
              Khám phá ngay
            </a>
            <a href="#about" className="btn btn-outline hero__btn">
              Về chúng tôi
            </a>
          </div>
        </div>

        <div className="hero__features">
          <div className="hero__feature animate-fade-in delay-200">
            <div className="hero__feature-icon">
              <FiGift size={28} />
            </div>
            <div className="hero__feature-text">
              <h4>Đóng gói tinh tế</h4>
              <p>Mỗi món quà được gói ghém cẩn thận</p>
            </div>
          </div>
          <div className="hero__feature animate-fade-in delay-400">
            <div className="hero__feature-icon">
              <FiTruck size={28} />
            </div>
            <div className="hero__feature-text">
              <h4>Giao hàng nhanh</h4>
              <p>Giao tận nơi trên toàn quốc</p>
            </div>
          </div>
          <div className="hero__feature animate-fade-in delay-600">
            <div className="hero__feature-icon">
              <FiHeart size={28} />
            </div>
            <div className="hero__feature-text">
              <h4>Thiệp miễn phí</h4>
              <p>Tặng thiếp viết tay theo yêu cầu</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
