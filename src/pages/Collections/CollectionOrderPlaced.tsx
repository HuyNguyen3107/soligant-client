import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  FiCheckCircle,
  FiCopy,
  FiList,
  FiSearch,
  FiShoppingBag,
} from "react-icons/fi";
import {
  ImageWithFallback,
  PageBreadcrumb,
  RichTextContent,
  SEO,
} from "../../components/common";
import {
  formatCustomerOrderFieldValue,
  isCustomerOrderFieldValueEmpty,
} from "../../lib/customer-order-fields";
import { getErrorMessage } from "../../lib/error";
import { getStaticAssetUrl } from "../../lib/http";
import { getPublicOrderByCode } from "../../services/orders.service";
import type { OrderRow, OrderStatus } from "../Dashboard/types";
import "./CollectionOrderPlaced.css";

interface OrderPlacedLocationState {
  order?: OrderRow;
}

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
  completed: "Hoàn tất",
  complaint: "Khiếu nại",
  handling_complaint: "Đang xử lý khiếu nại",
  complaint_closed: "Đóng khiếu nại",
  closed: "Kết thúc",
  cancelled: "Đã hủy",
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

const ORDER_PROGRESS_IMAGE_LABELS = [
  { key: "demoImage" as const, label: "Ảnh demo" },
  { key: "backgroundImage" as const, label: "Ảnh background" },
  {
    key: "completedProductImage" as const,
    label: "Ảnh sản phẩm hoàn thiện",
  },
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

const normalizeOrderCode = (value: string) =>
  value.trim().toUpperCase().replace(/\s+/g, "");

const CollectionOrderPlaced = () => {
  const { orderCode: orderCodeParam } = useParams<{ orderCode: string }>();
  const location = useLocation();
  const [isCopied, setIsCopied] = useState(false);

  const normalizedOrderCode = useMemo(
    () => normalizeOrderCode(decodeURIComponent(orderCodeParam ?? "")),
    [orderCodeParam],
  );

  const locationState = location.state as OrderPlacedLocationState | null;
  const stateOrder = useMemo(() => {
    const candidate = locationState?.order;

    if (!candidate) {
      return null;
    }

    if (normalizeOrderCode(candidate.orderCode) !== normalizedOrderCode) {
      return null;
    }

    return candidate;
  }, [locationState?.order, normalizedOrderCode]);

  const {
    data: fetchedOrder,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["public-order", normalizedOrderCode],
    queryFn: () => getPublicOrderByCode(normalizedOrderCode),
    enabled: Boolean(normalizedOrderCode) && !stateOrder,
    retry: false,
  });

  const order = stateOrder ?? fetchedOrder ?? null;

  const handleCopyOrderCode = async () => {
    if (!normalizedOrderCode) {
      return;
    }

    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(normalizedOrderCode);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1600);
    } catch {
      setIsCopied(false);
    }
  };

  return (
    <>
      <SEO
        title="Đặt hàng thành công"
        description="Lưu lại mã đơn hàng để tiện tra cứu trạng thái xử lý đơn hàng của bạn."
        keywords="đặt hàng thành công, mã đơn hàng, tra cứu đơn hàng, Soligant"
      />

      <div className="cop-page">
        <div className="container">
          <PageBreadcrumb
            className="cop-page__breadcrumb"
            items={[
              { label: "Trang chủ", to: "/" },
              { label: "Bộ sưu tập", to: "/bo-suu-tap" },
              { label: "Đặt hàng thành công" },
            ]}
          />

          {!normalizedOrderCode ? (
            <div className="cop-card cop-card--empty">
              <h1>Mã đơn hàng không hợp lệ</h1>
              <p>
                Vui lòng truy cập lại từ trang đặt hàng hoặc chuyển đến trang
                tra cứu đơn.
              </p>
              <div className="cop-actions">
                <Link to="/tra-cuu-don-hang" className="cop-btn cop-btn--ghost">
                  <FiSearch size={16} /> Tra cứu đơn hàng
                </Link>
                <Link to="/bo-suu-tap" className="cop-btn">
                  <FiShoppingBag size={16} /> Tiếp tục mua sắm
                </Link>
              </div>
            </div>
          ) : isLoading ? (
            <div className="cop-card cop-card--empty">
              <p>Đang tải thông tin đơn hàng...</p>
            </div>
          ) : isError || !order ? (
            <div className="cop-card cop-card--empty">
              <h1>Không tìm thấy đơn hàng</h1>
              <p>
                {getErrorMessage(
                  error,
                  "Đơn hàng có thể chưa sẵn sàng hoặc mã đơn không tồn tại.",
                )}
              </p>
              <div className="cop-actions">
                <Link
                  to={`/tra-cuu-don-hang?ma-don=${encodeURIComponent(normalizedOrderCode)}`}
                  className="cop-btn cop-btn--ghost"
                >
                  <FiSearch size={16} /> Tra cứu lại
                </Link>
                <Link to="/bo-suu-tap" className="cop-btn">
                  <FiShoppingBag size={16} /> Tiếp tục mua sắm
                </Link>
              </div>
            </div>
          ) : (
            <div className="cop-card">
              <div className="cop-hero">
                <span className="cop-hero__icon">
                  <FiCheckCircle size={26} />
                </span>
                <div>
                  <p className="cop-hero__eyebrow">Đặt hàng thành công</p>
                  <h1 className="cop-hero__title">
                    Đơn hàng của bạn đã được ghi nhận
                  </h1>
                  <p className="cop-hero__desc">
                    Đội ngũ Soligant sẽ liên hệ xác nhận trong thời gian sớm
                    nhất.
                  </p>
                </div>
              </div>

              <div className="cop-order-code">
                <span>Mã đơn hàng của bạn</span>
                <strong>{order.orderCode}</strong>
                <button
                  type="button"
                  className="cop-code-copy"
                  onClick={handleCopyOrderCode}
                  disabled={!navigator?.clipboard}
                >
                  <FiCopy size={14} />{" "}
                  {isCopied ? "Đã sao chép" : "Sao chép mã"}
                </button>
              </div>

              <div className="cop-note-box">
                <p>
                  Lưu ý: Vui lòng lưu lại mã đơn hàng{" "}
                  <strong>{order.orderCode}</strong> để tra cứu trạng thái đơn
                  hàng sau này.
                </p>
              </div>

              <div className="cop-grid">
                <div className="cop-field">
                  <span>Trạng thái</span>
                  <strong
                    className={`cop-status ${STATUS_CLASSNAMES[order.status]}`}
                  >
                    {STATUS_LABELS[order.status]}
                  </strong>
                </div>
                <div className="cop-field">
                  <span>Thời gian tạo đơn</span>
                  <strong>{formatDateTime(order.createdAt)}</strong>
                </div>
                <div className="cop-field">
                  <span>Số lượng sản phẩm</span>
                  <strong>{order.itemsCount}</strong>
                </div>
                <div className="cop-field">
                  <span>Tổng thanh toán</span>
                  <strong>
                    {formatMoney(order.pricingSummary.finalTotal)}
                  </strong>
                </div>
              </div>

              {ORDER_PROGRESS_IMAGE_LABELS.some(({ key }) =>
                Boolean(order.progressImages?.[key]?.trim()),
              ) && (
                <div className="cop-progress-images">
                  <h2>Hình ảnh cập nhật từ shop</h2>
                  <div className="cop-progress-images__grid">
                    {ORDER_PROGRESS_IMAGE_LABELS.map(({ key, label }) => {
                      const rawUrl = order.progressImages?.[key]?.trim() ?? "";
                      const imageUrl = getStaticAssetUrl(rawUrl) ?? rawUrl;

                      if (!imageUrl) {
                        return null;
                      }

                      return (
                        <figure className="cop-progress-images__item" key={key}>
                          <a
                            href={imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cop-image-link"
                            title="Bấm để xem ảnh gốc"
                          >
                            <ImageWithFallback
                              src={imageUrl}
                              alt={label}
                              fallback={<strong>Ảnh không còn khả dụng</strong>}
                            />
                          </a>
                          <figcaption>{label}</figcaption>
                        </figure>
                      );
                    })}
                  </div>
                </div>
              )}

              {order.note && (
                <div className="cop-customer-note">
                  <h2>Ghi chú bạn đã gửi</h2>
                  <p>{order.note}</p>
                </div>
              )}

              {order.customerInfoEntries?.length > 0 && (
                <div className="cop-customer-info">
                  <h2>Thông tin khách hàng đã gửi</h2>
                  <div className="cop-customer-info__list">
                    {(order.customerInfoEntries ?? [])
                      .filter(
                        (entry) =>
                          entry.required ||
                          !isCustomerOrderFieldValueEmpty(entry, entry.value),
                      )
                      .sort((left, right) => left.sortOrder - right.sortOrder)
                      .map((entry) => (
                        <div
                          key={entry.key}
                          className="cop-customer-info__item"
                        >
                          <span>{entry.label}</span>
                          {entry.fieldType === "image_upload" ? (
                            typeof entry.value === "string" &&
                            entry.value.trim() ? (
                              <a
                                href={
                                  getStaticAssetUrl(entry.value) ?? entry.value
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cop-image-link"
                                title="Bấm để xem ảnh gốc"
                              >
                                <ImageWithFallback
                                  src={entry.value}
                                  alt={entry.label}
                                  fallback={
                                    <strong>Ảnh không còn khả dụng</strong>
                                  }
                                />
                              </a>
                            ) : (
                              <strong>Chưa tải ảnh</strong>
                            )
                          ) : entry.fieldType === "long_text" ? (
                            <RichTextContent
                              value={
                                typeof entry.value === "string"
                                  ? entry.value
                                  : ""
                              }
                            />
                          ) : (
                            <strong>
                              {formatCustomerOrderFieldValue(entry)}
                            </strong>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="cop-actions">
                <Link
                  to={`/tra-cuu-don-hang?ma-don=${encodeURIComponent(order.orderCode)}`}
                  className="cop-btn cop-btn--ghost"
                >
                  <FiSearch size={16} /> Tra cứu đơn hàng
                </Link>
                <Link to="/lich-su-don-hang" className="cop-btn cop-btn--ghost">
                  <FiList size={16} /> Đơn hàng của tôi
                </Link>
                <Link to="/bo-suu-tap" className="cop-btn">
                  <FiShoppingBag size={16} /> Tiếp tục mua sắm
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CollectionOrderPlaced;
