import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FiArrowLeft, FiArrowRight, FiArrowUpRight } from "react-icons/fi";
import { ImageWithFallback, SEO } from "../../components/common";
import { getErrorMessage } from "../../lib/error";
import { getStaticAssetUrl } from "../../lib/http";
import { getPublicFeedbacks } from "../../services/feedbacks.service";
import { getPublicCollections } from "../../services/collections.service";
import heroImage from "../../assets/images/product-1.jpg";
import moodImage from "../../assets/images/product-2.jpg";
import detailImage from "../../assets/images/product-3.jpg";
import "./Home.css";

const fallbackImages = [heroImage, moodImage, detailImage];

const steps = [
  {
    n: "01",
    title: "Chọn bộ sưu tập",
    desc: "Lựa chọn bộ quà phù hợp với dịp và đối tượng của bạn",
  },
  {
    n: "02",
    title: "Cá nhân hóa",
    desc: "Tùy chỉnh thông điệp, màu sắc và chi tiết theo ý thích",
  },
  {
    n: "03",
    title: "Tư vấn & Đặt hàng",
    desc: "Đội ngũ tư vấn sẽ xác nhận và hỗ trợ bạn hoàn tất đơn",
  },
  {
    n: "04",
    title: "Sản xuất & Giao hàng",
    desc: "Hoàn thiện và giao tận tay trong thời gian cam kết",
  },
];

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const Home = () => {
  const {
    data: feedbacks = [],
    isLoading: fbLoading,
    isError: fbError,
    error: fbErr,
  } = useQuery({
    queryKey: ["public-feedbacks"],
    queryFn: getPublicFeedbacks,
  });

  const { data: collections = [] } = useQuery({
    queryKey: ["public-collections"],
    queryFn: getPublicCollections,
  });

  const featured = useMemo(() => {
    const f = collections.filter((c) => c.isFeatured);
    return (f.length > 0 ? f : collections).slice(0, 3);
  }, [collections]);

  const reviews = useMemo(() => feedbacks.slice(0, 6), [feedbacks]);

  // Carousel
  const [slide, setSlide] = useState(0);
  const perPage = 2;
  const maxSlide = Math.max(0, reviews.length - perPage);
  const trackRef = useRef<HTMLDivElement>(null);
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  // Contact
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSent(true);
    setName("");
    setPhone("");
    setTimeout(() => setSent(false), 4000);
  };

  useEffect(() => {
    if (!previewImage) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewImage(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [previewImage]);

  return (
    <>
      <SEO
        title="Trang chủ"
        description="Soligant - studio quà tặng theo phong cách hiện đại, tập trung vào sự tinh tế và khả năng cá nhân hóa."
        keywords="Soligant, quà tặng cao cấp, bộ sưu tập quà tặng, cá nhân hóa quà tặng"
      />

      {/* ═══ HERO ═══ */}
      <section className="hp-hero">
        <div className="hp-hero__left">
          <span className="hp-hero__badge">Soligant Gift Studio</span>
          <h1 className="hp-hero__brand">
            SOLIGANT
            <br />
            .GIFTS
          </h1>
          <p className="hp-hero__tagline">
            Tinh tế cho mọi dịp — hiện diện trong từng món quà.
          </p>
          <div className="hp-hero__actions">
            <Link to="/bo-suu-tap" className="hp-btn hp-btn--light">
              Khám phá bộ sưu tập <FiArrowUpRight size={15} />
            </Link>
            <Link to="/lien-he" className="hp-btn hp-btn--ghost">
              Nhận tư vấn
            </Link>
          </div>
        </div>
        <div className="hp-hero__right">
          <img src={heroImage} alt="Bộ quà Soligant" />
        </div>
      </section>

      {/* ═══ FEATURED COLLECTIONS ═══ */}
      <section className="hp-section hp-collections">
        <div className="container">
          <div className="hp-section__head">
            <div>
              <p className="hp-eyebrow">Bộ sưu tập nổi bật</p>
              <h2 className="hp-section__title">SẢN PHẨM NỔI BẬT</h2>
            </div>
            <Link to="/bo-suu-tap" className="hp-link-more">
              Xem tất cả <FiArrowRight size={14} />
            </Link>
          </div>

          <div className="hp-collections__grid">
            {featured.length === 0
              ? fallbackImages.map((img, i) => (
                  <article key={i} className="hp-col-card">
                    <div className="hp-col-card__img">
                      <img src={img} alt="Sản phẩm Soligant" />
                    </div>
                    <div className="hp-col-card__body">
                      <h3>Bộ quà Soligant</h3>
                      <Link to="/bo-suu-tap" className="hp-col-card__cta">
                        Xem ngay <FiArrowRight size={13} />
                      </Link>
                    </div>
                  </article>
                ))
              : featured.map((col, i) => (
                  <article key={col._id} className="hp-col-card">
                    <div className="hp-col-card__img">
                      {col.thumbnail ? (
                        <ImageWithFallback
                          src={getStaticAssetUrl(col.thumbnail)}
                          alt={col.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <img src={fallbackImages[i % 3]} alt={col.name} />
                      )}
                    </div>
                    <div className="hp-col-card__body">
                      <h3>{col.name}</h3>
                      {col.description && (
                        <p className="hp-col-card__desc">{col.description}</p>
                      )}
                      <Link
                        to={`/bo-suu-tap/${col.slug}`}
                        className="hp-col-card__cta"
                      >
                        Xem ngay <FiArrowRight size={13} />
                      </Link>
                    </div>
                  </article>
                ))}
          </div>
        </div>
      </section>

      {/* ═══ ORDER PROCESS ═══ */}
      <section className="hp-section hp-process">
        <div className="container hp-process__grid">
          <div className="hp-process__img">
            <img src={moodImage} alt="Quy trình đặt quà Soligant" />
          </div>
          <div className="hp-process__content">
            <p className="hp-eyebrow">Đơn giản & minh bạch</p>
            <h2 className="hp-section__title hp-section__title--left">
              QUY TRÌNH ĐẶT QUÀ
            </h2>
            <div className="hp-steps">
              {steps.map((s) => (
                <div key={s.n} className="hp-step">
                  <div className="hp-step__num">{s.n}</div>
                  <div className="hp-step__body">
                    <h4>{s.title}</h4>
                    <p>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/bo-suu-tap"
              className="hp-btn hp-btn--primary"
              style={{ marginTop: "8px", display: "inline-flex" }}
            >
              Bắt đầu ngay <FiArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ CTA BANNER ═══ */}
      <section className="hp-cta">
        <div className="container hp-cta__inner">
          <p className="hp-eyebrow hp-eyebrow--light">Tạo món quà đặc biệt</p>
          <h2 className="hp-cta__title">
            Bạn đã sẵn sàng tạo
            <br />
            món quà mang dấu ấn?
          </h2>
          <p className="hp-cta__sub">
            Hàng trăm bộ quà đã được cá nhân hóa và trao tặng — câu chuyện tiếp
            theo có thể là của bạn.
          </p>
          <Link to="/bo-suu-tap" className="hp-btn hp-btn--light">
            Khám phá bộ sưu tập <FiArrowUpRight size={15} />
          </Link>
        </div>
      </section>

      {/* ═══ REVIEWS ═══ */}
      <section className="hp-section hp-reviews">
        <div className="container">
          <div className="hp-section__head">
            <div>
              <p className="hp-eyebrow">Khách hàng nói gì</p>
              <h2 className="hp-section__title">NHỮNG NIỀM VUI NHỎ</h2>
            </div>
            {reviews.length > perPage && (
              <div className="hp-reviews__nav">
                <button
                  onClick={() => setSlide((i) => Math.max(0, i - 1))}
                  disabled={slide === 0}
                  aria-label="Trước"
                >
                  <FiArrowLeft size={17} />
                </button>
                <button
                  onClick={() => setSlide((i) => Math.min(maxSlide, i + 1))}
                  disabled={slide >= maxSlide}
                  aria-label="Tiếp"
                >
                  <FiArrowRight size={17} />
                </button>
              </div>
            )}
          </div>

          {fbLoading ? (
            <p className="hp-state">Đang tải nhận xét...</p>
          ) : fbError ? (
            <p className="hp-state">
              {getErrorMessage(fbErr, "Không thể tải nhận xét.")}
            </p>
          ) : reviews.length === 0 ? (
            <p className="hp-state">Chưa có nhận xét nào.</p>
          ) : (
            <div className="hp-reviews__viewport">
              <div
                ref={trackRef}
                className="hp-reviews__track"
                style={{
                  transform: `translateX(calc(-${slide} * (50% + 8px)))`,
                }}
              >
                {reviews.map((fb) => {
                  const displayName = fb.name.trim() || "Khách hàng";
                  const feedbackImageUrl = fb.image
                    ? getStaticAssetUrl(fb.image)
                    : "";
                  return (
                    <article key={fb.id} className="hp-review">
                      <div className="hp-review__top">
                        <div className="hp-review__stars">★★★★★</div>
                        <span className="hp-review__quote">"</span>
                      </div>
                      <p className="hp-review__msg">{fb.message}</p>
                      {feedbackImageUrl && (
                        <button
                          type="button"
                          className="hp-review__proof"
                          onClick={() =>
                            setPreviewImage({
                              src: feedbackImageUrl,
                              alt: `Ảnh minh chứng từ ${displayName}`,
                            })
                          }
                          aria-label={`Xem ảnh minh chứng của ${displayName}`}
                        >
                          <ImageWithFallback
                            src={feedbackImageUrl}
                            alt={`Ảnh minh chứng từ ${displayName}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                          <span className="hp-review__proofHint">
                            Bấm để xem rõ ảnh
                          </span>
                        </button>
                      )}
                      <div className="hp-review__author">
                        <div className="hp-review__avatar hp-review__avatar--init">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="hp-review__name">{displayName}</p>
                          <p className="hp-review__date">
                            {formatDate(fb.createdAt)}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {previewImage && (
        <div
          className="hp-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh minh chứng feedback"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            className="hp-lightbox__close"
            onClick={() => setPreviewImage(null)}
            aria-label="Đóng ảnh"
          >
            ×
          </button>
          <div
            className="hp-lightbox__frame"
            onClick={(e) => e.stopPropagation()}
          >
            <ImageWithFallback
              src={previewImage.src}
              alt={previewImage.alt}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      )}

      {/* ═══ STORY ═══ */}
      <section className="hp-section hp-story">
        <div className="container hp-story__grid">
          <div className="hp-story__photos">
            <div className="hp-story__photo hp-story__photo--tall">
              <img src={heroImage} alt="Quà tặng Soligant" />
            </div>
            <div className="hp-story__col">
              <div className="hp-story__photo">
                <img src={moodImage} alt="Quà tặng Soligant" />
              </div>
              <div className="hp-story__photo">
                <img src={detailImage} alt="Quà tặng Soligant" />
              </div>
            </div>
          </div>
          <div className="hp-story__copy">
            <p className="hp-eyebrow">Triết lý thương hiệu</p>
            <h2 className="hp-section__title hp-section__title--left">
              QUÀ TẶNG
              <br />
              MANG DẤU ẤN
            </h2>
            <p>
              Những điều tưởng chừng nhỏ bé lại làm nên hạnh phúc lớn — và{" "}
              <strong>Soligant</strong> tin rằng hạnh phúc thật sự nằm trong
              những khoảnh khắc giản dị ấy.
            </p>
            <p>
              Dù là ngày sinh nhật, ngày tốt nghiệp, hay chỉ đơn giản là một lần
              muốn nói <em>"Dear You"</em> — chúng tôi luôn hiện diện.
            </p>
            <div className="hp-story__links">
              <Link to="/ve-chung-toi" className="hp-text-link">
                Về chúng tôi <FiArrowRight size={14} />
              </Link>
              <Link to="/tra-cuu-don-hang" className="hp-text-link">
                Tra cứu đơn hàng <FiArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CONTACT ═══ */}
      <section className="hp-section hp-contact">
        <div className="container">
          <div className="hp-contact__wrap">
            <div className="hp-contact__info">
              <p className="hp-eyebrow">Liên hệ ngay</p>
              <p className="hp-contact__desc">
                Để lại thông tin, đội ngũ Soligant sẽ liên hệ tư vấn trong thời
                gian sớm nhất.
              </p>
              <div className="hp-contact__detail">
                <span>0989 804 006</span>
                <span>soligant.gifts@gmail.com</span>
                <span>Online tại Hà Nội</span>
              </div>
            </div>
            <form className="hp-contact__form" onSubmit={handleSubmit}>
              {sent && (
                <p className="hp-contact__success">
                  Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm nhất.
                </p>
              )}
              <label className="hp-contact__label">
                Họ và tên
                <input
                  className="hp-contact__input"
                  type="text"
                  placeholder="Nhập họ và tên"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <label className="hp-contact__label">
                Số điện thoại
                <input
                  className="hp-contact__input"
                  type="tel"
                  placeholder="Nhập số điện thoại"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </label>
              <button
                type="submit"
                className="hp-btn hp-btn--primary"
                style={{ width: "100%", justifyContent: "center" }}
              >
                Gửi thông tin
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
