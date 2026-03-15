import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  FiCalendar,
  FiChevronDown,
  FiChevronUp,
  FiHash,
  FiList,
  FiPlus,
  FiSave,
  FiType,
  FiUpload,
  FiX,
} from "react-icons/fi";
import { RichTextEditor } from "../../../components/common";
import { getErrorMessage } from "../../../lib/error";
import { hasPermission } from "../../../lib/permissions";
import { useAuthStore } from "../../../store/auth.store";
import {
  getCustomerOrderFieldsConfig,
  updateCustomerOrderFieldsConfig,
} from "../../../services/customer-order-fields.service";
import type {
  CustomerOrderFieldForm,
  CustomerOrderFieldOption,
  CustomerOrderFieldType,
  CustomerOrderFieldsFormState,
} from "../types";
import {
  isRichTextEmpty,
  normalizeRichTextForStorage,
} from "../../../lib/rich-text";

const FIELD_TYPE_MAP: Record<
  CustomerOrderFieldType,
  { label: string; icon: ReactNode }
> = {
  short_text: { label: "Văn bản ngắn", icon: <FiType size={14} /> },
  long_text: { label: "Văn bản dài", icon: <FiType size={14} /> },
  select: { label: "Lựa chọn (Select)", icon: <FiList size={14} /> },
  image_upload: { label: "Tải ảnh lên", icon: <FiUpload size={14} /> },
  number: { label: "Số", icon: <FiHash size={14} /> },
  date: { label: "Ngày tháng", icon: <FiCalendar size={14} /> },
};

const EMPTY_FIELD: CustomerOrderFieldForm = {
  label: "",
  fieldType: "short_text",
  placeholder: "",
  required: false,
  options: [],
};

const INITIAL_FORM: CustomerOrderFieldsFormState = {
  title: "Thông tin khách hàng",
  description: "",
  fields: [],
  isActive: true,
};

const mapConfigToForm = (
  config: Awaited<ReturnType<typeof getCustomerOrderFieldsConfig>> | undefined,
): CustomerOrderFieldsFormState => {
  if (!config) {
    return { ...INITIAL_FORM, fields: [] };
  }

  return {
    title: config.title || INITIAL_FORM.title,
    description: config.description,
    fields: config.fields
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((field) => ({
        label: field.label,
        fieldType: field.fieldType,
        placeholder: field.placeholder,
        required: field.required,
        options: [...field.options],
        selectType: field.selectType,
      })),
    isActive: config.isActive,
  };
};

const CustomerOrderFieldsTab = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const canEdit = hasPermission(currentUser, "customer-order-fields.edit");

  const {
    data: config,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["customer-order-fields-config"],
    queryFn: getCustomerOrderFieldsConfig,
  });

  const [form, setForm] = useState<CustomerOrderFieldsFormState>({ ...INITIAL_FORM });

  useEffect(() => {
    setForm(mapConfigToForm(config));
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: updateCustomerOrderFieldsConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-order-fields-config"] });
      toast.success("Đã lưu cấu hình thông tin khách hàng.");
    },
    onError: (saveError) => {
      toast.error(
        getErrorMessage(saveError, "Không thể lưu cấu hình thông tin khách hàng."),
      );
    },
  });

  const requiredFieldCount = useMemo(
    () => form.fields.filter((field) => field.required).length,
    [form.fields],
  );

  const updateField = <K extends keyof CustomerOrderFieldsFormState>(
    key: K,
    value: CustomerOrderFieldsFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addFormField = () => {
    setForm((prev) => ({
      ...prev,
      fields: [...prev.fields, { ...EMPTY_FIELD, options: [] }],
    }));
  };

  const updateFormField = (
    index: number,
    key: keyof CustomerOrderFieldForm,
    value: unknown,
  ) => {
    setForm((prev) => {
      const fields = [...prev.fields];
      const nextField = { ...fields[index], [key]: value };

      if (key === "fieldType" && value !== "select") {
        nextField.options = [];
        nextField.selectType = undefined;
      }

      if (key === "fieldType" && value === "select" && nextField.options.length === 0) {
        nextField.options = [{ label: "", value: "" }];
        nextField.selectType = "dropdown";
      }

      fields[index] = nextField;
      return { ...prev, fields };
    });
  };

  const removeFormField = (index: number) => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, fieldIndex) => fieldIndex !== index),
    }));
  };

  const moveField = (index: number, direction: "up" | "down") => {
    setForm((prev) => {
      const fields = [...prev.fields];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= fields.length) {
        return prev;
      }

      [fields[index], fields[targetIndex]] = [fields[targetIndex], fields[index]];
      return { ...prev, fields };
    });
  };

  const addOption = (fieldIndex: number) => {
    setForm((prev) => {
      const fields = [...prev.fields];
      fields[fieldIndex] = {
        ...fields[fieldIndex],
        options: [...fields[fieldIndex].options, { label: "", value: "" }],
      };
      return { ...prev, fields };
    });
  };

  const updateOption = (
    fieldIndex: number,
    optionIndex: number,
    key: keyof CustomerOrderFieldOption,
    value: string,
  ) => {
    setForm((prev) => {
      const fields = [...prev.fields];
      const options = [...fields[fieldIndex].options];
      options[optionIndex] = { ...options[optionIndex], [key]: value };

      if (key === "label" && !options[optionIndex].value) {
        options[optionIndex].value = value.toLowerCase().replace(/\s+/g, "_");
      }

      fields[fieldIndex] = { ...fields[fieldIndex], options };
      return { ...prev, fields };
    });
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    setForm((prev) => {
      const fields = [...prev.fields];
      fields[fieldIndex] = {
        ...fields[fieldIndex],
        options: fields[fieldIndex].options.filter((_, idx) => idx !== optionIndex),
      };
      return { ...prev, fields };
    });
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canEdit) {
      toast.error("Bạn không có quyền cập nhật cấu hình thông tin khách hàng.");
      return;
    }

    const title = form.title.trim();
    if (!title) {
      toast.error("Tiêu đề form thông tin khách hàng không được để trống.");
      return;
    }

    const description = normalizeRichTextForStorage(form.description);

    if (!isRichTextEmpty(description) && description.length > 5000) {
      toast.error("Mô tả không được vượt quá 5000 ký tự.");
      return;
    }

    for (let index = 0; index < form.fields.length; index += 1) {
      const field = form.fields[index];

      if (!field.label.trim()) {
        toast.error(`Trường #${index + 1}: Tên trường không được để trống.`);
        return;
      }

      if (field.fieldType === "select") {
        const validOptions = field.options.filter(
          (option) => option.label.trim() && option.value.trim(),
        );

        if (validOptions.length === 0) {
          toast.error(`Trường "${field.label}": Phải có ít nhất 1 lựa chọn.`);
          return;
        }
      }
    }

    await saveMutation.mutateAsync({
      title,
      description,
      fields: form.fields.map((field, index) => ({
        label: field.label.trim(),
        fieldType: field.fieldType,
        placeholder: field.placeholder.trim(),
        required: field.required,
        options:
          field.fieldType === "select"
            ? field.options
                .filter((option) => option.label.trim() && option.value.trim())
                .map((option) => ({
                  label: option.label.trim(),
                  value: option.value.trim(),
                }))
            : [],
        selectType: field.fieldType === "select" ? field.selectType || "dropdown" : undefined,
        sortOrder: index,
      })),
      isActive: form.isActive,
    });
  };

  if (isLoading) {
    return (
      <div className="tab-panel promo-root">
        <div className="tab-empty">
          <FiList size={40} className="tab-empty-icon" />
          <p>Đang tải cấu hình thông tin khách hàng...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="tab-panel promo-root">
        <div className="tab-empty">
          <FiList size={40} className="tab-empty-icon" />
          <p>{getErrorMessage(error, "Không thể tải cấu hình thông tin khách hàng.")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel promo-root">
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Thông tin khách hàng</h2>
          <p className="tab-subtitle">
            Cấu hình các trường khách hàng cần điền trước bước thông tin đơn hàng.
          </p>
        </div>
        {canEdit && (
          <button
            className="btn-primary"
            type="submit"
            form="customer-order-fields-form"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <span className="btn-spinner" /> Đang lưu...
              </>
            ) : (
              <>
                <FiSave size={14} /> Lưu cấu hình
              </>
            )}
          </button>
        )}
      </div>

      <section className="lc-stats">
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">
            <FiList size={15} />
          </span>
          <div>
            <strong>{form.fields.length}</strong>
            <span>Tổng trường</span>
          </div>
        </div>
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">
            <FiType size={15} />
          </span>
          <div>
            <strong>{requiredFieldCount}</strong>
            <span>Trường bắt buộc</span>
          </div>
        </div>
      </section>

      <form id="customer-order-fields-form" className="tab-content" onSubmit={handleSave}>
        <section className="tab-panel" style={{ margin: 0 }}>
          <div className="form-group">
            <label className="form-label">Tiêu đề form *</label>
            <input
              className="form-input"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="VD: Thông tin nhận hàng"
              disabled={!canEdit}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mô tả form</label>
            <RichTextEditor
              value={form.description}
              onChange={(nextValue) => updateField("description", nextValue)}
              placeholder="Mô tả ngắn cho khách hàng trước khi điền form..."
              minHeight={140}
            />
          </div>

          <div className="form-group">
            <label className="promo-radio" style={{ cursor: canEdit ? "pointer" : "default" }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => updateField("isActive", event.target.checked)}
                disabled={!canEdit}
              />
              <span>Bật bước điền thông tin khách hàng</span>
            </label>
          </div>

          <div className="bgt-fields-section">
            <div className="bgt-fields-header">
              <h4 className="bgt-fields-title">
                Trường thông tin khách hàng
                <span className="bgt-fields-count">{form.fields.length} trường</span>
              </h4>
              {canEdit && (
                <button type="button" className="btn-secondary" onClick={addFormField}>
                  <FiPlus size={14} /> Thêm trường
                </button>
              )}
            </div>

            {form.fields.length === 0 && (
              <div className="bgt-fields-empty">
                <FiList size={24} />
                <p>Chưa có trường nào. Nhấn "Thêm trường" để bắt đầu cấu hình form.</p>
              </div>
            )}

            {form.fields.map((field, index) => (
              <div key={`${field.fieldType}-${index}`} className="bgt-field-card">
                <div className="bgt-field-card__header">
                  <span className="bgt-field-card__index">#{index + 1}</span>
                  <span className="bgt-field-card__type-badge">
                    {FIELD_TYPE_MAP[field.fieldType]?.icon}
                    {FIELD_TYPE_MAP[field.fieldType]?.label}
                  </span>
                  {canEdit && (
                    <div className="bgt-field-card__actions">
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => moveField(index, "up")}
                        disabled={index === 0}
                        title="Di chuyển lên"
                        style={{ background: "#f1f5f9", color: "#475569" }}
                      >
                        <FiChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => moveField(index, "down")}
                        disabled={index === form.fields.length - 1}
                        title="Di chuyển xuống"
                        style={{ background: "#f1f5f9", color: "#475569" }}
                      >
                        <FiChevronDown size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-del"
                        onClick={() => removeFormField(index)}
                        title="Xóa trường"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="bgt-field-card__body">
                  <div className="bgt-field-row">
                    <div className="form-group" style={{ flex: 2 }}>
                      <label className="form-label">Tên trường *</label>
                      <input
                        className="form-input"
                        value={field.label}
                        onChange={(event) =>
                          updateFormField(index, "label", event.target.value)
                        }
                        placeholder="VD: Họ và tên"
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Loại trường</label>
                      <select
                        className="form-input"
                        value={field.fieldType}
                        onChange={(event) =>
                          updateFormField(index, "fieldType", event.target.value)
                        }
                        disabled={!canEdit}
                      >
                        {Object.entries(FIELD_TYPE_MAP).map(([value, meta]) => (
                          <option key={value} value={value}>
                            {meta.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bgt-field-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Placeholder</label>
                      <input
                        className="form-input"
                        value={field.placeholder}
                        onChange={(event) =>
                          updateFormField(index, "placeholder", event.target.value)
                        }
                        placeholder="Gợi ý cho người dùng..."
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 0, minWidth: "fit-content" }}>
                      <label className="form-label">&nbsp;</label>
                      <label
                        className="promo-radio"
                        style={{ cursor: canEdit ? "pointer" : "default", padding: "8px 0" }}
                      >
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(event) =>
                            updateFormField(index, "required", event.target.checked)
                          }
                          disabled={!canEdit}
                        />
                        <span>Bắt buộc</span>
                      </label>
                    </div>
                  </div>

                  {field.fieldType === "select" && (
                    <div className="bgt-options-section">
                      <div className="bgt-field-row" style={{ marginBottom: 16 }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Kiểu hiển thị *</label>
                          <select
                            className="form-input"
                            value={field.selectType || "dropdown"}
                            onChange={(event) =>
                              updateFormField(index, "selectType", event.target.value)
                            }
                            disabled={!canEdit}
                          >
                            <option value="dropdown">Dropdown (Chọn 1)</option>
                            <option value="radio">Radio (Chọn 1)</option>
                            <option value="checkbox">Checkbox (Chọn nhiều)</option>
                          </select>
                        </div>
                      </div>

                      <label className="form-label">Các lựa chọn *</label>
                      {field.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="bgt-option-row">
                          <input
                            className="form-input"
                            value={option.label}
                            onChange={(event) =>
                              updateOption(index, optionIndex, "label", event.target.value)
                            }
                            placeholder={`Lựa chọn ${optionIndex + 1}`}
                            disabled={!canEdit}
                          />
                          <input
                            className="form-input"
                            value={option.value}
                            onChange={(event) =>
                              updateOption(index, optionIndex, "value", event.target.value)
                            }
                            placeholder="Giá trị"
                            style={{ maxWidth: 150 }}
                            disabled={!canEdit}
                          />
                          {canEdit && field.options.length > 1 && (
                            <button
                              type="button"
                              className="btn-icon btn-del"
                              onClick={() => removeOption(index, optionIndex)}
                              title="Xóa lựa chọn"
                            >
                              <FiX size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      {canEdit && (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => addOption(index)}
                          style={{ marginTop: 4 }}
                        >
                          <FiPlus size={12} /> Thêm lựa chọn
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {canEdit && (
            <div className="modal-footer" style={{ marginTop: 16 }}>
              <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <>
                    <span className="btn-spinner" /> Đang lưu...
                  </>
                ) : (
                  <>
                    <FiSave size={14} /> Lưu cấu hình
                  </>
                )}
              </button>
            </div>
          )}
        </section>
      </form>
    </div>
  );
};

export default CustomerOrderFieldsTab;
