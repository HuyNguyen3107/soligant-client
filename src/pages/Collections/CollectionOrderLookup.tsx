import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { FiSearch, FiShoppingBag } from "react-icons/fi";
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
import "./CollectionOrderLookup.css";

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

const normalizeOrderCode = (value: string) =>
  value.trim().toUpperCase().replace(/\s+/g, "");

const ORDER_PROGRESS_IMAGE_LABELS = [
  { key: "demoImage" as const, label: "Ảnh demo" },
  { key: "backgroundImage" as const, label: "Ảnh background" },
  {
    key: "completedProductImage" as const,
    label: "Ảnh sản phẩm hoàn thiện",
  },
];

const CollectionOrderLookup = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCode = useMemo(
    () => normalizeOrderCode(searchParams.get("ma-don") ?? ""),
    [searchParams],
  );

  const [orderCodeInput, setOrderCodeInput] = useState(initialCode);
  const [submittedCode, setSubmittedCode] = useState(initialCode);
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    data: order,
    isFetching,
    isError,
    error,
  } = useQuery<OrderRow>({
    queryKey: ["public-order-lookup", submittedCode],
    queryFn: () => getPublicOrderByCode(submittedCode),
    enabled: Boolean(submittedCode),
    retry: false,
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedCode = normalizeOrderCode(orderCodeInput);

    if (!normalizedCode) {
      setValidationError("Vui lòng nhập mã đơn hàng để tra cứu.");
      setSubmittedCode("");
      setSearchParams({});
      return;
    }

    setValidationError(null);
    setSubmittedCode(normalizedCode);
    setSearchParams({ "ma-don": normalizedCode });
  };

  return (
    <>
      <SEO
        title="Tra cứu đơn hàng"
        description="Nhập mã đơn hàng để theo dõi trạng thái xử lý đơn hàng của bạn tại Soligant."
        keywords="tra cứu đơn hàng, mã đơn hàng, trạng thái đơn hàng, Soligant"
      />

      <div className="colu-page">
        <div className="container">
          <PageBreadcrumb
            className="colu-page__breadcrumb"
            items={[
              { label: "Trang chủ", to: "/" },
              { label: "Tra cứu đơn hàng" },
            ]}
          />

          <section className="colu-card">
            <header className="colu-header">
              <p className="colu-header__eyebrow">Theo dõi đơn hàng</p>
              <h1 className="colu-header__title">Tra cứu đơn hàng của bạn</h1>
              <p className="colu-header__desc">
                Nhập chính xác mã đơn hàng (ví dụ:{" "}
                <strong>S-20261403-A-0001</strong>) để xem trạng thái đơn.
              </p>
            </header>

            <form className="colu-form" onSubmit={handleSubmit}>
              <div className="colu-form__input-wrap">
                <FiSearch size={16} />
                <input
                  className="colu-form__input"
                  value={orderCodeInput}
                  onChange={(event) =>
                    setOrderCodeInput(event.target.value.toUpperCase())
                  }
                  placeholder="Nhập mã đơn hàng"
                />
              </div>
              <button
                type="submit"
                className="colu-form__submit"
                disabled={isFetching}
              >
                {isFetching ? "Đang tra cứu..." : "Tra cứu"}
              </button>
            </form>

            {validationError && (
              <p className="colu-message colu-message--error">
                {validationError}
              </p>
            )}

            {submittedCode && isError && (
              <p className="colu-message colu-message--error">
                {getErrorMessage(
                  error,
                  "Không tìm thấy đơn hàng với mã đã nhập.",
                )}
              </p>
            )}

            {!submittedCode && (
              <p className="colu-message">
                Chưa có dữ liệu tra cứu. Vui lòng nhập mã đơn hàng bạn đã nhận
                sau khi đặt thành công.
              </p>
            )}

            {order && (
              <article className="colu-result">
                <div className="colu-result__top">
                  <div>
                    <p className="colu-result__label">Mã đơn</p>
                    <h2 className="colu-result__code">{order.orderCode}</h2>
                  </div>
                  <span
                    className={`colu-status ${STATUS_CLASSNAMES[order.status]}`}
                  >
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>

                <div className="colu-grid">
                  <div className="colu-field">
                    <span>Thời gian tạo đơn</span>
                    <strong>{formatDateTime(order.createdAt)}</strong>
                  </div>
                  <div className="colu-field">
                    <span>Số lượng sản phẩm</span>
                    <strong>{order.itemsCount}</strong>
                  </div>
                  <div className="colu-field">
                    <span>Tổng thanh toán</span>
                    <strong>
                      {formatMoney(order.pricingSummary.finalTotal)}
                    </strong>
                  </div>
                  <div className="colu-field">
                    <span>Ký hiệu mã</span>
                    <strong>{order.variantSymbol}</strong>
                  </div>
                </div>

                {order.items.length > 0 && (
                  <div className="colu-products">
                    <p className="colu-products__title">Sản phẩm trong đơn</p>
                    <div className="colu-products__list">
                      {order.items.map((item) => (
                        <div
                          key={`${order.id}-${item.cartItemId}-${item.productId}`}
                          className="colu-products__item"
                        >
                          <strong>{item.productName || "Sản phẩm"}</strong>
                          <span>
                            {item.collectionName || "Bộ sưu tập"} ·{" "}
                            {formatMoney(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ORDER_PROGRESS_IMAGE_LABELS.some(({ key }) =>
                  Boolean(order.progressImages?.[key]?.trim()),
                ) && (
                  <div className="colu-progress-images">
                    <p className="colu-progress-images__title">
                      Hình ảnh cập nhật từ shop
                    </p>
                    <div className="colu-progress-images__grid">
                      {ORDER_PROGRESS_IMAGE_LABELS.map(({ key, label }) => {
                        const rawUrl =
                          order.progressImages?.[key]?.trim() ?? "";
                        const imageUrl = getStaticAssetUrl(rawUrl) ?? rawUrl;

                        if (!imageUrl) {
                          return null;
                        }

                        return (
                          <figure
                            className="colu-progress-images__item"
                            key={key}
                          >
                            <a
                              href={imageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="colu-image-link"
                              title="Bấm để xem ảnh gốc"
                            >
                              <ImageWithFallback
                                src={imageUrl}
                                alt={label}
                                fallback={
                                  <strong>Ảnh không còn khả dụng</strong>
                                }
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
                  <div className="colu-note">
                    <p className="colu-note__title">Ghi chú của bạn</p>
                    <p className="colu-note__text">{order.note}</p>
                  </div>
                )}

                {order.customerInfoEntries?.length > 0 && (
                  <div className="colu-customer-info">
                    <p className="colu-customer-info__title">
                      Thông tin khách hàng đã gửi
                    </p>
                    <div className="colu-customer-info__list">
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
                            className="colu-customer-info__item"
                          >
                            <span>{entry.label}</span>
                            {entry.fieldType === "image_upload" ? (
                              typeof entry.value === "string" &&
                              entry.value.trim() ? (
                                <a
                                  href={
                                    getStaticAssetUrl(entry.value) ??
                                    entry.value
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="colu-image-link"
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
              </article>
            )}

            <div className="colu-actions">
              <Link to="/bo-suu-tap" className="colu-btn">
                <FiShoppingBag size={16} /> Tiếp tục mua sắm
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default CollectionOrderLookup;
