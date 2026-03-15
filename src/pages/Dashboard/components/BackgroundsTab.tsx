import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiCalendar,
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiHash,
  FiImage,
  FiList,
  FiPlus,
  FiSave,
  FiTrash2,
  FiType,
  FiUpload,
  FiX,
  FiLayers,
} from "react-icons/fi";
import { ImageWithFallback } from "../../../components/common";
import { getErrorMessage } from "../../../lib/error";
import { getStaticAssetUrl, http } from "../../../lib/http";
import type {
  BackgroundFieldForm,
  BackgroundFieldOption,
  BackgroundFieldType,
  Background,
  BackgroundFormState,
} from "../types";
import {
  createBackground,
  deleteBackground,
  getBackgrounds,
  updateBackground,
} from "../../../services/backgrounds.service";
import { getBackgroundThemes } from "../../../services/background-themes.service";
import { hasPermission } from "../../../lib/permissions";
import { useAuthStore } from "../../../store/auth.store";
import { RichTextEditor } from "../../../components/common";
import {
  isRichTextEmpty,
  normalizeRichTextForStorage,
  toRichTextPlainText,
} from "../../../lib/rich-text";

// ─── Constants ────────────────────────────────────────────────────────────────
const FIELD_TYPE_MAP: Record<
  BackgroundFieldType,
  { label: string; icon: React.ReactNode }
> = {
  short_text: { label: "Văn bản ngắn", icon: <FiType size={14} /> },
  long_text: { label: "Văn bản dài", icon: <FiType size={14} /> },
  select: { label: "Lựa chọn (Select)", icon: <FiList size={14} /> },
  image_upload: { label: "Tải ảnh lên", icon: <FiUpload size={14} /> },
  number: { label: "Số", icon: <FiHash size={14} /> },
  date: { label: "Ngày tháng", icon: <FiCalendar size={14} /> },
};

const EMPTY_FIELD: BackgroundFieldForm = {
  label: "",
  fieldType: "short_text",
  placeholder: "",
  required: false,
  options: [],
};

const INITIAL_FORM: BackgroundFormState = {
  name: "",
  description: "",
  themeId: "",
  image: "",
  fields: [],
  isActive: true,
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// ─── Component ────────────────────────────────────────────────────────────────
const BackgroundsTab = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const canCreate = hasPermission(currentUser, "backgrounds.create");
  const canEdit = hasPermission(currentUser, "backgrounds.edit");
  const canDelete = hasPermission(currentUser, "backgrounds.delete");

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingItem, setEditingItem] = useState<Background | null>(null);
  const [deletingItem, setDeletingItem] = useState<Background | null>(null);
  const [form, setForm] = useState<BackgroundFormState>({ ...INITIAL_FORM });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: themes = [] } = useQuery({
    queryKey: ["background-themes"],
    queryFn: getBackgroundThemes,
  });

  const { data: backgrounds = [] } = useQuery({
    queryKey: ["backgrounds"],
    queryFn: getBackgrounds,
  });

  // ── Mutations ───────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      data: Parameters<typeof createBackground>[0];
    }) => {
      if (payload.id) return updateBackground(payload.id, payload.data);
      return createBackground(payload.data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["backgrounds"] });
      toast.success(
        variables.id
          ? "Đã cập nhật background."
          : "Đã thêm background mới.",
      );
      closeModal();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể lưu background."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBackground,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backgrounds"] });
      toast.success("Đã xóa background.");
      setDeletingItem(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể xóa background."));
    },
  });

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filteredList = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return backgrounds;
    return backgrounds.filter(
      (b) =>
        b.name.toLowerCase().includes(keyword) ||
        toRichTextPlainText(b.description).toLowerCase().includes(keyword) ||
        b.themeName?.toLowerCase().includes(keyword),
    );
  }, [backgrounds, search]);

  // ── Modal helpers ───────────────────────────────────────────────────────────
  const closeModal = () => {
    setModal(null);
    setEditingItem(null);
    setForm({ ...INITIAL_FORM, fields: [] });
  };

  const openCreate = () => {
    if (!canCreate) {
      toast.error("Bạn không có quyền tạo background.");
      return;
    }
    setEditingItem(null);
    setForm({ 
      ...INITIAL_FORM, 
      themeId: themes.length > 0 ? themes[0].id : "",
      fields: [] 
    });
    setModal("create");
  };

  const openEdit = (bg: Background) => {
    if (!canEdit) {
      toast.error("Bạn không có quyền chỉnh sửa background.");
      return;
    }
    setEditingItem(bg);
    setForm({
      name: bg.name,
      description: bg.description,
      themeId: bg.themeId,
      image: bg.image,
      fields: bg.fields.map((f) => ({
        label: f.label,
        fieldType: f.fieldType,
        placeholder: f.placeholder,
        required: f.required,
        selectType: f.selectType,
        options: [...f.options],
      })),
      isActive: bg.isActive,
    });
    setModal("edit");
  };

  const updateField = <K extends keyof BackgroundFormState>(
    key: K,
    value: BackgroundFormState[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  // ── Image upload ────────────────────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await http.post<{ url: string }>(
        "/upload/image",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      updateField("image", data.url);
      toast.success("Đã tải ảnh lên.");
    } catch (err) {
      toast.error(getErrorMessage(err, "Không thể tải ảnh lên."));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Dynamic fields management ───────────────────────────────────────────────
  const addFormField = () => {
    setForm((prev) => ({
      ...prev,
      fields: [...prev.fields, { ...EMPTY_FIELD, options: [] }],
    }));
  };

  const updateFormField = (
    index: number,
    key: keyof BackgroundFieldForm,
    value: unknown,
  ) => {
    setForm((prev) => {
      const fields = [...prev.fields];
      fields[index] = { ...fields[index], [key]: value };
      if (key === "fieldType" && value !== "select") {
        fields[index].options = [];
      }
      if (key === "fieldType" && value === "select" && fields[index].options.length === 0) {
        fields[index].options = [{ label: "", value: "" }];
        fields[index].selectType = "dropdown";
      }
      return { ...prev, fields };
    });
  };

  const removeFormField = (index: number) => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  };

  const moveField = (index: number, direction: "up" | "down") => {
    setForm((prev) => {
      const fields = [...prev.fields];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= fields.length) return prev;
      [fields[index], fields[target]] = [fields[target], fields[index]];
      return { ...prev, fields };
    });
  };

  // ── Select options management ───────────────────────────────────────────────
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
    optIndex: number,
    key: keyof BackgroundFieldOption,
    value: string,
  ) => {
    setForm((prev) => {
      const fields = [...prev.fields];
      const options = [...fields[fieldIndex].options];
      options[optIndex] = { ...options[optIndex], [key]: value };
      if (key === "label" && !options[optIndex].value) {
        options[optIndex].value = value.toLowerCase().replace(/\s+/g, "_");
      }
      fields[fieldIndex] = { ...fields[fieldIndex], options };
      return { ...prev, fields };
    });
  };

  const removeOption = (fieldIndex: number, optIndex: number) => {
    setForm((prev) => {
      const fields = [...prev.fields];
      fields[fieldIndex] = {
        ...fields[fieldIndex],
        options: fields[fieldIndex].options.filter((_, i) => i !== optIndex),
      };
      return { ...prev, fields };
    });
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = form.name.trim();
    if (!name) {
      toast.error("Tên background không được để trống.");
      return;
    }

    const description = normalizeRichTextForStorage(form.description);
    if (isRichTextEmpty(description)) {
      toast.error("Mô tả background không được để trống.");
      return;
    }

    if (!form.themeId) {
      toast.error("Vui lòng chọn chủ đề background.");
      return;
    }

    for (let i = 0; i < form.fields.length; i++) {
      const f = form.fields[i];
      if (!f.label.trim()) {
        toast.error(`Trường #${i + 1}: Tên trường không được để trống.`);
        return;
      }
      if (f.fieldType === "select") {
        const validOptions = f.options.filter((o) => o.label.trim() && o.value.trim());
        if (validOptions.length === 0) {
          toast.error(`Trường "${f.label}": Phải có ít nhất 1 lựa chọn.`);
          return;
        }
      }
    }

    await saveMutation.mutateAsync({
      id: editingItem?.id,
      data: {
        name,
        description,
        themeId: form.themeId,
        image: form.image,
        fields: form.fields.map((f, index) => ({
          label: f.label.trim(),
          fieldType: f.fieldType,
          placeholder: f.placeholder.trim(),
          required: f.required,
          options: f.fieldType === "select"
            ? f.options
                .filter((o) => o.label.trim() && o.value.trim())
                .map((o) => ({ label: o.label.trim(), value: o.value.trim() }))
            : [],
          selectType: f.fieldType === "select" ? (f.selectType || "dropdown") : undefined,
          sortOrder: index,
        })),
        isActive: form.isActive,
      },
    });
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    await deleteMutation.mutateAsync(deletingItem.id);
  };

  // ── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <div className="tab-panel lc-root">
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Quản lý Backgrounds</h2>
          <p className="tab-subtitle">
            Tạo bối cảnh mới và cấu hình các trường thông tin điền form.
          </p>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={openCreate}>
            <FiPlus size={15} /> Thêm bối cảnh
          </button>
        )}
      </div>

      <section className="lc-stats">
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon"><FiImage size={15} /></span>
          <div>
            <strong>{backgrounds.length}</strong>
            <span>Tổng bối cảnh</span>
          </div>
        </div>
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon"><FiLayers size={15} /></span>
          <div>
            <strong>{themes.length}</strong>
            <span>Chủ đề</span>
          </div>
        </div>
      </section>

      <section className="tab-toolbar">
        <div className="tab-search-wrap">
          <input
            className="tab-search"
            placeholder="Tìm theo tên hoặc chủ đề..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="tab-search-clear" onClick={() => setSearch("")} title="Xóa tìm kiếm">
              <FiX size={14} />
            </button>
          )}
        </div>
      </section>

      {filteredList.length === 0 ? (
        <div className="tab-empty">
          <FiImage size={40} className="tab-empty-icon" />
          <p>
            {backgrounds.length === 0
              ? "Chưa có bối cảnh nào. Hãy tạo bối cảnh đầu tiên."
              : "Không tìm thấy bối cảnh phù hợp."}
          </p>
        </div>
      ) : (
        <div className="tab-table-wrap">
          <table className="tab-table">
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Bối cảnh</th>
                <th>Chủ đề</th>
                <th>Trường dữ liệu</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((bg) => (
                <tr key={bg.id}>
                  <td>
                    <ImageWithFallback
                      src={getStaticAssetUrl(bg.image)}
                      alt={bg.name}
                      className="bgt-thumb"
                      fallback={
                      <div className="bgt-thumb bgt-thumb--empty"><FiImage size={16} /></div>
                      }
                    />
                  </td>
                  <td><strong>{bg.name}</strong></td>
                  <td><span className="lc-name-chip">{bg.themeName || "ID lỗi"}</span></td>
                  <td><span className="lc-name-chip" style={{ background: "#f1f5f9" }}>{bg.fieldCount} trường</span></td>
                  <td>
                    <span
                      className="lc-name-chip"
                      style={{
                        background: bg.isActive ? "#e8f5e9" : "#fce4ec",
                        color: bg.isActive ? "#2e7d32" : "#c62828",
                      }}
                    >
                      {bg.isActive ? "Hoạt động" : "Tạm dừng"}
                    </span>
                  </td>
                  <td className="text-muted">{formatDateTime(bg.updatedAt)}</td>
                  <td>
                    <div className="tab-actions">
                      {canEdit && (
                        <button className="btn-icon btn-edit" onClick={() => openEdit(bg)} title="Chỉnh sửa">
                          <FiEdit2 size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn-icon btn-del" onClick={() => setDeletingItem(bg)} title="Xóa">
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

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box bgt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{modal === "create" ? "Thêm Background" : "Sửa Background"}</h3>
              <button className="modal-close" onClick={closeModal}><FiX size={16} /></button>
            </div>

            <form className="modal-body" onSubmit={handleSave} style={{ maxHeight: "75vh", overflowY: "auto" }}>
              <div className="bgt-field-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Tên background *</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="VD: Background Mẫu 1"
                    autoFocus
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Thuộc chủ đề *</label>
                  <select
                    className="form-input"
                    value={form.themeId}
                    onChange={(e) => updateField("themeId", e.target.value)}
                    required
                  >
                    {!form.themeId && <option value="" disabled>-- Chọn chủ đề --</option>}
                    {themes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả background *</label>
                <RichTextEditor
                  value={form.description}
                  onChange={(nextValue) => updateField("description", nextValue)}
                  placeholder="Nhập mô tả background cho người dùng..."
                  minHeight={140}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ảnh nền</label>
                {form.image ? (
                  <div className="bgt-image-preview">
                    <ImageWithFallback
                      src={getStaticAssetUrl(form.image)}
                      alt="Background"
                      fallback={
                        <div
                          style={{
                            width: 200,
                            minHeight: 140,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#94a3b8",
                            borderRadius: 10,
                            border: "1px solid #e2e8f0",
                            background: "#f8fafc",
                          }}
                        >
                          <FiImage size={20} />
                        </div>
                      }
                    />
                    <button
                      type="button"
                      className="bgt-image-remove"
                      onClick={() => updateField("image", "")}
                      title="Xóa ảnh"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="bgt-image-dropzone" onClick={() => fileInputRef.current?.click()}>
                    {uploading ? (
                      <><span className="btn-spinner" /> Đang tải...</>
                    ) : (
                      <><FiUpload size={20} /><span>Nhấn để tải ảnh lên</span></>
                    )}
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
              </div>

              <div className="form-group">
                <label className="promo-radio" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => updateField("isActive", e.target.checked)}
                  />
                  <span>Hoạt động</span>
                </label>
              </div>

              {/* ════════ Dynamic Fields Builder ════════ */}
              <div className="bgt-fields-section">
                <div className="bgt-fields-header">
                  <h4 className="bgt-fields-title">
                    Trường thông tin tùy chỉnh
                    <span className="bgt-fields-count">{form.fields.length} trường</span>
                  </h4>
                  <button type="button" className="btn-secondary" onClick={addFormField}>
                    <FiPlus size={14} /> Thêm trường
                  </button>
                </div>

                {form.fields.length === 0 && (
                  <div className="bgt-fields-empty">
                    <FiList size={24} />
                    <p>Chưa có trường nào. Nhấn "Thêm trường" để bắt đầu.</p>
                  </div>
                )}

                {form.fields.map((field, idx) => (
                  <div key={idx} className="bgt-field-card">
                    <div className="bgt-field-card__header">
                      <span className="bgt-field-card__index">#{idx + 1}</span>
                      <span className="bgt-field-card__type-badge">
                        {FIELD_TYPE_MAP[field.fieldType]?.icon}
                        {FIELD_TYPE_MAP[field.fieldType]?.label}
                      </span>
                      <div className="bgt-field-card__actions">
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => moveField(idx, "up")}
                          disabled={idx === 0}
                          title="Di chuyển lên"
                          style={{ background: "#f1f5f9", color: "#475569" }}
                        >
                          <FiChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => moveField(idx, "down")}
                          disabled={idx === form.fields.length - 1}
                          title="Di chuyển xuống"
                          style={{ background: "#f1f5f9", color: "#475569" }}
                        >
                          <FiChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-del"
                          onClick={() => removeFormField(idx)}
                          title="Xóa trường"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="bgt-field-card__body">
                      <div className="bgt-field-row">
                        <div className="form-group" style={{ flex: 2 }}>
                          <label className="form-label">Tên trường *</label>
                          <input
                            className="form-input"
                            value={field.label}
                            onChange={(e) => updateFormField(idx, "label", e.target.value)}
                            placeholder="VD: Họ và tên"
                          />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label className="form-label">Loại trường</label>
                          <select
                            className="form-input"
                            value={field.fieldType}
                            onChange={(e) => updateFormField(idx, "fieldType", e.target.value)}
                          >
                            {Object.entries(FIELD_TYPE_MAP).map(([value, { label }]) => (
                              <option key={value} value={value}>{label}</option>
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
                            onChange={(e) => updateFormField(idx, "placeholder", e.target.value)}
                            placeholder="Gợi ý cho người dùng..."
                          />
                        </div>
                        <div className="form-group" style={{ flex: 0, minWidth: "fit-content" }}>
                          <label className="form-label">&nbsp;</label>
                          <label className="promo-radio" style={{ padding: "8px 0" }}>
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateFormField(idx, "required", e.target.checked)}
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
                                onChange={(e) => updateFormField(idx, "selectType", e.target.value)}
                              >
                                <option value="dropdown">Dropdown (Chọn 1)</option>
                                <option value="radio">Radio (Chọn 1)</option>
                                <option value="checkbox">Checkbox (Chọn nhiều)</option>
                              </select>
                            </div>
                            <div className="form-group" style={{ flex: 2 }}></div>
                          </div>

                          <label className="form-label">Các lựa chọn *</label>
                          {field.options.map((opt, oi) => (
                            <div key={oi} className="bgt-option-row">
                              <input
                                className="form-input"
                                value={opt.label}
                                onChange={(e) => updateOption(idx, oi, "label", e.target.value)}
                                placeholder={`Lựa chọn ${oi + 1}`}
                              />
                              <input
                                className="form-input"
                                value={opt.value}
                                onChange={(e) => updateOption(idx, oi, "value", e.target.value)}
                                placeholder="Giá trị"
                                style={{ maxWidth: 150 }}
                              />
                              {field.options.length > 1 && (
                                <button
                                  type="button"
                                  className="btn-icon btn-del"
                                  onClick={() => removeOption(idx, oi)}
                                  title="Xóa lựa chọn"
                                >
                                  <FiX size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => addOption(idx)}
                            style={{ marginTop: 4 }}
                          >
                            <FiPlus size={12} /> Thêm lựa chọn
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>Hủy</button>
                <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? <><span className="btn-spinner" /> Đang lưu...</> : <><FiSave size={14} /> Lưu background</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingItem && (
        <div className="modal-overlay" onClick={() => setDeletingItem(null)}>
          <div className="modal-box modal-box--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title modal-title--danger">Xóa bối cảnh</h3>
              <button className="modal-close" onClick={() => setDeletingItem(null)}><FiX size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="confirm-body">
                <FiAlertTriangle className="confirm-icon" />
                <p>Bạn có chắc muốn xóa <strong>{deletingItem.name}</strong>?</p>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setDeletingItem(null)}>Hủy</button>
                <button className="btn-danger" onClick={handleDelete} disabled={deleteMutation.isPending}>
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

export default BackgroundsTab;
