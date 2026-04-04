import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FiShoppingBag,
  FiSearch,
  FiTrash2,
  FiClock,
  FiPackage,
  FiAlertCircle,
} from "react-icons/fi";
import { PageBreadcrumb, SEO } from "../../components/common";
import type { SavedOrderEntry } from "../../store/order-history.store";
import { useOrderHistoryStore } from "../../store/order-history.store";
import type { OrderStatus } from "../Dashboard/types";
import "./MyOrders.css";

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

const STATUS_CLASSNAMES: Record<OrderStatus, string> = {
  received: "is-received",
  consulting: "is-consulting",
  waiting_demo: "is-waiting-demo",
  waiting_demo_confirm: "is-waiting-demo-confirm",
  waiting_payment: "is-waiting-payment",
  paid: "is-paid",
  designing: "is-designing",
  waiting_design_approval: "is-waiting-design-approval",
  producing: "is-producing",
  shipped: "is-shipped",
  delivering: "is-delivering",
  completed: "is-completed",
  complaint: "is-complaint",
  handling_complaint: "is-handling-complaint",
  complaint_closed: "is-complaint-closed",
  closed: "is-closed",
  cancelled: "is-cancelled",
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

interface OrderCardProps {
  entry: SavedOrderEntry;
  onRemove: (orderCode: string) => void;
}

const OrderCard = ({ entry, onRemove }: OrderCardProps) => {
  const displayNames = entry.productNames.length > 0
    ? entry.productNames.slice(0, 2).join(", ") +
      (entry.productNames.length > 2 ? ` và ${entry.productNames.length - 2} sản phẩm khác` : "")
    : entry.collectionName || "Sản phẩm tùy chỉnh";

  return (
    <article className="myo-card">
      <div className="myo-card__header">
        <div className="myo-card__code-row">
          <span className="myo-card__code-label">Mã đơn</span>
          <strong className="myo-card__code">{entry.orderCode}</strong>
          <span className={`myo-status ${STATUS_CLASSNAMES[entry.status]}`}>
            {STATUS_LABELS[entry.status]}
          </span>
        </div>
        <button
          type="button"
          className="myo-card__remove"
          title="Xóa khỏi lịch sử"
          onClick={() => onRemove(entry.orderCode)}
        >
          <FiTrash2 size={15} />
        </button>
      </div>

      <p className="myo-card__products">
        <FiPackage size={13} /> {displayNames}
      </p>

      <div className="myo-card__meta">
        <span>
          <FiClock size={12} /> {formatDateTime(entry.createdAt)}
        </span>
        <span>{entry.itemsCount} sản phẩm</span>
        <span className="myo-card__total">{formatMoney(entry.finalTotal)}</span>
      </div>

      <div className="myo-card__actions">
        <Link
          to={`/don-hang/${encodeURIComponent(entry.orderCode)}`}
          className="myo-btn myo-btn--primary"
        >
          Xem chi tiết đơn
        </Link>
        <Link
          to={`/tra-cuu-don-hang?ma-don=${encodeURIComponent(entry.orderCode)}`}
          className="myo-btn myo-btn--ghost"
        >
          <FiSearch size={13} /> Tra cứu trạng thái
        </Link>
      </div>
    </article>
  );
};

const MyOrders = () => {
  const orders = useOrderHistoryStore((state) => state.orders);
  const removeOrder = useOrderHistoryStore((state) => state.removeOrder);
  const clearHistory = useOrderHistoryStore((state) => state.clearHistory);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearHistory = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      window.setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    clearHistory();
    setConfirmClear(false);
  };

  return (
    <>
      <SEO
        title="Đơn hàng của tôi"
        description="Xem lại các đơn hàng bạn đã đặt trên thiết bị này và tra cứu trạng thái xử lý."
        keywords="lịch sử đơn hàng, đơn hàng của tôi, tra cứu đơn, Soligant"
      />

      <div className="myo-page">
        <div className="container">
          <PageBreadcrumb
            className="myo-page__breadcrumb"
            items={[
              { label: "Trang chủ", to: "/" },
              { label: "Đơn hàng của tôi" },
            ]}
          />

          <section className="myo-wrap">
            <header className="myo-header">
              <div>
                <p className="myo-header__eyebrow">Thiết bị này</p>
                <h1 className="myo-header__title">Đơn hàng của tôi</h1>
              </div>
              {orders.length > 0 && (
                <button
                  type="button"
                  className={`myo-clear-btn${confirmClear ? " is-confirm" : ""}`}
                  onClick={handleClearHistory}
                >
                  <FiTrash2 size={14} />
                  {confirmClear ? "Xác nhận xóa tất cả?" : "Xóa lịch sử"}
                </button>
              )}
            </header>

            {orders.length === 0 ? (
              <div className="myo-empty">
                <FiAlertCircle size={36} className="myo-empty__icon" />
                <h2>Chưa có đơn hàng nào</h2>
                <p>
                  Sau khi đặt hàng thành công, mã đơn và thông tin sơ lược sẽ được lưu tại đây
                  để bạn dễ tra cứu lại mà không cần ghi nhớ mã đơn.
                </p>
                <div className="myo-empty__actions">
                  <Link to="/bo-suu-tap" className="myo-btn myo-btn--primary">
                    <FiShoppingBag size={14} /> Khám phá bộ sưu tập
                  </Link>
                  <Link to="/tra-cuu-don-hang" className="myo-btn myo-btn--ghost">
                    <FiSearch size={14} /> Tra cứu đơn hàng
                  </Link>
                </div>
              </div>
            ) : (
              <div className="myo-list">
                {orders.map((entry) => (
                  <OrderCard
                    key={entry.orderCode}
                    entry={entry}
                    onRemove={removeOrder}
                  />
                ))}
              </div>
            )}

            <div className="myo-footer-note">
              <FiSearch size={13} />
              Không thấy đơn bạn muốn tìm?{" "}
              <Link to="/tra-cuu-don-hang">Tra cứu theo mã đơn hàng</Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default MyOrders;
