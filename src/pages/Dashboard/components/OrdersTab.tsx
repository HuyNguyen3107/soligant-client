import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { FiClipboard, FiEye, FiRefreshCw, FiX } from "react-icons/fi";
import { ImageWithFallback, RichTextContent } from "../../../components/common";
import { getErrorMessage } from "../../../lib/error";
import { getStaticAssetUrl } from "../../../lib/http";
import { buildBackgroundFieldKey } from "../../../lib/custom-cart";
import {
  formatCustomerOrderFieldValue,
  isCustomerOrderFieldValueEmpty,
} from "../../../lib/customer-order-fields";
import { hasPermission } from "../../../lib/permissions";
import { useAuthStore } from "../../../store/auth.store";
import {
  getOrders,
  getSystemUsers,
  assignOrder,
  updateOrderStatus,
  updateOrderShippingFee,
  uploadOrderProgressImage,
  updateOrderProgressImages,
} from "../../../services/orders.service";
import { getLegoCustomizationGroups } from "../../../services/lego-customizations.service";
import { getBearCustomizationGroups } from "../../../services/bear-customizations.service";
import { getAddonOptions } from "../../../services/addon-options.service";
import type {
  AddonOptionRow,
  BearCustomizationGroup,
  LegoCustomizationGroup,
  OrderRow,
  OrderStatus,
  OrderProductType,
  UserRow,
} from "../types";
import { ALL_ORDER_STATUSES, BEAR_EXCLUDED_STATUSES } from "../types";

// ─── Payload helper types (data stored in item.payload from order creation) ──

interface PayloadLegoEntry {
  groupName: string;
  optionName: string;
  count: number;
}

interface PayloadLegoSlotSelection {
  groupName: string;
  optionName: string;
  optionId?: string;
  colorCode?: string;
}

interface PayloadLegoSlot {
  slot: number;
  selections: PayloadLegoSlotSelection[];
}

interface PayloadBgField {
  label: string;
  fieldType: string;
  sortOrder?: number;
  selectType?: string;
  options?: Array<{ label: string; value: string }>;
}

interface PayloadAddonCustomField {
  label: string;
  fieldType: string;
  value: string;
}

interface PayloadAddonOption {
  id?: string;
  name: string;
  price: number;
  customFieldValues?: PayloadAddonCustomField[];
}

interface PayloadInfoEntry {
  label: string;
  value: string;
}

interface CustomizationOptionMeta {
  name: string;
  image?: string;
  colorCode?: string;
}

type ProgressImageKey =
  | "demoImage"
  | "backgroundImage"
  | "completedProductImage";

const PROGRESS_IMAGE_LABELS: Record<ProgressImageKey, string> = {
  demoImage: "Ảnh demo",
  backgroundImage: "Ảnh background",
  completedProductImage: "Ảnh sản phẩm hoàn thiện",
};

const looksLikeObjectId = (value: string) =>
  /^[a-f\d]{24}$/i.test(value.trim());

const resolveDisplayValue = (
  value: string | undefined,
  dictionary: Map<string, string>,
) => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return "-";
  return dictionary.get(normalized) ?? normalized;
};

const getPayloadLegoSummary = (
  payload: Record<string, unknown>,
): PayloadLegoEntry[] =>
  Array.isArray(payload.customizationSummary)
    ? (payload.customizationSummary as PayloadLegoEntry[])
    : [];

const getPayloadLegoSlots = (
  payload: Record<string, unknown>,
): PayloadLegoSlot[] =>
  Array.isArray(payload.legoSlotDetails)
    ? (payload.legoSlotDetails as PayloadLegoSlot[])
    : [];

const getPayloadBearSlots = (
  payload: Record<string, unknown>,
): PayloadLegoSlot[] =>
  Array.isArray(payload.bearSlotDetails)
    ? (payload.bearSlotDetails as PayloadLegoSlot[])
    : [];

const getPayloadBgFields = (
  payload: Record<string, unknown>,
): PayloadBgField[] => {
  const bg = payload.background;
  if (
    bg &&
    typeof bg === "object" &&
    Array.isArray((bg as Record<string, unknown>).fields)
  ) {
    const fields = (bg as Record<string, unknown>).fields as PayloadBgField[];
    return [...fields].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  return [];
};

const getPayloadBgValues = (
  payload: Record<string, unknown>,
): Record<string, string | string[]> => {
  const bfv = payload.backgroundFieldValues;
  if (bfv && typeof bfv === "object" && !Array.isArray(bfv)) {
    return bfv as Record<string, string | string[]>;
  }
  return {};
};

const pickFirstNonEmptyString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const getPayloadBackgroundOverview = (
  payload: Record<string, unknown>,
  fallbackBackgroundName: string,
): PayloadInfoEntry[] => {
  const background =
    payload.background && typeof payload.background === "object"
      ? (payload.background as Record<string, unknown>)
      : null;

  const backgroundName = pickFirstNonEmptyString(
    background?.name,
    fallbackBackgroundName,
  );

  const themeName = pickFirstNonEmptyString(
    payload.backgroundThemeName,
    payload.themeName,
    payload.backgroundTheme,
    background?.themeName,
    background?.theme,
    (background?.theme as Record<string, unknown> | undefined)?.name,
  );

  const backgroundId = pickFirstNonEmptyString(
    payload.backgroundId,
    background?.id,
    background?._id,
  );

  const entries: PayloadInfoEntry[] = [];
  if (backgroundName) {
    entries.push({ label: "Background", value: backgroundName });
  }
  if (themeName) {
    entries.push({ label: "Chủ đề background", value: themeName });
  }
  if (backgroundId) {
    entries.push({ label: "Mã background", value: backgroundId });
  }
  return entries;
};

const getPayloadPromotionSummaries = (payload: Record<string, unknown>) => {
  const candidates = [
    payload.appliedPromotions,
    payload.orderPromotions,
    payload.itemPromotions,
    payload.promotions,
  ].find((value) => Array.isArray(value) && value.length > 0);

  if (!Array.isArray(candidates)) {
    return [] as string[];
  }

  return candidates
    .map((promotion) => {
      if (!promotion || typeof promotion !== "object") return "";
      const current = promotion as Record<string, unknown>;
      const name = pickFirstNonEmptyString(
        current.name,
        current.title,
        current.promotionName,
      );
      const summary = pickFirstNonEmptyString(
        current.rewardSummary,
        current.description,
      );

      if (name && summary) return `${name}: ${summary}`;
      if (name) return name;
      return summary;
    })
    .filter(Boolean);
};

const normalizeOrderFieldValue = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join(", ");
  }
  return "";
};

const extractCustomerOverview = (entries: OrderRow["customerInfoEntries"]) => {
  let name = "";
  let phone = "";
  let address = "";

  entries.forEach((entry) => {
    const label = (entry.label ?? "").toLowerCase();
    const value = normalizeOrderFieldValue(entry.value);
    if (!value) return;

    if (!name && /(họ\s*tên|tên|full\s*name|name)/i.test(label)) {
      name = value;
      return;
    }

    if (!phone && /(sđt|điện\s*thoại|phone|tel|zalo)/i.test(label)) {
      phone = value;
      return;
    }

    if (!address && /(địa\s*chỉ|address|nơi\s*nhận|giao\s*hàng)/i.test(label)) {
      address = value;
    }
  });

  return { name, phone, address };
};

const getPayloadAddonOptions = (
  payload: Record<string, unknown>,
  fallbackNames: string[],
): PayloadAddonOption[] => {
  if (
    Array.isArray(payload.additionalOptions) &&
    payload.additionalOptions.length > 0
  ) {
    return payload.additionalOptions as PayloadAddonOption[];
  }
  return fallbackNames.map((name) => ({ name, price: 0 }));
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Tiếp nhận đơn",
  consulting: "Tư vấn",
  waiting_demo: "Chờ demo",
  waiting_demo_confirm: "Chờ confirm demo",
  waiting_payment: "Chờ chuyển khoản",
  paid: "Đã thanh toán",
  designing: "Đang thiết kế",
  waiting_design_approval: "Chờ duyệt thiết kế",
  producing: "Đang sản xuất",
  shipped: "Đã gửi vận chuyển",
  delivering: "Đang giao",
  completed: "Hoàn thành",
  complaint: "Khiếu nại",
  handling_complaint: "Đang xử lý khiếu nại",
  complaint_closed: "Đóng khiếu nại",
  closed: "Kết thúc",
  cancelled: "Huỷ đơn",
};

const SHIPPING_PAYER_LABELS: Record<string, string> = {
  customer: "Khách hàng",
  shop: "Shop",
};

const STATUS_COLORS: Record<OrderStatus, { bg: string; color: string }> = {
  received: { bg: "#e0f2fe", color: "#0369a1" },
  consulting: { bg: "#fef3c7", color: "#92400e" },
  waiting_demo: { bg: "#fef9c3", color: "#854d0e" },
  waiting_demo_confirm: { bg: "#fef9c3", color: "#854d0e" },
  waiting_payment: { bg: "#ffedd5", color: "#9a3412" },
  paid: { bg: "#dbeafe", color: "#1d4ed8" },
  designing: { bg: "#ede9fe", color: "#6d28d9" },
  waiting_design_approval: { bg: "#ede9fe", color: "#6d28d9" },
  producing: { bg: "#e0e7ff", color: "#4338ca" },
  shipped: { bg: "#cffafe", color: "#0e7490" },
  delivering: { bg: "#ccfbf1", color: "#0f766e" },
  completed: { bg: "#dcfce7", color: "#166534" },
  complaint: { bg: "#fee2e2", color: "#991b1b" },
  handling_complaint: { bg: "#fecaca", color: "#b91c1c" },
  complaint_closed: { bg: "#f3f4f6", color: "#6b7280" },
  closed: { bg: "#f3f4f6", color: "#374151" },
  cancelled: { bg: "#fee2e2", color: "#991b1b" },
};

const getStatusesForProductType = (
  productType: OrderProductType,
): OrderStatus[] => {
  if (productType === "bear") {
    return ALL_ORDER_STATUSES.filter(
      (status) => !BEAR_EXCLUDED_STATUSES.includes(status),
    );
  }
  return ALL_ORDER_STATUSES;
};

const formatMoney = (value: number) =>
  `${new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.floor(value)))} đ`;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const getItemsPreview = (order: OrderRow) => {
  const names = order.items.map((item) => item.productName).filter(Boolean);

  if (names.length === 0) {
    return "Không có dữ liệu sản phẩm";
  }

  if (names.length <= 2) {
    return names.join(", ");
  }

  return `${names.slice(0, 2).join(", ")} +${names.length - 2} sản phẩm`;
};

const OrdersTab = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const canEditOrder = hasPermission(currentUser, "orders.edit");
  const canAssignAny = hasPermission(currentUser, "orders.assign");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);
  const [shippingEdit, setShippingEdit] = useState({ name: "", fee: "" });
  const [progressImageEdit, setProgressImageEdit] = useState({
    demoImage: "",
    backgroundImage: "",
    completedProductImage: "",
  });
  const [uploadingImageKey, setUploadingImageKey] =
    useState<ProgressImageKey | null>(null);
  // ID đơn hàng đang trong chế độ chuyển giao (hiện dropdown chọn người nhận mới)
  const [transferOrderId, setTransferOrderId] = useState<string | null>(null);

  const {
    data: orders = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
  });

  const { data: systemUsers = [] } = useQuery<UserRow[]>({
    queryKey: ["system-users"],
    queryFn: getSystemUsers,
    staleTime: 5 * 60 * 1000,
  });

  const { data: legoGroups = [] } = useQuery<LegoCustomizationGroup[]>({
    queryKey: ["lego-customization-groups-for-orders"],
    queryFn: getLegoCustomizationGroups,
    staleTime: 5 * 60 * 1000,
  });

  const { data: bearGroups = [] } = useQuery<BearCustomizationGroup[]>({
    queryKey: ["bear-customization-groups-for-orders"],
    queryFn: getBearCustomizationGroups,
    staleTime: 5 * 60 * 1000,
  });

  const { data: addonOptionsCatalog = [] } = useQuery<AddonOptionRow[]>({
    queryKey: ["addon-options-for-orders"],
    queryFn: getAddonOptions,
    staleTime: 5 * 60 * 1000,
  });

  const customizationGroupNameById = useMemo(() => {
    const map = new Map<string, string>();
    [...legoGroups, ...bearGroups].forEach((group) => {
      map.set(group.id, group.name);
    });
    return map;
  }, [legoGroups, bearGroups]);

  const customizationOptionNameById = useMemo(() => {
    const map = new Map<string, string>();
    [...legoGroups, ...bearGroups].forEach((group) => {
      group.options.forEach((option) => {
        map.set(option.id, option.name);
      });
    });
    return map;
  }, [legoGroups, bearGroups]);

  const customizationOptionMetaById = useMemo(() => {
    const map = new Map<string, CustomizationOptionMeta>();
    [...legoGroups, ...bearGroups].forEach((group) => {
      group.options.forEach((option) => {
        map.set(option.id, {
          name: option.name,
          image: option.image,
          colorCode: option.colorCode,
        });
      });
    });
    return map;
  }, [legoGroups, bearGroups]);

  const addonNameById = useMemo(() => {
    const map = new Map<string, string>();
    addonOptionsCatalog.forEach((option) => {
      map.set(option.id, option.name);
    });
    return map;
  }, [addonOptionsCatalog]);

  const updateStatusMutation = useMutation({
    mutationFn: async (variables: {
      id: string;
      status: OrderStatus;
      assignedTo?: string;
    }) => {
      return updateOrderStatus(
        variables.id,
        variables.status,
        variables.assignedTo,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Đã cập nhật trạng thái đơn hàng.");
    },
    onError: (mutationError) => {
      toast.error(
        getErrorMessage(
          mutationError,
          "Không thể cập nhật trạng thái đơn hàng.",
        ),
      );
    },
  });

  const assignOrderMutation = useMutation({
    mutationFn: (variables: { id: string; assignedTo: string }) =>
      assignOrder(variables.id, variables.assignedTo),
    onSuccess: () => {
      setTransferOrderId(null);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Đã cập nhật người nhận đơn.");
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, "Không thể cập nhật người nhận đơn."));
    },
  });

  const saveShippingMutation = useMutation({
    mutationFn: (variables: { id: string; name: string; fee: number }) =>
      updateOrderShippingFee(variables.id, {
        shippingName: variables.name,
        shippingFee: variables.fee,
      }),
    onSuccess: (updatedOrder: OrderRow) => {
      setDetailOrder(updatedOrder);
      setShippingEdit({
        name: updatedOrder.pricingSummary.shippingName,
        fee:
          updatedOrder.pricingSummary.shippingFee > 0
            ? String(updatedOrder.pricingSummary.shippingFee)
            : "",
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Đã cập nhật phí ship.");
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không thể lưu phí ship."));
    },
  });

  const saveProgressImagesMutation = useMutation({
    mutationFn: (variables: {
      id: string;
      demoImage: string;
      backgroundImage: string;
      completedProductImage: string;
    }) => updateOrderProgressImages(variables.id, variables),
    onSuccess: (updatedOrder: OrderRow) => {
      setDetailOrder(updatedOrder);
      setProgressImageEdit({
        demoImage: updatedOrder.progressImages?.demoImage ?? "",
        backgroundImage: updatedOrder.progressImages?.backgroundImage ?? "",
        completedProductImage:
          updatedOrder.progressImages?.completedProductImage ?? "",
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Đã cập nhật ảnh tiến độ đơn hàng.");
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không thể lưu ảnh tiến độ."));
    },
  });

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const matchesKeyword =
        order.orderCode.toLowerCase().includes(keyword) ||
        order.variantSymbol.toLowerCase().includes(keyword) ||
        order.items.some((item) =>
          item.productName.toLowerCase().includes(keyword),
        );

      return matchesKeyword;
    });
  }, [orders, search, statusFilter]);

  const handleUpdateStatus = async (id: string, status: OrderStatus) => {
    if (!canEditOrder) {
      toast.error("Bạn không có quyền cập nhật trạng thái đơn hàng.");
      return;
    }

    await updateStatusMutation.mutateAsync({ id, status });
  };

  const handleSaveShipping = async () => {
    if (!detailOrder) return;
    const fee = Math.max(0, parseFloat(shippingEdit.fee) || 0);
    await saveShippingMutation.mutateAsync({
      id: detailOrder.id,
      name: shippingEdit.name,
      fee,
    });
  };

  const handleUploadProgressImage = async (
    key: ProgressImageKey,
    file: File | null,
  ) => {
    if (!file) return;

    try {
      setUploadingImageKey(key);
      const uploadedUrl = await uploadOrderProgressImage(file);
      setProgressImageEdit((prev) => ({ ...prev, [key]: uploadedUrl }));
      toast.success(`Đã tải lên ${PROGRESS_IMAGE_LABELS[key].toLowerCase()}.`);
    } catch (uploadError) {
      toast.error(getErrorMessage(uploadError, "Không thể tải ảnh lên."));
    } finally {
      setUploadingImageKey(null);
    }
  };

  const handleClearProgressImage = (key: ProgressImageKey) => {
    setProgressImageEdit((prev) => ({
      ...prev,
      [key]: "",
    }));
  };

  const handleSaveProgressImages = async () => {
    if (!detailOrder) return;

    await saveProgressImagesMutation.mutateAsync({
      id: detailOrder.id,
      demoImage: progressImageEdit.demoImage.trim(),
      backgroundImage: progressImageEdit.backgroundImage.trim(),
      completedProductImage: progressImageEdit.completedProductImage.trim(),
    });
  };

  const shippingFeeNum = Math.max(0, parseFloat(shippingEdit.fee) || 0);
  const computedDetailTotal = detailOrder
    ? Math.max(
        0,
        detailOrder.pricingSummary.subtotal -
          detailOrder.pricingSummary.productDiscountTotal -
          detailOrder.pricingSummary.orderDiscountTotal +
          shippingFeeNum,
      )
    : 0;

  const detailAssigneeName = detailOrder
    ? systemUsers.find((u) => u._id === detailOrder.assignedTo)?.name ||
      detailOrder.assignedTo ||
      "Chưa có"
    : "Chưa có";

  const customerOverview = useMemo(
    () =>
      detailOrder
        ? extractCustomerOverview(detailOrder.customerInfoEntries ?? [])
        : { name: "", phone: "", address: "" },
    [detailOrder],
  );

  const overviewItemsPreview = detailOrder
    ? detailOrder.items
        .map((item) => item.productName)
        .filter(Boolean)
        .slice(0, 2)
        .join(", ") || "-"
    : "-";

  const stats = useMemo(() => {
    const received = orders.filter(
      (order) => order.status === "received",
    ).length;
    const completed = orders.filter(
      (order) => order.status === "completed" || order.status === "closed",
    ).length;

    return {
      total: orders.length,
      received,
      completed,
    };
  }, [orders]);

  return (
    <div className="tab-panel promo-root">
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Đơn hàng</h2>
          <p className="tab-subtitle">
            Theo dõi đơn khách đặt từ trang thông tin đơn hàng và cập nhật trạng
            thái xử lý.
          </p>
        </div>
        <button
          className="btn-secondary"
          onClick={() => refetch()}
          disabled={isFetching}
          title="Làm mới danh sách đơn hàng"
        >
          <FiRefreshCw size={14} /> {isFetching ? "Đang làm mới..." : "Làm mới"}
        </button>
      </div>

      <section className="lc-stats">
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">
            <FiClipboard size={15} />
          </span>
          <div>
            <strong>{stats.total}</strong>
            <span>Tổng đơn</span>
          </div>
        </div>
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">R</span>
          <div>
            <strong>{stats.received}</strong>
            <span>Tiếp nhận đơn</span>
          </div>
        </div>
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">C</span>
          <div>
            <strong>{stats.completed}</strong>
            <span>Hoàn thành</span>
          </div>
        </div>
      </section>

      <section className="tab-toolbar">
        <div className="tab-search-wrap">
          <input
            className="tab-search"
            placeholder="Tìm theo mã đơn, ký hiệu, tên sản phẩm..."
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

        <select
          className="form-input"
          style={{ maxWidth: "220px" }}
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as OrderStatus | "all")
          }
        >
          <option value="all">Tất cả trạng thái</option>
          {ALL_ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </section>

      {isLoading ? (
        <div className="tab-empty">
          <FiClipboard size={40} className="tab-empty-icon" />
          <p>Đang tải danh sách đơn hàng...</p>
        </div>
      ) : isError ? (
        <div className="tab-empty">
          <FiClipboard size={40} className="tab-empty-icon" />
          <p>{getErrorMessage(error, "Không thể tải danh sách đơn hàng.")}</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="tab-empty">
          <FiClipboard size={40} className="tab-empty-icon" />
          <p>
            {orders.length === 0
              ? "Chưa có đơn hàng nào từ khách hàng."
              : "Không tìm thấy đơn phù hợp bộ lọc."}
          </p>
        </div>
      ) : (
        <div className="tab-table-wrap">
          <table className="tab-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Sản phẩm</th>
                <th>Số lượng</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Người nhận đơn</th>
                <th>Thời gian</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const statusStyles = STATUS_COLORS[order.status];
                const isUpdatingThisOrder =
                  updateStatusMutation.isPending &&
                  updateStatusMutation.variables?.id === order.id;

                return (
                  <tr key={order.id}>
                    <td>
                      <div>
                        <strong>{order.orderCode}</strong>
                        <p
                          className="text-muted"
                          style={{ margin: "2px 0 0", fontSize: "12px" }}
                        >
                          Ký hiệu: {order.variantSymbol}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{getItemsPreview(order)}</strong>
                        {order.note && (
                          <p
                            className="text-muted"
                            style={{ margin: "2px 0 0", fontSize: "12px" }}
                          >
                            Ghi chú: {order.note}
                          </p>
                        )}
                      </div>
                    </td>
                    <td>{order.itemsCount}</td>
                    <td>
                      <strong>
                        {formatMoney(order.pricingSummary.finalTotal)}
                      </strong>
                      {(order.pricingSummary.productDiscountTotal > 0 ||
                        order.pricingSummary.orderDiscountTotal > 0) && (
                        <p
                          className="text-muted"
                          style={{ margin: "2px 0 0", fontSize: "12px" }}
                        >
                          Giảm:{" "}
                          {formatMoney(
                            order.pricingSummary.productDiscountTotal +
                              order.pricingSummary.orderDiscountTotal,
                          )}
                        </p>
                      )}
                    </td>
                    <td>
                      {canEditOrder ? (
                        <select
                          className="form-input"
                          value={order.status}
                          disabled={isUpdatingThisOrder}
                          onChange={(event) =>
                            handleUpdateStatus(
                              order.id,
                              event.target.value as OrderStatus,
                            )
                          }
                        >
                          {getStatusesForProductType(order.productType).map(
                            (status) => (
                              <option key={status} value={status}>
                                {STATUS_LABELS[status]}
                              </option>
                            ),
                          )}
                        </select>
                      ) : (
                        <span
                          className="lc-name-chip"
                          style={{
                            background: statusStyles.bg,
                            color: statusStyles.color,
                          }}
                        >
                          {STATUS_LABELS[order.status]}
                        </span>
                      )}
                    </td>
                    <td>
                      {(() => {
                        const assigneeName =
                          systemUsers.find((u) => u._id === order.assignedTo)
                            ?.name ||
                          order.assignedTo ||
                          "";
                        const currentUserId = currentUser?.id ?? "";
                        const isMyOrder = order.assignedTo === currentUserId;
                        const isUnassigned = !order.assignedTo;
                        const isTransferring = transferOrderId === order.id;
                        const isAssigning =
                          assignOrderMutation.isPending &&
                          (
                            assignOrderMutation.variables as
                              | { id: string }
                              | undefined
                          )?.id === order.id;

                        // Chế độ 1: quyền orders.assign → dropdown chọn bất kỳ user
                        if (canAssignAny) {
                          return (
                            <select
                              className="form-input"
                              style={{ minWidth: "130px", fontSize: "13px" }}
                              value={order.assignedTo || ""}
                              disabled={isAssigning}
                              onChange={(event) => {
                                const value = event.target.value;
                                if (value !== (order.assignedTo || "")) {
                                  assignOrderMutation.mutate({
                                    id: order.id,
                                    assignedTo: value,
                                  });
                                }
                              }}
                            >
                              <option value="">— Chưa có —</option>
                              {systemUsers.map((u) => (
                                <option key={u._id} value={u._id}>
                                  {u.name}
                                </option>
                              ))}
                            </select>
                          );
                        }

                        // Chế độ 2: đơn chưa có người nhận → nút "Nhận đơn"
                        if (isUnassigned) {
                          return (
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{
                                padding: "5px 10px",
                                fontSize: "12px",
                                whiteSpace: "nowrap",
                              }}
                              disabled={isAssigning}
                              onClick={() =>
                                assignOrderMutation.mutate({
                                  id: order.id,
                                  assignedTo: currentUserId,
                                })
                              }
                            >
                              {isAssigning ? "Đang nhận..." : "Nhận đơn"}
                            </button>
                          );
                        }

                        // Chế độ 3: mình đang nhận → tên + nút "Chuyển giao"
                        if (isMyOrder) {
                          if (isTransferring) {
                            return (
                              <div
                                style={{
                                  display: "flex",
                                  gap: "4px",
                                  alignItems: "center",
                                }}
                              >
                                <select
                                  className="form-input"
                                  style={{
                                    minWidth: "120px",
                                    fontSize: "13px",
                                  }}
                                  defaultValue=""
                                  disabled={isAssigning}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    if (value) {
                                      assignOrderMutation.mutate({
                                        id: order.id,
                                        assignedTo: value,
                                      });
                                    }
                                  }}
                                >
                                  <option value="" disabled>
                                    Chọn người nhận...
                                  </option>
                                  {systemUsers
                                    .filter((u) => u._id !== currentUserId)
                                    .map((u) => (
                                      <option key={u._id} value={u._id}>
                                        {u.name}
                                      </option>
                                    ))}
                                </select>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  style={{
                                    padding: "5px 8px",
                                    fontSize: "12px",
                                  }}
                                  onClick={() => setTransferOrderId(null)}
                                >
                                  <FiX size={12} />
                                </button>
                              </div>
                            );
                          }
                          return (
                            <div
                              style={{
                                display: "flex",
                                gap: "6px",
                                alignItems: "center",
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{ fontSize: "13px", fontWeight: 500 }}
                              >
                                {assigneeName}
                              </span>
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "11px",
                                  whiteSpace: "nowrap",
                                }}
                                onClick={() => setTransferOrderId(order.id)}
                              >
                                Chuyển giao
                              </button>
                            </div>
                          );
                        }

                        // Chế độ 4: đơn do người khác nhận → chỉ xem
                        return (
                          <span
                            className="text-muted"
                            style={{ fontSize: "13px" }}
                          >
                            {assigneeName || "—"}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="text-muted">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: "7px 12px", fontSize: "12px" }}
                        onClick={() => {
                          setDetailOrder(order);
                          setShippingEdit({
                            name: order.pricingSummary.shippingName,
                            fee:
                              order.pricingSummary.shippingFee > 0
                                ? String(order.pricingSummary.shippingFee)
                                : "",
                          });
                          setProgressImageEdit({
                            demoImage: order.progressImages?.demoImage ?? "",
                            backgroundImage:
                              order.progressImages?.backgroundImage ?? "",
                            completedProductImage:
                              order.progressImages?.completedProductImage ?? "",
                          });
                        }}
                      >
                        <FiEye size={14} /> Xem chi tiết
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="lc-summary">
        Hiển thị {filteredOrders.length}/{orders.length} đơn hàng
      </p>

      {detailOrder && (
        <div className="modal-overlay" onClick={() => setDetailOrder(null)}>
          <div
            className="modal-box modal-box--lg order-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">Chi tiết đơn hàng</h3>
              <button
                className="modal-close"
                type="button"
                onClick={() => setDetailOrder(null)}
              >
                <FiX size={16} />
              </button>
            </div>

            <div className="modal-body">
              <section className="order-detail-top">
                <div>
                  <p className="order-detail-label">Mã đơn hàng</p>
                  <h4 className="order-detail-code">{detailOrder.orderCode}</h4>
                </div>
                <span
                  className="order-detail-status"
                  style={{
                    background: STATUS_COLORS[detailOrder.status].bg,
                    color: STATUS_COLORS[detailOrder.status].color,
                  }}
                >
                  {STATUS_LABELS[detailOrder.status]}
                </span>
              </section>

              <section className="order-detail-priority-grid">
                <article className="order-detail-priority-card">
                  <p>Khách hàng</p>
                  <strong>{customerOverview.name || "Chưa có"}</strong>
                  <span>{customerOverview.phone || "Chưa có SĐT"}</span>
                </article>
                <article className="order-detail-priority-card">
                  <p>Người nhận xử lý</p>
                  <strong>{detailAssigneeName}</strong>
                  <span>
                    {SHIPPING_PAYER_LABELS[detailOrder.shippingPayer] ??
                      detailOrder.shippingPayer}
                  </span>
                </article>
                <article className="order-detail-priority-card">
                  <p>Tổng thanh toán</p>
                  <strong>{formatMoney(computedDetailTotal)}</strong>
                  <span>{detailOrder.itemsCount} sản phẩm</span>
                </article>
                <article className="order-detail-priority-card">
                  <p>Loại đơn hàng</p>
                  <strong>
                    {detailOrder.productType === "bear"
                      ? "Gấu"
                      : "Lego / Khung tranh"}
                  </strong>
                  <span>{overviewItemsPreview}</span>
                </article>
                {customerOverview.address && (
                  <article className="order-detail-priority-card order-detail-priority-card--wide">
                    <p>Địa chỉ giao hàng</p>
                    <strong>{customerOverview.address}</strong>
                  </article>
                )}
              </section>

              <section className="order-detail-grid">
                <div className="order-detail-field">
                  <span>Thời gian tạo</span>
                  <strong>{formatDateTime(detailOrder.createdAt)}</strong>
                </div>
                <div className="order-detail-field">
                  <span>Cập nhật lần cuối</span>
                  <strong>{formatDateTime(detailOrder.updatedAt)}</strong>
                </div>
                <div className="order-detail-field">
                  <span>Số sản phẩm</span>
                  <strong>{detailOrder.itemsCount}</strong>
                </div>
                <div className="order-detail-field">
                  <span>Ký hiệu mã</span>
                  <strong>{detailOrder.variantSymbol}</strong>
                </div>
                <div className="order-detail-field">
                  <span>Loại sản phẩm</span>
                  <strong>
                    {detailOrder.productType === "bear"
                      ? "Gấu"
                      : "Lego / Khung tranh"}
                  </strong>
                </div>
                <div className="order-detail-field">
                  <span>Người nhận đơn</span>
                  <strong>
                    {systemUsers.find((u) => u._id === detailOrder.assignedTo)
                      ?.name ||
                      detailOrder.assignedTo ||
                      "Chưa có"}
                  </strong>
                </div>
                <div className="order-detail-field">
                  <span>Người trả phí ship</span>
                  <strong>
                    {SHIPPING_PAYER_LABELS[detailOrder.shippingPayer] ??
                      detailOrder.shippingPayer}
                  </strong>
                </div>
              </section>

              <section className="order-detail-section">
                <h4 className="order-detail-section-title">
                  Thông tin thanh toán
                </h4>
                <div className="order-detail-pricing">
                  <div className="order-detail-pricing-row">
                    <span>Tạm tính</span>
                    <strong>
                      {formatMoney(detailOrder.pricingSummary.subtotal)}
                    </strong>
                  </div>
                  {detailOrder.pricingSummary.productDiscountTotal > 0 && (
                    <div className="order-detail-pricing-row is-discount">
                      <span>Giảm theo sản phẩm</span>
                      <strong>
                        -
                        {formatMoney(
                          detailOrder.pricingSummary.productDiscountTotal,
                        )}
                      </strong>
                    </div>
                  )}
                  {detailOrder.pricingSummary.orderDiscountTotal > 0 && (
                    <div className="order-detail-pricing-row is-discount">
                      <span>Giảm theo set</span>
                      <strong>
                        -
                        {formatMoney(
                          detailOrder.pricingSummary.orderDiscountTotal,
                        )}
                      </strong>
                    </div>
                  )}
                  {/* ── Shipping fee ── */}
                  {canEditOrder ? (
                    <div className="order-detail-pricing-row order-detail-shipping-edit-row">
                      <input
                        className="order-detail-shipping-name-input"
                        placeholder="Tên phí ship (vd: Giao hàng nhanh)"
                        value={shippingEdit.name}
                        onChange={(e) =>
                          setShippingEdit((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                      />
                      <div className="order-detail-shipping-fee-right">
                        <input
                          type="number"
                          className="order-detail-shipping-fee-input"
                          placeholder="0"
                          min={0}
                          value={shippingEdit.fee}
                          onChange={(e) =>
                            setShippingEdit((prev) => ({
                              ...prev,
                              fee: e.target.value,
                            }))
                          }
                        />
                        <span className="order-detail-shipping-unit">đ</span>
                        <button
                          type="button"
                          className="btn-primary order-detail-shipping-save-btn"
                          disabled={saveShippingMutation.isPending}
                          onClick={handleSaveShipping}
                        >
                          {saveShippingMutation.isPending
                            ? "Lưu..."
                            : "Lưu phí"}
                        </button>
                      </div>
                    </div>
                  ) : shippingFeeNum > 0 ? (
                    <div className="order-detail-pricing-row is-shipping">
                      <span>
                        Phí ship
                        {detailOrder.pricingSummary.shippingName
                          ? ` (${detailOrder.pricingSummary.shippingName})`
                          : ""}
                      </span>
                      <strong>+{formatMoney(shippingFeeNum)}</strong>
                    </div>
                  ) : null}
                  <div className="order-detail-pricing-row is-total">
                    <span>Tổng thanh toán</span>
                    <strong>{formatMoney(computedDetailTotal)}</strong>
                  </div>
                </div>
              </section>

              <section className="order-detail-section">
                <h4 className="order-detail-section-title">
                  Ảnh tiến độ đơn hàng
                </h4>
                <div className="order-progress-images-grid">
                  {(
                    [
                      "demoImage",
                      "backgroundImage",
                      "completedProductImage",
                    ] as ProgressImageKey[]
                  ).map((key) => {
                    const imageValue = progressImageEdit[key]?.trim() ?? "";
                    const previewUrl =
                      getStaticAssetUrl(imageValue) ?? imageValue;
                    const isUploading = uploadingImageKey === key;
                    const fileInputId = `order-progress-upload-${key}`;

                    return (
                      <article className="order-progress-image-card" key={key}>
                        <div className="order-progress-image-head">
                          <p className="order-progress-image-label">
                            {PROGRESS_IMAGE_LABELS[key]}
                          </p>
                          <span
                            className={`order-progress-image-badge ${previewUrl ? "is-filled" : "is-empty"}`}
                          >
                            {previewUrl ? "Đã có ảnh" : "Chưa có ảnh"}
                          </span>
                        </div>

                        <div className="order-progress-image-preview-wrap">
                          {previewUrl ? (
                            <a
                              href={previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="order-progress-image-preview-link"
                              title="Bấm để xem ảnh gốc"
                            >
                              <ImageWithFallback
                                src={previewUrl}
                                alt={PROGRESS_IMAGE_LABELS[key]}
                                className="order-progress-image-preview"
                                fallback={
                                  <span className="order-detail-item-bg-field-value">
                                    Ảnh không còn khả dụng
                                  </span>
                                }
                              />
                            </a>
                          ) : (
                            <p className="order-progress-image-empty">
                              Chưa có ảnh
                            </p>
                          )}
                        </div>

                        {canEditOrder && (
                          <>
                            <input
                              className="order-progress-image-url-input"
                              value={imageValue}
                              onChange={(event) =>
                                setProgressImageEdit((prev) => ({
                                  ...prev,
                                  [key]: event.target.value,
                                }))
                              }
                              placeholder="Dán URL ảnh hoặc tải lên bên dưới"
                            />
                            <div className="order-progress-image-upload-row">
                              <input
                                id={fileInputId}
                                type="file"
                                accept="image/*"
                                className="order-progress-image-file-input"
                                onChange={(event) => {
                                  const selectedFile =
                                    event.target.files?.[0] ?? null;
                                  void handleUploadProgressImage(
                                    key,
                                    selectedFile,
                                  );
                                  event.currentTarget.value = "";
                                }}
                                disabled={
                                  isUploading ||
                                  saveProgressImagesMutation.isPending
                                }
                              />
                              <label
                                htmlFor={fileInputId}
                                className="btn-secondary order-progress-image-upload-btn"
                              >
                                {isUploading
                                  ? "Đang tải ảnh..."
                                  : "Tải ảnh từ máy"}
                              </label>
                              {imageValue && (
                                <button
                                  type="button"
                                  className="btn-secondary order-progress-image-clear-btn"
                                  onClick={() => handleClearProgressImage(key)}
                                  disabled={
                                    isUploading ||
                                    saveProgressImagesMutation.isPending
                                  }
                                >
                                  Xóa ảnh
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </article>
                    );
                  })}
                </div>

                {canEditOrder && (
                  <div className="order-progress-image-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleSaveProgressImages}
                      disabled={saveProgressImagesMutation.isPending}
                    >
                      {saveProgressImagesMutation.isPending
                        ? "Đang lưu..."
                        : "Lưu ảnh tiến độ"}
                    </button>
                  </div>
                )}
              </section>

              <section className="order-detail-section">
                <h4 className="order-detail-section-title">
                  Ghi chú khách hàng
                </h4>
                {detailOrder.note ? (
                  <p className="order-detail-note">{detailOrder.note}</p>
                ) : (
                  <p className="order-detail-empty">
                    Khách hàng không để lại ghi chú
                  </p>
                )}
              </section>

              <section className="order-detail-section">
                <h4 className="order-detail-section-title">
                  Thông tin khách hàng
                </h4>
                {(detailOrder.customerInfoEntries ?? []).length > 0 ? (
                  <div className="order-detail-item-bg-fields">
                    {(detailOrder.customerInfoEntries ?? [])
                      .filter(
                        (entry) =>
                          entry.required ||
                          !isCustomerOrderFieldValueEmpty(entry, entry.value),
                      )
                      .sort((left, right) => left.sortOrder - right.sortOrder)
                      .map((entry) => (
                        <div
                          key={entry.key}
                          className="order-detail-item-bg-field"
                        >
                          <span className="order-detail-item-bg-field-label">
                            {entry.label}
                          </span>
                          {entry.fieldType === "image_upload" ? (
                            typeof entry.value === "string" &&
                            entry.value.trim() ? (
                              <ImageWithFallback
                                src={getStaticAssetUrl(entry.value) ?? ""}
                                alt={entry.label}
                                className="order-detail-item-bg-field-img"
                                fallback={
                                  <span className="order-detail-item-bg-field-value">
                                    Ảnh không còn khả dụng
                                  </span>
                                }
                              />
                            ) : (
                              <span className="order-detail-item-bg-field-value">
                                Chưa tải ảnh
                              </span>
                            )
                          ) : entry.fieldType === "long_text" ? (
                            <RichTextContent
                              value={
                                typeof entry.value === "string"
                                  ? entry.value
                                  : ""
                              }
                              className="order-detail-item-bg-field-value"
                            />
                          ) : (
                            <span className="order-detail-item-bg-field-value">
                              {formatCustomerOrderFieldValue(entry)}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="order-detail-empty">
                    Chưa có thông tin khách hàng
                  </p>
                )}
              </section>

              {(detailOrder.appliedGifts ?? []).length > 0 && (
                <section className="order-detail-section">
                  <h4 className="order-detail-section-title">
                    Quà tặng khuyến mãi
                  </h4>
                  <div className="order-detail-item-addon-list">
                    {detailOrder.appliedGifts.map((gift, i) => (
                      <div key={i} className="order-detail-item-addon-option">
                        <div className="order-detail-item-addon-head">
                          <strong>
                            Quà tặng:{" "}
                            {resolveDisplayValue(
                              gift.optionId,
                              customizationOptionNameById,
                            )}
                          </strong>
                          <span>×{gift.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="order-detail-section">
                <h4 className="order-detail-section-title">
                  Sản phẩm trong đơn
                </h4>

                <div className="order-detail-items">
                  {detailOrder.items.map((item, index) => {
                    const legoSummary = getPayloadLegoSummary(item.payload);
                    const bgFields = getPayloadBgFields(item.payload);
                    const legoSlots = getPayloadLegoSlots(item.payload);
                    const bearSlots = getPayloadBearSlots(item.payload);
                    const isBear =
                      detailOrder.productType === "bear" ||
                      bearSlots.length > 0 ||
                      (typeof item.payload.totalBearCount === "number" &&
                        (item.payload.totalBearCount as number) > 0);
                    const bgValues = getPayloadBgValues(item.payload);
                    const addonOptions = getPayloadAddonOptions(
                      item.payload,
                      item.additionalOptionNames,
                    );
                    const backgroundOverview = getPayloadBackgroundOverview(
                      item.payload,
                      item.backgroundName,
                    );
                    const promotionSummaries = getPayloadPromotionSummaries(
                      item.payload,
                    );
                    const productImageUrl = getStaticAssetUrl(
                      item.productImage,
                    );
                    const totalBearCount =
                      typeof item.payload.totalBearCount === "number"
                        ? item.payload.totalBearCount
                        : 0;
                    const selectedAdditionalBearCount =
                      typeof item.payload.selectedAdditionalBearCount ===
                      "number"
                        ? item.payload.selectedAdditionalBearCount
                        : 0;

                    const resolveCustomizationGroup = (value?: string) =>
                      resolveDisplayValue(value, customizationGroupNameById);

                    const resolveCustomizationOption = (value?: string) =>
                      resolveDisplayValue(value, customizationOptionNameById);

                    const resolveCustomizationPresentation = (
                      selection: PayloadLegoSlotSelection,
                    ) => {
                      const optionKey = (
                        selection.optionId ??
                        selection.optionName ??
                        ""
                      ).trim();
                      const optionMeta = optionKey
                        ? customizationOptionMetaById.get(optionKey)
                        : undefined;

                      return {
                        optionName: resolveCustomizationOption(optionKey),
                        colorCode: (
                          selection.colorCode ||
                          optionMeta?.colorCode ||
                          ""
                        ).trim(),
                        imageUrl:
                          getStaticAssetUrl(optionMeta?.image ?? "") ?? "",
                      };
                    };

                    const buildSelectionGroups = (
                      selections: PayloadLegoSlotSelection[],
                    ) => {
                      const groups = new Map<
                        string,
                        Array<{
                          id: string;
                          optionName: string;
                          colorCode: string;
                          imageUrl: string;
                        }>
                      >();

                      selections.forEach((selection, idx) => {
                        const groupName = resolveCustomizationGroup(
                          selection.groupName,
                        );
                        const presentation =
                          resolveCustomizationPresentation(selection);
                        const current = groups.get(groupName) ?? [];
                        current.push({
                          id: `${groupName}-${idx}-${presentation.optionName}`,
                          optionName: presentation.optionName,
                          colorCode: presentation.colorCode,
                          imageUrl: presentation.imageUrl,
                        });
                        groups.set(groupName, current);
                      });

                      return Array.from(groups.entries()).map(
                        ([groupName, options]) => ({
                          groupName,
                          options,
                        }),
                      );
                    };

                    const resolveAddonName = (option: PayloadAddonOption) => {
                      if (option.id && addonNameById.has(option.id)) {
                        return addonNameById.get(option.id) ?? option.name;
                      }
                      if (
                        looksLikeObjectId(option.name) &&
                        addonNameById.has(option.name)
                      ) {
                        return addonNameById.get(option.name) ?? option.name;
                      }
                      return option.name;
                    };

                    const filledBgFields = bgFields.flatMap((field, i) => {
                      const key = buildBackgroundFieldKey(
                        i,
                        field.label,
                        field.fieldType,
                      );
                      const value = bgValues[key];
                      if (!value) return [];
                      if (Array.isArray(value) && value.length === 0) return [];
                      if (typeof value === "string" && !value.trim()) return [];
                      return [{ field, key, value }];
                    });

                    return (
                      <article
                        key={`${detailOrder.id}-${item.cartItemId || item.productId || index}`}
                        className="order-detail-item-card"
                      >
                        {/* ── Head: thumbnail + name + price ── */}
                        <div className="order-detail-item-head">
                          <ImageWithFallback
                            src={productImageUrl}
                            alt={item.productName}
                            className="order-detail-item-thumb"
                            fallback={
                              <div
                                className="order-detail-item-thumb"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: "#f8fafc",
                                  color: "#94a3b8",
                                }}
                              >
                                <FiClipboard size={18} />
                              </div>
                            }
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong>
                              {index + 1}. {item.productName || "Sản phẩm"}
                            </strong>
                            {(item.collectionName ||
                              item.categoryName ||
                              item.productSize) && (
                              <p className="order-detail-item-meta-sub">
                                {[
                                  item.collectionName,
                                  item.categoryName,
                                  item.productSize,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            )}
                          </div>
                          <span>{formatMoney(item.subtotal)}</span>
                        </div>

                        {/* ── Core meta ── */}
                        <div className="order-detail-item-meta">
                          <div className="order-detail-item-meta-field">
                            <span>Ký hiệu</span>
                            <strong>{item.variantSymbol || "-"}</strong>
                          </div>
                          <div className="order-detail-item-meta-field">
                            <span>Nền</span>
                            <strong>{item.backgroundName || "-"}</strong>
                          </div>
                          {isBear ? (
                            <>
                              <div className="order-detail-item-meta-field">
                                <span>Tổng Gấu</span>
                                <strong>{totalBearCount}</strong>
                              </div>
                              <div className="order-detail-item-meta-field">
                                <span>Gấu thêm</span>
                                <strong>{selectedAdditionalBearCount}</strong>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="order-detail-item-meta-field">
                                <span>Tổng Lego</span>
                                <strong>{item.totalLegoCount}</strong>
                              </div>
                              <div className="order-detail-item-meta-field">
                                <span>Lego thêm</span>
                                <strong>
                                  {item.selectedAdditionalLegoCount}
                                </strong>
                              </div>
                            </>
                          )}
                        </div>

                        {(backgroundOverview.length > 0 ||
                          promotionSummaries.length > 0) && (
                          <div className="order-detail-item-section">
                            <p className="order-detail-item-section-title">
                              Thông tin bổ sung
                            </p>
                            {backgroundOverview.length > 0 && (
                              <div className="order-detail-item-bg-fields">
                                {backgroundOverview.map((entry) => (
                                  <div
                                    key={`${entry.label}-${entry.value}`}
                                    className="order-detail-item-bg-field"
                                  >
                                    <span className="order-detail-item-bg-field-label">
                                      {entry.label}
                                    </span>
                                    <span className="order-detail-item-bg-field-value">
                                      {entry.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {promotionSummaries.length > 0 && (
                              <div className="order-detail-item-addon-list">
                                {promotionSummaries.map((summary, i) => (
                                  <div
                                    key={`${summary}-${i}`}
                                    className="order-detail-item-addon-option"
                                  >
                                    <div className="order-detail-item-addon-head">
                                      <strong>Ưu đãi áp dụng</strong>
                                    </div>
                                    <span className="order-detail-item-bg-field-value">
                                      {summary}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── Per-item pricing (only when there are addons) ── */}
                        {item.additionalOptionsPrice > 0 && (
                          <div className="order-detail-item-pricing">
                            <span>
                              Tùy chỉnh:{" "}
                              {formatMoney(item.customizationSubtotal)}
                            </span>
                            <span>
                              Mua thêm: +
                              {formatMoney(item.additionalOptionsPrice)}
                            </span>
                            <strong>
                              Tổng sản phẩm: {formatMoney(item.subtotal)}
                            </strong>
                          </div>
                        )}

                        {/* ── Customization configuration (Lego or Bear) ── */}
                        {isBear ? (
                          bearSlots.length > 0 ? (
                            <div className="order-detail-item-section">
                              <p className="order-detail-item-section-title">
                                Cấu hình từng Gấu ({bearSlots.length} Gấu)
                              </p>
                              <div className="order-detail-bear-slots">
                                {bearSlots.map((slotDetail) => (
                                  <div
                                    key={slotDetail.slot}
                                    className="order-detail-bear-slot"
                                  >
                                    <div className="order-detail-bear-slot-head">
                                      <p className="order-detail-bear-slot-label">
                                        Gấu {slotDetail.slot}
                                      </p>
                                      <span className="order-detail-bear-slot-count">
                                        {slotDetail.selections.length} lựa chọn
                                      </span>
                                    </div>
                                    <div className="order-detail-bear-slot-rows">
                                      {buildSelectionGroups(
                                        slotDetail.selections,
                                      ).map((group) => (
                                        <section
                                          key={`${slotDetail.slot}-${group.groupName}`}
                                          className="order-detail-bear-group-block"
                                        >
                                          <p className="order-detail-bear-group-title">
                                            {group.groupName}
                                          </p>
                                          <div className="order-detail-bear-group-options">
                                            {group.options.map((option) => (
                                              <div
                                                key={option.id}
                                                className="order-detail-bear-option-row"
                                              >
                                                <strong className="order-detail-bear-option">
                                                  {option.optionName}
                                                </strong>
                                                <div className="order-detail-bear-option-meta">
                                                  {option.colorCode ? (
                                                    <span className="order-detail-color-meta">
                                                      <span
                                                        className="order-detail-bear-color"
                                                        style={{
                                                          background:
                                                            option.colorCode,
                                                        }}
                                                        title={option.colorCode}
                                                      />
                                                      <span className="order-detail-color-code">
                                                        {option.colorCode}
                                                      </span>
                                                    </span>
                                                  ) : null}
                                                  {option.imageUrl ? (
                                                    <ImageWithFallback
                                                      src={option.imageUrl}
                                                      alt={option.optionName}
                                                      className="order-detail-option-image"
                                                      fallback={null}
                                                    />
                                                  ) : null}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </section>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="order-detail-item-section">
                              <p className="order-detail-item-section-title">
                                Cấu hình tùy chỉnh Gấu
                              </p>
                              <p className="order-detail-empty">
                                Không có cấu hình tùy chỉnh
                              </p>
                            </div>
                          )
                        ) : legoSlots.length > 0 ? (
                          <div className="order-detail-item-section">
                            <p className="order-detail-item-section-title">
                              Cấu hình từng Lego ({legoSlots.length} Lego)
                            </p>
                            <div className="order-detail-bear-slots">
                              {legoSlots.map((slotDetail) => (
                                <div
                                  key={slotDetail.slot}
                                  className="order-detail-bear-slot"
                                >
                                  <div className="order-detail-bear-slot-head">
                                    <p className="order-detail-bear-slot-label">
                                      Lego {slotDetail.slot}
                                    </p>
                                    <span className="order-detail-bear-slot-count">
                                      {slotDetail.selections.length} lựa chọn
                                    </span>
                                  </div>
                                  <div className="order-detail-bear-slot-rows">
                                    {buildSelectionGroups(
                                      slotDetail.selections,
                                    ).map((group) => (
                                      <section
                                        key={`${slotDetail.slot}-${group.groupName}`}
                                        className="order-detail-bear-group-block"
                                      >
                                        <p className="order-detail-bear-group-title">
                                          {group.groupName}
                                        </p>
                                        <div className="order-detail-bear-group-options">
                                          {group.options.map((option) => (
                                            <div
                                              key={option.id}
                                              className="order-detail-bear-option-row"
                                            >
                                              <strong className="order-detail-bear-option">
                                                {option.optionName}
                                              </strong>
                                              <div className="order-detail-bear-option-meta">
                                                {option.colorCode ? (
                                                  <span className="order-detail-color-meta">
                                                    <span
                                                      className="order-detail-bear-color"
                                                      style={{
                                                        background:
                                                          option.colorCode,
                                                      }}
                                                      title={option.colorCode}
                                                    />
                                                    <span className="order-detail-color-code">
                                                      {option.colorCode}
                                                    </span>
                                                  </span>
                                                ) : null}
                                                {option.imageUrl ? (
                                                  <ImageWithFallback
                                                    src={option.imageUrl}
                                                    alt={option.optionName}
                                                    className="order-detail-option-image"
                                                    fallback={null}
                                                  />
                                                ) : null}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </section>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : legoSummary.length > 0 ? (
                          <div className="order-detail-item-section">
                            <p className="order-detail-item-section-title">
                              Cấu hình Lego (tổng hợp)
                            </p>
                            <div className="order-detail-item-chips">
                              {legoSummary.map((entry, i) => (
                                <span
                                  key={i}
                                  className="order-detail-item-chip"
                                >
                                  {resolveCustomizationGroup(entry.groupName)}:{" "}
                                  <strong>
                                    {resolveCustomizationOption(
                                      entry.optionName,
                                    )}
                                  </strong>
                                  {entry.count > 1 && <em> ×{entry.count}</em>}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="order-detail-item-section">
                            <p className="order-detail-item-section-title">
                              Cấu hình tùy chỉnh
                            </p>
                            <p className="order-detail-empty">
                              Không có cấu hình tùy chỉnh
                            </p>
                          </div>
                        )}

                        {/* ── Background field values ── */}
                        {filledBgFields.length > 0 ? (
                          <div className="order-detail-item-section">
                            <p className="order-detail-item-section-title">
                              Thông tin nền & tùy chỉnh
                            </p>
                            <div className="order-detail-item-bg-fields">
                              {filledBgFields.map(({ field, key, value }) => {
                                let displayValue = "";
                                if (Array.isArray(value)) {
                                  displayValue = value
                                    .map(
                                      (v) =>
                                        field.options?.find(
                                          (opt) => opt.value === v,
                                        )?.label ?? v,
                                    )
                                    .join(", ");
                                } else if (field.fieldType === "select") {
                                  displayValue =
                                    field.options?.find(
                                      (opt) => opt.value === value,
                                    )?.label ?? value;
                                } else {
                                  displayValue = value;
                                }

                                return (
                                  <div
                                    key={key}
                                    className="order-detail-item-bg-field"
                                  >
                                    <span className="order-detail-item-bg-field-label">
                                      {field.label}
                                    </span>
                                    {field.fieldType === "image_upload" ? (
                                      <ImageWithFallback
                                        src={
                                          getStaticAssetUrl(
                                            typeof value === "string"
                                              ? value
                                              : "",
                                          ) ?? ""
                                        }
                                        alt={field.label}
                                        className="order-detail-item-bg-field-img"
                                        fallback={
                                          <span className="order-detail-item-bg-field-value">
                                            Ảnh không còn khả dụng
                                          </span>
                                        }
                                      />
                                    ) : (
                                      <span className="order-detail-item-bg-field-value">
                                        {displayValue}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="order-detail-item-section">
                            <p className="order-detail-item-section-title">
                              Thông tin nền & tùy chỉnh
                            </p>
                            <p className="order-detail-empty">
                              Không có thông tin nền tùy chỉnh
                            </p>
                          </div>
                        )}

                        {/* ── Addon options with custom field values ── */}
                        {addonOptions.length > 0 ? (
                          <div className="order-detail-item-section">
                            <p className="order-detail-item-section-title">
                              Mua thêm
                            </p>
                            <div className="order-detail-item-addon-list">
                              {addonOptions.map((option, i) => (
                                <div
                                  key={i}
                                  className="order-detail-item-addon-option"
                                >
                                  <div className="order-detail-item-addon-head">
                                    <strong>{resolveAddonName(option)}</strong>
                                    {option.price > 0 && (
                                      <span>+{formatMoney(option.price)}</span>
                                    )}
                                  </div>
                                  {option.customFieldValues &&
                                    option.customFieldValues.length > 0 && (
                                      <div className="order-detail-item-bg-fields">
                                        {option.customFieldValues.map(
                                          (cf, j) => (
                                            <div
                                              key={j}
                                              className="order-detail-item-bg-field"
                                            >
                                              <span className="order-detail-item-bg-field-label">
                                                {cf.label}
                                              </span>
                                              {cf.fieldType === "image" ? (
                                                <ImageWithFallback
                                                  src={
                                                    getStaticAssetUrl(
                                                      cf.value,
                                                    ) ?? ""
                                                  }
                                                  alt={cf.label}
                                                  className="order-detail-item-bg-field-img"
                                                  fallback={
                                                    <span className="order-detail-item-bg-field-value">
                                                      Ảnh không còn khả dụng
                                                    </span>
                                                  }
                                                />
                                              ) : cf.fieldType === "link" ? (
                                                <a
                                                  href={cf.value}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="order-detail-item-bg-field-value order-detail-item-link"
                                                >
                                                  {cf.value}
                                                </a>
                                              ) : (
                                                <span className="order-detail-item-bg-field-value">
                                                  {cf.value}
                                                </span>
                                              )}
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="order-detail-item-section">
                            <p className="order-detail-item-section-title">
                              Mua thêm
                            </p>
                            <p className="order-detail-empty">
                              Không có tùy chọn mua thêm
                            </p>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersTab;
