import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiGrid, FiImage, FiTag } from "react-icons/fi";
import {
  ImageWithFallback,
  PageBreadcrumb,
  RichTextContent,
  RichTextEditor,
  SEO,
} from "../../components/common";
import {
  type AdditionalOptionsNavigationState,
  buildBackgroundFieldKey,
  type BackgroundFieldValue,
  type CustomizerNavigationState,
} from "../../lib/custom-cart";
import { getErrorMessage } from "../../lib/error";
import { getStaticAssetUrl } from "../../lib/http";
import { isRichTextEmpty } from "../../lib/rich-text";
import { getPublicCollectionProducts } from "../../services/collections.service";
import {
  getPublicBackgrounds,
  type PublicBackground,
} from "../../services/backgrounds.service";
import "./CollectionProductBackgroundPicker.css";

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Không thể đọc file ảnh."));
    reader.readAsDataURL(file);
  });

interface BackgroundCardProps {
  background: PublicBackground;
  isSelected: boolean;
  onSelect: () => void;
}

const BackgroundCard = ({
  background,
  isSelected,
  onSelect,
}: BackgroundCardProps) => {
  const imageUrl = getStaticAssetUrl(background.image);

  return (
    <button
      type="button"
      className={`cbp-card${isSelected ? " is-active" : ""}`}
      onClick={onSelect}
    >
      <div className="cbp-card__thumb">
        <ImageWithFallback
          src={imageUrl}
          alt={background.name}
          fallback={
            <div className="cbp-card__placeholder">
              <FiImage size={28} />
            </div>
          }
        />
      </div>
      <div className="cbp-card__body">
        <span className="cbp-card__theme">
          <FiTag size={11} />
          {background.themeName}
        </span>
        <p className="cbp-card__name">{background.name}</p>
        <span className="cbp-card__state">
          {isSelected ? "Đã chọn" : "Bấm để chọn"}
        </span>
      </div>
    </button>
  );
};

const CollectionProductBackgroundPicker = () => {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const customizerState = location.state as CustomizerNavigationState | null;

  const {
    data: payload,
    isLoading: isProductLoading,
    isError: isProductError,
    error: productError,
  } = useQuery({
    queryKey: ["public-collection-products", slug],
    queryFn: () => getPublicCollectionProducts(slug as string),
    enabled: Boolean(slug),
    retry: false,
  });

  const product = useMemo(
    () => (payload?.products ?? []).find((p) => p.id === productId),
    [payload, productId],
  );

  const {
    data: backgrounds = [],
    isLoading: isBackgroundsLoading,
    isError: isBackgroundsError,
    error: backgroundsError,
  } = useQuery({
    queryKey: ["public-backgrounds", product?.productType ?? "lego"],
    queryFn: () =>
      getPublicBackgrounds({
        productType: product?.productType === "bear" ? "bear" : "lego",
      }),
    enabled: Boolean(product),
    retry: false,
  });

  const collectionName = payload?.collection?.name ?? "";

  const groupedByTheme = useMemo(() => {
    const groups: Record<
      string,
      { themeId: string; themeName: string; items: PublicBackground[] }
    > = {};

    backgrounds.forEach((bg) => {
      const key = bg.themeId;
      if (!groups[key]) {
        groups[key] = { themeId: key, themeName: bg.themeName, items: [] };
      }
      groups[key].items.push(bg);
    });

    return Object.values(groups);
  }, [backgrounds]);

  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string>("");
  const [backgroundFieldValues, setBackgroundFieldValues] = useState<
    Record<string, BackgroundFieldValue>
  >({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const selectedBackground = backgrounds.find(
    (bg) => bg.id === selectedBackgroundId,
  );
  const selectedBackgroundFields = useMemo(
    () =>
      selectedBackground
        ? [...selectedBackground.fields].sort(
            (a, b) => a.sortOrder - b.sortOrder,
          )
        : [],
    [selectedBackground],
  );
  const selectedBackgroundImage = selectedBackground
    ? getStaticAssetUrl(selectedBackground.image)
    : null;

  useEffect(() => {
    if (backgrounds.length === 0) {
      if (selectedBackgroundId) {
        setSelectedBackgroundId("");
      }
      return;
    }

    if (!backgrounds.some((bg) => bg.id === selectedBackgroundId)) {
      setSelectedBackgroundId(backgrounds[0].id);
    }
  }, [backgrounds, selectedBackgroundId]);

  useEffect(() => {
    if (!selectedBackground) {
      setBackgroundFieldValues({});
      setSubmissionError(null);
      return;
    }

    setBackgroundFieldValues((prev) => {
      const next: Record<string, BackgroundFieldValue> = {};

      selectedBackgroundFields.forEach((field, index) => {
        const key = buildBackgroundFieldKey(
          index,
          field.label,
          field.fieldType,
        );

        if (prev[key] !== undefined) {
          next[key] = prev[key];
          return;
        }

        next[key] =
          field.fieldType === "select" && field.selectType === "checkbox"
            ? []
            : "";
      });

      return next;
    });
  }, [selectedBackground, selectedBackgroundFields]);

  const updateBackgroundFieldValue = (
    key: string,
    value: BackgroundFieldValue,
  ) => {
    setSubmissionError(null);
    setBackgroundFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCheckboxValue = (key: string, optionValue: string) => {
    setBackgroundFieldValues((prev) => {
      const current = prev[key];
      const currentValues = Array.isArray(current) ? current : [];

      if (currentValues.includes(optionValue)) {
        return {
          ...prev,
          [key]: currentValues.filter((value) => value !== optionValue),
        };
      }

      return {
        ...prev,
        [key]: [...currentValues, optionValue],
      };
    });
  };

  const onFieldImageSelect = async (fieldKey: string, file?: File | null) => {
    if (!file) {
      updateBackgroundFieldValue(fieldKey, "");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSubmissionError("Chỉ chấp nhận file ảnh cho trường tải ảnh nền.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      updateBackgroundFieldValue(fieldKey, dataUrl);
    } catch (error) {
      setSubmissionError(getErrorMessage(error, "Không thể đọc file ảnh."));
    }
  };

  const resolveOptionLabels = (
    fieldKey: string,
    field: PublicBackground["fields"][number],
  ) => {
    const selectedValue = backgroundFieldValues[fieldKey];
    if (!Array.isArray(selectedValue)) {
      return [];
    }

    const selectedSet = new Set(selectedValue);
    return field.options
      .filter((option) => selectedSet.has(option.value))
      .map((option) => option.label);
  };

  const validateSelection = () => {
    if (!customizerState) {
      return "Vui lòng quay lại bước tùy chỉnh sản phẩm trước khi thêm vào giỏ hoặc đặt hàng ngay.";
    }

    if (!selectedBackground) {
      return "Vui lòng chọn một nền trước khi tiếp tục.";
    }

    for (const [index, field] of selectedBackgroundFields.entries()) {
      if (!field.required) {
        continue;
      }

      const fieldKey = buildBackgroundFieldKey(
        index,
        field.label,
        field.fieldType,
      );
      const value = backgroundFieldValues[fieldKey];

      if (field.fieldType === "select" && field.selectType === "checkbox") {
        if (!Array.isArray(value) || value.length === 0) {
          return `Vui lòng chọn thông tin cho trường "${field.label}".`;
        }

        continue;
      }

      if (field.fieldType === "long_text") {
        if (typeof value !== "string" || isRichTextEmpty(value)) {
          return `Vui lòng nhập nội dung cho trường "${field.label}".`;
        }

        continue;
      }

      if (field.fieldType === "image_upload") {
        if (typeof value !== "string" || !value.trim()) {
          return `Vui lòng tải ảnh cho trường "${field.label}".`;
        }

        continue;
      }

      if (typeof value !== "string" || !value.trim()) {
        return `Vui lòng nhập thông tin cho trường "${field.label}".`;
      }
    }

    return null;
  };

  const handleContinueToAddons = () => {
    if (!slug || !selectedBackground || !customizerState || !product) {
      setSubmissionError(
        "Không đủ dữ liệu tùy chỉnh để tiếp tục. Vui lòng quay lại bước trước và thử lại.",
      );
      return;
    }

    const validationMessage = validateSelection();
    if (validationMessage) {
      setSubmissionError(validationMessage);
      return;
    }

    const navigationState: AdditionalOptionsNavigationState = {
      legoSelections: customizerState.legoSelections,
      totalLegoCount: customizerState.totalLegoCount,
      selectedAdditionalLegoCount: customizerState.selectedAdditionalLegoCount,
      pricingSummary: customizerState.pricingSummary,
      selectedBackground,
      backgroundFieldValues: Object.fromEntries(
        Object.entries(backgroundFieldValues).map(([fieldKey, value]) => [
          fieldKey,
          Array.isArray(value) ? [...value] : value,
        ]),
      ),
    };

    setSubmissionError(null);

    navigate(`/bo-suu-tap/${slug}/san-pham/${product.id}/mua-them`, {
      state: navigationState,
    });
  };

  const errorMessage = isProductError
    ? getErrorMessage(productError, "Có lỗi xảy ra khi tải sản phẩm.")
    : isBackgroundsError
      ? getErrorMessage(
          backgroundsError,
          "Có lỗi xảy ra khi tải danh sách nền.",
        )
      : null;

  if (isProductLoading || isBackgroundsLoading || !slug || !productId) {
    return (
      <div className="cbp-page">
        <div className="cbp-loading container">
          <div className="cbp-skeleton cbp-skeleton--left" />
          <div className="cbp-skeleton cbp-skeleton--right" />
        </div>
      </div>
    );
  }

  if (errorMessage || !payload?.collection) {
    return (
      <div className="cbp-page">
        <div className="cbp-error container">
          <FiGrid size={44} />
          <h2>Không thể mở trang chọn nền</h2>
          <p>{errorMessage ?? "Dữ liệu bộ sưu tập không khả dụng."}</p>
          <Link
            to={`/bo-suu-tap/${slug}/san-pham/${productId}/custom`}
            className="cbp-btn-back"
          >
            <FiArrowLeft size={16} /> Quay lại tùy chỉnh
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="cbp-page">
        <div className="cbp-error container">
          <FiGrid size={44} />
          <h2>Không tìm thấy sản phẩm</h2>
          <p>Sản phẩm bạn chọn không tồn tại hoặc đã bị ẩn.</p>
          <Link to={`/bo-suu-tap/${slug}`} className="cbp-btn-back">
            <FiArrowLeft size={16} /> Quay lại bộ sưu tập
          </Link>
        </div>
      </div>
    );
  }

  const productImage = getStaticAssetUrl(product.image);

  return (
    <>
      <SEO
        title={`Chọn nền cho ${product.name}`}
        description={`Chọn nền cho ${product.name} trong bộ sưu tập ${collectionName}.`}
        keywords={`${product.name}, chọn nền, ${collectionName}, Soligant`}
      />

      <div className="cbp-page">
        <div className="container">
          <PageBreadcrumb
            className="cbp-page__breadcrumb"
            items={[
              { label: "Trang chủ", to: "/" },
              { label: "Bộ sưu tập", to: "/bo-suu-tap" },
              { label: collectionName, to: `/bo-suu-tap/${slug}` },
              {
                label: product.name,
                to: `/bo-suu-tap/${slug}/san-pham/${productId}/custom`,
              },
              { label: "Chọn nền" },
            ]}
          />
        </div>

        <div className="container cbp-layout">
          <aside className="cbp-sidebar">
            <div className="cbp-product-card">
              <div className="cbp-product-card__thumb">
                <ImageWithFallback
                  src={productImage}
                  alt={product.name}
                  fallback={
                    <div className="cbp-product-card__placeholder">
                      <FiGrid size={30} />
                    </div>
                  }
                />
              </div>
              <div className="cbp-product-card__body">
                <span className="cbp-product-card__category">
                  <FiTag size={12} />
                  {product.categoryName || "Chưa phân loại"}
                </span>
                <h1 className="cbp-product-card__name">{product.name}</h1>
              </div>
            </div>

            <div className="cbp-summary">
              <h2 className="cbp-summary__title">Nền đã chọn</h2>
              {selectedBackground ? (
                <>
                  <div className="cbp-summary__selected">
                    <ImageWithFallback
                      src={selectedBackgroundImage}
                      alt={selectedBackground.name}
                      className="cbp-summary__selected-img"
                      fallback={
                        <div className="cbp-summary__selected-img cbp-card__placeholder">
                          <FiImage size={18} />
                        </div>
                      }
                    />
                    <div>
                      <p className="cbp-summary__selected-theme">
                        {selectedBackground.themeName}
                      </p>
                      <p className="cbp-summary__selected-name">
                        {selectedBackground.name}
                      </p>
                    </div>
                  </div>
                  {!isRichTextEmpty(selectedBackground.description) && (
                    <RichTextContent
                      value={selectedBackground.description}
                      className="cbp-summary__background-desc"
                    />
                  )}
                </>
              ) : (
                <p className="cbp-summary__empty">Chưa chọn nền nào.</p>
              )}

              {customizerState && (
                <div className="cbp-summary__pricing">
                  <div className="cbp-summary__pricing-row">
                    <span>Tổng Lego tùy chỉnh</span>
                    <strong>{customizerState.totalLegoCount}</strong>
                  </div>
                  <div className="cbp-summary__pricing-row">
                    <span>Lego thêm</span>
                    <strong>
                      {customizerState.selectedAdditionalLegoCount}
                    </strong>
                  </div>
                  <div className="cbp-summary__pricing-row">
                    <span>Tạm tính hiện tại</span>
                    <strong>
                      {customizerState.pricingSummary.total.toLocaleString(
                        "vi-VN",
                      )}{" "}
                      đ
                    </strong>
                  </div>
                </div>
              )}

              {selectedBackground && selectedBackgroundFields.length > 0 && (
                <div className="cbp-summary__fields">
                  <p className="cbp-summary__fields-title">Thông tin đã nhập</p>

                  {selectedBackgroundFields.map((field, index) => {
                    const fieldKey = buildBackgroundFieldKey(
                      index,
                      field.label,
                      field.fieldType,
                    );
                    const value = backgroundFieldValues[fieldKey];

                    return (
                      <div key={fieldKey} className="cbp-summary__field-item">
                        <p className="cbp-summary__field-label">
                          {field.label}
                        </p>

                        {field.fieldType === "image_upload" ? (
                          typeof value === "string" && value.trim() ? (
                            <ImageWithFallback
                              src={value}
                              alt={field.label}
                              className="cbp-summary__field-image"
                              fallback={
                                <p className="cbp-summary__field-empty">
                                  Ảnh không còn khả dụng
                                </p>
                              }
                            />
                          ) : (
                            <p className="cbp-summary__field-empty">
                              Chưa tải ảnh
                            </p>
                          )
                        ) : field.fieldType === "long_text" ? (
                          isRichTextEmpty(
                            typeof value === "string" ? value : "",
                          ) ? (
                            <p className="cbp-summary__field-empty">
                              Chưa nhập nội dung
                            </p>
                          ) : (
                            <RichTextContent
                              value={typeof value === "string" ? value : ""}
                            />
                          )
                        ) : field.fieldType === "select" &&
                          field.selectType === "checkbox" ? (
                          resolveOptionLabels(fieldKey, field).length > 0 ? (
                            <p className="cbp-summary__field-value">
                              {resolveOptionLabels(fieldKey, field).join(", ")}
                            </p>
                          ) : (
                            <p className="cbp-summary__field-empty">
                              Chưa chọn
                            </p>
                          )
                        ) : !isRichTextEmpty(
                            typeof value === "string" ? value : "",
                          ) ? (
                          <p className="cbp-summary__field-value">
                            {String(value)}
                          </p>
                        ) : (
                          <p className="cbp-summary__field-empty">Chưa nhập</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!customizerState && (
                <div className="cbp-summary__error">
                  Vui lòng quay lại bước tùy chỉnh để hoàn tất thêm giỏ hàng
                  hoặc đặt hàng ngay.
                </div>
              )}

              {submissionError && (
                <div className="cbp-summary__error">{submissionError}</div>
              )}

              <div className="cbp-summary__actions">
                <button
                  type="button"
                  className="cbp-summary__cta"
                  onClick={handleContinueToAddons}
                  disabled={!customizerState}
                >
                  Tiếp theo: Chọn option mua thêm
                </button>
              </div>

              <Link
                to={`/bo-suu-tap/${slug}/san-pham/${productId}/custom`}
                className="cbp-btn-back"
                state={location.state}
              >
                <FiArrowLeft size={15} /> Quay lại tùy chỉnh
              </Link>
            </div>
          </aside>

          <section className="cbp-editor">
            <header className="cbp-editor__header">
              <p className="cbp-editor__eyebrow">Chọn nền cho sản phẩm</p>
              <h2 className="cbp-editor__title">
                Chọn hình nền phù hợp cho sản phẩm
              </h2>
              <p className="cbp-editor__desc">
                Bấm vào một hình nền bên dưới để chọn. Bạn có thể thay đổi lựa
                chọn bất kỳ lúc nào trước khi hoàn tất.
              </p>
            </header>

            {backgrounds.length === 0 ? (
              <div className="cbp-empty">
                <FiImage size={40} />
                <p>Chưa có hình nền nào. Vui lòng thêm dữ liệu ở Dashboard.</p>
              </div>
            ) : (
              <>
                {groupedByTheme.map((group) => (
                  <div key={group.themeId} className="cbp-theme-group">
                    <h3 className="cbp-theme-group__title">
                      {group.themeName}
                    </h3>
                    <div className="cbp-grid">
                      {group.items.map((bg) => (
                        <BackgroundCard
                          key={bg.id}
                          background={bg}
                          isSelected={selectedBackgroundId === bg.id}
                          onSelect={() => setSelectedBackgroundId(bg.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {selectedBackground && selectedBackgroundFields.length > 0 && (
                  <div className="cbp-form-section">
                    <h3 className="cbp-form-section__title">
                      Thông tin cần nhập cho nền đã chọn
                    </h3>
                    <p className="cbp-form-section__desc">
                      Điền các trường dưới đây để hoàn tất thông tin cho
                      background này.
                    </p>

                    <div className="cbp-form-fields">
                      {selectedBackgroundFields.map((field, index) => {
                        const fieldKey = buildBackgroundFieldKey(
                          index,
                          field.label,
                          field.fieldType,
                        );
                        const selectedValue = backgroundFieldValues[fieldKey];
                        const selectType = field.selectType || "dropdown";

                        return (
                          <div key={fieldKey} className="cbp-form-field">
                            <label className="cbp-form-field__label">
                              {field.label}
                              {field.required ? " *" : ""}
                            </label>

                            {field.fieldType === "short_text" && (
                              <input
                                className="cbp-input"
                                type="text"
                                placeholder={
                                  field.placeholder || "Nhập nội dung"
                                }
                                value={
                                  typeof selectedValue === "string"
                                    ? selectedValue
                                    : ""
                                }
                                onChange={(event) =>
                                  updateBackgroundFieldValue(
                                    fieldKey,
                                    event.target.value,
                                  )
                                }
                              />
                            )}

                            {field.fieldType === "number" && (
                              <input
                                className="cbp-input"
                                type="number"
                                placeholder={field.placeholder || "Nhập số"}
                                value={
                                  typeof selectedValue === "string"
                                    ? selectedValue
                                    : ""
                                }
                                onChange={(event) =>
                                  updateBackgroundFieldValue(
                                    fieldKey,
                                    event.target.value,
                                  )
                                }
                              />
                            )}

                            {field.fieldType === "date" && (
                              <input
                                className="cbp-input"
                                type="date"
                                value={
                                  typeof selectedValue === "string"
                                    ? selectedValue
                                    : ""
                                }
                                onChange={(event) =>
                                  updateBackgroundFieldValue(
                                    fieldKey,
                                    event.target.value,
                                  )
                                }
                              />
                            )}

                            {field.fieldType === "long_text" && (
                              <RichTextEditor
                                value={
                                  typeof selectedValue === "string"
                                    ? selectedValue
                                    : ""
                                }
                                onChange={(nextValue) =>
                                  updateBackgroundFieldValue(
                                    fieldKey,
                                    nextValue,
                                  )
                                }
                                placeholder={
                                  field.placeholder || "Nhập nội dung chi tiết"
                                }
                                minHeight={150}
                              />
                            )}

                            {field.fieldType === "image_upload" && (
                              <div className="cbp-upload-field">
                                <input
                                  className="cbp-input"
                                  type="file"
                                  accept="image/*"
                                  onChange={(event) =>
                                    onFieldImageSelect(
                                      fieldKey,
                                      event.target.files?.[0],
                                    )
                                  }
                                />

                                {typeof selectedValue === "string" &&
                                  selectedValue.trim() && (
                                    <ImageWithFallback
                                      src={selectedValue}
                                      alt={field.label}
                                      className="cbp-upload-preview"
                                      fallback={
                                        <div
                                          className="cbp-upload-preview"
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            background: "#f8fafc",
                                            color: "#94a3b8",
                                          }}
                                        >
                                          <FiImage size={24} />
                                        </div>
                                      }
                                    />
                                  )}
                              </div>
                            )}

                            {field.fieldType === "select" &&
                              selectType === "dropdown" && (
                                <select
                                  className="cbp-input"
                                  value={
                                    typeof selectedValue === "string"
                                      ? selectedValue
                                      : ""
                                  }
                                  onChange={(event) =>
                                    updateBackgroundFieldValue(
                                      fieldKey,
                                      event.target.value,
                                    )
                                  }
                                >
                                  <option value="">-- Chọn --</option>
                                  {field.options.map((option) => (
                                    <option
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              )}

                            {field.fieldType === "select" &&
                              selectType === "radio" && (
                                <div className="cbp-choice-list">
                                  {field.options.map((option) => (
                                    <label
                                      key={option.value}
                                      className="cbp-choice-item"
                                    >
                                      <input
                                        type="radio"
                                        name={fieldKey}
                                        checked={selectedValue === option.value}
                                        onChange={() =>
                                          updateBackgroundFieldValue(
                                            fieldKey,
                                            option.value,
                                          )
                                        }
                                      />
                                      <span>{option.label}</span>
                                    </label>
                                  ))}
                                </div>
                              )}

                            {field.fieldType === "select" &&
                              selectType === "checkbox" && (
                                <div className="cbp-choice-list">
                                  {field.options.map((option) => {
                                    const selectedValues = Array.isArray(
                                      selectedValue,
                                    )
                                      ? selectedValue
                                      : [];

                                    return (
                                      <label
                                        key={option.value}
                                        className="cbp-choice-item"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selectedValues.includes(
                                            option.value,
                                          )}
                                          onChange={() =>
                                            toggleCheckboxValue(
                                              fieldKey,
                                              option.value,
                                            )
                                          }
                                        />
                                        <span>{option.label}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
};

export default CollectionProductBackgroundPicker;
