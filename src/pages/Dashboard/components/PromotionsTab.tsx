import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiCalendar,
  FiEdit2,
  FiGift,
  FiPercent,
  FiPlus,
  FiSave,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { getErrorMessage } from "../../../lib/error";
import { hasPermission } from "../../../lib/permissions";
import { useAuthStore } from "../../../store/auth.store";
import {
  createPromotion,
  deletePromotion,
  getPromotions,
  updatePromotion,
} from "../../../services/promotions.service";
import { getLegoCustomizationGroups } from "../../../services/lego-customizations.service";
import type {
  LegoCustomizationGroup,
  PromotionFormState,
  PromotionGiftForm,
  PromotionRow,
} from "../types";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CONDITION_LABELS: Record<string, string> = {
  lego_quantity: "Theo số lượng Lego",
  set_quantity: "Theo số lượng Set",
};

const REWARD_LABELS: Record<string, string> = {
  gift: "Tặng quà",
  discount_fixed: "Giảm giá cố định",
  discount_percent: "Giảm giá %",
};

const EMPTY_GIFT: PromotionGiftForm = { groupId: "", optionId: "", quantity: "1" };

const INITIAL_FORM: PromotionFormState = {
  name: "",
  description: "",
  conditionType: "lego_quantity",
  conditionMinQuantity: "3",
  rewardType: "gift",
  rewardGifts: [{ ...EMPTY_GIFT }],
  rewardDiscountValue: "0",
  startDate: "",
  endDate: "",
  isActive: true,
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value) + "đ";

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const PromotionsTab = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  const canCreate = hasPermission(currentUser, "promotions.create");
  const canEdit = hasPermission(currentUser, "promotions.edit");
  const canDelete = hasPermission(currentUser, "promotions.delete");

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingPromotion, setEditingPromotion] = useState<PromotionRow | null>(null);
  const [deletingPromotion, setDeletingPromotion] = useState<PromotionRow | null>(null);
  const [form, setForm] = useState<PromotionFormState>({ ...INITIAL_FORM });

  // ── Data queries ────────────────────────────────────────────────────────────
  const { data: promotions = [] } = useQuery({
    queryKey: ["promotions"],
    queryFn: getPromotions,
  });

  const { data: customizationGroups = [] } = useQuery({
    queryKey: ["lego-customization-groups"],
    queryFn: getLegoCustomizationGroups,
  });

  // ── Mutations ───────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (payload: {
      id?: string;
      data: Parameters<typeof createPromotion>[0];
    }) => {
      if (payload.id) {
        return updatePromotion(payload.id, payload.data);
      }
      return createPromotion(payload.data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      toast.success(
        variables.id ? "Đã cập nhật ưu đãi." : "Đã tạo ưu đãi mới.",
      );
      closeModal();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể lưu ưu đãi."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePromotion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
      toast.success("Đã xóa ưu đãi.");
      setDeletingPromotion(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể xóa ưu đãi."));
    },
  });

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filteredPromotions = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return promotions;
    return promotions.filter(
      (p) =>
        p.name.toLowerCase().includes(kw) ||
        p.description.toLowerCase().includes(kw),
    );
  }, [promotions, search]);

  // ── Modal helpers ───────────────────────────────────────────────────────────
  const closeModal = () => {
    setModal(null);
    setEditingPromotion(null);
    setForm({ ...INITIAL_FORM });
  };

  const openCreate = () => {
    if (!canCreate) {
      toast.error("Bạn không có quyền tạo ưu đãi.");
      return;
    }
    setEditingPromotion(null);
    setForm({ ...INITIAL_FORM, rewardGifts: [{ ...EMPTY_GIFT }] });
    setModal("create");
  };

  const openEdit = (promo: PromotionRow) => {
    if (!canEdit) {
      toast.error("Bạn không có quyền chỉnh sửa ưu đãi.");
      return;
    }
    setEditingPromotion(promo);
    setForm({
      name: promo.name,
      description: promo.description,
      conditionType: promo.conditionType,
      conditionMinQuantity: String(promo.conditionMinQuantity),
      rewardType: promo.rewardType,
      rewardGifts:
        promo.rewardGifts.length > 0
          ? promo.rewardGifts.map((g) => ({
              groupId: g.groupId,
              optionId: g.optionId,
              quantity: String(g.quantity),
            }))
          : [{ ...EMPTY_GIFT }],
      rewardDiscountValue: String(promo.rewardDiscountValue),
      startDate: promo.startDate
        ? new Date(promo.startDate).toISOString().slice(0, 10)
        : "",
      endDate: promo.endDate
        ? new Date(promo.endDate).toISOString().slice(0, 10)
        : "",
      isActive: promo.isActive,
    });
    setModal("edit");
  };

  // ── Form field updaters ─────────────────────────────────────────────────────
  const updateField = <K extends keyof PromotionFormState>(
    key: K,
    value: PromotionFormState[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateGift = (index: number, field: keyof PromotionGiftForm, value: string) => {
    setForm((prev) => {
      const gifts = [...prev.rewardGifts];
      gifts[index] = { ...gifts[index], [field]: value };
      // Reset optionId when group changes
      if (field === "groupId") {
        gifts[index].optionId = "";
      }
      return { ...prev, rewardGifts: gifts };
    });
  };

  const addGift = () => {
    setForm((prev) => ({
      ...prev,
      rewardGifts: [...prev.rewardGifts, { ...EMPTY_GIFT }],
    }));
  };

  const removeGift = (index: number) => {
    setForm((prev) => ({
      ...prev,
      rewardGifts: prev.rewardGifts.filter((_, i) => i !== index),
    }));
  };

  // ── Get options for a specific group ────────────────────────────────────────
  const getOptionsForGroup = (groupId: string) => {
    const group = customizationGroups.find((g: LegoCustomizationGroup) => g.id === groupId);
    return group?.options ?? [];
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modal === "create" && !canCreate) {
      toast.error("Bạn không có quyền tạo ưu đãi.");
      return;
    }
    if (modal === "edit" && !canEdit) {
      toast.error("Bạn không có quyền chỉnh sửa ưu đãi.");
      return;
    }

    const name = form.name.trim();
    if (!name) {
      toast.error("Tên ưu đãi không được để trống.");
      return;
    }

    const conditionMinQuantity = parseInt(form.conditionMinQuantity, 10);
    if (isNaN(conditionMinQuantity) || conditionMinQuantity < 1) {
      toast.error("Số lượng tối thiểu phải từ 1 trở lên.");
      return;
    }

    if (form.rewardType === "gift") {
      const validGifts = form.rewardGifts.filter(
        (g) => g.groupId && g.optionId,
      );
      if (validGifts.length === 0) {
        toast.error("Phải chọn ít nhất 1 quà tặng.");
        return;
      }
    }

    if (form.rewardType !== "gift") {
      const val = parseFloat(form.rewardDiscountValue);
      if (isNaN(val) || val < 0) {
        toast.error("Giá trị giảm giá không hợp lệ.");
        return;
      }
      if (form.rewardType === "discount_percent" && val > 100) {
        toast.error("Phần trăm giảm giá không được vượt quá 100%.");
        return;
      }
    }

    if (form.startDate && form.endDate) {
      if (new Date(form.endDate) <= new Date(form.startDate)) {
        toast.error("Ngày kết thúc phải sau ngày bắt đầu.");
        return;
      }
    }

    await saveMutation.mutateAsync({
      id: editingPromotion?.id,
      data: {
        name,
        description: form.description.trim(),
        conditionType: form.conditionType,
        conditionMinQuantity,
        rewardType: form.rewardType,
        rewardGifts:
          form.rewardType === "gift"
            ? form.rewardGifts
                .filter((g) => g.groupId && g.optionId)
                .map((g) => ({
                  groupId: g.groupId,
                  optionId: g.optionId,
                  quantity: parseInt(g.quantity, 10) || 1,
                }))
            : undefined,
        rewardDiscountValue:
          form.rewardType !== "gift"
            ? parseFloat(form.rewardDiscountValue) || 0
            : undefined,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        isActive: form.isActive,
      },
    });
  };

  const handleDelete = async () => {
    if (!deletingPromotion) return;
    if (!canDelete) {
      toast.error("Bạn không có quyền xóa ưu đãi.");
      return;
    }
    await deleteMutation.mutateAsync(deletingPromotion.id);
  };

  // ── Render helpers ──────────────────────────────────────────────────────────
  const renderRewardSummary = (promo: PromotionRow) => {
    if (promo.rewardType === "gift") {
      return promo.rewardGifts
        .map((g) => `${g.optionName || "?"} x${g.quantity}`)
        .join(", ");
    }
    if (promo.rewardType === "discount_fixed") {
      return `Giảm ${formatMoney(promo.rewardDiscountValue)}`;
    }
    return `Giảm ${promo.rewardDiscountValue}%`;
  };

  const renderDateRange = (promo: PromotionRow) => {
    if (!promo.startDate && !promo.endDate) return "Không giới hạn";
    return `${formatDate(promo.startDate)} – ${formatDate(promo.endDate)}`;
  };

  // ── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <div className="tab-panel promo-root">
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Quản lý ưu đãi</h2>
          <p className="tab-subtitle">
            Tạo và quản lý các chương trình ưu đãi cho khách hàng.
          </p>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={openCreate}>
            <FiPlus size={15} /> Tạo ưu đãi
          </button>
        )}
      </div>

      {/* ── Stats ── */}
      <section className="lc-stats">
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">
            <FiGift size={15} />
          </span>
          <div>
            <strong>{promotions.length}</strong>
            <span>Tổng ưu đãi</span>
          </div>
        </div>
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">
            <FiCalendar size={15} />
          </span>
          <div>
            <strong>
              {promotions.filter((p) => p.isActive).length}
            </strong>
            <span>Đang hoạt động</span>
          </div>
        </div>
      </section>

      {/* ── Search ── */}
      <section className="tab-toolbar">
        <div className="tab-search-wrap">
          <input
            className="tab-search"
            placeholder="Tìm theo tên ưu đãi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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

      {/* ── Table ── */}
      {filteredPromotions.length === 0 ? (
        <div className="tab-empty">
          <FiGift size={40} className="tab-empty-icon" />
          <p>
            {promotions.length === 0
              ? "Chưa có ưu đãi nào. Hãy tạo ưu đãi đầu tiên."
              : "Không tìm thấy ưu đãi phù hợp."}
          </p>
        </div>
      ) : (
        <div className="tab-table-wrap">
          <table className="tab-table">
            <thead>
              <tr>
                <th>Tên ưu đãi</th>
                <th>Điều kiện</th>
                <th>Phần thưởng</th>
                <th>Thời hạn</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredPromotions.map((promo) => (
                <tr key={promo.id}>
                  <td>
                    <div>
                      <strong>{promo.name}</strong>
                      {promo.description && (
                        <p
                          className="text-muted"
                          style={{ fontSize: "12px", margin: "2px 0 0" }}
                        >
                          {promo.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="lc-name-chip">
                      {CONDITION_LABELS[promo.conditionType]} ≥{" "}
                      {promo.conditionMinQuantity}
                    </span>
                  </td>
                  <td>
                    <span className="lc-name-chip">
                      {REWARD_LABELS[promo.rewardType]}
                    </span>
                    <p
                      className="text-muted"
                      style={{ fontSize: "12px", margin: "2px 0 0" }}
                    >
                      {renderRewardSummary(promo)}
                    </p>
                  </td>
                  <td className="text-muted" style={{ fontSize: "13px" }}>
                    {renderDateRange(promo)}
                  </td>
                  <td>
                    <span
                      className={`lc-name-chip${promo.isActive ? "" : " lc-name-chip--inactive"}`}
                      style={{
                        background: promo.isActive ? "#e8f5e9" : "#fce4ec",
                        color: promo.isActive ? "#2e7d32" : "#c62828",
                      }}
                    >
                      {promo.isActive ? "Hoạt động" : "Tạm dừng"}
                    </span>
                  </td>
                  <td className="text-muted">{formatDateTime(promo.updatedAt)}</td>
                  <td>
                    <div className="tab-actions">
                      {canEdit && (
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => openEdit(promo)}
                          title="Chỉnh sửa"
                        >
                          <FiEdit2 size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="btn-icon btn-del"
                          onClick={() => setDeletingPromotion(promo)}
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
        Hiển thị {filteredPromotions.length}/{promotions.length} ưu đãi
      </p>

      {/* ── Create / Edit Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-box modal-box--lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">
                {modal === "create" ? "Tạo ưu đãi mới" : "Chỉnh sửa ưu đãi"}
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
              {/* Name */}
              <div className="form-group">
                <label className="form-label">Tên ưu đãi *</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="VD: Ưu đãi mua 3 tặng phụ kiện"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Mô tả ngắn về ưu đãi..."
                />
              </div>

              {/* Condition Type */}
              <div className="form-group">
                <label className="form-label">Loại điều kiện *</label>
                <div className="promo-radio-group">
                  <label className="promo-radio">
                    <input
                      type="radio"
                      name="conditionType"
                      value="lego_quantity"
                      checked={form.conditionType === "lego_quantity"}
                      onChange={() => updateField("conditionType", "lego_quantity")}
                    />
                    <span>Theo số lượng Lego</span>
                  </label>
                  <label className="promo-radio">
                    <input
                      type="radio"
                      name="conditionType"
                      value="set_quantity"
                      checked={form.conditionType === "set_quantity"}
                      onChange={() => updateField("conditionType", "set_quantity")}
                    />
                    <span>Theo số lượng Set (biến thể)</span>
                  </label>
                </div>
              </div>

              {/* Min Quantity */}
              <div className="form-group">
                <label className="form-label">
                  Số lượng tối thiểu để áp dụng *
                </label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  value={form.conditionMinQuantity}
                  onChange={(e) =>
                    updateField("conditionMinQuantity", e.target.value)
                  }
                  placeholder="VD: 3"
                />
              </div>

              {/* Reward Type */}
              <div className="form-group">
                <label className="form-label">Loại phần thưởng *</label>
                <div className="promo-radio-group">
                  <label className="promo-radio">
                    <input
                      type="radio"
                      name="rewardType"
                      value="gift"
                      checked={form.rewardType === "gift"}
                      onChange={() => updateField("rewardType", "gift")}
                    />
                    <FiGift size={14} />
                    <span>Tặng quà</span>
                  </label>
                  <label className="promo-radio">
                    <input
                      type="radio"
                      name="rewardType"
                      value="discount_fixed"
                      checked={form.rewardType === "discount_fixed"}
                      onChange={() => updateField("rewardType", "discount_fixed")}
                    />
                    <span>Giảm giá cố định (VNĐ)</span>
                  </label>
                  <label className="promo-radio">
                    <input
                      type="radio"
                      name="rewardType"
                      value="discount_percent"
                      checked={form.rewardType === "discount_percent"}
                      onChange={() => updateField("rewardType", "discount_percent")}
                    />
                    <FiPercent size={14} />
                    <span>Giảm giá theo %</span>
                  </label>
                </div>
              </div>

              {/* ── Gift selection ── */}
              {form.rewardType === "gift" && (
                <div className="form-group">
                  <label className="form-label">Quà tặng *</label>
                  {form.rewardGifts.map((gift, index) => (
                    <div key={index} className="promo-gift-row">
                      <select
                        className="form-input"
                        value={gift.groupId}
                        onChange={(e) =>
                          updateGift(index, "groupId", e.target.value)
                        }
                      >
                        <option value="">— Chọn nhóm —</option>
                        {customizationGroups.map((g: LegoCustomizationGroup) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="form-input"
                        value={gift.optionId}
                        onChange={(e) =>
                          updateGift(index, "optionId", e.target.value)
                        }
                        disabled={!gift.groupId}
                      >
                        <option value="">— Chọn lựa chọn —</option>
                        {getOptionsForGroup(gift.groupId).map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                            {opt.price > 0 ? ` (+${formatMoney(opt.price)})` : ""}
                          </option>
                        ))}
                      </select>
                      <input
                        className="form-input"
                        type="number"
                        min="1"
                        style={{ width: "70px", flex: "0 0 70px" }}
                        value={gift.quantity}
                        onChange={(e) =>
                          updateGift(index, "quantity", e.target.value)
                        }
                        title="Số lượng"
                      />
                      {form.rewardGifts.length > 1 && (
                        <button
                          type="button"
                          className="btn-icon btn-del"
                          onClick={() => removeGift(index)}
                          title="Xóa quà"
                        >
                          <FiX size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={addGift}
                    style={{ marginTop: "8px" }}
                  >
                    <FiPlus size={14} /> Thêm quà tặng
                  </button>
                </div>
              )}

              {/* ── Discount value ── */}
              {form.rewardType !== "gift" && (
                <div className="form-group">
                  <label className="form-label">
                    {form.rewardType === "discount_fixed"
                      ? "Số tiền giảm (VNĐ) *"
                      : "Phần trăm giảm (%) *"}
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    max={form.rewardType === "discount_percent" ? "100" : undefined}
                    step={form.rewardType === "discount_percent" ? "0.1" : "1000"}
                    value={form.rewardDiscountValue}
                    onChange={(e) =>
                      updateField("rewardDiscountValue", e.target.value)
                    }
                    placeholder={
                      form.rewardType === "discount_fixed" ? "VD: 50000" : "VD: 10"
                    }
                  />
                </div>
              )}

              {/* ── Date range ── */}
              <div className="form-group">
                <label className="form-label">
                  Thời hạn ưu đãi{" "}
                  <span className="text-muted" style={{ fontWeight: 400 }}>
                    (bỏ trống = vô thời hạn)
                  </span>
                </label>
                <div className="promo-date-row">
                  <input
                    className="form-input"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => updateField("startDate", e.target.value)}
                    placeholder="Ngày bắt đầu"
                  />
                  <span className="promo-date-sep">đến</span>
                  <input
                    className="form-input"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => updateField("endDate", e.target.value)}
                    placeholder="Ngày kết thúc"
                  />
                </div>
              </div>

              {/* ── Active toggle ── */}
              <div className="form-group">
                <label className="promo-radio" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => updateField("isActive", e.target.checked)}
                  />
                  <span>Kích hoạt ưu đãi</span>
                </label>
              </div>

              {/* ── Footer ── */}
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
                      <FiSave size={14} /> Lưu ưu đãi
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deletingPromotion && (
        <div
          className="modal-overlay"
          onClick={() => setDeletingPromotion(null)}
        >
          <div
            className="modal-box modal-box--sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title modal-title--danger">Xóa ưu đãi</h3>
              <button
                className="modal-close"
                onClick={() => setDeletingPromotion(null)}
              >
                <FiX size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="confirm-body">
                <FiAlertTriangle className="confirm-icon" />
                <p>
                  Bạn có chắc muốn xóa ưu đãi{" "}
                  <strong>{deletingPromotion.name}</strong>?
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-secondary"
                  onClick={() => setDeletingPromotion(null)}
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

export default PromotionsTab;
