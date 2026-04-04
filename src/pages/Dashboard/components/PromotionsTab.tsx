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
import { RichTextContent, RichTextEditor } from "../../../components/common";
import {
  createPromotion,
  deletePromotion,
  getPromotions,
  updatePromotion,
} from "../../../services/promotions.service";
import { getBearCustomizationGroups } from "../../../services/bear-customizations.service";
import { getBearVariants } from "../../../services/bear-variants.service";
import { getLegoCustomizationGroups } from "../../../services/lego-customizations.service";
import { getLegoFrameVariants } from "../../../services/lego-frame-variants.service";
import type {
  PromotionFormState,
  PromotionGiftForm,
  PromotionRewardType,
  PromotionRow,
} from "../types";
import {
  normalizeRichTextForStorage,
  toRichTextPlainText,
} from "../../../lib/rich-text";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CONDITION_LABELS: Record<string, string> = {
  lego_quantity: "Theo số lượng tùy chỉnh",
  set_quantity: "Theo số lượng sản phẩm",
};

const REWARD_LABELS: Record<string, string> = {
  gift: "Tặng quà",
  discount_fixed: "Giảm giá cố định",
  discount_percent: "Giảm giá %",
  freeship: "Freeship",
};

const PRODUCT_TYPE_LABELS: Record<"lego" | "bear", string> = {
  lego: "Lego",
  bear: "Gấu",
};

const GIFT_MODE_LABELS: Record<"fixed" | "multiply_by_condition", string> = {
  fixed: "Số lượng quà cố định",
  multiply_by_condition: "Nhân theo điều kiện",
};

const GIFT_SELECTION_MODE_LABELS: Record<"all" | "choose_one", string> = {
  all: "Tặng toàn bộ quà đã cấu hình",
  choose_one: "Khách chọn 1 món trong danh sách quà",
};

const EMPTY_GIFT: PromotionGiftForm = {
  groupId: "",
  optionId: "",
  quantity: "1",
};

const INITIAL_FORM: PromotionFormState = {
  name: "",
  description: "",
  conditionType: "lego_quantity",
  conditionMinQuantity: "3",
  conditionMaxQuantity: "",
  applicableProductType: "lego",
  applicableProductIds: [],
  rewardTypes: ["gift"],
  rewardGiftSelectionMode: "all",
  rewardGiftQuantityMode: "fixed",
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

type PromotionProductType = PromotionFormState["applicableProductType"];

interface PromotionProductItem {
  id: string;
  productType: PromotionProductType;
  collectionId: string;
  collectionName: string;
  categoryName: string;
  name: string;
  price: number;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
const PromotionsTab = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  const canCreate = hasPermission(currentUser, "promotions.create");
  const canEdit = hasPermission(currentUser, "promotions.edit");
  const canDelete = hasPermission(currentUser, "promotions.delete");

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingPromotion, setEditingPromotion] = useState<PromotionRow | null>(
    null,
  );
  const [deletingPromotion, setDeletingPromotion] =
    useState<PromotionRow | null>(null);
  const [form, setForm] = useState<PromotionFormState>({ ...INITIAL_FORM });

  // ── Data queries ────────────────────────────────────────────────────────────
  const { data: promotions = [] } = useQuery({
    queryKey: ["promotions"],
    queryFn: getPromotions,
  });

  const { data: legoCustomizationGroups = [] } = useQuery({
    queryKey: ["lego-customization-groups"],
    queryFn: getLegoCustomizationGroups,
  });

  const { data: bearCustomizationGroups = [] } = useQuery({
    queryKey: ["bear-customization-groups"],
    queryFn: getBearCustomizationGroups,
  });

  const { data: legoFrameVariants = [] } = useQuery({
    queryKey: ["lego-frame-variants"],
    queryFn: getLegoFrameVariants,
  });

  const { data: bearVariants = [] } = useQuery({
    queryKey: ["bear-variants"],
    queryFn: getBearVariants,
  });

  const customizationGroupsByType = useMemo(
    () => ({
      lego: legoCustomizationGroups,
      bear: bearCustomizationGroups,
    }),
    [bearCustomizationGroups, legoCustomizationGroups],
  );

  const promotionProducts = useMemo<PromotionProductItem[]>(
    () => [
      ...legoFrameVariants.map((variant) => ({
        id: variant.id,
        productType: "lego" as const,
        collectionId: variant.collectionId,
        collectionName: variant.collectionName || "Chưa có bộ sưu tập",
        categoryName: variant.categoryName || "Chưa phân loại",
        name: variant.name,
        price: variant.price,
      })),
      ...bearVariants.map((variant) => ({
        id: variant.id,
        productType: "bear" as const,
        collectionId: variant.collectionId,
        collectionName: variant.collectionName || "Chưa có bộ sưu tập",
        categoryName: variant.categoryName || "Chưa phân loại",
        name: variant.name,
        price: variant.price,
      })),
    ],
    [bearVariants, legoFrameVariants],
  );

  const productLookup = useMemo(
    () => new Map(promotionProducts.map((product) => [product.id, product])),
    [promotionProducts],
  );

  const productsByCollection = useMemo(() => {
    const scopedProducts = promotionProducts.filter(
      (product) => product.productType === form.applicableProductType,
    );
    const groups = new Map<
      string,
      { collectionName: string; items: PromotionProductItem[] }
    >();

    scopedProducts.forEach((product) => {
      const key = product.collectionId || product.collectionName || "default";
      const current = groups.get(key);

      if (current) {
        current.items.push(product);
        return;
      }

      groups.set(key, {
        collectionName: product.collectionName || "Chưa có bộ sưu tập",
        items: [product],
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
  }, [form.applicableProductType, promotionProducts]);

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
        toRichTextPlainText(p.description).toLowerCase().includes(kw) ||
        (p.applicableProductIds ?? []).some((productId) => {
          const product = productLookup.get(productId);
          if (!product) return false;

          return `${PRODUCT_TYPE_LABELS[product.productType]} ${product.collectionName} ${product.categoryName} ${product.name}`
            .toLowerCase()
            .includes(kw);
        }),
    );
  }, [productLookup, promotions, search]);

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
      conditionMaxQuantity:
        promo.conditionMaxQuantity != null
          ? String(promo.conditionMaxQuantity)
          : "",
      applicableProductType: promo.applicableProductType ?? "lego",
      applicableProductIds: promo.applicableProductIds ?? [],
      rewardTypes: promo.rewardTypes ?? ["gift"],
      rewardGiftSelectionMode: promo.rewardGiftSelectionMode ?? "all",
      rewardGiftQuantityMode: promo.rewardGiftQuantityMode ?? "fixed",
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

  const handleApplicableProductTypeChange = (
    nextType: PromotionProductType,
  ) => {
    setForm((prev) => {
      const nextApplicableProductIds = prev.applicableProductIds.filter(
        (productId) => productLookup.get(productId)?.productType === nextType,
      );

      const nextRewardGifts =
        prev.rewardTypes.includes("gift")
          ? (prev.rewardGifts.length > 0
              ? prev.rewardGifts
              : [{ ...EMPTY_GIFT }]
            ).map((gift) => ({ ...gift, groupId: "", optionId: "" }))
          : prev.rewardGifts;

      return {
        ...prev,
        applicableProductType: nextType,
        applicableProductIds: nextApplicableProductIds,
        rewardGifts: nextRewardGifts,
      };
    });
  };

  const updateGift = (
    index: number,
    field: keyof PromotionGiftForm,
    value: string,
  ) => {
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

  const currentCustomizationGroups =
    customizationGroupsByType[form.applicableProductType] ?? [];

  // ── Get options for a specific group ────────────────────────────────────────
  const getOptionsForGroup = (groupId: string) => {
    const group = currentCustomizationGroups.find((g) => g.id === groupId);
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

    const conditionMaxQuantity = form.conditionMaxQuantity.trim()
      ? parseInt(form.conditionMaxQuantity, 10)
      : null;
    if (conditionMaxQuantity !== null) {
      if (isNaN(conditionMaxQuantity) || conditionMaxQuantity < 1) {
        toast.error("Số lượng tối đa phải từ 1 trở lên.");
        return;
      }
      if (conditionMaxQuantity < conditionMinQuantity) {
        toast.error(
          "Số lượng tối đa phải lớn hơn hoặc bằng số lượng tối thiểu.",
        );
        return;
      }
    }

    const applicableProductIds = form.applicableProductIds.filter(
      (productId) =>
        productLookup.get(productId)?.productType ===
        form.applicableProductType,
    );

    if (form.rewardTypes.length === 0) {
      toast.error("Phải chọn ít nhất 1 loại phần thưởng.");
      return;
    }

    const hasGift = form.rewardTypes.includes("gift");
    const hasDiscount = form.rewardTypes.some((t) =>
      ["discount_fixed", "discount_percent"].includes(t),
    );

    if (hasGift) {
      const validGifts = form.rewardGifts.filter(
        (g) => g.groupId && g.optionId,
      );
      if (validGifts.length === 0) {
        toast.error("Phải chọn ít nhất 1 quà tặng.");
        return;
      }
    }

    if (hasDiscount) {
      const val = parseFloat(form.rewardDiscountValue);
      if (isNaN(val) || val < 0) {
        toast.error("Giá trị giảm giá không hợp lệ.");
        return;
      }
      if (form.rewardTypes.includes("discount_percent") && val > 100) {
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
        description: normalizeRichTextForStorage(form.description),
        conditionType: form.conditionType,
        conditionMinQuantity,
        conditionMaxQuantity,
        applicableProductType: form.applicableProductType,
        applicableProductIds,
        rewardTypes: form.rewardTypes,
        rewardGiftSelectionMode: hasGift
          ? form.rewardGiftSelectionMode
          : undefined,
        rewardGiftQuantityMode: hasGift
          ? form.rewardGiftQuantityMode
          : undefined,
        rewardGifts: hasGift
          ? form.rewardGifts
              .filter((g) => g.groupId && g.optionId)
              .map((g) => ({
                groupId: g.groupId,
                optionId: g.optionId,
                quantity: parseInt(g.quantity, 10) || 1,
              }))
          : undefined,
        rewardDiscountValue: hasDiscount
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
    const parts: string[] = [];

    if (promo.rewardTypes.includes("gift")) {
      const giftSummary = promo.rewardGifts
        .map((g) => `${g.optionName || "?"} x${g.quantity}`)
        .join(", ");
      const safeGiftSummary = giftSummary || "Quà tặng theo cấu hình";

      const rewardNotes: string[] = [];

      if (promo.rewardGiftSelectionMode === "choose_one") {
        rewardNotes.push("khách chọn 1 món");
      }

      if (promo.rewardGiftQuantityMode === "multiply_by_condition") {
        rewardNotes.push(
          promo.conditionType === "lego_quantity"
            ? "nhân theo số lượng tùy chỉnh đủ điều kiện"
            : "nhân theo số set đủ điều kiện",
        );
      }

      parts.push(
        rewardNotes.length > 0
          ? `${safeGiftSummary} (${rewardNotes.join(", ")})`
          : safeGiftSummary,
      );
    }

    if (promo.rewardTypes.includes("discount_fixed")) {
      parts.push(`Giảm ${formatMoney(promo.rewardDiscountValue)}`);
    } else if (promo.rewardTypes.includes("discount_percent")) {
      parts.push(`Giảm ${promo.rewardDiscountValue}%`);
    }

    if (promo.rewardTypes.includes("freeship")) {
      parts.push("Miễn phí vận chuyển");
    }

    return parts.join(" + ") || "—";
  };

  const renderDateRange = (promo: PromotionRow) => {
    if (!promo.startDate && !promo.endDate) return "Không giới hạn";
    return `${formatDate(promo.startDate)} – ${formatDate(promo.endDate)}`;
  };

  const renderApplicableProducts = (promo: PromotionRow) => {
    const applicableProductIds = promo.applicableProductIds ?? [];
    const applicableProductType = promo.applicableProductType ?? "lego";
    const productTypeLabel = PRODUCT_TYPE_LABELS[applicableProductType];

    if (applicableProductIds.length === 0) {
      return `Tất cả sản phẩm ${productTypeLabel}`;
    }

    const productNames = applicableProductIds
      .map((productId) => productLookup.get(productId))
      .filter((product): product is PromotionProductItem => {
        if (!product) {
          return false;
        }

        return product.productType === applicableProductType;
      })
      .map((product) => product.name);

    if (productNames.length === 0) {
      return `${productTypeLabel}: ${applicableProductIds.length} sản phẩm đã chọn`;
    }

    if (productNames.length <= 2) {
      return `${productTypeLabel}: ${productNames.join(", ")}`;
    }

    return `${productTypeLabel}: ${productNames.slice(0, 2).join(", ")} +${productNames.length - 2} sản phẩm`;
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
            <strong>{promotions.filter((p) => p.isActive).length}</strong>
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
                <th>Áp dụng cho</th>
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
                        <div style={{ fontSize: "12px", margin: "2px 0 0" }}>
                          <RichTextContent
                            value={promo.description}
                            className="text-muted"
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="lc-name-chip">
                      {CONDITION_LABELS[promo.conditionType]}{" "}
                      {promo.conditionMaxQuantity != null
                        ? `${promo.conditionMinQuantity} – ${promo.conditionMaxQuantity}`
                        : `≥ ${promo.conditionMinQuantity}`}
                    </span>
                  </td>
                  <td>
                    <p
                      className="text-muted"
                      style={{ fontSize: "12px", margin: 0, lineHeight: 1.5 }}
                    >
                      {renderApplicableProducts(promo)}
                    </p>
                  </td>
                  <td>
                    {promo.rewardTypes.map((rt) => (
                      <span
                        key={rt}
                        className="lc-name-chip"
                        style={{ marginRight: "4px", marginBottom: "2px" }}
                      >
                        {REWARD_LABELS[rt] ?? rt}
                      </span>
                    ))}
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
                  <td className="text-muted">
                    {formatDateTime(promo.updatedAt)}
                  </td>
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
                <RichTextEditor
                  value={form.description}
                  onChange={(nextValue) =>
                    updateField("description", nextValue)
                  }
                  placeholder="Mô tả ngắn về ưu đãi..."
                  minHeight={120}
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
                      onChange={() =>
                        updateField("conditionType", "lego_quantity")
                      }
                    />
                    <span>Theo số lượng tùy chỉnh</span>
                  </label>
                  <label className="promo-radio">
                    <input
                      type="radio"
                      name="conditionType"
                      value="set_quantity"
                      checked={form.conditionType === "set_quantity"}
                      onChange={() =>
                        updateField("conditionType", "set_quantity")
                      }
                    />
                    <span>Theo số lượng sản phẩm</span>
                  </label>
                </div>
              </div>

              {/* Min / Max Quantity */}
              <div style={{ display: "flex", gap: "12px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">
                    Số lượng tối thiểu *
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    value={form.conditionMinQuantity}
                    onChange={(e) =>
                      updateField("conditionMinQuantity", e.target.value)
                    }
                    placeholder="VD: 1"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">
                    Số lượng tối đa
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    value={form.conditionMaxQuantity}
                    onChange={(e) =>
                      updateField("conditionMaxQuantity", e.target.value)
                    }
                    placeholder="Để trống = không giới hạn"
                  />
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
                      onChange={() => handleApplicableProductTypeChange("lego")}
                    />
                    <span>Sản phẩm Lego</span>
                  </label>
                  <label className="promo-radio">
                    <input
                      type="radio"
                      name="applicableProductType"
                      value="bear"
                      checked={form.applicableProductType === "bear"}
                      onChange={() => handleApplicableProductTypeChange("bear")}
                    />
                    <span>Sản phẩm Gấu</span>
                  </label>
                </div>
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
                  Không chọn sản phẩm nào thì ưu đãi sẽ tự áp dụng cho toàn bộ
                  sản phẩm {PRODUCT_TYPE_LABELS[form.applicableProductType]}.
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
                  {productsByCollection.length === 0 ? (
                    <p
                      className="text-muted"
                      style={{ margin: 0, fontSize: "13px" }}
                    >
                      Chưa có sản phẩm{" "}
                      {PRODUCT_TYPE_LABELS[form.applicableProductType]} nào để
                      chọn phạm vi áp dụng.
                    </p>
                  ) : (
                    productsByCollection.map((group) => (
                      <div
                        key={group.collectionName}
                        style={{ display: "grid", gap: "8px" }}
                      >
                        <strong style={{ fontSize: "13px", color: "#1f2937" }}>
                          {group.collectionName}
                        </strong>
                        <div style={{ display: "grid", gap: "8px" }}>
                          {group.items.map((product) => {
                            const checked = form.applicableProductIds.includes(
                              product.id,
                            );

                            return (
                              <label
                                key={product.id}
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
                                      toggleApplicableProduct(product.id)
                                    }
                                  />
                                  <span>
                                    <strong
                                      style={{
                                        display: "block",
                                        fontSize: "13px",
                                      }}
                                    >
                                      {product.name}
                                    </strong>
                                    <small style={{ color: "#6b7280" }}>
                                      {product.categoryName || "Chưa phân loại"}
                                    </small>
                                  </span>
                                </span>
                                <small
                                  style={{
                                    color: "#6b7280",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {formatMoney(product.price)}
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

              {/* Reward Types */}
              <div className="form-group">
                <label className="form-label">Loại phần thưởng * (chọn nhiều)</label>
                <div className="promo-radio-group">
                  {(
                    [
                      { value: "gift", icon: <FiGift size={14} />, label: "Tặng quà" },
                      { value: "discount_fixed", icon: null, label: "Giảm giá cố định (VNĐ)" },
                      { value: "discount_percent", icon: <FiPercent size={14} />, label: "Giảm giá theo %" },
                      { value: "freeship", icon: null, label: "Miễn phí vận chuyển (Freeship)" },
                    ] as const
                  ).map((opt) => (
                    <label key={opt.value} className="promo-radio">
                      <input
                        type="checkbox"
                        checked={form.rewardTypes.includes(opt.value)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...form.rewardTypes, opt.value]
                            : form.rewardTypes.filter((t) => t !== opt.value);
                          // discount_fixed and discount_percent are mutually exclusive
                          const cleaned =
                            e.target.checked &&
                            (opt.value === "discount_fixed" || opt.value === "discount_percent")
                              ? next.filter(
                                  (t) =>
                                    t === opt.value ||
                                    (t !== "discount_fixed" && t !== "discount_percent"),
                                )
                              : next;
                          updateField("rewardTypes", cleaned as PromotionRewardType[]);
                        }}
                      />
                      {opt.icon}
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ── Gift selection ── */}
              {form.rewardTypes.includes("gift") && (
                <div className="form-group">
                  <label className="form-label">Cách nhận quà *</label>
                  <div
                    className="promo-radio-group"
                    style={{ marginBottom: "10px" }}
                  >
                    <label className="promo-radio">
                      <input
                        type="radio"
                        name="rewardGiftSelectionMode"
                        value="all"
                        checked={form.rewardGiftSelectionMode === "all"}
                        onChange={() =>
                          updateField("rewardGiftSelectionMode", "all")
                        }
                      />
                      <span>{GIFT_SELECTION_MODE_LABELS.all}</span>
                    </label>
                    <label className="promo-radio">
                      <input
                        type="radio"
                        name="rewardGiftSelectionMode"
                        value="choose_one"
                        checked={form.rewardGiftSelectionMode === "choose_one"}
                        onChange={() =>
                          updateField("rewardGiftSelectionMode", "choose_one")
                        }
                      />
                      <span>{GIFT_SELECTION_MODE_LABELS.choose_one}</span>
                    </label>
                  </div>

                  <label className="form-label">Chế độ số lượng quà *</label>
                  <div
                    className="promo-radio-group"
                    style={{ marginBottom: "10px" }}
                  >
                    <label className="promo-radio">
                      <input
                        type="radio"
                        name="rewardGiftQuantityMode"
                        value="fixed"
                        checked={form.rewardGiftQuantityMode === "fixed"}
                        onChange={() =>
                          updateField("rewardGiftQuantityMode", "fixed")
                        }
                      />
                      <span>{GIFT_MODE_LABELS.fixed}</span>
                    </label>
                    <label className="promo-radio">
                      <input
                        type="radio"
                        name="rewardGiftQuantityMode"
                        value="multiply_by_condition"
                        checked={
                          form.rewardGiftQuantityMode ===
                          "multiply_by_condition"
                        }
                        onChange={() =>
                          updateField(
                            "rewardGiftQuantityMode",
                            "multiply_by_condition",
                          )
                        }
                      />
                      <span>
                        {form.conditionType === "lego_quantity"
                          ? "Nhân theo số lượng tùy chỉnh của sản phẩm đạt điều kiện"
                          : "Nhân theo số set (sản phẩm) đạt điều kiện"}
                      </span>
                    </label>
                  </div>

                  <p
                    className="text-muted"
                    style={{ margin: "0 0 10px", fontSize: "12px" }}
                  >
                    {form.rewardGiftSelectionMode === "choose_one"
                      ? "Khách hàng sẽ chọn 1 món quà trong danh sách bên dưới khi đặt hàng."
                      : "Khách hàng sẽ nhận toàn bộ quà trong danh sách bên dưới."}
                  </p>

                  <p
                    className="text-muted"
                    style={{ margin: "0 0 10px", fontSize: "12px" }}
                  >
                    {form.rewardGiftQuantityMode === "fixed"
                      ? "Mỗi quà dùng đúng số lượng đã nhập bên dưới."
                      : "Số lượng quà thực nhận = số lượng nhập bên dưới x số lượng điều kiện đạt được."}
                  </p>

                  <p
                    className="text-muted"
                    style={{ margin: "0 0 10px", fontSize: "12px" }}
                  >
                    Chỉ hiển thị nhóm tùy chỉnh của sản phẩm{" "}
                    {PRODUCT_TYPE_LABELS[form.applicableProductType]}.
                  </p>

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
                        {currentCustomizationGroups.map((g) => (
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
                            {opt.price > 0
                              ? ` (+${formatMoney(opt.price)})`
                              : ""}
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
              {form.rewardTypes.some((t) =>
                ["discount_fixed", "discount_percent"].includes(t),
              ) && (
                <div className="form-group">
                  <label className="form-label">
                    {form.rewardTypes.includes("discount_fixed")
                      ? "Số tiền giảm (VNĐ) *"
                      : "Phần trăm giảm (%) *"}
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    max={
                      form.rewardTypes.includes("discount_percent")
                        ? "100"
                        : undefined
                    }
                    step={
                      form.rewardTypes.includes("discount_percent")
                        ? "0.1"
                        : "1000"
                    }
                    value={form.rewardDiscountValue}
                    onChange={(e) =>
                      updateField("rewardDiscountValue", e.target.value)
                    }
                    placeholder={
                      form.rewardTypes.includes("discount_fixed")
                        ? "VD: 50000"
                        : "VD: 10"
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
