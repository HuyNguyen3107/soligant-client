import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FiGrid, FiArrowRight } from "react-icons/fi";
import { PageBreadcrumb, RichTextContent, SEO } from "../../components/common";
import { getErrorMessage } from "../../lib/error";
import { getStaticAssetUrl } from "../../lib/http";
import { getPublicCollections } from "../../services/collections.service";
import "./Collections.css";

const Collections = () => {
  const {
    data: collections = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["public-collections"],
    queryFn: getPublicCollections,
  });

  const errorMessage = isError
    ? getErrorMessage(error, "Không thể tải bộ sưu tập.")
    : null;

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
          <PageBreadcrumb
            tone="dark"
            className="col-hero__breadcrumb"
            items={[
              { label: "Trang chủ", to: "/" },
              { label: "Bộ sưu tập" },
            ]}
          />
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
          {isLoading && (
            <div className="col-loading">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="col-skeleton" />
              ))}
            </div>
          )}

          {errorMessage && (
            <div className="col-error">
              <FiGrid size={40} />
              <p>{errorMessage}</p>
            </div>
          )}

          {!isLoading && !errorMessage && collections.length === 0 && (
            <div className="col-empty">
              <FiGrid size={48} />
              <h3>Chưa có bộ sưu tập nào</h3>
              <p>Hãy quay lại sau nhé!</p>
            </div>
          )}

          {!isLoading && !errorMessage && collections.length > 0 && (
            <div className="col-grid">
              {collections.map((col) => {
                const thumbUrl = getStaticAssetUrl(col.thumbnail);
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
                        <RichTextContent value={col.description} className="col-card__desc" />
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
