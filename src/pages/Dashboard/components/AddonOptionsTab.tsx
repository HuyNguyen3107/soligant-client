import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiEdit2,
  FiImage,
  FiLink,
  FiPlus,
  FiSave,
  FiTag,
  FiTrash2,
  FiType,
  FiX,
} from "react-icons/fi";
import { getErrorMessage } from "../../../lib/error";
import { hasPermission } from "../../../lib/permissions";
import { useAuthStore } from "../../../store/auth.store";
import { RichTextContent, RichTextEditor } from "../../../components/common";
import {
  createAddonOption,
  deleteAddonOption,
  getAddonOptions,
  updateAddonOption,
} from "../../../services/addon-options.service";
import { getLegoFrameVariants } from "../../../services/lego-frame-variants.service";
import { getBearVariants } from "../../../services/bear-variants.service";
import type {
  AddonOptionFieldForm,
  AddonOptionFieldType,
  AddonOptionFormState,
  AddonOptionRow,
  AddonOptionType,
} from "../types";
import {
  normalizeRichTextForStorage,
  toRichTextPlainText,
} from "../../../lib/rich-text";

const OPTION_TYPE_LABELS: Record<AddonOptionType, string> = {
  basic: "Mua thêm cơ bản",
  customizable: "Ấn phẩm tùy chỉnh",
};

const FIELD_TYPE_LABELS: Record<AddonOptionFieldType, string> = {
  image: "Ảnh",
  link: "Link",
  text: "Text",
};

const EMPTY_FIELD: AddonOptionFieldForm = {
  label: "",
  fieldType: "text",
  placeholder: "",
  required: false,
};

const INITIAL_FORM: AddonOptionFormState = {
  name: "",
  description: "",
  optionType: "basic",
  price: "0",
  applicableProductIds: [],
  applicableProductType: "lego",
  fields: [],
  isActive: true,
};

const formatMoney = (value: number) =>
  `${new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.floor(value)))}đ`;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const AddonOptionsTab = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  const canCreate = hasPermission(currentUser, "addon-options.create");
  const canEdit = hasPermission(currentUser, "addon-options.edit");
  const canDelete = hasPermission(currentUser, "addon-options.delete");

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingOption, setEditingOption] = useState<AddonOptionRow | null>(
    null,
  );
  const [deletingOption, setDeletingOption] = useState<AddonOptionRow | null>(
    null,
  );
  const [form, setForm] = useState<AddonOptionFormState>({ ...INITIAL_FORM });

  const { data: addonOptions = [] } = useQuery({
    queryKey: ["addon-options"],
    queryFn: getAddonOptions,
  });

  const { data: legoFrameVariants = [] } = useQuery({
    queryKey: ["lego-frame-variants"],
    queryFn: getLegoFrameVariants,
  });

  const { data: bearVariants = [] } = useQuery({
    queryKey: ["bear-variants"],
    queryFn: getBearVariants,
  });

  const variantLookup = useMemo(() => {
    const lookup = new Map<string, { name: string }>();

    legoFrameVariants.forEach((variant) => {
      lookup.set(variant.id, { name: variant.name });
    });

    bearVariants.forEach((variant) => {
      lookup.set(variant.id, { name: variant.name });
    });

    return lookup;
  }, [bearVariants, legoFrameVariants]);

  interface ProductVariant {
    id: string;
    collectionId: string;
    collectionName: string;
    categoryName: string;
    name: string;
    price: number;
  }

  const variantsByCollection = useMemo(() => {
    const sourceVariants: ProductVariant[] =
      form.applicableProductType === "bear"
        ? (bearVariants as ProductVariant[])
        : (legoFrameVariants as ProductVariant[]);

    const groups = new Map<
      string,
      { collectionName: string; items: ProductVariant[] }
    >();

    sourceVariants.forEach((variant) => {
      const key = variant.collectionId || variant.collectionName || "default";
      const current = groups.get(key);

      if (current) {
        current.items.push(variant);
        return;
      }

      groups.set(key, {
        collectionName: variant.collectionName || "Chưa có bộ sưu tập",
        items: [variant],
      });
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      items: [...group.items].sort((left, right) => {
        const leftLabel = `${left.categoryName} ${left.name}`.trim();
        const rightLabel = `${right.categoryName} ${right.name}`.trim();
        return leftLabel.localeCompare(rightLabel, "vi");
      }),
    }));
  }, [form.applicableProductType, bearVariants, legoFrameVariants]);

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      data: Parameters<typeof createAddonOption>[0];
    }) => {
      if (payload.id) {
        return updateAddonOption(payload.id, payload.data);
      }

      return createAddonOption(payload.data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["addon-options"] });
      toast.success(
        variables.id
          ? "Đã cập nhật option mua thêm."
          : "Đã tạo option mua thêm mới.",
      );
      closeModal();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể lưu option mua thêm."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAddonOption,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addon-options"] });
      toast.success("Đã xóa option mua thêm.");
      setDeletingOption(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể xóa option mua thêm."));
    },
  });

  const filteredOptions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return addonOptions;
    }

    return addonOptions.filter((option) => {
      const optionText = [
        option.name,
        toRichTextPlainText(option.description),
        OPTION_TYPE_LABELS[option.optionType],
      ]
        .join(" ")
        .toLowerCase();

      return optionText.includes(keyword);
    });
  }, [addonOptions, search]);

  const updateField = <K extends keyof AddonOptionFormState>(
    key: K,
    value: AddonOptionFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const closeModal = () => {
    setModal(null);
    setEditingOption(null);
    setForm({ ...INITIAL_FORM });
  };

  const openCreate = () => {
    if (!canCreate) {
      toast.error("Bạn không có quyền tạo option mua thêm.");
      return;
    }

    setEditingOption(null);
    setForm({ ...INITIAL_FORM });
    setModal("create");
  };

  const openEdit = (option: AddonOptionRow) => {
    if (!canEdit) {
      toast.error("Bạn không có quyền chỉnh sửa option mua thêm.");
      return;
    }

    setEditingOption(option);
    setForm({
      name: option.name,
      description: option.description,
      optionType: option.optionType,
      price: String(option.price),
      applicableProductIds: option.applicableProductIds,
      applicableProductType: option.applicableProductType ?? "lego",
      fields:
        option.optionType === "customizable"
          ? option.fields
              .slice()
              .sort((left, right) => left.sortOrder - right.sortOrder)
              .map((field) => ({
                label: field.label,
                fieldType: field.fieldType,
                placeholder: field.placeholder,
                required: field.required,
              }))
          : [],
      isActive: option.isActive,
    });
    setModal("edit");
  };

  const setOptionType = (nextType: AddonOptionType) => {
    setForm((prev) => ({
      ...prev,
      optionType: nextType,
      fields:
        nextType === "customizable"
          ? prev.fields.length > 0
            ? prev.fields
            : [{ ...EMPTY_FIELD }]
          : [],
    }));
  };

  const toggleApplicableProduct = (productId: string) => {
    setForm((prev) => {
      const exists = prev.applicableProductIds.includes(productId);

      return {
        ...prev,
        applicableProductIds: exists
          ? prev.applicableProductIds.filter((id) => id !== productId)
          : [...prev.applicableProductIds, productId],
      };
    });
  };

  const addField = () => {
    setForm((prev) => ({
      ...prev,
      fields: [...prev.fields, { ...EMPTY_FIELD }],
    }));
  };

  const updateCustomField = (
    index: number,
    key: keyof AddonOptionFieldForm,
    value: string | boolean,
  ) => {
    setForm((prev) => {
      const nextFields = [...prev.fields];
      nextFields[index] = {
        ...nextFields[index],
        [key]: value,
      };

      return {
        ...prev,
        fields: nextFields,
      };
    });
  };

  const removeCustomField = (index: number) => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, fieldIndex) => fieldIndex !== index),
    }));
  };

  const renderApplicableProducts = (option: AddonOptionRow) => {
    if (option.applicableProductIds.length === 0) {
      return "Tất cả sản phẩm";
    }

    const productNames = option.applicableProductIds
      .map((productId) => variantLookup.get(productId)?.name)
      .filter((name): name is string => Boolean(name));

    if (productNames.length === 0) {
      return `${option.applicableProductIds.length} sản phẩm đã chọn`;
    }

    if (productNames.length <= 2) {
      return productNames.join(", ");
    }

    return `${productNames.slice(0, 2).join(", ")} +${productNames.length - 2} sản phẩm`;
  };

  const renderOptionSummary = (option: AddonOptionRow) => {
    if (option.optionType === "basic") {
      return "Hiển thị tên, mô tả và giá.";
    }

    if (option.fields.length === 0) {
      return "Ấn phẩm tùy chỉnh chưa có trường.";
    }

    return option.fields
      .slice()
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((field) => `${FIELD_TYPE_LABELS[field.fieldType]}: ${field.label}`)
      .join(" | ");
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (modal === "create" && !canCreate) {
      toast.error("Bạn không có quyền tạo option mua thêm.");
      return;
    }

    if (modal === "edit" && !canEdit) {
      toast.error("Bạn không có quyền chỉnh sửa option mua thêm.");
      return;
    }

    const name = form.name.trim();
    if (!name) {
      toast.error("Tên option mua thêm không được để trống.");
      return;
    }

    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Giá option mua thêm không hợp lệ.");
      return;
    }

    if (form.optionType === "customizable") {
      if (form.fields.length === 0) {
        toast.error("Ấn phẩm tùy chỉnh phải có ít nhất 1 trường.");
        return;
      }

      for (let index = 0; index < form.fields.length; index += 1) {
        const field = form.fields[index];

        if (!field.label.trim()) {
          toast.error(`Trường #${index + 1}: Tên trường không được để trống.`);
          return;
        }
      }
    }

    await saveMutation.mutateAsync({
      id: editingOption?.id,
      data: {
        name,
        description: normalizeRichTextForStorage(form.description),
        optionType: form.optionType,
        price: Math.max(0, Math.floor(price)),
        applicableProductIds: form.applicableProductIds,
        applicableProductType: form.applicableProductType,
        fields:
          form.optionType === "customizable"
            ? form.fields.map((field, index) => ({
                label: field.label.trim(),
                fieldType: field.fieldType,
                placeholder: field.placeholder.trim(),
                required: field.required,
                sortOrder: index,
              }))
            : [],
        isActive: form.isActive,
      },
    });
  };

  const handleDelete = async () => {
    if (!deletingOption) {
      return;
    }

    if (!canDelete) {
      toast.error("Bạn không có quyền xóa option mua thêm.");
      return;
    }

    await deleteMutation.mutateAsync(deletingOption.id);
  };

  return (
    <div className="tab-panel promo-root">
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Option mua thêm</h2>
          <p className="tab-subtitle">
            Quản lý các option mua thêm cơ bản và ấn phẩm tùy chỉnh cho từng
            biến thể sản phẩm.
          </p>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={openCreate}>
            <FiPlus size={15} /> Tạo option mua thêm
          </button>
        )}
      </div>

      <section className="lc-stats">
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">
            <FiTag size={15} />
          </span>
          <div>
            <strong>{addonOptions.length}</strong>
            <span>Tổng option</span>
          </div>
        </div>
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">
            <FiType size={15} />
          </span>
          <div>
            <strong>
              {
                addonOptions.filter(
                  (option) => option.optionType === "customizable",
                ).length
              }
            </strong>
            <span>Ấn phẩm tùy chỉnh</span>
          </div>
        </div>
      </section>

      <section className="tab-toolbar">
        <div className="tab-search-wrap">
          <input
            className="tab-search"
            placeholder="Tìm theo tên option..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button
              className="tab-search-clear"
              onClick={() => setSearch("")}
              title="Xóa tìm kiếm"
            >
              <FiX size={14} />
            </button>
          )}
        </div>
      </section>

      {filteredOptions.length === 0 ? (
        <div className="tab-empty">
          <FiTag size={40} className="tab-empty-icon" />
          <p>
            {addonOptions.length === 0
              ? "Chưa có option mua thêm nào. Hãy tạo option đầu tiên."
              : "Không tìm thấy option phù hợp."}
          </p>
        </div>
      ) : (
        <div className="tab-table-wrap">
          <table className="tab-table">
            <thead>
              <tr>
                <th>Tên option</th>
                <th>Loại</th>
                <th>Áp dụng cho</th>
                <th>Giá</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredOptions.map((option) => (
                <tr key={option.id}>
                  <td>
                    <div>
                      <strong>{option.name}</strong>
                      {option.description && (
                        <div style={{ fontSize: "12px", margin: "2px 0 0" }}>
                          <RichTextContent
                            value={option.description}
                            className="text-muted"
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="lc-name-chip">
                      {OPTION_TYPE_LABELS[option.optionType]}
                    </span>
                    <p
                      className="text-muted"
                      style={{ fontSize: "12px", margin: "2px 0 0" }}
                    >
                      {renderOptionSummary(option)}
                    </p>
                  </td>
                  <td>
                    <p
                      className="text-muted"
                      style={{ fontSize: "12px", margin: 0, lineHeight: 1.5 }}
                    >
                      {renderApplicableProducts(option)}
                    </p>
                  </td>
                  <td>
                    <strong>{formatMoney(option.price)}</strong>
                  </td>
                  <td>
                    <span
                      className={`lc-name-chip${option.isActive ? "" : " lc-name-chip--inactive"}`}
                      style={{
                        background: option.isActive ? "#e8f5e9" : "#fce4ec",
                        color: option.isActive ? "#2e7d32" : "#c62828",
                      }}
                    >
                      {option.isActive ? "Hoạt động" : "Tạm dừng"}
                    </span>
                  </td>
                  <td className="text-muted">
                    {formatDateTime(option.updatedAt)}
                  </td>
                  <td>
                    <div className="tab-actions">
                      {canEdit && (
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => openEdit(option)}
                          title="Chỉnh sửa"
                        >
                          <FiEdit2 size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="btn-icon btn-del"
                          onClick={() => setDeletingOption(option)}
                          title="Xóa"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="lc-summary">
        Hiển thị {filteredOptions.length}/{addonOptions.length} option mua thêm
      </p>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-box modal-box--lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                {modal === "create"
                  ? "Tạo option mua thêm mới"
                  : "Chỉnh sửa option mua thêm"}
              </h3>
              <button className="modal-close" onClick={closeModal}>
                <FiX size={16} />
              </button>
            </div>

            <form
              className="modal-body"
              onSubmit={handleSave}
              style={{ maxHeight: "70vh", overflowY: "auto" }}
            >
              <div className="form-group">
                <label className="form-label">Tên option mua thêm *</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="VD: Thiệp cảm ơn"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <RichTextEditor
                  value={form.description}
                  onChange={(nextValue) =>
                    updateField("description", nextValue)
                  }
                  placeholder="Mô tả option mua thêm..."
                  minHeight={120}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Loại option *</label>
                <div className="promo-radio-group">
                  <label className="promo-radio">
                    <input
                      type="radio"
                      name="optionType"
                      value="basic"
                      checked={form.optionType === "basic"}
                      onChange={() => setOptionType("basic")}
                    />
                    <span>Mua thêm cơ bản (tên, mô tả, giá)</span>
                  </label>
                  <label className="promo-radio">
                    <input
                      type="radio"
                      name="optionType"
                      value="customizable"
                      checked={form.optionType === "customizable"}
                      onChange={() => setOptionType("customizable")}
                    />
                    <span>Ấn phẩm tùy chỉnh (có form nhập cho user)</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Áp dụng cho loại sản phẩm *
                </label>
                <div className="promo-radio-group">
                  <label className="promo-radio">
                    <input
                      type="radio"
                      name="applicableProductType"
                      value="lego"
                      checked={form.applicableProductType === "lego"}
                      onChange={() =>
                        updateField("applicableProductType", "lego")
                      }
                    />
                    <span>Sản phẩm Lego</span>
                  </label>
                  <label className="promo-radio">
                    <input
                      type="radio"
                      name="applicableProductType"
                      value="bear"
                      checked={form.applicableProductType === "bear"}
                      onChange={() =>
                        updateField("applicableProductType", "bear")
                      }
                    />
                    <span>Sản phẩm Gấu</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Giá option (VNĐ) *</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="1000"
                  value={form.price}
                  onChange={(event) => updateField("price", event.target.value)}
                  placeholder="VD: 50000"
                />
              </div>

              <div className="form-group">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "6px",
                  }}
                >
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Sản phẩm áp dụng
                  </label>
                  {form.applicableProductIds.length > 0 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => updateField("applicableProductIds", [])}
                      style={{ padding: "6px 10px", fontSize: "12px" }}
                    >
                      Mặc định tất cả
                    </button>
                  )}
                </div>

                <p
                  className="text-muted"
                  style={{ margin: "0 0 10px", fontSize: "12px" }}
                >
                  Không chọn sản phẩm nào thì option này sẽ áp dụng cho toàn bộ
                  biến thể.
                </p>

                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "12px",
                    background: "#fafbfd",
                    maxHeight: "260px",
                    overflowY: "auto",
                    display: "grid",
                    gap: "14px",
                  }}
                >
                  {variantsByCollection.length === 0 ? (
                    <p
                      className="text-muted"
                      style={{ margin: 0, fontSize: "13px" }}
                    >
                      Chưa có sản phẩm nào để chọn phạm vi áp dụng.
                    </p>
                  ) : (
                    variantsByCollection.map((group) => (
                      <div
                        key={group.collectionName}
                        style={{ display: "grid", gap: "8px" }}
                      >
                        <strong style={{ fontSize: "13px", color: "#1f2937" }}>
                          {group.collectionName}
                        </strong>
                        <div style={{ display: "grid", gap: "8px" }}>
                          {group.items.map((variant) => {
                            const checked = form.applicableProductIds.includes(
                              variant.id,
                            );

                            return (
                              <label
                                key={variant.id}
                                className="promo-radio"
                                style={{
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  border: checked
                                    ? "1px solid #d7b0b1"
                                    : "1px solid #ebeef5",
                                  borderRadius: "10px",
                                  padding: "10px 12px",
                                  background: checked ? "#fff7f7" : "#ffffff",
                                }}
                              >
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "10px",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      toggleApplicableProduct(variant.id)
                                    }
                                  />
                                  <span>
                                    <strong
                                      style={{
                                        display: "block",
                                        fontSize: "13px",
                                      }}
                                    >
                                      {variant.name}
                                    </strong>
                                    <small style={{ color: "#6b7280" }}>
                                      {variant.categoryName || "Chưa phân loại"}
                                    </small>
                                  </span>
                                </span>
                                <small
                                  style={{
                                    color: "#6b7280",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {formatMoney(variant.price)}
                                </small>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {form.optionType === "customizable" && (
                <div className="form-group">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      marginBottom: "8px",
                    }}
                  >
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Trường tùy chỉnh ấn phẩm *
                    </label>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={addField}
                    >
                      <FiPlus size={14} /> Thêm trường
                    </button>
                  </div>

                  {form.fields.length === 0 && (
                    <p
                      className="text-muted"
                      style={{ margin: "0 0 8px", fontSize: "12px" }}
                    >
                      Chưa có trường nào. Nhấn "Thêm trường" để tạo form cho
                      người dùng.
                    </p>
                  )}

                  <div style={{ display: "grid", gap: "10px" }}>
                    {form.fields.map((field, index) => (
                      <div
                        key={`${field.fieldType}-${index}`}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: "12px",
                          padding: "10px",
                          background: "#fafbfd",
                        }}
                      >
                        <div style={{ display: "grid", gap: "8px" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "24px",
                                height: "24px",
                                borderRadius: "999px",
                                background: "#f1f5f9",
                                color: "#475569",
                                fontSize: "12px",
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {index + 1}
                            </span>

                            <input
                              className="form-input"
                              value={field.label}
                              onChange={(event) =>
                                updateCustomField(
                                  index,
                                  "label",
                                  event.target.value,
                                )
                              }
                              placeholder="Tên trường hiển thị cho user"
                            />

                            <select
                              className="form-input"
                              style={{ maxWidth: "160px" }}
                              value={field.fieldType}
                              onChange={(event) =>
                                updateCustomField(
                                  index,
                                  "fieldType",
                                  event.target.value,
                                )
                              }
                            >
                              <option value="image">Ảnh</option>
                              <option value="link">Link</option>
                              <option value="text">Text</option>
                            </select>

                            {form.fields.length > 1 && (
                              <button
                                type="button"
                                className="btn-icon btn-del"
                                onClick={() => removeCustomField(index)}
                                title="Xóa trường"
                              >
                                <FiX size={14} />
                              </button>
                            )}
                          </div>

                          <input
                            className="form-input"
                            value={field.placeholder}
                            onChange={(event) =>
                              updateCustomField(
                                index,
                                "placeholder",
                                event.target.value,
                              )
                            }
                            placeholder="Placeholder gợi ý cho người dùng"
                          />

                          <label
                            className="promo-radio"
                            style={{ cursor: "pointer" }}
                          >
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(event) =>
                                updateCustomField(
                                  index,
                                  "required",
                                  event.target.checked,
                                )
                              }
                            />
                            <span>Bắt buộc nhập</span>
                            {field.fieldType === "image" ? (
                              <FiImage size={13} style={{ color: "#6b7280" }} />
                            ) : field.fieldType === "link" ? (
                              <FiLink size={13} style={{ color: "#6b7280" }} />
                            ) : (
                              <FiType size={13} style={{ color: "#6b7280" }} />
                            )}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="promo-radio" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      updateField("isActive", event.target.checked)
                    }
                  />
                  <span>Kích hoạt option mua thêm</span>
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <>
                      <span className="btn-spinner" /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <FiSave size={14} /> Lưu option
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingOption && (
        <div className="modal-overlay" onClick={() => setDeletingOption(null)}>
          <div
            className="modal-box modal-box--sm"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title modal-title--danger">
                Xóa option mua thêm
              </h3>
              <button
                className="modal-close"
                onClick={() => setDeletingOption(null)}
              >
                <FiX size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="confirm-body">
                <FiAlertTriangle className="confirm-icon" />
                <p>
                  Bạn có chắc muốn xóa option{" "}
                  <strong>{deletingOption.name}</strong>?
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-secondary"
                  onClick={() => setDeletingOption(null)}
                >
                  Hủy
                </button>
                <button
                  className="btn-danger"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  <FiTrash2 size={14} /> Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddonOptionsTab;
