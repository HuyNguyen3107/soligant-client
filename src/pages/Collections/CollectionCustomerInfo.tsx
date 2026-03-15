import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckSquare,
  FiFileText,
  FiImage,
  FiShoppingBag,
} from "react-icons/fi";
import {
  PageBreadcrumb,
  RichTextContent,
  RichTextEditor,
  SEO,
} from "../../components/common";
import type { CustomerInfoNavigationState, CustomizedCartItem } from "../../lib/custom-cart";
import {
  buildCustomerOrderFieldKey,
  isCustomerOrderFieldValueEmpty,
  normalizeCustomerOrderFieldValue,
  type CustomerOrderFieldDefinition,
  type CustomerOrderFieldEntry,
  type CustomerOrderFieldValue,
} from "../../lib/customer-order-fields";
import { getErrorMessage } from "../../lib/error";
import { getPublicCustomerOrderFieldsConfig } from "../../services/customer-order-fields.service";
import { useCustomCartStore } from "../../store/custom-cart.store";
import "./CollectionCustomerInfo.css";

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Không thể đọc file ảnh."));
    reader.readAsDataURL(file);
  });

const createInitialFieldValues = (
  activeFields: CustomerOrderFieldDefinition[],
  initialEntries: CustomerOrderFieldEntry[],
) => {
  const initialValueLookup = new Map(
    initialEntries.map((entry) => [entry.key, entry.value] as const),
  );

  return Object.fromEntries(
    activeFields.map((field, index) => {
      const key = buildCustomerOrderFieldKey(index, field.label, field.fieldType);
      return [key, normalizeCustomerOrderFieldValue(field, initialValueLookup.get(key))];
    }),
  ) as Record<string, CustomerOrderFieldValue>;
};

interface CustomerInfoFormProps {
  selectedItems: CustomizedCartItem[];
  configTitle: string;
  configDescription: string;
  activeFields: CustomerOrderFieldDefinition[];
  initialEntries: CustomerOrderFieldEntry[];
  onBack: () => void;
  onSubmit: (entries: CustomerOrderFieldEntry[]) => void;
}

const CustomerInfoForm = ({
  selectedItems,
  configTitle,
  configDescription,
  activeFields,
  initialEntries,
  onBack,
  onSubmit,
}: CustomerInfoFormProps) => {
  const [fieldValues, setFieldValues] = useState<Record<string, CustomerOrderFieldValue>>(() =>
    createInitialFieldValues(activeFields, initialEntries),
  );
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const updateFieldValue = (fieldKey: string, value: CustomerOrderFieldValue) => {
    setSubmissionError(null);
    setFieldValues((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const toggleCheckboxValue = (fieldKey: string, optionValue: string) => {
    setFieldValues((prev) => {
      const current = prev[fieldKey];
      const currentValues = Array.isArray(current) ? current : [];

      if (currentValues.includes(optionValue)) {
        return {
          ...prev,
          [fieldKey]: currentValues.filter((value) => value !== optionValue),
        };
      }

      return {
        ...prev,
        [fieldKey]: [...currentValues, optionValue],
      };
    });
  };

  const handleImageSelect = async (fieldKey: string, file?: File | null) => {
    if (!file) {
      updateFieldValue(fieldKey, "");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSubmissionError("Chỉ chấp nhận file ảnh cho trường tải ảnh.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      updateFieldValue(fieldKey, dataUrl);
    } catch (readError) {
      setSubmissionError(
        readError instanceof Error ? readError.message : "Không thể đọc file ảnh.",
      );
    }
  };

  const validateBeforeContinue = () => {
    for (const [index, field] of activeFields.entries()) {
      if (!field.required) {
        continue;
      }

      const fieldKey = buildCustomerOrderFieldKey(index, field.label, field.fieldType);
      const value = fieldValues[fieldKey];

      if (isCustomerOrderFieldValueEmpty(field, value)) {
        return `Vui lòng nhập thông tin cho trường "${field.label}".`;
      }
    }

    return null;
  };

  const buildEntriesForOrder = () => {
    return activeFields
      .map((field, index) => {
        const key = buildCustomerOrderFieldKey(index, field.label, field.fieldType);
        const normalizedValue = normalizeCustomerOrderFieldValue(field, fieldValues[key]);

        return {
          key,
          label: field.label,
          fieldType: field.fieldType,
          placeholder: field.placeholder,
          required: field.required,
          options: field.options,
          sortOrder: field.sortOrder,
          selectType: field.selectType,
          value: normalizedValue,
        } as CustomerOrderFieldEntry;
      })
      .filter((entry) => !isCustomerOrderFieldValueEmpty(entry, entry.value) || entry.required)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  };

  const handleContinue = () => {
    const validationMessage = validateBeforeContinue();

    if (validationMessage) {
      setSubmissionError(validationMessage);
      return;
    }

    onSubmit(buildEntriesForOrder());
  };

  return (
    <div className="container ccif-layout">
      <aside className="ccif-sidebar">
        <h2 className="ccif-sidebar__title">Sản phẩm đã chọn</h2>
        <p className="ccif-sidebar__count">{selectedItems.length} sản phẩm trong đơn</p>

        <div className="ccif-selected-list">
          {selectedItems.map((item) => (
            <article key={item.id} className="ccif-selected-item">
              <strong>{item.product.name}</strong>
              <span>{item.collectionName}</span>
            </article>
          ))}
        </div>

        <div className="ccif-sidebar__actions">
          <button type="button" className="ccif-btn ccif-btn--ghost" onClick={onBack}>
            <FiArrowLeft size={15} /> Quay lại
          </button>
          <button type="button" className="ccif-btn" onClick={handleContinue}>
            Tiếp theo: Thông tin đơn hàng
          </button>
        </div>

        {submissionError && <div className="ccif-summary__error">{submissionError}</div>}
      </aside>

      <section className="ccif-form-wrap">
        <header className="ccif-form-wrap__header">
          <p className="ccif-form-wrap__eyebrow">Bước bổ sung trước khi chốt đơn</p>
          <h1>{configTitle || "Thông tin khách hàng"}</h1>
          {configDescription && <RichTextContent value={configDescription} />}
        </header>

        {activeFields.length === 0 ? (
          <div className="ccif-empty-form">
            <FiCheckSquare size={38} />
            <p>Hiện tại chưa có trường thông tin bắt buộc. Bạn có thể tiếp tục ngay.</p>
          </div>
        ) : (
          <div className="ccif-form-grid">
            {activeFields.map((field, index) => {
              const fieldKey = buildCustomerOrderFieldKey(index, field.label, field.fieldType);
              const selectedValue = fieldValues[fieldKey];
              const selectType = field.selectType || "dropdown";

              return (
                <div key={fieldKey} className="ccif-field">
                  <label className="ccif-field__label">
                    {field.label}
                    {field.required ? " *" : ""}
                  </label>

                  {field.fieldType === "short_text" && (
                    <input
                      className="ccif-input"
                      type="text"
                      placeholder={field.placeholder || "Nhập nội dung"}
                      value={typeof selectedValue === "string" ? selectedValue : ""}
                      onChange={(event) => updateFieldValue(fieldKey, event.target.value)}
                    />
                  )}

                  {field.fieldType === "number" && (
                    <input
                      className="ccif-input"
                      type="number"
                      placeholder={field.placeholder || "Nhập số"}
                      value={typeof selectedValue === "string" ? selectedValue : ""}
                      onChange={(event) => updateFieldValue(fieldKey, event.target.value)}
                    />
                  )}

                  {field.fieldType === "date" && (
                    <input
                      className="ccif-input"
                      type="date"
                      value={typeof selectedValue === "string" ? selectedValue : ""}
                      onChange={(event) => updateFieldValue(fieldKey, event.target.value)}
                    />
                  )}

                  {field.fieldType === "long_text" && (
                    <RichTextEditor
                      value={typeof selectedValue === "string" ? selectedValue : ""}
                      onChange={(nextValue) => updateFieldValue(fieldKey, nextValue)}
                      placeholder={field.placeholder || "Nhập nội dung chi tiết"}
                      minHeight={150}
                    />
                  )}

                  {field.fieldType === "image_upload" && (
                    <div className="ccif-upload-field">
                      <input
                        className="ccif-input"
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleImageSelect(fieldKey, event.target.files?.[0])}
                      />

                      {typeof selectedValue === "string" && selectedValue.trim() && (
                        <img src={selectedValue} alt={field.label} className="ccif-upload-preview" />
                      )}

                      {!selectedValue && (
                        <p className="ccif-field__hint">
                          <FiImage size={12} /> Chỉ chấp nhận file ảnh.
                        </p>
                      )}
                    </div>
                  )}

                  {field.fieldType === "select" && selectType === "dropdown" && (
                    <select
                      className="ccif-input"
                      value={typeof selectedValue === "string" ? selectedValue : ""}
                      onChange={(event) => updateFieldValue(fieldKey, event.target.value)}
                    >
                      <option value="">-- Chọn --</option>
                      {field.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.fieldType === "select" && selectType === "radio" && (
                    <div className="ccif-choice-list">
                      {field.options.map((option) => (
                        <label key={option.value} className="ccif-choice-item">
                          <input
                            type="radio"
                            name={fieldKey}
                            checked={selectedValue === option.value}
                            onChange={() => updateFieldValue(fieldKey, option.value)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {field.fieldType === "select" && selectType === "checkbox" && (
                    <div className="ccif-choice-list">
                      {field.options.map((option) => {
                        const selectedValues = Array.isArray(selectedValue) ? selectedValue : [];

                        return (
                          <label key={option.value} className="ccif-choice-item">
                            <input
                              type="checkbox"
                              checked={selectedValues.includes(option.value)}
                              onChange={() => toggleCheckboxValue(fieldKey, option.value)}
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
        )}
      </section>
    </div>
  );
};

const CollectionCustomerInfo = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const cartItems = useCustomCartStore((state) => state.items);
  const storedSelectedItemIds = useCustomCartStore((state) => state.selectedItemIds);
  const setSelectedItemIds = useCustomCartStore((state) => state.setSelectedItemIds);
  const storedCustomerInfoEntries = useCustomCartStore((state) => state.customerInfoEntries);
  const setCustomerInfoEntries = useCustomCartStore((state) => state.setCustomerInfoEntries);

  const locationState = location.state as CustomerInfoNavigationState | null;

  const itemLookup = useMemo(
    () => new Map(cartItems.map((item) => [item.id, item])),
    [cartItems],
  );

  const effectiveSelectedIds = useMemo(() => {
    const candidateIds =
      locationState?.selectedItemIds?.length
        ? locationState.selectedItemIds
        : storedSelectedItemIds.length > 0
          ? storedSelectedItemIds
          : cartItems.map((item) => item.id);

    return candidateIds.filter((itemId) => itemLookup.has(itemId));
  }, [locationState, storedSelectedItemIds, cartItems, itemLookup]);

  useEffect(() => {
    const isSameSelection =
      effectiveSelectedIds.length === storedSelectedItemIds.length &&
      effectiveSelectedIds.every((itemId, index) => storedSelectedItemIds[index] === itemId);

    if (!isSameSelection) {
      setSelectedItemIds(effectiveSelectedIds);
    }
  }, [effectiveSelectedIds, setSelectedItemIds, storedSelectedItemIds]);

  const selectedItems = useMemo(
    () =>
      effectiveSelectedIds
        .map((itemId) => itemLookup.get(itemId))
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [effectiveSelectedIds, itemLookup],
  );

  const initialEntries = useMemo(() => {
    if (locationState?.customerInfoEntries && locationState.customerInfoEntries.length > 0) {
      return locationState.customerInfoEntries;
    }

    return storedCustomerInfoEntries;
  }, [locationState, storedCustomerInfoEntries]);

  const {
    data: config,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["public-customer-order-fields-config"],
    queryFn: getPublicCustomerOrderFieldsConfig,
    retry: false,
  });

  const activeFields = useMemo(
    () =>
      config?.isActive
        ? config.fields.slice().sort((left, right) => left.sortOrder - right.sortOrder)
        : [],
    [config],
  );

  const formResetKey = useMemo(
    () =>
      JSON.stringify(activeFields.map((field) => [field.label, field.fieldType, field.sortOrder])) +
      JSON.stringify(initialEntries.map((entry) => [entry.key, entry.value])),
    [activeFields, initialEntries],
  );

  const handleSubmit = (entries: CustomerOrderFieldEntry[]) => {
    setCustomerInfoEntries(entries);

    navigate("/thong-tin-don-hang", {
      state: {
        selectedItemIds: selectedItems.map((item) => item.id),
        customerInfoEntries: entries,
      },
    });
  };

  if (selectedItems.length === 0) {
    return (
      <>
        <SEO
          title="Thông tin khách hàng"
          description="Điền thông tin khách hàng trước khi chuyển sang bước thông tin đơn hàng."
          keywords="thông tin khách hàng, đặt hàng, Soligant"
        />

        <div className="ccif-page">
          <div className="container ccif-empty-state">
            <FiShoppingBag size={42} />
            <h1>Chưa có sản phẩm nào được chọn</h1>
            <p>
              Hãy chọn ít nhất một sản phẩm trong giỏ hàng trước khi điền thông tin khách hàng.
            </p>
            <Link to="/bo-suu-tap" className="ccif-btn">
              <FiArrowLeft size={16} /> Quay lại bộ sưu tập
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="ccif-page">
        <div className="container ccif-loading">Đang tải biểu mẫu thông tin khách hàng...</div>
      </div>
    );
  }

  if (isError || !config) {
    return (
      <div className="ccif-page">
        <div className="container ccif-error">
          <FiFileText size={44} />
          <h2>Không thể mở bước thông tin khách hàng</h2>
          <p>{getErrorMessage(error, "Có lỗi xảy ra khi tải cấu hình biểu mẫu.")}</p>
          <div className="ccif-error__actions">
            <button
              type="button"
              className="ccif-btn ccif-btn--ghost"
              onClick={() => navigate(-1)}
            >
              <FiArrowLeft size={15} /> Quay lại
            </button>
            <button
              type="button"
              className="ccif-btn"
              onClick={() =>
                navigate("/thong-tin-don-hang", {
                  state: {
                    selectedItemIds: selectedItems.map((item) => item.id),
                    customerInfoEntries: initialEntries,
                  },
                })
              }
            >
              Bỏ qua và đến thông tin đơn hàng
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Thông tin khách hàng"
        description="Điền thông tin khách hàng trước khi chuyển sang bước thông tin đơn hàng."
        keywords="thông tin khách hàng, form đặt hàng, Soligant"
      />

      <div className="ccif-page">
        <div className="container">
          <PageBreadcrumb
            className="ccif-page__breadcrumb"
            items={[
              { label: "Trang chủ", to: "/" },
              { label: "Bộ sưu tập", to: "/bo-suu-tap" },
              { label: "Thông tin khách hàng" },
            ]}
          />
        </div>

        <CustomerInfoForm
          key={formResetKey}
          selectedItems={selectedItems}
          configTitle={config.title}
          configDescription={config.description}
          activeFields={activeFields}
          initialEntries={initialEntries}
          onBack={() => navigate(-1)}
          onSubmit={handleSubmit}
        />
      </div>
    </>
  );
};

export default CollectionCustomerInfo;
