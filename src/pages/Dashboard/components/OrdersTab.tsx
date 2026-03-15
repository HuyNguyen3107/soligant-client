import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  FiClipboard,
  FiEye,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";
import { RichTextContent } from "../../../components/common";
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
  updateOrderStatus,
  updateOrderShippingFee,
} from "../../../services/orders.service";
import type {
  OrderRow,
  OrderStatus,
} from "../types";

// ─── Payload helper types (data stored in item.payload from order creation) ──

interface PayloadLegoEntry {
  groupName: string;
  optionName: string;
  count: number;
}

interface PayloadLegoSlotSelection {
  groupName: string;
  optionName: string;
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
  name: string;
  price: number;
  customFieldValues?: PayloadAddonCustomField[];
}

const getPayloadLegoSummary = (payload: Record<string, unknown>): PayloadLegoEntry[] =>
  Array.isArray(payload.customizationSummary)
    ? (payload.customizationSummary as PayloadLegoEntry[])
    : [];

const getPayloadLegoSlots = (payload: Record<string, unknown>): PayloadLegoSlot[] =>
  Array.isArray(payload.legoSlotDetails)
    ? (payload.legoSlotDetails as PayloadLegoSlot[])
    : [];

const getPayloadBgFields = (payload: Record<string, unknown>): PayloadBgField[] => {
  const bg = payload.background;
  if (bg && typeof bg === "object" && Array.isArray((bg as Record<string, unknown>).fields)) {
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

const getPayloadAddonOptions = (
  payload: Record<string, unknown>,
  fallbackNames: string[],
): PayloadAddonOption[] => {
  if (Array.isArray(payload.additionalOptions) && payload.additionalOptions.length > 0) {
    return payload.additionalOptions as PayloadAddonOption[];
  }
  return fallbackNames.map((name) => ({ name, price: 0 }));
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  processing: "Đang xử lý",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

const STATUS_COLORS: Record<OrderStatus, { bg: string; color: string }> = {
  pending: { bg: "#fef3c7", color: "#92400e" },
  confirmed: { bg: "#dbeafe", color: "#1d4ed8" },
  processing: { bg: "#ede9fe", color: "#6d28d9" },
  completed: { bg: "#dcfce7", color: "#166534" },
  cancelled: { bg: "#fee2e2", color: "#991b1b" },
};

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
];

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

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);
  const [shippingEdit, setShippingEdit] = useState({ name: "", fee: "" });

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

  const updateStatusMutation = useMutation({
    mutationFn: async (variables: { id: string; status: OrderStatus }) => {
      return updateOrderStatus(variables.id, variables.status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Đã cập nhật trạng thái đơn hàng.");
    },
    onError: (mutationError) => {
      toast.error(getErrorMessage(mutationError, "Không thể cập nhật trạng thái đơn hàng."));
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

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const matchesKeyword =
        order.orderCode.toLowerCase().includes(keyword) ||
        order.variantSymbol.toLowerCase().includes(keyword) ||
        order.items.some((item) => item.productName.toLowerCase().includes(keyword));

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

  const shippingFeeNum = Math.max(0, parseFloat(shippingEdit.fee) || 0);
  const computedDetailTotal = detailOrder
    ? Math.max(
        0,
        detailOrder.pricingSummary.subtotal
          - detailOrder.pricingSummary.productDiscountTotal
          - detailOrder.pricingSummary.orderDiscountTotal
          + shippingFeeNum,
      )
    : 0;

  const stats = useMemo(() => {
    const pending = orders.filter((order) => order.status === "pending").length;
    const completed = orders.filter((order) => order.status === "completed").length;

    return {
      total: orders.length,
      pending,
      completed,
    };
  }, [orders]);

  return (
    <div className="tab-panel promo-root">
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Đơn hàng</h2>
          <p className="tab-subtitle">
            Theo dõi đơn khách đặt từ trang thông tin đơn hàng và cập nhật trạng thái xử lý.
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
          <span className="lc-stat-card__icon">P</span>
          <div>
            <strong>{stats.pending}</strong>
            <span>Chờ xác nhận</span>
          </div>
        </div>
        <div className="lc-stat-card">
          <span className="lc-stat-card__icon">C</span>
          <div>
            <strong>{stats.completed}</strong>
            <span>Đã hoàn tất</span>
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
          onChange={(event) => setStatusFilter(event.target.value as OrderStatus | "all")}
        >
          <option value="all">Tất cả trạng thái</option>
          {ORDER_STATUSES.map((status) => (
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
                        <p className="text-muted" style={{ margin: "2px 0 0", fontSize: "12px" }}>
                          Ký hiệu: {order.variantSymbol}
                        </p>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{getItemsPreview(order)}</strong>
                        {order.note && (
                          <p className="text-muted" style={{ margin: "2px 0 0", fontSize: "12px" }}>
                            Ghi chú: {order.note}
                          </p>
                        )}
                      </div>
                    </td>
                    <td>{order.itemsCount}</td>
                    <td>
                      <strong>{formatMoney(order.pricingSummary.finalTotal)}</strong>
                      {(order.pricingSummary.productDiscountTotal > 0 ||
                        order.pricingSummary.orderDiscountTotal > 0) && (
                        <p className="text-muted" style={{ margin: "2px 0 0", fontSize: "12px" }}>
                          Giảm: {formatMoney(
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
                            handleUpdateStatus(order.id, event.target.value as OrderStatus)
                          }
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </option>
                          ))}
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
                    <td className="text-muted">{formatDateTime(order.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: "7px 12px", fontSize: "12px" }}
                        onClick={() => {
                          setDetailOrder(order);
                          setShippingEdit({
                            name: order.pricingSummary.shippingName,
                            fee: order.pricingSummary.shippingFee > 0
                              ? String(order.pricingSummary.shippingFee)
                              : "",
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
              </section>

              <section className="order-detail-section">
                <h4 className="order-detail-section-title">Thông tin thanh toán</h4>
                <div className="order-detail-pricing">
                  <div className="order-detail-pricing-row">
                    <span>Tạm tính</span>
                    <strong>{formatMoney(detailOrder.pricingSummary.subtotal)}</strong>
                  </div>
                  {detailOrder.pricingSummary.productDiscountTotal > 0 && (
                    <div className="order-detail-pricing-row is-discount">
                      <span>Giảm theo sản phẩm</span>
                      <strong>-{formatMoney(detailOrder.pricingSummary.productDiscountTotal)}</strong>
                    </div>
                  )}
                  {detailOrder.pricingSummary.orderDiscountTotal > 0 && (
                    <div className="order-detail-pricing-row is-discount">
                      <span>Giảm theo set</span>
                      <strong>-{formatMoney(detailOrder.pricingSummary.orderDiscountTotal)}</strong>
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
                          setShippingEdit((prev) => ({ ...prev, name: e.target.value }))
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
                            setShippingEdit((prev) => ({ ...prev, fee: e.target.value }))
                          }
                        />
                        <span className="order-detail-shipping-unit">đ</span>
                        <button
                          type="button"
                          className="btn-primary order-detail-shipping-save-btn"
                          disabled={saveShippingMutation.isPending}
                          onClick={handleSaveShipping}
                        >
                          {saveShippingMutation.isPending ? "Lưu..." : "Lưu phí"}
                        </button>
                      </div>
                    </div>
                  ) : shippingFeeNum > 0 ? (
                    <div className="order-detail-pricing-row is-shipping">
                      <span>
                        Phí ship{detailOrder.pricingSummary.shippingName
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

              {detailOrder.note && (
                <section className="order-detail-section">
                  <h4 className="order-detail-section-title">Ghi chú khách hàng</h4>
                  <p className="order-detail-note">{detailOrder.note}</p>
                </section>
              )}

              {detailOrder.customerInfoEntries?.length > 0 && (
                <section className="order-detail-section">
                  <h4 className="order-detail-section-title">Thông tin khách hàng</h4>
                  <div className="order-detail-item-bg-fields">
                    {(detailOrder.customerInfoEntries ?? [])
                      .filter(
                        (entry) =>
                          entry.required ||
                          !isCustomerOrderFieldValueEmpty(entry, entry.value),
                      )
                      .sort((left, right) => left.sortOrder - right.sortOrder)
                      .map((entry) => (
                        <div key={entry.key} className="order-detail-item-bg-field">
                          <span className="order-detail-item-bg-field-label">{entry.label}</span>
                          {entry.fieldType === "image_upload" ? (
                            typeof entry.value === "string" && entry.value.trim() ? (
                              <img
                                src={entry.value}
                                alt={entry.label}
                                className="order-detail-item-bg-field-img"
                              />
                            ) : (
                              <span className="order-detail-item-bg-field-value">Chưa tải ảnh</span>
                            )
                          ) : entry.fieldType === "long_text" ? (
                            <RichTextContent
                              value={typeof entry.value === "string" ? entry.value : ""}
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
                </section>
              )}

              <section className="order-detail-section">
                <h4 className="order-detail-section-title">Sản phẩm trong đơn</h4>

                <div className="order-detail-items">
                  {detailOrder.items.map((item, index) => {
                    const legoSummary = getPayloadLegoSummary(item.payload);
                    const bgFields = getPayloadBgFields(item.payload);
                    const legoSlots = getPayloadLegoSlots(item.payload);
                    const bgValues = getPayloadBgValues(item.payload);
                    const addonOptions = getPayloadAddonOptions(item.payload, item.additionalOptionNames);
                    const productImageUrl = getStaticAssetUrl(item.productImage);

                    const filledBgFields = bgFields.flatMap((field, i) => {
                      const key = buildBackgroundFieldKey(i, field.label, field.fieldType);
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
                          {productImageUrl && (
                            <img
                              src={productImageUrl}
                              alt={item.productName}
                              className="order-detail-item-thumb"
                            />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <strong>
                              {index + 1}. {item.productName || "Sản phẩm"}
                            </strong>
                            {(item.collectionName || item.categoryName || item.productSize) && (
                              <p className="order-detail-item-meta-sub">
                                {[item.collectionName, item.categoryName, item.productSize]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            )}
                          </div>
                          <span>{formatMoney(item.subtotal)}</span>
                        </div>

                        {/* ── Core meta ── */}
                        <div className="order-detail-item-meta">
                          <span>Ký hiệu: <strong>{item.variantSymbol || "-"}</strong></span>
                          <span>Nền: <strong>{item.backgroundName || "-"}</strong></span>
                          <span>Tổng Lego: <strong>{item.totalLegoCount}</strong></span>
                          <span>Lego thêm: <strong>{item.selectedAdditionalLegoCount}</strong></span>
                        </div>

                        {/* ── Per-item pricing (only when there are addons) ── */}
                        {item.additionalOptionsPrice > 0 && (
                          <div className="order-detail-item-pricing">
                            <span>Tùy chỉnh: {formatMoney(item.customizationSubtotal)}</span>
                            <span>Mua thêm: +{formatMoney(item.additionalOptionsPrice)}</span>
                            <strong>Tổng sản phẩm: {formatMoney(item.subtotal)}</strong>
                          </div>
                        )}

                        {/* ── Lego configuration ── */}
                        {/* ── Lego configuration: per-slot detail (preferred) or aggregate fallback ── */}
                        {legoSlots.length > 0 ? (
                          <div className="order-detail-item-section">
                            <p className="order-detail-item-section-title">
                              Cấu hình từng Lego ({legoSlots.length} Lego)
                            </p>
                            <div className="order-detail-lego-slots">
                              {legoSlots.map((slotDetail) => (
                                <div key={slotDetail.slot} className="order-detail-lego-slot">
                                  <p className="order-detail-lego-slot-label">
                                    Lego {slotDetail.slot}
                                  </p>
                                  <div className="order-detail-lego-slot-rows">
                                    {slotDetail.selections.map((sel, si) => (
                                      <div key={si} className="order-detail-lego-slot-row">
                                        {sel.colorCode && (
                                          <span
                                            className="order-detail-lego-color"
                                            style={{ background: sel.colorCode }}
                                            title={sel.colorCode}
                                          />
                                        )}
                                        <span className="order-detail-lego-group">{sel.groupName}:</span>
                                        <strong className="order-detail-lego-option">{sel.optionName}</strong>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : legoSummary.length > 0 ? (
                          <div className="order-detail-item-section">
                            <p className="order-detail-item-section-title">Cấu hình Lego (tổng hợp)</p>
                            <div className="order-detail-item-chips">
                              {legoSummary.map((entry, i) => (
                                <span key={i} className="order-detail-item-chip">
                                  {entry.groupName}: <strong>{entry.optionName}</strong>
                                  {entry.count > 1 && <em> ×{entry.count}</em>}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {/* ── Background field values ── */}
                        {filledBgFields.length > 0 && (
                          <div className="order-detail-item-section">
                            <p className="order-detail-item-section-title">Thông tin nền & tùy chỉnh</p>
                            <div className="order-detail-item-bg-fields">
                              {filledBgFields.map(({ field, key, value }) => {
                                let displayValue = "";
                                if (Array.isArray(value)) {
                                  displayValue = value
                                    .map(
                                      (v) =>
                                        field.options?.find((opt) => opt.value === v)?.label ?? v,
                                    )
                                    .join(", ");
                                } else if (field.fieldType === "select") {
                                  displayValue =
                                    field.options?.find((opt) => opt.value === value)?.label ??
                                    value;
                                } else {
                                  displayValue = value;
                                }

                                return (
                                  <div key={key} className="order-detail-item-bg-field">
                                    <span className="order-detail-item-bg-field-label">
                                      {field.label}
                                    </span>
                                    {field.fieldType === "image_upload" ? (
                                      <img
                                        src={typeof value === "string" ? value : ""}
                                        alt={field.label}
                                        className="order-detail-item-bg-field-img"
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
                        )}

                        {/* ── Addon options with custom field values ── */}
                        {addonOptions.length > 0 && (
                          <div className="order-detail-item-section">
                            <p className="order-detail-item-section-title">Mua thêm</p>
                            <div className="order-detail-item-addon-list">
                              {addonOptions.map((option, i) => (
                                <div key={i} className="order-detail-item-addon-option">
                                  <div className="order-detail-item-addon-head">
                                    <strong>{option.name}</strong>
                                    {option.price > 0 && (
                                      <span>+{formatMoney(option.price)}</span>
                                    )}
                                  </div>
                                  {option.customFieldValues && option.customFieldValues.length > 0 && (
                                    <div className="order-detail-item-bg-fields">
                                      {option.customFieldValues.map((cf, j) => (
                                        <div key={j} className="order-detail-item-bg-field">
                                          <span className="order-detail-item-bg-field-label">
                                            {cf.label}
                                          </span>
                                          {cf.fieldType === "image" ? (
                                            <img
                                              src={cf.value}
                                              alt={cf.label}
                                              className="order-detail-item-bg-field-img"
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
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
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
