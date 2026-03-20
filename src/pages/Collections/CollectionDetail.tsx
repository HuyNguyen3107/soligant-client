import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Link, useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiGrid, FiStar, FiTag } from "react-icons/fi";
import {
  ImageWithFallback,
  PageBreadcrumb,
  RichTextContent,
  SEO,
} from "../../components/common";
import { getErrorMessage } from "../../lib/error";
import { getStaticAssetUrl } from "../../lib/http";
import { toRichTextPlainText } from "../../lib/rich-text";
import {
  getPublicCollectionProducts,
  getPublicBearCollectionProducts,
  type CollectionProduct,
  type BearCollectionProduct,
} from "../../services/collections.service";
import "./CollectionDetail.css";

type AnyProduct = (CollectionProduct & { productType: "lego" }) | BearCollectionProduct;

export const CollectionDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const selectedCategory =
    selectedCategoryId === "all" ? undefined : selectedCategoryId;

  const {
    data: legoPayload,
    isLoading: isLegoLoading,
    isError: isLegoError,
    error: legoError,
  } = useQuery({
    queryKey: ["public-collection-products", slug, selectedCategory],
    queryFn: () =>
      getPublicCollectionProducts(slug as string, selectedCategory),
    enabled: Boolean(slug),
    retry: false,
  });

  const {
    data: bearPayload,
    isLoading: isBearLoading,
  } = useQuery({
    queryKey: ["public-bear-collection-products", slug, selectedCategory],
    queryFn: () =>
      getPublicBearCollectionProducts(slug as string, selectedCategory),
    enabled: Boolean(slug),
    retry: false,
  });

  const payload = legoPayload;
  const collection = payload?.collection;

  // Merge LEGO and bear categories
  const categories = useMemo(() => {
    const legoCategories = legoPayload?.categories ?? [];
    const bearCategories = bearPayload?.categories ?? [];
    const categoryMap = new Map(legoCategories.map((c) => [c.id, { ...c }]));

    bearCategories.forEach((bc) => {
      if (categoryMap.has(bc.id)) {
        categoryMap.get(bc.id)!.productCount += bc.productCount;
      } else {
        categoryMap.set(bc.id, { ...bc });
      }
    });

    return Array.from(categoryMap.values());
  }, [legoPayload?.categories, bearPayload?.categories]);

  // Merge LEGO and bear products into a single list
  const products = useMemo((): AnyProduct[] => {
    const legoProducts = (legoPayload?.products ?? []).map(
      (p): AnyProduct => ({ ...p, productType: "lego" as const }),
    );
    const bearProducts = (bearPayload?.products ?? []) as AnyProduct[];

    // Filter by selected category
    const filter = (p: AnyProduct) =>
      !selectedCategory || p.categoryId === selectedCategory;

    return [...legoProducts.filter(filter), ...bearProducts.filter(filter)];
  }, [legoPayload?.products, bearPayload?.products, selectedCategory]);

  const totalProductsInCollection = useMemo(
    () => categories.reduce((sum, category) => sum + category.productCount, 0),
    [categories],
  );

  const activeCategoryName = useMemo(
    () => categories.find((item) => item.id === selectedCategoryId)?.name,
    [categories, selectedCategoryId],
  );

  const isLoading = isLegoLoading || isBearLoading;
  const error = legoError;
  const isError = isLegoError;

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
          toRichTextPlainText(collection.description) ||
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
              <RichTextContent value={collection.description} className="cd-hero__desc" />
            )}
          </div>
        </section>

        {/* Main content */}
        <section className="cd-body container">
          <div className="cd-info-card">
            {thumbUrl && (
              <div className="cd-info-card__img-wrap">
                <ImageWithFallback
                  src={thumbUrl}
                  alt={collection.name}
                  className="cd-info-card__img"
                  fallback={
                    <div className="cd-info-card__placeholder">
                      <FiGrid size={28} />
                    </div>
                  }
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
                <RichTextContent value={collection.description} className="cd-info-card__desc" />
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
                  const isBear = product.productType === "bear";
                  const customPath = isBear
                    ? `/bo-suu-tap/${slug}/san-pham/${product.id}/tuy-chinh-gau`
                    : `/bo-suu-tap/${slug}/san-pham/${product.id}/custom`;

                  return (
                    <Link
                      key={product.id}
                      to={customPath}
                      className="cd-product-card-link"
                      aria-label={`Tùy chỉnh ${product.name}`}
                    >
                      <article className="cd-product-card">
                        <div className="cd-product-card__thumb">
                          <ImageWithFallback
                            src={productImage}
                            alt={product.name}
                            className="cd-product-card__image"
                            fallback={
                              <div className="cd-product-card__placeholder">
                                <FiGrid size={28} />
                              </div>
                            }
                          />
                        </div>

                        <div className="cd-product-card__body">
                          <span className="cd-product-card__category">
                            <FiTag size={12} />
                            {product.categoryName || "Chưa phân loại"}
                          </span>

                          <h3 className="cd-product-card__name">{product.name}</h3>

                          {product.description ? (
                            <RichTextContent
                              value={product.description}
                              className="cd-product-card__desc"
                            />
                          ) : (
                            <p className="cd-product-card__desc">Sản phẩm chưa có mô tả.</p>
                          )}

                          <ul className="cd-product-card__meta">
                            {isBear ? (
                              <>
                                <li>Loại: Gấu nhồi bông</li>
                                <li>Số Gấu: {(product as BearCollectionProduct).bearQuantity.toLocaleString("vi-VN")}</li>
                              </>
                            ) : (
                              <>
                                <li>Kích thước: {(product as CollectionProduct).size}</li>
                                <li>Số lượng Lego: {(product as CollectionProduct).legoQuantity.toLocaleString("vi-VN")}</li>
                              </>
                            )}
                          </ul>

                          <p className="cd-product-card__price">
                            {product.price.toLocaleString("vi-VN")} đ
                          </p>

                          <span className="cd-product-card__cta">Tùy chỉnh ngay</span>
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
