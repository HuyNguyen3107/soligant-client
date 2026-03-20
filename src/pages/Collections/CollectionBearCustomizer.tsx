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
  BearCustomizerNavigationState,
  BearSelections,
} from "../../lib/custom-cart";
import { getErrorMessage } from "../../lib/error";
import { getStaticAssetUrl } from "../../lib/http";
import { isRichTextEmpty } from "../../lib/rich-text";
import { getPublicBearCollectionProducts } from "../../services/collections.service";
import type { BearCollectionProduct } from "../../services/collections.service";
import {
  getPublicBearCustomizations,
  type PublicBearCustomizationGroup,
} from "../../services/bear-customizations.service";
import "./CollectionBearCustomizer.css";

const createEmptySelections = (slotCount: number): BearSelections => {
  const nextSelections: BearSelections = {};

  for (let slotIndex = 1; slotIndex <= slotCount; slotIndex += 1) {
    nextSelections[String(slotIndex)] = {};
  }

  return nextSelections;
};

const findOptionById = (
  group: PublicBearCustomizationGroup,
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
  customGroups: PublicBearCustomizationGroup[],
) =>
  customGroups.reduce(
    (count, group) => (slotSelections[group.id] ? count + 1 : count),
    0,
  );

interface CollectionBearCustomizerContentProps {
  slug: string;
  collectionName: string;
  product: BearCollectionProduct;
  customGroups: PublicBearCustomizationGroup[];
}

const CollectionBearCustomizerContent = ({
  slug,
  collectionName,
  product,
  customGroups,
}: CollectionBearCustomizerContentProps) => {
  const navigate = useNavigate();

  const baseBearCount = useMemo(() => {
    const rawQuantity = Number(product.bearQuantity ?? 1);

    if (!Number.isFinite(rawQuantity) || rawQuantity <= 0) {
      return 1;
    }

    return Math.floor(rawQuantity);
  }, [product.bearQuantity]);

  const additionalBearMin = useMemo(() => {
    if (!product.allowVariableBearCount) {
      return 0;
    }
    const min = Number(product.bearCountMin ?? 0);
    return Number.isFinite(min) && min >= 0 ? Math.floor(min) : 0;
  }, [product.allowVariableBearCount, product.bearCountMin]);

  const additionalBearMax = useMemo(() => {
    if (!product.allowVariableBearCount) {
      return 0;
    }
    const max = Number(product.bearCountMax ?? 0);
    if (!Number.isFinite(max) || max < 0) {
      return additionalBearMin;
    }
    return Math.max(Math.floor(max), additionalBearMin);
  }, [additionalBearMin, product.allowVariableBearCount, product.bearCountMax]);

  const additionalBearUnitPrice = useMemo(() => {
    if (!product.allowVariableBearCount) {
      return 0;
    }

    const value = Number(product.additionalBearPrice ?? 0);
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  }, [product.additionalBearPrice, product.allowVariableBearCount]);

  const customGroupCount = customGroups.length;
  const [activeBearIndex, setActiveBearIndex] = useState<number>(1);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedAdditionalBearCount, setSelectedAdditionalBearCount] = useState<number>(
    additionalBearMin,
  );
  const totalBearCount = baseBearCount + selectedAdditionalBearCount;
  const [bearSelections, setBearSelections] = useState<BearSelections>(() =>
    createEmptySelections(baseBearCount + additionalBearMin),
  );

  useEffect(() => {
    setSelectedAdditionalBearCount(additionalBearMin);
  }, [additionalBearMin, product.id]);

  useEffect(() => {
    setBearSelections((prev) => {
      const newSelections: BearSelections = {};

      for (let slotIndex = 1; slotIndex <= totalBearCount; slotIndex += 1) {
        newSelections[String(slotIndex)] = prev[String(slotIndex)] ?? {};
      }

      return newSelections;
    });
  }, [totalBearCount]);

  useEffect(() => {
    if (activeBearIndex > totalBearCount) {
      setActiveBearIndex(totalBearCount);
    }
  }, [activeBearIndex, totalBearCount]);

  const activeGroupId = useMemo(() => {
    if (customGroups.length === 0) {
      return "";
    }

    return customGroups.some((group) => group.id === selectedGroupId)
      ? selectedGroupId
      : customGroups[0].id;
  }, [customGroups, selectedGroupId]);

  const bearSlots = useMemo(
    () => Array.from({ length: totalBearCount }, (_, index) => index + 1),
    [totalBearCount],
  );

  const activeGroup = useMemo(
    () => customGroups.find((group) => group.id === activeGroupId) ?? customGroups[0] ?? null,
    [activeGroupId, customGroups],
  );

  const activeSelections = bearSelections[String(activeBearIndex)] ?? {};
  const activeOptionId = activeGroup ? activeSelections[activeGroup.id] : undefined;
  const activeOption = activeGroup ? findOptionById(activeGroup, activeOptionId) : undefined;

  const baseVariantPrice = useMemo(
    () => normalizePrice(Number(product.price ?? 0)),
    [product.price],
  );

  const selectedAddonPrice = useMemo(() => {
    let total = 0;

    Object.values(bearSelections).forEach((slotSelections) => {
      customGroups.forEach((group) => {
        const selectedOption = findOptionById(group, slotSelections[group.id]);
        total += normalizePrice(Number(selectedOption?.price ?? 0));
      });
    });

    return total;
  }, [customGroups, bearSelections]);

  const customizedBearCount = useMemo(
    () =>
      Object.values(bearSelections).filter(
        (slotSelections) => countSelectedGroups(slotSelections, customGroups) > 0,
      ).length,
    [customGroups, bearSelections],
  );

  const pricingSummary = useMemo(() => {
    const extraBearPrice = normalizePrice(
      selectedAdditionalBearCount * additionalBearUnitPrice,
    );
    const customizationPrice = normalizePrice(selectedAddonPrice);
    const total = baseVariantPrice + extraBearPrice + customizationPrice;

    return {
      baseVariantPrice,
      extraLegoPrice: extraBearPrice,
      customizationPrice,
      total,
    };
  }, [
    additionalBearUnitPrice,
    baseVariantPrice,
    selectedAdditionalBearCount,
    selectedAddonPrice,
  ]);

  const handleSelectOption = (groupId: string, optionId: string) => {
    const group = customGroups.find((candidate) => candidate.id === groupId);
    const option = group?.options.find((candidate) => candidate.id === optionId);

    if (!option || Number(option.stockQuantity ?? 0) <= 0) {
      return;
    }

    setBearSelections((prev) => ({
      ...prev,
      [String(activeBearIndex)]: {
        ...prev[String(activeBearIndex)],
        [groupId]: optionId,
      },
    }));
  };

  const handleClearActiveGroup = () => {
    if (!activeGroup) {
      return;
    }

    setBearSelections((prev) => {
      const currentSlotSelections = prev[String(activeBearIndex)] ?? {};

      if (!currentSlotSelections[activeGroup.id]) {
        return prev;
      }

      const nextSlotSelections = { ...currentSlotSelections };
      delete nextSlotSelections[activeGroup.id];

      return {
        ...prev,
        [String(activeBearIndex)]: nextSlotSelections,
      };
    });
  };

  const productImage = getStaticAssetUrl(product.image);

  const handleNext = () => {
    const navigationState: BearCustomizerNavigationState = {
      bearSelections,
      pricingSummary,
      selectedAdditionalBearCount,
      totalBearCount,
    };

    if (product.hasBackground) {
      navigate(`/bo-suu-tap/${slug}/san-pham/${product.id}/chon-nen-gau`, {
        state: navigationState,
      });
    } else {
      navigate(`/bo-suu-tap/${slug}/san-pham/${product.id}/mua-them-gau`, {
        state: { ...navigationState, selectedBackground: null, backgroundFieldValues: {} },
      });
    }
  };

  return (
    <div className="cbc-page">
      <div className="container">
        <PageBreadcrumb
          className="cbc-page__breadcrumb"
          items={[
            { label: "Trang chủ", to: "/" },
            { label: "Bộ sưu tập", to: "/bo-suu-tap" },
            { label: collectionName, to: `/bo-suu-tap/${slug}` },
            { label: product.name },
            { label: "Tùy chỉnh" },
          ]}
        />
      </div>

      <div className="container cbc-layout">
        <aside className="cbc-sidebar">
          <div className="cbc-product-card">
            <div className="cbc-product-card__thumb">
              <ImageWithFallback
                src={productImage}
                alt={product.name}
                fallback={
                <div className="cbc-product-card__placeholder">
                  <FiGrid size={30} />
                </div>
                }
              />
            </div>
            <div className="cbc-product-card__body">
              <span className="cbc-product-card__category">
                <FiTag size={12} />
                {product.categoryName || "Chưa phân loại"}
              </span>
              <h1 className="cbc-product-card__name">{product.name}</h1>
              {isRichTextEmpty(product.description) ? (
                <p className="cbc-product-card__desc">Sản phẩm chưa có mô tả.</p>
              ) : (
                <RichTextContent value={product.description} className="cbc-product-card__desc" />
              )}
              <ul className="cbc-product-card__meta">
                <li>Số Gấu cố định: {baseBearCount.toLocaleString("vi-VN")}</li>
                {product.allowVariableBearCount ? (
                  <li>
                    Có thể chọn thêm: {additionalBearMin.toLocaleString("vi-VN")} - {additionalBearMax.toLocaleString("vi-VN")} Gấu
                  </li>
                ) : null}
                {product.allowVariableBearCount ? (
                  <li>Giá mỗi Gấu thêm: {formatAddonPrice(additionalBearUnitPrice)}</li>
                ) : null}
              </ul>
            </div>
          </div>

          <div className="cbc-summary">
            <h2 className="cbc-summary__title">Thông tin tùy chỉnh và giá</h2>
            {product.allowVariableBearCount ? (
              <p className="cbc-summary__desc">
                Sản phẩm này có sẵn <strong>{baseBearCount}</strong> Gấu cố định.
                Bạn có thể chọn thêm từ <strong>{additionalBearMin}</strong> đến <strong>{additionalBearMax}</strong> Gấu,
                tức tổng số Gấu cần tùy chỉnh sẽ từ <strong>{baseBearCount + additionalBearMin}</strong> đến <strong>{baseBearCount + additionalBearMax}</strong>.
                Mỗi Gấu thêm được tính <strong>{formatAddonPrice(additionalBearUnitPrice)}</strong>.
              </p>
            ) : (
              <p className="cbc-summary__desc">
                Sản phẩm có <strong>{baseBearCount}</strong> Gấu cố định cần tùy chỉnh.
                Gán lựa chọn từ các nhóm tùy chỉnh đã cấu hình.
              </p>
            )}

            {product.allowVariableBearCount && (
              <div className="cbc-summary__bear-count-selector">
                <label className="cbc-summary__bear-count-label">
                  Chọn thêm số Gấu: <strong>{selectedAdditionalBearCount}</strong>
                </label>
                <input
                  className="cbc-summary__bear-count-slider"
                  type="range"
                  min={additionalBearMin}
                  max={additionalBearMax}
                  value={selectedAdditionalBearCount}
                  onChange={(e) => setSelectedAdditionalBearCount(Number(e.target.value))}
                />
                <div className="cbc-summary__bear-count-range">
                  <span>{additionalBearMin}</span>
                  <span>{additionalBearMax}</span>
                </div>
                <p className="cbc-summary__desc">
                  Tổng số Gấu đang tùy chỉnh: <strong>{totalBearCount}</strong>
                </p>
                <p className="cbc-summary__desc">
                  Chi phí Gấu thêm: <strong>{formatAddonPrice(pricingSummary.extraLegoPrice)}</strong>
                </p>
              </div>
            )}

            <div className="cbc-summary__pricing">
              <div className="cbc-summary__pricing-row">
                <span>Giá sản phẩm</span>
                <strong>{pricingSummary.baseVariantPrice.toLocaleString("vi-VN")} đ</strong>
              </div>
              {product.allowVariableBearCount && (
                <div className="cbc-summary__pricing-row">
                  <span>Giá Gấu thêm</span>
                  <strong>{formatAddonPrice(pricingSummary.extraLegoPrice)}</strong>
                </div>
              )}
              <div className="cbc-summary__pricing-row">
                <span>Giá tùy chỉnh</span>
                <strong>{formatAddonPrice(pricingSummary.customizationPrice)}</strong>
              </div>
              <div className="cbc-summary__total">
                <span>Tạm tính</span>
                <strong>{pricingSummary.total.toLocaleString("vi-VN")} đ</strong>
              </div>
            </div>

            <div className="cbc-summary__characters">
              {bearSlots.map((slotIndex) => {
                const slotSelections = bearSelections[String(slotIndex)] ?? {};
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
                    className={`cbc-character${customGroupCount > 0 && selectedLabels.length === customGroupCount ? " is-complete" : ""}`}
                  >
                    <div className="cbc-character__header">
                      <div>
                        <strong>Gấu {slotIndex}</strong>
                        <span>
                          {selectedLabels.length}/{customGroupCount} nhóm đã chọn
                        </span>
                      </div>
                      {customGroupCount > 0 && selectedLabels.length === customGroupCount && (
                        <FiCheck size={16} />
                      )}
                    </div>

                    {selectedLabels.length > 0 ? (
                      <div className="cbc-character__tags">
                        {selectedLabels.map((label) => (
                          <span key={label} className="cbc-character__tag">
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="cbc-character__empty">Chưa chọn chi tiết nào.</p>
                    )}
                  </article>
                );
              })}
            </div>

            <button
              type="button"
              className="cbc-summary__cta"
              onClick={handleNext}
            >
              {product.hasBackground ? "Tiếp theo: Chọn nền" : "Tiếp theo: Chọn option mua thêm"}
            </button>

            <p className="cbc-summary__note">
              Đội ngũ Soligant sẽ đối chiếu lại từng lựa chọn tùy chỉnh trước khi sản xuất.
            </p>
          </div>
        </aside>

        <section className="cbc-editor">
          <header className="cbc-editor__header">
            <p className="cbc-editor__eyebrow">Trang tùy chỉnh sản phẩm</p>
            <h2 className="cbc-editor__title">Chọn từng Gấu rồi tùy chỉnh chi tiết cho Gấu đó</h2>
            <p className="cbc-editor__desc">
              Số Gấu sẽ được tạo từ phần cố định của sản phẩm và phần Gấu chọn thêm,
              nếu sản phẩm đó cho phép. Bấm vào từng Gấu để mở danh sách tùy chỉnh bên dưới.
            </p>
          </header>

          <div className="cbc-slot-section">
            <div className="cbc-slot-section__head">
              <div>
                <h3>Danh sách Gấu cần tùy chỉnh</h3>
                <p>
                  Tổng cộng đang có <strong>{totalBearCount}</strong> Gấu cần tùy chỉnh. Đã bắt đầu tùy chỉnh cho
                  <strong> {customizedBearCount}</strong> Gấu.
                </p>
              </div>
            </div>

            <div className="cbc-slot-list">
              {bearSlots.map((slotIndex) => {
                const slotSelections = bearSelections[String(slotIndex)] ?? {};
                const selectionCount = countSelectedGroups(slotSelections, customGroups);

                return (
                  <button
                    key={slotIndex}
                    type="button"
                    className={`cbc-slot${activeBearIndex === slotIndex ? " is-active" : ""}${customGroupCount > 0 && selectionCount === customGroupCount ? " is-complete" : ""}`}
                    onClick={() => setActiveBearIndex(slotIndex)}
                  >
                    <span className="cbc-slot__label">Gấu {slotIndex}</span>
                    <span className="cbc-slot__meta">
                      {selectionCount > 0
                        ? `${selectionCount}/${customGroupCount} nhóm đã chọn`
                        : "Chưa tùy chỉnh"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="cbc-customizer">
            <article className="cbc-panel cbc-panel--workspace">
              <div className="cbc-panel__header">
                <div>
                  <h3>Đang tùy chỉnh Gấu {activeBearIndex}</h3>
                  <p>
                    Chọn nhóm sản phẩm trước, sau đó chọn món muốn áp dụng cho Gấu này.
                  </p>
                </div>

                {activeOption ? (
                  <button
                    type="button"
                    className="cbc-clear-btn"
                    onClick={handleClearActiveGroup}
                  >
                    Bỏ chọn nhóm này
                  </button>
                ) : null}
              </div>

              <div className="cbc-group-tabs">
                {customGroups.map((group) => {
                  const selectedOption = findOptionById(group, activeSelections[group.id]);

                  return (
                    <button
                      key={group.id}
                      type="button"
                      className={`cbc-group-tab${activeGroupId === group.id ? " is-active" : ""}${selectedOption ? " is-done" : ""}`}
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
                  <div className="cbc-group-meta">
                    <div>
                      <p className="cbc-group-meta__eyebrow">Nhóm đang chọn</p>
                      <h4>{activeGroup.name}</h4>
                      {isRichTextEmpty(activeGroup.helper) ? (
                        <p>Nhóm này chưa có mô tả hướng dẫn.</p>
                      ) : (
                        <RichTextContent value={activeGroup.helper} />
                      )}
                    </div>

                    <div className="cbc-group-meta__selected">
                      <span>Lựa chọn hiện tại</span>
                      <strong>{activeOption?.name ?? "Chưa có"}</strong>
                    </div>
                  </div>

                  {activeGroup.options.length === 0 ? (
                    <div className="cbc-empty-options">
                      Nhóm này chưa có lựa chọn nào. Vui lòng tạo dữ liệu ở Dashboard để
                      khách hàng có thể chọn.
                    </div>
                  ) : (
                    <div className="cbc-option-grid">
                      {activeGroup.options.map((option) => {
                        const isSelected = activeOptionId === option.id;
                        const isOutOfStock = Number(option.stockQuantity ?? 0) <= 0;
                        const optionImage = getStaticAssetUrl(option.image);
                        const colorCode = normalizeColorCode(option.colorCode);

                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={`cbc-option-card${isSelected ? " is-active" : ""}`}
                            disabled={isOutOfStock}
                            onClick={() => handleSelectOption(activeGroup.id, option.id)}
                          >
                            <div className="cbc-option-card__top">
                              <div>
                                {option.allowImageUpload ? (
                                  <div className="cbc-option-card__asset cbc-option-card__asset--image">
                                    <ImageWithFallback
                                      src={optionImage}
                                      alt={option.name}
                                      fallback={<span>Chưa có ảnh</span>}
                                    />
                                  </div>
                                ) : (
                                  <div className="cbc-option-card__asset cbc-option-card__asset--color">
                                    <span
                                      className="cbc-option-card__swatch"
                                      style={{ backgroundColor: colorCode }}
                                    />
                                    <small>{colorCode}</small>
                                  </div>
                                )}
                                <span className="cbc-option-card__name">{option.name}</span>
                                <p className="cbc-option-card__desc">
                                  Tồn kho: {Math.max(0, Number(option.stockQuantity ?? 0)).toLocaleString("vi-VN")}
                                </p>
                                {isRichTextEmpty(option.description) ? (
                                  <p className="cbc-option-card__desc">Chưa có mô tả.</p>
                                ) : (
                                  <RichTextContent
                                    value={option.description}
                                    className="cbc-option-card__desc"
                                  />
                                )}
                              </div>
                              <strong className="cbc-option-card__price">
                                {formatAddonPrice(option.price)}
                              </strong>
                            </div>

                            <span className="cbc-option-card__state">
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
                <div className="cbc-empty-options">
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

const CollectionBearCustomizer = () => {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const navigate = useNavigate();

  const {
    data: payload,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["public-bear-collection-products", slug],
    queryFn: () => getPublicBearCollectionProducts(slug as string),
    enabled: Boolean(slug),
    retry: false,
  });

  const {
    data: customGroups = [],
    isLoading: isCustomGroupsLoading,
    isError: isCustomGroupsError,
    error: customGroupsError,
  } = useQuery({
    queryKey: ["public-bear-customizations"],
    queryFn: getPublicBearCustomizations,
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
          "Có lỗi xảy ra khi tải dữ liệu nhóm tùy chỉnh Gấu.",
        )
      : null;

  if (isLoading || isCustomGroupsLoading || !slug || !productId) {
    return (
      <div className="cbc-page">
        <div className="cbc-loading container">
          <div className="cbc-skeleton cbc-skeleton--left" />
          <div className="cbc-skeleton cbc-skeleton--right" />
        </div>
      </div>
    );
  }

  if (errorMessage || !payload?.collection) {
    return (
      <div className="cbc-page">
        <div className="cbc-error container">
          <FiGrid size={44} />
          <h2>Không thể mở trang tùy chỉnh</h2>
          <p>{errorMessage ?? "Dữ liệu bộ sưu tập không khả dụng."}</p>
          <Link to="/bo-suu-tap" className="cbc-btn-back">
            <FiArrowLeft size={16} /> Trở về bộ sưu tập
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="cbc-page">
        <div className="cbc-error container">
          <FiGrid size={44} />
          <h2>Không tìm thấy sản phẩm</h2>
          <p>Sản phẩm bạn chọn không tồn tại hoặc đã bị ẩn.</p>
          <Link to={`/bo-suu-tap/${slug}`} className="cbc-btn-back">
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
        keywords={`${product.name}, tùy chỉnh gấu, ${payload.collection.name}, Soligant`}
      />
      <CollectionBearCustomizerContent
        key={product.id}
        slug={slug}
        collectionName={payload.collection.name}
        product={product}
        customGroups={customGroups}
      />
    </>
  );
};

export default CollectionBearCustomizer;
