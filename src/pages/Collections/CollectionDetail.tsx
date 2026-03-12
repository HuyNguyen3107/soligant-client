import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Link, useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiGrid, FiStar, FiTag } from "react-icons/fi";
import { PageBreadcrumb, SEO } from "../../components/common";
import { getErrorMessage } from "../../lib/error";
import { getStaticAssetUrl } from "../../lib/http";
import { getPublicCollectionProducts } from "../../services/collections.service";
import "./CollectionDetail.css";

const CollectionDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const selectedCategory =
    selectedCategoryId === "all" ? undefined : selectedCategoryId;

  const {
    data: payload,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["public-collection-products", slug, selectedCategory],
    queryFn: () =>
      getPublicCollectionProducts(slug as string, selectedCategory),
    enabled: Boolean(slug),
    retry: false,
  });

  const collection = payload?.collection;
  const categories = useMemo(() => payload?.categories ?? [], [payload?.categories]);
  const products = useMemo(() => payload?.products ?? [], [payload?.products]);

  const totalProductsInCollection = useMemo(
    () => categories.reduce((sum, category) => sum + category.productCount, 0),
    [categories],
  );

  const activeCategoryName = useMemo(
    () => categories.find((item) => item.id === selectedCategoryId)?.name,
    [categories, selectedCategoryId],
  );

  useEffect(() => {
    if (!slug) {
      navigate("/bo-suu-tap", { replace: true });
      return;
    }

    if (isAxiosError(error) && error.response?.status === 404) {
      navigate("/bo-suu-tap", { replace: true });
    }
  }, [slug, error, navigate]);

  const errorMessage = isError
    ? getErrorMessage(error, "Có lỗi xảy ra khi tải dữ liệu.")
    : null;

  if (isLoading || !slug) {
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

  if (errorMessage || !collection) {
    return (
      <div className="cd-page">
        <div className="cd-error container">
          <FiGrid size={48} />
          <h2>Không tìm thấy bộ sưu tập</h2>
          <p>{errorMessage ?? "Bộ sưu tập này không tồn tại hoặc đã bị ẩn."}</p>
          <Link to="/bo-suu-tap" className="cd-btn-back">
            <FiArrowLeft size={16} /> Về danh sách bộ sưu tập
          </Link>
        </div>
      </div>
    );
  }

  const thumbUrl = getStaticAssetUrl(collection.thumbnail);

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
            <PageBreadcrumb
              tone="dark"
              className="cd-hero__breadcrumb"
              items={[
                { label: "Trang chủ", to: "/" },
                { label: "Bộ sưu tập", to: "/bo-suu-tap" },
                { label: collection.name },
              ]}
            />
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

          {/* Products */}
          <div className="cd-products">
            <h2 className="cd-products__title">Sản phẩm trong bộ sưu tập</h2>

            <div className="cd-products__toolbar">
              <p className="cd-products__count">
                Hiển thị <strong>{products.length}</strong>
                {activeCategoryName
                  ? ` sản phẩm thuộc danh mục ${activeCategoryName}`
                  : " sản phẩm"}
              </p>

              <div className="cd-products__filters">
                <button
                  className={`cd-products__filter${selectedCategoryId === "all" ? " is-active" : ""}`}
                  onClick={() => setSelectedCategoryId("all")}
                >
                  Tất cả ({totalProductsInCollection || products.length})
                </button>

                {categories.map((category) => (
                  <button
                    key={category.id}
                    className={`cd-products__filter${selectedCategoryId === category.id ? " is-active" : ""}`}
                    onClick={() => setSelectedCategoryId(category.id)}
                  >
                    {category.name} ({category.productCount})
                  </button>
                ))}
              </div>
            </div>

            {products.length === 0 ? (
              <div className="cd-products__empty">
                <FiGrid size={40} />
                <p>
                  {activeCategoryName
                    ? "Danh mục này chưa có sản phẩm trong bộ sưu tập."
                    : "Bộ sưu tập này chưa có sản phẩm hiển thị."}
                </p>
              </div>
            ) : (
              <div className="cd-products__grid">
                {products.map((product) => {
                  const productImage = getStaticAssetUrl(product.image);
                  const customPath = `/bo-suu-tap/${slug}/san-pham/${product.id}/custom`;

                  return (
                    <Link
                      key={product.id}
                      to={customPath}
                      className="cd-product-card-link"
                      aria-label={`Tuỳ chỉnh biến thể ${product.name}`}
                    >
                      <article className="cd-product-card">
                        <div className="cd-product-card__thumb">
                          {productImage ? (
                            <img src={productImage} alt={product.name} />
                          ) : (
                            <div className="cd-product-card__placeholder">
                              <FiGrid size={28} />
                            </div>
                          )}
                        </div>

                        <div className="cd-product-card__body">
                          <span className="cd-product-card__category">
                            <FiTag size={12} />
                            {product.categoryName || "Chưa phân loại"}
                          </span>

                          <h3 className="cd-product-card__name">{product.name}</h3>

                          <p className="cd-product-card__desc">
                            {product.description || "Sản phẩm chưa có mô tả."}
                          </p>

                          <ul className="cd-product-card__meta">
                            <li>Kích thước: {product.size}</li>
                            <li>
                              Số lượng Lego: {product.legoQuantity.toLocaleString("vi-VN")}
                            </li>
                          </ul>

                          <p className="cd-product-card__price">
                            {product.price.toLocaleString("vi-VN")} đ
                          </p>

                          <span className="cd-product-card__cta">Tuỳ chỉnh biến thể</span>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default CollectionDetail;
