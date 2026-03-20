import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FiArrowRight,
  FiCompass,
  FiGift,
  FiShield,
  FiTruck,
} from "react-icons/fi";
import { ImageWithFallback, SEO } from "../../components/common";
import { getErrorMessage } from "../../lib/error";
import { getStaticAssetUrl } from "../../lib/http";
import { getPublicFeedbacks } from "../../services/feedbacks.service";
import heroImage from "../../assets/images/product-1.jpg";
import moodImage from "../../assets/images/product-2.jpg";
import detailImage from "../../assets/images/product-3.jpg";
import "./Home.css";

const strengths = [
  {
    title: "Bộ sưu tập có chọn lọc",
    description:
      "Mẫu quà được cập nhật liên tục theo từng dịp, để bạn chọn nhanh mà vẫn đúng gu.",
    icon: <FiCompass size={20} />,
  },
  {
    title: "Đóng gói chỉn chu",
    description:
      "Từ chất liệu đến cách phối màu, mọi chi tiết đều được xử lý để món quà thêm trang trọng.",
    icon: <FiGift size={20} />,
  },
  {
    title: "Giao nhanh và minh bạch",
    description:
      "Quy trình xử lý rõ ràng, bạn có thể theo dõi trạng thái để chủ động trong mọi tình huống.",
    icon: <FiTruck size={20} />,
  },
];

const formatFeedbackDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const Home = () => {
  const {
    data: publicFeedbacks = [],
    isLoading: isFeedbackLoading,
    isError: isFeedbackError,
    error: feedbackError,
  } = useQuery({
    queryKey: ["public-feedbacks"],
    queryFn: getPublicFeedbacks,
  });

  const highlightedFeedbacks = useMemo(
    () => publicFeedbacks.slice(0, 6),
    [publicFeedbacks],
  );

  return (
    <>
      <SEO
        title="Trang chủ"
        description="Soligant - studio quà tặng theo phong cách hiện đại, tập trung vào sự tinh tế và khả năng cá nhân hóa."
        keywords="Soligant, quà tặng cao cấp, bộ sưu tập quà tặng, cá nhân hóa quà tặng"
      />

      <section className="home-page__hero">
        <div className="home-page__hero-glow" />
        <div className="container home-page__hero-container">
          <div className="home-page__hero-copy">
            <p className="home-page__eyebrow">Soligant Gift Studio</p>
            <h1>
              Món quà đẹp mắt,
              <span> thông điệp rõ ràng, cảm xúc trọn vẹn.</span>
            </h1>
            <p className="home-page__lead">
              Soligant giúp bạn chọn quà theo từng dịp và từng đối tượng, để
              việc tặng quà trở nên gọn gàng nhưng vẫn thật sự ấn tượng.
            </p>
            <div className="home-page__hero-actions">
              <Link
                to="/bo-suu-tap"
                className="home-page__btn home-page__btn--solid"
              >
                Khám phá bộ sưu tập <FiArrowRight size={16} />
              </Link>
              <Link
                to="/lien-he"
                className="home-page__btn home-page__btn--ghost"
              >
                Tư vấn cho dịp đặc biệt
              </Link>
            </div>
            <div className="home-page__hero-note">
              <FiShield size={15} />
              <span>Thông tin đơn hàng được xử lý riêng tư và bảo mật.</span>
            </div>
          </div>

          <div className="home-page__hero-media">
            <img src={heroImage} alt="Bộ quà Soligant" />
            <div className="home-page__hero-card">
              <strong>Ý tưởng quà tặng theo yêu cầu</strong>
              <p>
                Từ quà sinh nhật đến quà đối tác, đều có thể cá nhân hóa theo
                thông điệp của bạn.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-page__strengths">
        <div className="container">
          <div className="home-page__section-title">
            <p>Vì sao khách hàng chọn Soligant</p>
            <h2>Hệ thống quà tặng được xây để dễ chọn, dễ gửi và dễ ghi nhớ</h2>
          </div>
          <div className="home-page__strength-grid">
            {strengths.map((item) => (
              <article key={item.title} className="home-page__strength-card">
                <div className="home-page__strength-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-page__story">
        <div className="container home-page__story-grid">
          <div className="home-page__story-media">
            <figure>
              <img src={moodImage} alt="Không gian bộ quà với tông màu ấm" />
            </figure>
            <figure>
              <img
                src={detailImage}
                alt="Chi tiết hộp quà được bố trí cẩn thận"
              />
            </figure>
          </div>

          <div className="home-page__story-copy">
            <p className="home-page__story-eyebrow">
              Từ ý tưởng đến món quà hoàn chỉnh
            </p>
            <h2>Mỗi bộ quà là một kịch bản được biên tập riêng cho bạn</h2>
            <p>
              Chúng tôi bắt đầu bằng việc hiểu đúng người nhận, tiếp đến là chọn
              bộ sưu tập, thông điệp và cách trình bày phù hợp. Toàn bộ quy
              trình được tối giản để bạn không mất nhiều thời gian nhưng vẫn có
              kết quả vượt mong đợi.
            </p>
            <div className="home-page__story-actions">
              <Link to="/ve-chung-toi" className="home-page__text-link">
                Tìm hiểu về chúng tôi <FiArrowRight size={15} />
              </Link>
              <Link to="/tra-cuu-don-hang" className="home-page__text-link">
                Tra cứu đơn hàng <FiArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="home-page__feedbacks">
        <div className="container">
          <div className="home-page__section-title">
            <p>Feedback từ khách hàng</p>
            <h2>Những chia sẻ đã được đăng trên trang chủ</h2>
          </div>

          {isFeedbackLoading ? (
            <p className="home-page__feedback-state">Đang tải feedback...</p>
          ) : isFeedbackError ? (
            <p className="home-page__feedback-state">
              {getErrorMessage(
                feedbackError,
                "Không thể tải feedback lúc này.",
              )}
            </p>
          ) : highlightedFeedbacks.length === 0 ? (
            <p className="home-page__feedback-state">
              Chưa có feedback nào hiển thị.
            </p>
          ) : (
            <div className="home-page__feedback-grid">
              {highlightedFeedbacks.map((feedback) => {
                const fallbackName = feedback.name.trim() || "Khách hàng";
                const firstChar = fallbackName.charAt(0).toUpperCase();

                return (
                  <article
                    className="home-page__feedback-card"
                    key={feedback.id}
                  >
                    <div className="home-page__feedback-head">
                      {feedback.image ? (
                        <div className="home-page__feedback-avatar">
                          <ImageWithFallback
                            src={getStaticAssetUrl(feedback.image)}
                            alt={`Feedback của ${fallbackName}`}
                            width={56}
                            height={56}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                      ) : (
                        <div className="home-page__feedback-avatar home-page__feedback-avatar--placeholder">
                          {firstChar}
                        </div>
                      )}

                      <div>
                        <h3>{fallbackName}</h3>
                        <p>{formatFeedbackDate(feedback.createdAt)}</p>
                      </div>
                    </div>

                    <p className="home-page__feedback-message">
                      {feedback.message}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="home-page__cta">
        <div className="container home-page__cta-box">
          <div>
            <p>Bạn đã có ý tưởng quà tặng?</p>
            <h2>
              Bắt đầu từ bộ sưu tập để nhận tư vấn nhanh từ đội ngũ Soligant.
            </h2>
          </div>
          <Link
            to="/bo-suu-tap"
            className="home-page__btn home-page__btn--solid"
          >
            Bắt đầu ngay
          </Link>
        </div>
      </section>
    </>
  );
};

export default Home;
