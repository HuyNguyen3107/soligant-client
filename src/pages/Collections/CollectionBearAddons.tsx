import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckSquare,
  FiImage,
  FiLink,
  FiShoppingBag,
  FiTag,
  FiType,
} from "react-icons/fi";
import {
  ImageWithFallback,
  PageBreadcrumb,
  RichTextContent,
  RichTextEditor,
  SEO,
} from "../../components/common";
import {
  type BearAdditionalOptionsNavigationState,
  type AddonCustomFieldType,
} from "../../lib/custom-cart";
import { getErrorMessage } from "../../lib/error";
import { getStaticAssetUrl } from "../../lib/http";
import { isRichTextEmpty } from "../../lib/rich-text";
import { getPublicBearCollectionProducts } from "../../services/collections.service";
import { getPublicAddonOptions } from "../../services/addon-options.service";
import { useCustomCartStore } from "../../store/custom-cart.store";
import "./CollectionProductAddons.css";

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Không thể đọc file ảnh."));
    reader.readAsDataURL(file);
  });

const buildAddonFieldKey = (
  index: number,
  fieldLabel: string,
  fieldType: AddonCustomFieldType,
) => `${index}-${fieldType}-${fieldLabel}`;

const normalizePrice = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.floor(value);
};

const formatMoney = (value: number) =>
  `${new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.floor(value)))} đ`;

const CollectionBearAddons = () => {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const addItem = useCustomCartStore((state) => state.addItem);
  const navigationState =
    location.state as BearAdditionalOptionsNavigationState | null;

  const {
    data: payload,
    isLoading: isProductLoading,
    isError: isProductError,
    error: productError,
  } = useQuery({
    queryKey: ["public-bear-collection-products", slug],
    queryFn: () => getPublicBearCollectionProducts(slug as string),
    enabled: Boolean(slug),
    retry: false,
  });

  const {
    data: addonOptions = [],
    isLoading: isAddonsLoading,
    isError: isAddonsError,
    error: addonsError,
  } = useQuery({
    queryKey: ["public-addon-options", productId],
    queryFn: () => getPublicAddonOptions(productId),
    enabled: Boolean(productId),
    retry: false,
  });

  const product = useMemo(
    () => (payload?.products ?? []).find((item) => item.id === productId),
    [payload, productId],
  );

  const collectionName = payload?.collection?.name ?? "";
  const productImage = product ? getStaticAssetUrl(product.image) : null;

  const optionsLookup = useMemo(
    () => new Map(addonOptions.map((option) => [option.id, option])),
    [addonOptions],
  );

  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, Record<string, string>>
  >({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const selectedOptionIds = useMemo(
    () =>
      Object.keys(selectedOptions).filter((optionId) =>
        optionsLookup.has(optionId),
      ),
    [optionsLookup, selectedOptions],
  );

  const selectedOptionRows = useMemo(
    () =>
      selectedOptionIds
        .map((optionId) => optionsLookup.get(optionId))
        .filter((option): option is NonNullable<typeof option> =>
          Boolean(option),
        ),
    [optionsLookup, selectedOptionIds],
  );

  const selectedAddonsPrice = useMemo(
    () =>
      selectedOptionRows.reduce(
        (sum, option) => sum + normalizePrice(option.price),
        0,
      ),
    [selectedOptionRows],
  );

  const baseCustomizationTotal = useMemo(
    () => normalizePrice(navigationState?.pricingSummary.total ?? 0),
    [navigationState?.pricingSummary.total],
  );

  const finalEstimate = baseCustomizationTotal + selectedAddonsPrice;

  const toggleOption = (optionId: string) => {
    const option = optionsLookup.get(optionId);

    if (!option) {
      return;
    }

    setSubmissionError(null);

    setSelectedOptions((prev) => {
      if (prev[optionId]) {
        const next = { ...prev };
        delete next[optionId];
        return next;
      }

      if (option.optionType !== "customizable") {
        return {
          ...prev,
          [optionId]: {},
        };
      }

      const initialFieldValues = Object.fromEntries(
        option.fields
          .slice()
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((field, index) => [
            buildAddonFieldKey(index, field.label, field.fieldType),
            "",
          ]),
      );

      return {
        ...prev,
        [optionId]: initialFieldValues,
      };
    });
  };

  const updateFieldValue = (
    optionId: string,
    fieldKey: string,
    value: string,
  ) => {
    setSubmissionError(null);

    setSelectedOptions((prev) => ({
      ...prev,
      [optionId]: {
        ...(prev[optionId] ?? {}),
        [fieldKey]: value,
      },
    }));
  };

  const handleImageSelect = async (
    optionId: string,
    fieldKey: string,
    file?: File | null,
  ) => {
    if (!file) {
      updateFieldValue(optionId, fieldKey, "");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSubmissionError("Chỉ chấp nhận file ảnh cho trường tải ảnh.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      updateFieldValue(optionId, fieldKey, dataUrl);
    } catch (error) {
      setSubmissionError(getErrorMessage(error, "Không thể đọc file ảnh."));
    }
  };

  const validateBeforeFinalize = () => {
    if (!navigationState) {
      return "Không tìm thấy dữ liệu đã tùy chỉnh. Vui lòng quay lại bước trước.";
    }

    for (const optionId of selectedOptionIds) {
      const option = optionsLookup.get(optionId);

      if (!option || option.optionType !== "customizable") {
        continue;
      }

      const optionValues = selectedOptions[optionId] ?? {};
      const sortedFields = option.fields
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder);

      for (const [index, field] of sortedFields.entries()) {
        if (!field.required) {
          continue;
        }

        const fieldKey = buildAddonFieldKey(
          index,
          field.label,
          field.fieldType,
        );
        const value = optionValues[fieldKey] ?? "";

        if (field.fieldType === "text") {
          if (isRichTextEmpty(value)) {
            return `Vui lòng nhập nội dung cho trường "${field.label}" của option "${option.name}".`;
          }
          continue;
        }

        if (!value.trim()) {
          return `Vui lòng nhập thông tin cho trường "${field.label}" của option "${option.name}".`;
        }
      }
    }

    return null;
  };

  const handleFinalize = (mode: "cart" | "buy-now") => {
    if (!slug || !product || !navigationState) {
      setSubmissionError(
        "Không đủ dữ liệu để hoàn tất. Vui lòng quay lại bước trước và thử lại.",
      );
      return;
    }

    const validationMessage = validateBeforeFinalize();

    if (validationMessage) {
      setSubmissionError(validationMessage);
      return;
    }

    const normalizedSelectedOptions = selectedOptionRows.map((option) => {
      const values = selectedOptions[option.id] ?? {};
      const customFieldValues =
        option.optionType === "customizable"
          ? option.fields
              .slice()
              .sort((left, right) => left.sortOrder - right.sortOrder)
              .map((field, index) => {
                const key = buildAddonFieldKey(
                  index,
                  field.label,
                  field.fieldType,
                );

                return {
                  label: field.label,
                  fieldType: field.fieldType,
                  value: values[key] ?? "",
                };
              })
          : [];

      return {
        id: option.id,
        name: option.name,
        description: option.description,
        optionType: option.optionType,
        price: normalizePrice(option.price),
        customFieldValues,
      };
    });

    // Build a CollectionProduct-like object from BearCollectionProduct for cart compatibility
    const cartProduct = {
      ...product,
      // Lego fields set to 0/false for bear products
      size: "20x20" as const,
      legoQuantity: 0,
      allowVariableLegoCount: false,
      legoCountMin: 0,
      legoCountMax: 0,
      additionalLegoPrice: 0,
    };

    const nextItem = addItem({
      collectionSlug: slug,
      collectionName,
      product: cartProduct,
      background: navigationState.selectedBackground,
      legoSelections: {},
      totalLegoCount: 0,
      selectedAdditionalLegoCount: 0,
      pricingSummary: navigationState.pricingSummary,
      backgroundFieldValues: navigationState.backgroundFieldValues,
      additionalOptions: normalizedSelectedOptions,
      // Bear-specific
      bearSelections: navigationState.bearSelections,
      totalBearCount: navigationState.totalBearCount,
      selectedAdditionalBearCount: navigationState.selectedAdditionalBearCount,
    });

    if (mode === "buy-now") {
      navigate("/thong-tin-khach-hang", {
        state: { selectedItemIds: [nextItem.id] },
      });
      return;
    }

    navigate(`/bo-suu-tap/${slug}`);
  };

  const errorMessage = isProductError
    ? getErrorMessage(productError, "Có lỗi xảy ra khi tải sản phẩm.")
    : isAddonsError
      ? getErrorMessage(addonsError, "Có lỗi xảy ra khi tải option mua thêm.")
      : null;

  if (isProductLoading || isAddonsLoading || !slug || !productId) {
    return (
      <div className="cao-page">
        <div className="cao-loading container">
          <div className="cao-skeleton cao-skeleton--left" />
          <div className="cao-skeleton cao-skeleton--right" />
        </div>
      </div>
    );
  }

  if (errorMessage || !payload?.collection || !product) {
    return (
      <div className="cao-page">
        <div className="cao-error container">
          <FiShoppingBag size={44} />
          <h2>Không thể mở bước mua thêm</h2>
          <p>{errorMessage ?? "Dữ liệu sản phẩm không khả dụng."}</p>
          <Link
            to={`/bo-suu-tap/${slug}/san-pham/${productId}/chon-nen-gau`}
            className="cao-btn-back"
            state={location.state}
          >
            <FiArrowLeft size={16} /> Quay lại chọn nền
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={`Mua thêm cho ${product.name}`}
        description={`Chọn option mua thêm cho ${product.name} trước khi hoàn tất đơn hàng.`}
        keywords={`${product.name}, option mua thêm, gấu tùy chỉnh, Soligant`}
      />

      <div className="cao-page">
        <div className="container">
          <PageBreadcrumb
            className="cao-page__breadcrumb"
            items={[
              { label: "Trang chủ", to: "/" },
              { label: "Bộ sưu tập", to: "/bo-suu-tap" },
              { label: collectionName, to: `/bo-suu-tap/${slug}` },
              {
                label: product.name,
                to: `/bo-suu-tap/${slug}/san-pham/${productId}/tuy-chinh-gau`,
              },
              { label: "Mua thêm" },
            ]}
          />
        </div>

        <div className="container cao-layout">
          <aside className="cao-sidebar">
            <div className="cao-product-card">
              <div className="cao-product-card__thumb">
                <ImageWithFallback
                  src={productImage}
                  alt={product.name}
                  fallback={
                    <div className="cao-product-card__placeholder">
                      <FiShoppingBag size={28} />
                    </div>
                  }
                />
              </div>
              <div className="cao-product-card__body">
                <span className="cao-product-card__category">
                  <FiTag size={12} />
                  {product.categoryName || "Chưa phân loại"}
                </span>
                <h1 className="cao-product-card__name">{product.name}</h1>
              </div>
            </div>

            <div className="cao-summary">
              <h2 className="cao-summary__title">Tóm tắt bước mua thêm</h2>

              <div className="cao-summary__rows">
                <div className="cao-summary__row">
                  <span>Tạm tính tùy chỉnh</span>
                  <strong>{formatMoney(baseCustomizationTotal)}</strong>
                </div>
                <div className="cao-summary__row">
                  <span>Option mua thêm đã chọn</span>
                  <strong>{selectedOptionRows.length}</strong>
                </div>
                <div className="cao-summary__row">
                  <span>Tiền mua thêm</span>
                  <strong>{formatMoney(selectedAddonsPrice)}</strong>
                </div>
                <div className="cao-summary__row cao-summary__row--total">
                  <span>Tạm tính sau mua thêm</span>
                  <strong>{formatMoney(finalEstimate)}</strong>
                </div>
              </div>

              {selectedOptionRows.length > 0 && (
                <div className="cao-selected-list">
                  {selectedOptionRows.map((option) => (
                    <div key={option.id} className="cao-selected-item">
                      <strong>{option.name}</strong>
                      <span>{formatMoney(option.price)}</span>
                    </div>
                  ))}
                </div>
              )}

              {submissionError && (
                <div className="cao-summary__error">{submissionError}</div>
              )}

              <div className="cao-summary__actions">
                <button
                  type="button"
                  className="cao-summary__cta cao-summary__cta--secondary"
                  onClick={() => handleFinalize("cart")}
                >
                  Hoàn tất và thêm vào giỏ
                </button>
                <button
                  type="button"
                  className="cao-summary__cta"
                  onClick={() => handleFinalize("buy-now")}
                >
                  Hoàn tất và điền thông tin khách hàng
                </button>
              </div>

              {product.hasBackground ? (
                <Link
                  to={`/bo-suu-tap/${slug}/san-pham/${productId}/chon-nen-gau`}
                  className="cao-btn-back"
                  state={location.state}
                >
                  <FiArrowLeft size={15} /> Quay lại chọn nền
                </Link>
              ) : (
                <Link
                  to={`/bo-suu-tap/${slug}/san-pham/${productId}/tuy-chinh-gau`}
                  className="cao-btn-back"
                  state={location.state}
                >
                  <FiArrowLeft size={15} /> Quay lại tùy chỉnh
                </Link>
              )}
            </div>
          </aside>

          <section className="cao-options">
            <header className="cao-options__header">
              <p className="cao-options__eyebrow">
                Bước cuối trước khi hoàn tất
              </p>
              <h2 className="cao-options__title">
                Bạn có muốn mua thêm gì không?
              </h2>
              <p className="cao-options__desc">
                Bạn có thể chọn nhiều option mua thêm. Nếu không cần mua thêm,
                bạn vẫn có thể bấm hoàn tất ở khung bên trái.
              </p>
            </header>

            {addonOptions.length === 0 ? (
              <div className="cao-empty">
                <FiShoppingBag size={40} />
                <p>Hiện chưa có option mua thêm nào cho sản phẩm này.</p>
              </div>
            ) : (
              <div className="cao-option-list">
                {addonOptions.map((option) => {
                  const isSelected = selectedOptionIds.includes(option.id);
                  const optionValues = selectedOptions[option.id] ?? {};
                  const sortedFields = option.fields
                    .slice()
                    .sort((left, right) => left.sortOrder - right.sortOrder);

                  return (
                    <article
                      key={option.id}
                      className={`cao-option-card${isSelected ? " is-selected" : ""}`}
                    >
                      <label className="cao-option-card__head">
                        <span className="cao-option-card__check-wrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOption(option.id)}
                          />
                        </span>

                        <div className="cao-option-card__meta">
                          <div className="cao-option-card__title-row">
                            <h3>{option.name}</h3>
                            <span className="cao-option-card__price">
                              {formatMoney(option.price)}
                            </span>
                          </div>
                          <p className="cao-option-card__type">
                            {option.optionType === "customizable"
                              ? "Ấn phẩm tùy chỉnh"
                              : "Mua thêm cơ bản"}
                          </p>

                          {!isRichTextEmpty(option.description) && (
                            <RichTextContent
                              value={option.description}
                              className="cao-option-card__desc"
                            />
                          )}
                        </div>

                        {isSelected && (
                          <span className="cao-option-card__selected">
                            <FiCheckSquare size={16} /> Đã chọn
                          </span>
                        )}
                      </label>

                      {isSelected && option.optionType === "customizable" && (
                        <div className="cao-option-card__fields">
                          {sortedFields.map((field, index) => {
                            const fieldKey = buildAddonFieldKey(
                              index,
                              field.label,
                              field.fieldType,
                            );
                            const value = optionValues[fieldKey] ?? "";

                            return (
                              <div key={fieldKey} className="cao-field">
                                <label className="cao-field__label">
                                  {field.label}
                                  {field.required ? " *" : ""}
                                </label>

                                {field.fieldType === "image" && (
                                  <div className="cao-upload-field">
                                    <input
                                      className="cao-input"
                                      type="file"
                                      accept="image/*"
                                      onChange={(event) =>
                                        handleImageSelect(
                                          option.id,
                                          fieldKey,
                                          event.target.files?.[0],
                                        )
                                      }
                                    />

                                    {value.trim() && (
                                      <ImageWithFallback
                                        src={value}
                                        alt={field.label}
                                        className="cao-upload-preview"
                                        fallback={
                                          <div
                                            className="cao-upload-preview"
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              color: "#94a3b8",
                                              background: "#f8fafc",
                                            }}
                                          >
                                            <FiImage size={24} />
                                          </div>
                                        }
                                      />
                                    )}
                                  </div>
                                )}

                                {field.fieldType === "link" && (
                                  <div className="cao-input-wrap">
                                    <FiLink size={14} />
                                    <input
                                      className="cao-input"
                                      type="url"
                                      value={value}
                                      placeholder={
                                        field.placeholder || "https://..."
                                      }
                                      onChange={(event) =>
                                        updateFieldValue(
                                          option.id,
                                          fieldKey,
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </div>
                                )}

                                {field.fieldType === "text" && (
                                  <div className="cao-rich-field">
                                    <RichTextEditor
                                      value={value}
                                      onChange={(nextValue) =>
                                        updateFieldValue(
                                          option.id,
                                          fieldKey,
                                          nextValue,
                                        )
                                      }
                                      placeholder={
                                        field.placeholder || "Nhập nội dung"
                                      }
                                      minHeight={130}
                                    />
                                  </div>
                                )}

                                {!field.required &&
                                  field.fieldType !== "text" &&
                                  !value.trim() && (
                                    <p className="cao-field__hint">
                                      {field.fieldType === "image" ? (
                                        <>
                                          <FiImage size={12} /> Trường này không
                                          bắt buộc.
                                        </>
                                      ) : (
                                        <>
                                          <FiLink size={12} /> Trường này không
                                          bắt buộc.
                                        </>
                                      )}
                                    </p>
                                  )}

                                {!field.required &&
                                  field.fieldType === "text" &&
                                  isRichTextEmpty(value) && (
                                    <p className="cao-field__hint">
                                      <FiType size={12} /> Trường này không bắt
                                      buộc.
                                    </p>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
};

export default CollectionBearAddons;
