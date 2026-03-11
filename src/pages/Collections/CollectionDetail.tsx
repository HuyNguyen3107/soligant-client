import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiGrid, FiStar } from "react-icons/fi";
import { SEO } from "../../components/common";
import "./CollectionDetail.css";

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const SERVER_ORIGIN = (() => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return API_URL;
  }
})();

interface Collection {
  _id: string;
  name: string;
  slug: string;
  description: string;
  thumbnail: string;
  isActive: boolean;
  isFeatured: boolean;
  createdAt?: string;
}

const getThumbnailUrl = (thumbnail: string) => {
  if (!thumbnail) return null;
  if (thumbnail.startsWith("http")) return thumbnail;
  return `${SERVER_ORIGIN}/${thumbnail.replace(/^\/+/, "")}`;
};

const CollectionDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const fetchCollection = async () => {
      try {
        const res = await fetch(`${API_URL}/public/collections/${slug}`);
        if (res.status === 404) {
          navigate("/bo-suu-tap", { replace: true });
          return;
        }
        if (!res.ok) throw new Error("Không thể tải bộ sưu tập.");
        const data: Collection = await res.json();
        setCollection(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Có lỗi xảy ra khi tải dữ liệu.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchCollection();
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="cd-page">
        <div className="cd-loading container">
          <div className="cd-skeleton cd-skeleton--hero" />
          <div className="cd-skeleton cd-skeleton--title" />
          <div className="cd-skeleton cd-skeleton--desc" />
          <div className="cd-skeleton cd-skeleton--desc cd-skeleton--short" />
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="cd-page">
        <div className="cd-error container">
          <FiGrid size={48} />
          <h2>Không tìm thấy bộ sưu tập</h2>
          <p>{error ?? "Bộ sưu tập này không tồn tại hoặc đã bị ẩn."}</p>
          <Link to="/bo-suu-tap" className="cd-btn-back">
            <FiArrowLeft size={16} /> Về danh sách bộ sưu tập
          </Link>
        </div>
      </div>
    );
  }

  const thumbUrl = getThumbnailUrl(collection.thumbnail);

  return (
    <>
      <SEO
        title={collection.name}
        description={
          collection.description ||
          `Khám phá bộ sưu tập ${collection.name} tại Soligant.`
        }
        keywords={`${collection.name}, bộ sưu tập, quà tặng, Soligant`}
      />

      <div className="cd-page">
        {/* Hero */}
        <section className="cd-hero">
          {thumbUrl && (
            <div
              className="cd-hero__bg"
              style={{ backgroundImage: `url(${thumbUrl})` }}
            />
          )}
          <div className="cd-hero__overlay" />
          <div className="cd-hero__content container">
            <Link to="/bo-suu-tap" className="cd-breadcrumb">
              <FiArrowLeft size={16} />
              <span>Bộ sưu tập</span>
            </Link>
            <div className="cd-hero__meta">
              {collection.isFeatured && (
                <span className="cd-badge">
                  <FiStar size={12} /> Nổi bật
                </span>
              )}
            </div>
            <h1 className="cd-hero__title">{collection.name}</h1>
            {collection.description && (
              <p className="cd-hero__desc">{collection.description}</p>
            )}
          </div>
        </section>

        {/* Main content */}
        <section className="cd-body container">
          <div className="cd-info-card">
            {thumbUrl && (
              <div className="cd-info-card__img-wrap">
                <img
                  src={thumbUrl}
                  alt={collection.name}
                  className="cd-info-card__img"
                />
              </div>
            )}
            <div className="cd-info-card__text">
              <h2 className="cd-info-card__name">{collection.name}</h2>
              {collection.isFeatured && (
                <span className="cd-badge cd-badge--sm">
                  <FiStar size={11} /> Bộ sưu tập nổi bật
                </span>
              )}
              {collection.description ? (
                <p className="cd-info-card__desc">{collection.description}</p>
              ) : (
                <p className="cd-info-card__desc cd-info-card__desc--muted">
                  Bộ sưu tập này chưa có mô tả.
                </p>
              )}
              <Link to="/bo-suu-tap" className="cd-btn-outline">
                <FiArrowLeft size={15} /> Xem tất cả bộ sưu tập
              </Link>
            </div>
          </div>

          {/* Products placeholder */}
          <div className="cd-products">
            <h2 className="cd-products__title">Sản phẩm trong bộ sưu tập</h2>
            <div className="cd-products__empty">
              <FiGrid size={40} />
              <p>Sản phẩm đang được cập nhật. Hãy quay lại sau nhé!</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default CollectionDetail;
