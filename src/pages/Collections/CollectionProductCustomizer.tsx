import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheck,
  FiGrid,
  FiTag,
} from "react-icons/fi";
import {
  ImageWithFallback,
  PageBreadcrumb,
  RichTextContent,
  SEO,
} from "../../components/common";
import type {
  CustomizerNavigationState,
  LegoSelections,
} from "../../lib/custom-cart";
import { getErrorMessage } from "../../lib/error";
import { getStaticAssetUrl } from "../../lib/http";
import { isRichTextEmpty } from "../../lib/rich-text";
import { getPublicCollectionProducts } from "../../services/collections.service";
import type { CollectionProduct } from "../../services/collections.service";
import {
  getPublicLegoCustomizations,
  type PublicLegoCustomizationGroup,
} from "../../services/lego-customizations.service";
import "./CollectionProductCustomizer.css";

const createEmptySelections = (slotCount: number): LegoSelections => {
  const nextSelections: LegoSelections = {};

  for (let slotIndex = 1; slotIndex <= slotCount; slotIndex += 1) {
    nextSelections[String(slotIndex)] = {};
  }

  return nextSelections;
};

const findOptionById = (
  group: PublicLegoCustomizationGroup,
  optionId?: string,
) => group.options.find((option) => option.id === optionId);

const normalizeColorCode = (value: string) => {
  const normalized = value.trim();
  const pureHex = normalized.replace(/^#/, "");

  if (!/^[0-9a-fA-F]{6}$/.test(pureHex)) {
    return "#D1D5DB";
  }

  return `#${pureHex.toUpperCase()}`;
};

const formatAddonPrice = (price: number) => {
  if (price <= 0) {
    return "Miễn phí";
  }

  return `${price.toLocaleString("vi-VN")} đ`;
};

const normalizePrice = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.floor(value);
};

const countSelectedGroups = (
  slotSelections: Record<string, string>,
  customGroups: PublicLegoCustomizationGroup[],
) =>
  customGroups.reduce(
    (count, group) => (slotSelections[group.id] ? count + 1 : count),
    0,
  );

interface CollectionProductCustomizerContentProps {
  slug: string;
  collectionName: string;
  product: CollectionProduct;
  customGroups: PublicLegoCustomizationGroup[];
}

const CollectionProductCustomizerContent = ({
  slug,
  collectionName,
  product,
  customGroups,
}: CollectionProductCustomizerContentProps) => {
  const navigate = useNavigate();

  const baseLegoCount = useMemo(() => {
    const rawQuantity = Number(product.legoQuantity ?? 1);

    if (!Number.isFinite(rawQuantity) || rawQuantity <= 0) {
      return 1;
    }

    return Math.floor(rawQuantity);
  }, [product.legoQuantity]);

  const additionalLegoMin = useMemo(() => {
    if (!product.allowVariableLegoCount) {
      return 0;
    }
    const min = Number(product.legoCountMin ?? 0);
    return Number.isFinite(min) && min >= 0 ? Math.floor(min) : 0;
  }, [product.allowVariableLegoCount, product.legoCountMin]);

  const additionalLegoMax = useMemo(() => {
    if (!product.allowVariableLegoCount) {
      return 0;
    }
    const max = Number(product.legoCountMax ?? 0);
    if (!Number.isFinite(max) || max < 0) {
      return additionalLegoMin;
    }
    return Math.max(Math.floor(max), additionalLegoMin);
  }, [additionalLegoMin, product.allowVariableLegoCount, product.legoCountMax]);

  const additionalLegoUnitPrice = useMemo(() => {
    if (!product.allowVariableLegoCount) {
      return 0;
    }

    const value = Number(product.additionalLegoPrice ?? 0);
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  }, [product.additionalLegoPrice, product.allowVariableLegoCount]);

  const customGroupCount = customGroups.length;
  const [activeLegoIndex, setActiveLegoIndex] = useState<number>(1);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedAdditionalLegoCount, setSelectedAdditionalLegoCount] = useState<number>(
    additionalLegoMin,
  );
  const totalLegoCount = baseLegoCount + selectedAdditionalLegoCount;
  const [legoSelections, setLegoSelections] = useState<LegoSelections>(() =>
    createEmptySelections(baseLegoCount + additionalLegoMin),
  );

  useEffect(() => {
    setSelectedAdditionalLegoCount(additionalLegoMin);
  }, [additionalLegoMin, product.id]);

  useEffect(() => {
    setLegoSelections((prev) => {
      const newSelections: LegoSelections = {};

      for (let slotIndex = 1; slotIndex <= totalLegoCount; slotIndex += 1) {
        newSelections[String(slotIndex)] = prev[String(slotIndex)] ?? {};
      }

      return newSelections;
    });
  }, [totalLegoCount]);

  useEffect(() => {
    if (activeLegoIndex > totalLegoCount) {
      setActiveLegoIndex(totalLegoCount);
    }
  }, [activeLegoIndex, totalLegoCount]);

  const activeGroupId = useMemo(() => {
    if (customGroups.length === 0) {
      return "";
    }

    return customGroups.some((group) => group.id === selectedGroupId)
      ? selectedGroupId
      : customGroups[0].id;
  }, [customGroups, selectedGroupId]);

  const legoSlots = useMemo(
    () => Array.from({ length: totalLegoCount }, (_, index) => index + 1),
    [totalLegoCount],
  );

  const activeGroup = useMemo(
    () => customGroups.find((group) => group.id === activeGroupId) ?? customGroups[0] ?? null,
    [activeGroupId, customGroups],
  );

  const activeSelections = legoSelections[String(activeLegoIndex)] ?? {};
  const activeOptionId = activeGroup ? activeSelections[activeGroup.id] : undefined;
  const activeOption = activeGroup ? findOptionById(activeGroup, activeOptionId) : undefined;

  const baseVariantPrice = useMemo(
    () => normalizePrice(Number(product.price ?? 0)),
    [product.price],
  );

  const selectedAddonPrice = useMemo(() => {
    let total = 0;

    Object.values(legoSelections).forEach((slotSelections) => {
      customGroups.forEach((group) => {
        const selectedOption = findOptionById(group, slotSelections[group.id]);
        total += normalizePrice(Number(selectedOption?.price ?? 0));
      });
    });

    return total;
  }, [customGroups, legoSelections]);

  const customizedLegoCount = useMemo(
    () =>
      Object.values(legoSelections).filter(
        (slotSelections) => countSelectedGroups(slotSelections, customGroups) > 0,
      ).length,
    [customGroups, legoSelections],
  );

  const pricingSummary = useMemo(() => {
    const extraLegoPrice = normalizePrice(
      selectedAdditionalLegoCount * additionalLegoUnitPrice,
    );
    const customizationPrice = normalizePrice(selectedAddonPrice);
    const total = baseVariantPrice + extraLegoPrice + customizationPrice;

    return {
      baseVariantPrice,
      extraLegoPrice,
      customizationPrice,
      total,
    };
  }, [
    additionalLegoUnitPrice,
    baseVariantPrice,
    selectedAdditionalLegoCount,
    selectedAddonPrice,
  ]);

  const handleSelectOption = (groupId: string, optionId: string) => {
    const group = customGroups.find((candidate) => candidate.id === groupId);
    const option = group?.options.find((candidate) => candidate.id === optionId);

    if (!option || Number(option.stockQuantity ?? 0) <= 0) {
      return;
    }

    setLegoSelections((prev) => ({
      ...prev,
      [String(activeLegoIndex)]: {
        ...prev[String(activeLegoIndex)],
        [groupId]: optionId,
      },
    }));
  };

  const handleClearActiveGroup = () => {
    if (!activeGroup) {
      return;
    }

    setLegoSelections((prev) => {
      const currentSlotSelections = prev[String(activeLegoIndex)] ?? {};

      if (!currentSlotSelections[activeGroup.id]) {
        return prev;
      }

      const nextSlotSelections = { ...currentSlotSelections };
      delete nextSlotSelections[activeGroup.id];

      return {
        ...prev,
        [String(activeLegoIndex)]: nextSlotSelections,
      };
    });
  };

  const productImage = getStaticAssetUrl(product.image);

  return (
    <div className="cpc-page">
      <div className="container">
        <PageBreadcrumb
          className="cpc-page__breadcrumb"
          items={[
            { label: "Trang chủ", to: "/" },
            { label: "Bộ sưu tập", to: "/bo-suu-tap" },
            { label: collectionName, to: `/bo-suu-tap/${slug}` },
            { label: product.name },
            { label: "Tùy chỉnh" },
          ]}
        />
      </div>

      <div className="container cpc-layout">
        <aside className="cpc-sidebar">
          <div className="cpc-product-card">
            <div className="cpc-product-card__thumb">
              <ImageWithFallback
                src={productImage}
                alt={product.name}
                fallback={
                <div className="cpc-product-card__placeholder">
                  <FiGrid size={30} />
                </div>
                }
              />
            </div>
            <div className="cpc-product-card__body">
              <span className="cpc-product-card__category">
                <FiTag size={12} />
                {product.categoryName || "Chưa phân loại"}
              </span>
              <h1 className="cpc-product-card__name">{product.name}</h1>
              {isRichTextEmpty(product.description) ? (
                <p className="cpc-product-card__desc">Sản phẩm chưa có mô tả.</p>
              ) : (
                <RichTextContent value={product.description} className="cpc-product-card__desc" />
              )}
              <ul className="cpc-product-card__meta">
                <li>Kích thước: {product.size}</li>
                <li>Số Lego cố định: {baseLegoCount.toLocaleString("vi-VN")}</li>
                {product.allowVariableLegoCount ? (
                  <li>
                    Có thể chọn thêm: {additionalLegoMin.toLocaleString("vi-VN")} - {additionalLegoMax.toLocaleString("vi-VN")} Lego
                  </li>
                ) : null}
                {product.allowVariableLegoCount ? (
                  <li>Giá mỗi Lego thêm: {formatAddonPrice(additionalLegoUnitPrice)}</li>
                ) : null}
              </ul>
            </div>
          </div>

          <div className="cpc-summary">
            <h2 className="cpc-summary__title">Thông tin tùy chỉnh và giá</h2>
            {product.allowVariableLegoCount ? (
              <p className="cpc-summary__desc">
                Sản phẩm này có sẵn <strong>{baseLegoCount}</strong> Lego cố định.
                Bạn có thể chọn thêm từ <strong>{additionalLegoMin}</strong> đến <strong>{additionalLegoMax}</strong> Lego,
                tức tổng số Lego cần tùy chỉnh sẽ từ <strong>{baseLegoCount + additionalLegoMin}</strong> đến <strong>{baseLegoCount + additionalLegoMax}</strong>.
                Mỗi Lego thêm được tính <strong>{formatAddonPrice(additionalLegoUnitPrice)}</strong>.
              </p>
            ) : (
              <p className="cpc-summary__desc">
                Khung tranh này có <strong>{baseLegoCount}</strong> Lego cố định cần tùy chỉnh.
                Gán lựa chọn từ các nhóm tùy chỉnh đã cấu hình.
              </p>
            )}

            {product.allowVariableLegoCount && (
              <div className="cpc-summary__lego-count-selector">
                <label className="cpc-summary__lego-count-label">
                  Chọn thêm số Lego: <strong>{selectedAdditionalLegoCount}</strong>
                </label>
                <input
                  className="cpc-summary__lego-count-slider"
                  type="range"
                  min={additionalLegoMin}
                  max={additionalLegoMax}
                  value={selectedAdditionalLegoCount}
                  onChange={(e) => setSelectedAdditionalLegoCount(Number(e.target.value))}
                />
                <div className="cpc-summary__lego-count-range">
                  <span>{additionalLegoMin}</span>
                  <span>{additionalLegoMax}</span>
                </div>
                <p className="cpc-summary__desc">
                  Tổng số Lego đang tùy chỉnh: <strong>{totalLegoCount}</strong>
                </p>
                <p className="cpc-summary__desc">
                  Chi phí Lego thêm: <strong>{formatAddonPrice(pricingSummary.extraLegoPrice)}</strong>
                </p>
              </div>
            )}

            <div className="cpc-summary__pricing">
              <div className="cpc-summary__pricing-row">
                <span>Giá sản phẩm</span>
                <strong>{pricingSummary.baseVariantPrice.toLocaleString("vi-VN")} đ</strong>
              </div>
              {product.allowVariableLegoCount && (
                <div className="cpc-summary__pricing-row">
                  <span>Giá Lego thêm</span>
                  <strong>{formatAddonPrice(pricingSummary.extraLegoPrice)}</strong>
                </div>
              )}
              <div className="cpc-summary__pricing-row">
                <span>Giá tùy chỉnh</span>
                <strong>{formatAddonPrice(pricingSummary.customizationPrice)}</strong>
              </div>
              <div className="cpc-summary__total">
                <span>Tạm tính</span>
                <strong>{pricingSummary.total.toLocaleString("vi-VN")} đ</strong>
              </div>
            </div>

            <div className="cpc-summary__characters">
              {legoSlots.map((slotIndex) => {
                const slotSelections = legoSelections[String(slotIndex)] ?? {};
                const selectedLabels = customGroups.reduce<string[]>((labels, group) => {
                  const selectedOption = findOptionById(group, slotSelections[group.id]);

                  if (selectedOption) {
                    labels.push(`${group.name}: ${selectedOption.name}`);
                  }

                  return labels;
                }, []);

                return (
                  <article
                    key={slotIndex}
                    className={`cpc-character${customGroupCount > 0 && selectedLabels.length === customGroupCount ? " is-complete" : ""}`}
                  >
                    <div className="cpc-character__header">
                      <div>
                        <strong>Lego {slotIndex}</strong>
                        <span>
                          {selectedLabels.length}/{customGroupCount} nhóm đã chọn
                        </span>
                      </div>
                      {customGroupCount > 0 && selectedLabels.length === customGroupCount && (
                        <FiCheck size={16} />
                      )}
                    </div>

                    {selectedLabels.length > 0 ? (
                      <div className="cpc-character__tags">
                        {selectedLabels.map((label) => (
                          <span key={label} className="cpc-character__tag">
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="cpc-character__empty">Chưa chọn chi tiết nào.</p>
                    )}
                  </article>
                );
              })}
            </div>

            <button
              type="button"
              className="cpc-summary__cta"
              onClick={() => {
                const navigationState: CustomizerNavigationState = {
                  legoSelections,
                  pricingSummary,
                  selectedAdditionalLegoCount,
                  totalLegoCount,
                };

                navigate(`/bo-suu-tap/${slug}/san-pham/${product.id}/chon-nen`, {
                  state: navigationState,
                });
              }}
            >
              Tiếp theo: Chọn nền
            </button>

            <p className="cpc-summary__note">
              Đội ngũ Soligant sẽ đối chiếu lại từng lựa chọn tùy chỉnh trước khi sản xuất.
            </p>
          </div>
        </aside>

        <section className="cpc-editor">
          <header className="cpc-editor__header">
            <p className="cpc-editor__eyebrow">Trang tùy chỉnh sản phẩm</p>
            <h2 className="cpc-editor__title">Chọn từng Lego rồi tùy chỉnh chi tiết cho Lego đó</h2>
            <p className="cpc-editor__desc">
              Số Lego sẽ được tạo từ phần cố định của sản phẩm và phần Lego chọn thêm,
              nếu sản phẩm đó cho phép. Bấm vào từng Lego để mở danh sách tùy chỉnh bên dưới.
            </p>
          </header>

          <div className="cpc-slot-section">
            <div className="cpc-slot-section__head">
              <div>
                <h3>Danh sách Lego cần tùy chỉnh</h3>
                <p>
                  Tổng cộng đang có <strong>{totalLegoCount}</strong> Lego cần tùy chỉnh. Đã bắt đầu tùy chỉnh cho
                  <strong> {customizedLegoCount}</strong> Lego.
                </p>
              </div>
            </div>

            <div className="cpc-slot-list">
              {legoSlots.map((slotIndex) => {
                const slotSelections = legoSelections[String(slotIndex)] ?? {};
                const selectionCount = countSelectedGroups(slotSelections, customGroups);

                return (
                  <button
                    key={slotIndex}
                    type="button"
                    className={`cpc-slot${activeLegoIndex === slotIndex ? " is-active" : ""}${customGroupCount > 0 && selectionCount === customGroupCount ? " is-complete" : ""}`}
                    onClick={() => setActiveLegoIndex(slotIndex)}
                  >
                    <span className="cpc-slot__label">Lego {slotIndex}</span>
                    <span className="cpc-slot__meta">
                      {selectionCount > 0
                        ? `${selectionCount}/${customGroupCount} nhóm đã chọn`
                        : "Chưa tùy chỉnh"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="cpc-customizer">
            <article className="cpc-panel cpc-panel--workspace">
              <div className="cpc-panel__header">
                <div>
                  <h3>Đang tùy chỉnh Lego {activeLegoIndex}</h3>
                  <p>
                    Chọn nhóm sản phẩm trước, sau đó chọn món muốn áp dụng cho Lego này.
                  </p>
                </div>

                {activeOption ? (
                  <button
                    type="button"
                    className="cpc-clear-btn"
                    onClick={handleClearActiveGroup}
                  >
                    Bỏ chọn nhóm này
                  </button>
                ) : null}
              </div>

              <div className="cpc-group-tabs">
                {customGroups.map((group) => {
                  const selectedOption = findOptionById(group, activeSelections[group.id]);

                  return (
                    <button
                      key={group.id}
                      type="button"
                      className={`cpc-group-tab${activeGroupId === group.id ? " is-active" : ""}${selectedOption ? " is-done" : ""}`}
                      onClick={() => setSelectedGroupId(group.id)}
                    >
                      <span>{group.name}</span>
                      <small>{selectedOption?.name ?? "Chưa chọn"}</small>
                    </button>
                  );
                })}
              </div>

              {activeGroup ? (
                <>
                  <div className="cpc-group-meta">
                    <div>
                      <p className="cpc-group-meta__eyebrow">Nhóm đang chọn</p>
                      <h4>{activeGroup.name}</h4>
                      {isRichTextEmpty(activeGroup.helper) ? (
                        <p>Nhóm này chưa có mô tả hướng dẫn.</p>
                      ) : (
                        <RichTextContent value={activeGroup.helper} />
                      )}
                    </div>

                    <div className="cpc-group-meta__selected">
                      <span>Lựa chọn hiện tại</span>
                      <strong>{activeOption?.name ?? "Chưa có"}</strong>
                    </div>
                  </div>

                  {activeGroup.options.length === 0 ? (
                    <div className="cpc-empty-options">
                      Nhóm này chưa có lựa chọn nào. Vui lòng tạo dữ liệu ở Dashboard để
                      khách hàng có thể chọn.
                    </div>
                  ) : (
                    <div className="cpc-option-grid">
                      {activeGroup.options.map((option) => {
                        const isSelected = activeOptionId === option.id;
                        const isOutOfStock = Number(option.stockQuantity ?? 0) <= 0;
                        const optionImage = getStaticAssetUrl(option.image);
                        const colorCode = normalizeColorCode(option.colorCode);

                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={`cpc-option-card${isSelected ? " is-active" : ""}`}
                            disabled={isOutOfStock}
                            onClick={() => handleSelectOption(activeGroup.id, option.id)}
                          >
                            <div className="cpc-option-card__top">
                              <div>
                                {option.allowImageUpload ? (
                                  <div className="cpc-option-card__asset cpc-option-card__asset--image">
                                    <ImageWithFallback
                                      src={optionImage}
                                      alt={option.name}
                                      fallback={<span>Chưa có ảnh</span>}
                                    />
                                  </div>
                                ) : (
                                  <div className="cpc-option-card__asset cpc-option-card__asset--color">
                                    <span
                                      className="cpc-option-card__swatch"
                                      style={{ backgroundColor: colorCode }}
                                    />
                                    <small>{colorCode}</small>
                                  </div>
                                )}
                                <span className="cpc-option-card__name">{option.name}</span>
                                <p className="cpc-option-card__desc">
                                  Tồn kho: {Math.max(0, Number(option.stockQuantity ?? 0)).toLocaleString("vi-VN")}
                                </p>
                                {isRichTextEmpty(option.description) ? (
                                  <p className="cpc-option-card__desc">Chưa có mô tả.</p>
                                ) : (
                                  <RichTextContent
                                    value={option.description}
                                    className="cpc-option-card__desc"
                                  />
                                )}
                              </div>
                              <strong className="cpc-option-card__price">
                                {formatAddonPrice(option.price)}
                              </strong>
                            </div>

                            <span className="cpc-option-card__state">
                              {isOutOfStock
                                ? "Hết hàng"
                                : isSelected
                                  ? "Đã chọn"
                                  : "Bấm để áp dụng"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <div className="cpc-empty-options">
                  Chưa có nhóm tùy chỉnh nào đang public. Hãy cập nhật dữ liệu ở Dashboard.
                </div>
              )}
            </article>
          </div>
        </section>
      </div>
    </div>
  );
};

const CollectionProductCustomizer = () => {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const navigate = useNavigate();

  const {
    data: payload,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["public-collection-products", slug],
    queryFn: () => getPublicCollectionProducts(slug as string),
    enabled: Boolean(slug),
    retry: false,
  });

  const {
    data: customGroups = [],
    isLoading: isCustomGroupsLoading,
    isError: isCustomGroupsError,
    error: customGroupsError,
  } = useQuery({
    queryKey: ["public-lego-customizations"],
    queryFn: getPublicLegoCustomizations,
    retry: false,
  });

  const products = useMemo(() => payload?.products ?? [], [payload?.products]);
  const product = useMemo(
    () => products.find((item) => item.id === productId),
    [products, productId],
  );

  useEffect(() => {
    if (!slug || !productId) {
      navigate("/bo-suu-tap", { replace: true });
      return;
    }

    if (isAxiosError(error) && error.response?.status === 404) {
      navigate("/bo-suu-tap", { replace: true });
    }
  }, [slug, productId, error, navigate]);

  const errorMessage = isError
    ? getErrorMessage(error, "Có lỗi xảy ra khi tải sản phẩm.")
    : isCustomGroupsError
      ? getErrorMessage(
          customGroupsError,
          "Có lỗi xảy ra khi tải dữ liệu nhóm tùy chỉnh Lego.",
        )
      : null;

  if (isLoading || isCustomGroupsLoading || !slug || !productId) {
    return (
      <div className="cpc-page">
        <div className="cpc-loading container">
          <div className="cpc-skeleton cpc-skeleton--left" />
          <div className="cpc-skeleton cpc-skeleton--right" />
        </div>
      </div>
    );
  }

  if (errorMessage || !payload?.collection) {
    return (
      <div className="cpc-page">
        <div className="cpc-error container">
          <FiGrid size={44} />
          <h2>Không thể mở trang tùy chỉnh</h2>
          <p>{errorMessage ?? "Dữ liệu bộ sưu tập không khả dụng."}</p>
          <Link to="/bo-suu-tap" className="cpc-btn-back">
            <FiArrowLeft size={16} /> Trở về bộ sưu tập
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="cpc-page">
        <div className="cpc-error container">
          <FiGrid size={44} />
          <h2>Không tìm thấy sản phẩm</h2>
          <p>Sản phẩm bạn chọn không tồn tại hoặc đã bị ẩn.</p>
          <Link to={`/bo-suu-tap/${slug}`} className="cpc-btn-back">
            <FiArrowLeft size={16} /> Quay lại bộ sưu tập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={`Tùy chỉnh ${product.name}`}
        description={`Tùy chỉnh ${product.name} trong bộ sưu tập ${payload.collection.name}.`}
        keywords={`${product.name}, tùy chỉnh lego, ${payload.collection.name}, Soligant`}
      />
      <CollectionProductCustomizerContent
        key={product.id}
        slug={slug}
        collectionName={payload.collection.name}
        product={product}
        customGroups={customGroups}
      />
    </>
  );
};

export default CollectionProductCustomizer;
