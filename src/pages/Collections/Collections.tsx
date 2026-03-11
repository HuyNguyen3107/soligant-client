import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiGrid, FiArrowRight } from "react-icons/fi";
import { SEO } from "../../components/common";
import "./Collections.css";

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
}

const Collections = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await fetch(`${API_URL}/public/collections`);
        if (!res.ok) throw new Error("Không thể tải bộ sưu tập.");
        const data: Collection[] = await res.json();
        setCollections(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Có lỗi xảy ra khi tải dữ liệu.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchCollections();
  }, []);

  const getThumbnailUrl = (thumbnail: string) => {
    if (!thumbnail) return null;
    if (thumbnail.startsWith("http")) return thumbnail;
    return `${SERVER_ORIGIN}/${thumbnail.replace(/^\/+/, "")}`;
  };

  return (
    <>
      <SEO
        title="Bộ sưu tập"
        description="Khám phá các bộ sưu tập quà tặng độc đáo của Soligant. Những món quà được tuyển chọn kỹ lưỡng cho mọi dịp đặc biệt."
        keywords="bộ sưu tập, quà tặng, Soligant, quà tặng độc đáo"
      />

      {/* Hero banner */}
      <section className="col-hero">
        <div className="col-hero__content container">
          <p className="col-hero__eyebrow">Danh mục sản phẩm</p>
          <h1 className="col-hero__title">Bộ Sưu Tập</h1>
          <p className="col-hero__desc">
            Khám phá những bộ sưu tập quà tặng tinh tế, được tuyển chọn kỹ lưỡng
            để mang đến niềm vui cho mọi dịp đặc biệt.
          </p>
        </div>
      </section>

      {/* Collections grid */}
      <section className="col-section">
        <div className="container col-section__container">
          {loading && (
            <div className="col-loading">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="col-skeleton" />
              ))}
            </div>
          )}

          {error && (
            <div className="col-error">
              <FiGrid size={40} />
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && collections.length === 0 && (
            <div className="col-empty">
              <FiGrid size={48} />
              <h3>Chưa có bộ sưu tập nào</h3>
              <p>Hãy quay lại sau nhé!</p>
            </div>
          )}

          {!loading && !error && collections.length > 0 && (
            <div className="col-grid">
              {collections.map((col) => {
                const thumbUrl = getThumbnailUrl(col.thumbnail);
                return (
                  <Link
                    key={col._id}
                    to={`/bo-suu-tap/${col.slug}`}
                    className={`col-card${col.isFeatured ? " col-card--featured" : ""}`}
                  >
                    <div className="col-card__thumb">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={col.name}
                          className="col-card__img"
                        />
                      ) : (
                        <div className="col-card__placeholder">
                          <FiGrid size={36} />
                        </div>
                      )}
                      {col.isFeatured && (
                        <span className="col-card__badge">Nổi bật</span>
                      )}
                    </div>
                    <div className="col-card__body">
                      <h3 className="col-card__name">{col.name}</h3>
                      {col.description && (
                        <p className="col-card__desc">{col.description}</p>
                      )}
                      <span className="col-card__link">
                        Xem sản phẩm <FiArrowRight size={14} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Collections;
