import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { FiSearch, FiShoppingBag } from "react-icons/fi";
import { PageBreadcrumb, RichTextContent, SEO } from "../../components/common";
import {
  formatCustomerOrderFieldValue,
  isCustomerOrderFieldValueEmpty,
} from "../../lib/customer-order-fields";
import { getErrorMessage } from "../../lib/error";
import { getPublicOrderByCode } from "../../services/orders.service";
import type { OrderRow, OrderStatus } from "../Dashboard/types";
import "./CollectionOrderLookup.css";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  processing: "Đang xử lý",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

const STATUS_CLASSNAMES: Record<OrderStatus, string> = {
  pending: "is-pending",
  confirmed: "is-confirmed",
  processing: "is-processing",
  completed: "is-completed",
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
  value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

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
                Nhập chính xác mã đơn hàng (ví dụ: <strong>S-20261403-A-0001</strong>) để xem trạng thái đơn.
              </p>
            </header>

            <form className="colu-form" onSubmit={handleSubmit}>
              <div className="colu-form__input-wrap">
                <FiSearch size={16} />
                <input
                  className="colu-form__input"
                  value={orderCodeInput}
                  onChange={(event) => setOrderCodeInput(event.target.value.toUpperCase())}
                  placeholder="Nhập mã đơn hàng"
                />
              </div>
              <button type="submit" className="colu-form__submit" disabled={isFetching}>
                {isFetching ? "Đang tra cứu..." : "Tra cứu"}
              </button>
            </form>

            {validationError && <p className="colu-message colu-message--error">{validationError}</p>}

            {submittedCode && isError && (
              <p className="colu-message colu-message--error">
                {getErrorMessage(error, "Không tìm thấy đơn hàng với mã đã nhập.")}
              </p>
            )}

            {!submittedCode && (
              <p className="colu-message">
                Chưa có dữ liệu tra cứu. Vui lòng nhập mã đơn hàng bạn đã nhận sau khi đặt thành công.
              </p>
            )}

            {order && (
              <article className="colu-result">
                <div className="colu-result__top">
                  <div>
                    <p className="colu-result__label">Mã đơn</p>
                    <h2 className="colu-result__code">{order.orderCode}</h2>
                  </div>
                  <span className={`colu-status ${STATUS_CLASSNAMES[order.status]}`}>
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
                    <strong>{formatMoney(order.pricingSummary.finalTotal)}</strong>
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
                        <div key={`${order.id}-${item.cartItemId}-${item.productId}`} className="colu-products__item">
                          <strong>{item.productName || "Sản phẩm"}</strong>
                          <span>
                            {item.collectionName || "Bộ sưu tập"} · {formatMoney(item.subtotal)}
                          </span>
                        </div>
                      ))}
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
                    <p className="colu-customer-info__title">Thông tin khách hàng đã gửi</p>
                    <div className="colu-customer-info__list">
                      {(order.customerInfoEntries ?? [])
                        .filter(
                          (entry) =>
                            entry.required ||
                            !isCustomerOrderFieldValueEmpty(entry, entry.value),
                        )
                        .sort((left, right) => left.sortOrder - right.sortOrder)
                        .map((entry) => (
                          <div key={entry.key} className="colu-customer-info__item">
                            <span>{entry.label}</span>
                            {entry.fieldType === "image_upload" ? (
                              typeof entry.value === "string" && entry.value.trim() ? (
                                <img src={entry.value} alt={entry.label} />
                              ) : (
                                <strong>Chưa tải ảnh</strong>
                              )
                            ) : entry.fieldType === "long_text" ? (
                              <RichTextContent
                                value={typeof entry.value === "string" ? entry.value : ""}
                              />
                            ) : (
                              <strong>{formatCustomerOrderFieldValue(entry)}</strong>
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
