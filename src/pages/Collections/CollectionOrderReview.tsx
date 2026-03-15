import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiArrowLeft,
  FiFileText,
  FiGift,
  FiShoppingBag,
  FiTag,
  FiTrash2,
} from "react-icons/fi";
import {
  ImageWithFallback,
  PageBreadcrumb,
  RichTextContent,
  RichTextEditor,
  SEO,
} from "../../components/common";
import {
  getAdditionalOptionsPrice,
  type CustomerInfoNavigationState,
} from "../../lib/custom-cart";
import {
  buildCustomerOrderFieldKey,
  formatCustomerOrderFieldValue,
  isCustomerOrderFieldValueEmpty,
} from "../../lib/customer-order-fields";
import { getErrorMessage } from "../../lib/error";
import { getStaticAssetUrl } from "../../lib/http";
import {
  calculateCartPricing,
  type AppliedPromotion,
} from "../../lib/promotion-calculator";
import { isRichTextEmpty, toRichTextPlainText } from "../../lib/rich-text";
import { getPublicCustomerOrderFieldsConfig } from "../../services/customer-order-fields.service";
import { getPublicLegoCustomizations } from "../../services/lego-customizations.service";
import { createPublicOrder } from "../../services/orders.service";
import { getPublicPromotions } from "../../services/promotions.service";
import { useCustomCartStore } from "../../store/custom-cart.store";
import "./CollectionOrderReview.css";

type ReviewLocationState = CustomerInfoNavigationState;

const formatMoney = (value: number) =>
  `${new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(value)))} đ`;

const getRewardSummary = (promotion: AppliedPromotion) => {
  if (promotion.rewardType === "gift") {
    if (promotion.rewardGifts.length === 0) {
      return "Tặng quà theo cấu hình ưu đãi";
    }

    const modeLabel =
      promotion.rewardGiftQuantityMode === "multiply_by_condition"
        ? promotion.conditionType === "lego_quantity"
          ? "(nhân theo số Lego)"
          : "(nhân theo số set)"
        : "";

    const giftSummary = promotion.rewardGifts
      .map((gift) => `${gift.optionName || gift.groupName || "Quà tặng"} x${gift.quantity}`)
      .join(", ");

    return modeLabel ? `${giftSummary} ${modeLabel}` : giftSummary;
  }

  if (promotion.rewardType === "discount_fixed") {
    return `Giảm ${formatMoney(promotion.rewardDiscountValue)}`;
  }

  return `Giảm ${promotion.rewardDiscountValue}%`;
};

const CollectionOrderReview = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const cartItems = useCustomCartStore((state) => state.items);
  const storedSelectedItemIds = useCustomCartStore((state) => state.selectedItemIds);
  const storedCustomerInfoEntries = useCustomCartStore((state) => state.customerInfoEntries);
  const setSelectedItemIds = useCustomCartStore((state) => state.setSelectedItemIds);
  const setCustomerInfoEntries = useCustomCartStore((state) => state.setCustomerInfoEntries);
  const clearCustomerInfoEntries = useCustomCartStore((state) => state.clearCustomerInfoEntries);
  const removeItem = useCustomCartStore((state) => state.removeItem);
  const removeItems = useCustomCartStore((state) => state.removeItems);

  const locationState = location.state as ReviewLocationState | null;
  const [customerNote, setCustomerNote] = useState("");
  const customerNotePlainText = toRichTextPlainText(customerNote);
  const isCustomerNoteTooLong = customerNotePlainText.length > 2000;

  const itemLookup = useMemo(
    () => new Map(cartItems.map((item) => [item.id, item])),
    [cartItems],
  );

  const effectiveSelectedIds = useMemo(() => {
    const preferredIds = locationState?.selectedItemIds?.length
      ? locationState.selectedItemIds
      : storedSelectedItemIds.length > 0
        ? storedSelectedItemIds
        : cartItems.map((item) => item.id);

    return preferredIds.filter((itemId) => itemLookup.has(itemId));
  }, [cartItems, itemLookup, locationState, storedSelectedItemIds]);

  useEffect(() => {
    const isSameSelection =
      effectiveSelectedIds.length === storedSelectedItemIds.length &&
      effectiveSelectedIds.every((itemId, index) => storedSelectedItemIds[index] === itemId);

    if (!isSameSelection) {
      setSelectedItemIds(effectiveSelectedIds);
    }
  }, [effectiveSelectedIds, setSelectedItemIds, storedSelectedItemIds]);

  const selectedItems = useMemo(
    () =>
      effectiveSelectedIds
        .map((itemId) => itemLookup.get(itemId))
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [effectiveSelectedIds, itemLookup],
  );

  const effectiveCustomerInfoEntries = useMemo(() => {
    if (locationState?.customerInfoEntries && locationState.customerInfoEntries.length > 0) {
      return locationState.customerInfoEntries;
    }

    return storedCustomerInfoEntries;
  }, [locationState, storedCustomerInfoEntries]);

  useEffect(() => {
    const fromState = locationState?.customerInfoEntries;
    if (!fromState) {
      return;
    }

    const isSameEntries =
      fromState.length === storedCustomerInfoEntries.length &&
      fromState.every((entry, index) => {
        const current = storedCustomerInfoEntries[index];
        if (!current) {
          return false;
        }

        return JSON.stringify(current) === JSON.stringify(entry);
      });

    if (!isSameEntries) {
      setCustomerInfoEntries(fromState);
    }
  }, [locationState?.customerInfoEntries, setCustomerInfoEntries, storedCustomerInfoEntries]);

  const { data: promotions = [] } = useQuery({
    queryKey: ["public-promotions"],
    queryFn: getPublicPromotions,
    enabled: selectedItems.length > 0,
  });

  const { data: customGroups = [] } = useQuery({
    queryKey: ["public-lego-customizations"],
    queryFn: getPublicLegoCustomizations,
    enabled: selectedItems.length > 0,
  });

  const { data: customerInfoConfig, isLoading: isCustomerInfoConfigLoading } = useQuery({
    queryKey: ["public-customer-order-fields-config"],
    queryFn: getPublicCustomerOrderFieldsConfig,
    enabled: selectedItems.length > 0,
  });

  const customGroupLookup = useMemo(
    () => new Map(customGroups.map((group) => [group.id, group])),
    [customGroups],
  );

  const pricing = useMemo(
    () => calculateCartPricing(selectedItems, promotions),
    [promotions, selectedItems],
  );

  const hasProductDiscount = pricing.productDiscountTotal > 0;
  const hasOrderDiscount = pricing.orderDiscountTotal > 0;
  const hasOrderPromotions = pricing.orderPromotions.length > 0;

  const pricingByItemId = useMemo(
    () => new Map(pricing.itemResults.map((result) => [result.item.id, result])),
    [pricing.itemResults],
  );

  const customizationSummaries = useMemo(() => {
    const summaries = new Map<
      string,
      Array<{ key: string; groupName: string; optionName: string; count: number }>
    >();

    selectedItems.forEach((item) => {
      const counts = new Map<string, { key: string; groupName: string; optionName: string; count: number }>();

      Object.values(item.legoSelections).forEach((slotSelections) => {
        Object.entries(slotSelections).forEach(([groupId, optionId]) => {
          const group = customGroupLookup.get(groupId);
          const option = group?.options.find((candidate) => candidate.id === optionId);
          const key = `${groupId}-${optionId}`;
          const current = counts.get(key);

          if (current) {
            current.count += 1;
            return;
          }

          counts.set(key, {
            key,
            groupName: group?.name ?? groupId,
            optionName: option?.name ?? optionId,
            count: 1,
          });
        });
      });

      summaries.set(
        item.id,
        Array.from(counts.values()).sort((left, right) => {
          const leftLabel = `${left.groupName} ${left.optionName}`.trim();
          const rightLabel = `${right.groupName} ${right.optionName}`.trim();
          return leftLabel.localeCompare(rightLabel, "vi");
        }),
      );
    });

    return summaries;
  }, [customGroupLookup, selectedItems]);

  const selectedCartItemIds = useMemo(
    () => selectedItems.map((item) => item.id),
    [selectedItems],
  );

  const activeCustomerInfoFields = useMemo(
    () =>
      customerInfoConfig?.isActive
        ? customerInfoConfig.fields
            .slice()
            .sort((left, right) => left.sortOrder - right.sortOrder)
        : [],
    [customerInfoConfig],
  );

  const customerInfoEntryLookup = useMemo(
    () => new Map(effectiveCustomerInfoEntries.map((entry) => [entry.key, entry])),
    [effectiveCustomerInfoEntries],
  );

  const requiredCustomerInfoErrors = useMemo(() => {
    return activeCustomerInfoFields
      .map((field, index) => {
        const fieldKey = buildCustomerOrderFieldKey(index, field.label, field.fieldType);
        const entry = customerInfoEntryLookup.get(fieldKey);
        const value = entry?.value;

        if (!field.required || !isCustomerOrderFieldValueEmpty(field, value)) {
          return null;
        }

        return `Trường "${field.label}" chưa được điền.`;
      })
      .filter((message): message is string => Boolean(message));
  }, [activeCustomerInfoFields, customerInfoEntryLookup]);

  const hasMissingRequiredCustomerInfo = requiredCustomerInfoErrors.length > 0;

  const visibleCustomerInfoEntries = useMemo(
    () =>
      effectiveCustomerInfoEntries
        .filter((entry) => !isCustomerOrderFieldValueEmpty(entry, entry.value) || entry.required)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [effectiveCustomerInfoEntries],
  );

  const appliedGifts = useMemo(() => {
    const giftMap = new Map<string, number>();

    [...pricing.itemResults.flatMap((result) => result.appliedPromotions), ...pricing.orderPromotions]
      .filter((promotion) => promotion.rewardType === "gift")
      .forEach((promotion) => {
        promotion.rewardGifts.forEach((gift) => {
          const optionId = String(gift.optionId ?? "").trim();
          const quantity = Number(gift.quantity ?? 0);

          if (!optionId || !Number.isFinite(quantity) || quantity <= 0) {
            return;
          }

          const normalizedQuantity = Math.max(1, Math.floor(quantity));
          giftMap.set(optionId, (giftMap.get(optionId) ?? 0) + normalizedQuantity);
        });
      });

    return Array.from(giftMap.entries()).map(([optionId, quantity]) => ({
      optionId,
      quantity,
    }));
  }, [pricing.itemResults, pricing.orderPromotions]);

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      if (selectedItems.length === 0) {
        throw new Error("Không có sản phẩm nào để đặt hàng.");
      }

      if (isCustomerInfoConfigLoading) {
        throw new Error("Đang tải cấu hình thông tin khách hàng. Vui lòng thử lại.");
      }

      if (hasMissingRequiredCustomerInfo) {
        throw new Error("Vui lòng hoàn tất thông tin khách hàng trước khi đặt hàng.");
      }

      return createPublicOrder({
        selectedItemIds: selectedCartItemIds,
        items: selectedItems.map((item) => ({
          id: item.id,
          collectionSlug: item.collectionSlug,
          collectionName: item.collectionName,
          product: {
            id: item.product.id,
            name: item.product.name,
            image: item.product.image,
            categoryName: item.product.categoryName,
            size: item.product.size,
            variantSymbol: item.product.variantSymbol,
          },
          background: {
            name: item.background.name,
            fields: [...(item.background.fields ?? [])].sort(
              (a, b) => a.sortOrder - b.sortOrder,
            ),
          },
          totalLegoCount: item.totalLegoCount,
          selectedAdditionalLegoCount: item.selectedAdditionalLegoCount,
          pricingSummary: {
            total: item.pricingSummary.total,
          },
          customizationSummary: customizationSummaries.get(item.id) ?? [],
          legoSlotDetails: Object.entries(item.legoSelections)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([slotIndex, slotSelections]) => ({
              slot: Number(slotIndex),
              selections: Object.entries(slotSelections)
                .filter(([, optionId]) => Boolean(optionId))
                .map(([groupId, optionId]) => {
                  const group = customGroupLookup.get(groupId);
                  const option = group?.options.find((candidate) => candidate.id === optionId);

                  return {
                    groupName: group?.name ?? groupId,
                    optionId,
                    optionName: option?.name ?? optionId,
                    colorCode: option?.colorCode ?? "",
                  };
                }),
            }))
            .filter((slotDetail) => slotDetail.selections.length > 0),
          backgroundFieldValues: item.backgroundFieldValues,
          additionalOptions: (item.additionalOptions ?? []).map((option) => ({
            id: option.id,
            name: option.name,
            description: option.description,
            price: option.price,
            customFieldValues: option.customFieldValues,
          })),
        })),
        pricingSummary: {
          subtotal: pricing.subtotal,
          productDiscountTotal: pricing.productDiscountTotal,
          orderDiscountTotal: pricing.orderDiscountTotal,
          finalTotal: pricing.finalTotal,
        },
        customerInfoEntries:
          activeCustomerInfoFields.length > 0 ? effectiveCustomerInfoEntries : [],
        appliedGifts,
        note: customerNotePlainText.trim() || undefined,
      });
    },
    onSuccess: (createdOrder) => {
      removeItems(selectedCartItemIds);
      setSelectedItemIds([]);
      clearCustomerInfoEntries();
      navigate(`/don-hang/${encodeURIComponent(createdOrder.orderCode)}`, {
        replace: true,
        state: { order: createdOrder },
      });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể đặt hàng. Vui lòng thử lại."));
    },
  });

  const firstCollectionSlug = selectedItems[0]?.collectionSlug;

  if (selectedItems.length === 0) {
    return (
      <>
        <SEO
          title="Thông tin đơn hàng"
          description="Xem lại các sản phẩm tùy chỉnh đã chọn trước khi tiếp tục đặt hàng."
          keywords="thông tin đơn hàng, giỏ hàng, Soligant"
        />

        <div className="cor-page">
          <div className="container cor-empty-state">
            <FiShoppingBag size={42} />
            <h1>Chưa có sản phẩm nào được chọn</h1>
            <p>
              Hãy thêm ít nhất một sản phẩm đã tùy chỉnh vào giỏ hàng hoặc chọn sản phẩm từ
              giỏ để xem lại đơn hàng.
            </p>
            <Link to="/bo-suu-tap" className="cor-btn">
              <FiArrowLeft size={16} /> Quay lại bộ sưu tập
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Thông tin đơn hàng"
        description="Xem lại các sản phẩm tùy chỉnh, nền đã chọn, option mua thêm và ưu đãi được áp dụng trước khi đặt hàng."
        keywords="thông tin đơn hàng, giỏ hàng, option mua thêm, ưu đãi, Soligant"
      />

      <div className="cor-page">
        <div className="container">
          <PageBreadcrumb
            className="cor-page__breadcrumb"
            items={[
              { label: "Trang chủ", to: "/" },
              { label: "Bộ sưu tập", to: "/bo-suu-tap" },
              { label: "Thông tin đơn hàng" },
            ]}
          />
        </div>

        <div className="container cor-layout">
          <section className="cor-items">
            <header className="cor-section-header">
              <p className="cor-section-header__eyebrow">Xem lại trước khi đặt</p>
              <h1 className="cor-section-header__title">Thông tin đơn hàng cuối cùng</h1>
              <p className="cor-section-header__desc">
                Kiểm tra lại sản phẩm đã tùy chỉnh, nền đã chọn, option mua thêm và ưu đãi áp
                dụng trước khi chuyển sang bước chốt đơn.
              </p>
            </header>

            {selectedItems.map((item) => {
              const itemPricing = pricingByItemId.get(item.id);
              const additionalOptions = item.additionalOptions ?? [];
              const additionalOptionsTotal = getAdditionalOptionsPrice(item);
              const customizationSummary = customizationSummaries.get(item.id) ?? [];
              const itemImage = getStaticAssetUrl(item.product.image);
              const itemPromotions = itemPricing?.appliedPromotions ?? [];

              return (
                <article key={item.id} className="cor-card">
                  <div className="cor-card__head">
                    <div className="cor-card__product">
                      <div className="cor-card__thumb">
                        <ImageWithFallback
                          src={itemImage}
                          alt={item.product.name}
                          fallback={
                          <div className="cor-card__thumb-placeholder">
                            <FiShoppingBag size={24} />
                          </div>
                          }
                        />
                      </div>

                      <div className="cor-card__body">
                        <span className="cor-card__collection">{item.collectionName}</span>
                        <h2 className="cor-card__title">{item.product.name}</h2>
                        <p className="cor-card__meta">Nền: {item.background.name}</p>
                        <p className="cor-card__meta">
                          Tổng Lego: {item.totalLegoCount} | Lego thêm: {item.selectedAdditionalLegoCount}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="cor-card__remove"
                      onClick={() => removeItem(item.id)}
                    >
                      <FiTrash2 size={14} /> Bỏ sản phẩm
                    </button>
                  </div>

                  <div className="cor-card__blocks">
                    <section className="cor-block">
                      <div className="cor-block__title-row">
                        <h3 className="cor-block__title">Tùy chỉnh Lego</h3>
                        <span className="cor-chip cor-chip--theme">
                          <FiTag size={12} /> {customizationSummary.length} lựa chọn
                        </span>
                      </div>

                      {customizationSummary.length > 0 ? (
                        <div className="cor-chip-list">
                          {customizationSummary.map((entry) => (
                            <span key={entry.key} className="cor-chip">
                              {entry.groupName}: {entry.optionName} x{entry.count}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="cor-empty-text">Chưa có lựa chọn tùy chỉnh nào được ghi nhận.</p>
                      )}
                    </section>

                    <section className="cor-block">
                      <h3 className="cor-block__title">Option mua thêm</h3>
                      {additionalOptions.length === 0 ? (
                        <p className="cor-empty-text">Không có option mua thêm nào được chọn.</p>
                      ) : (
                        <div className="cor-addon-list">
                          {additionalOptions.map((option) => {
                            const customFieldValues = option.customFieldValues ?? [];

                            return (
                              <article key={option.id} className="cor-addon-item">
                                <div className="cor-addon-item__head">
                                  <strong>{option.name}</strong>
                                  <span>{formatMoney(option.price)}</span>
                                </div>

                                {!isRichTextEmpty(option.description) && (
                                  <RichTextContent
                                    value={option.description}
                                    className="cor-addon-item__desc"
                                  />
                                )}

                                {customFieldValues.length > 0 && (
                                  <div className="cor-addon-item__fields">
                                    {customFieldValues.map((field, index) => (
                                      <div
                                        key={`${option.id}-${index}`}
                                        className="cor-addon-item__field"
                                      >
                                        <p className="cor-field-item__label">{field.label}</p>
                                        {field.fieldType === "image" ? (
                                          field.value.trim() ? (
                                            <ImageWithFallback
                                              src={field.value}
                                              alt={field.label}
                                              className="cor-field-item__image"
                                              fallback={
                                                <p className="cor-empty-text">Ảnh không còn khả dụng</p>
                                              }
                                            />
                                          ) : (
                                            <p className="cor-empty-text">Chưa tải ảnh</p>
                                          )
                                        ) : field.fieldType === "text" ? (
                                          isRichTextEmpty(field.value) ? (
                                            <p className="cor-empty-text">Chưa nhập nội dung</p>
                                          ) : (
                                            <RichTextContent value={field.value} />
                                          )
                                        ) : field.value.trim() ? (
                                          <a
                                            href={field.value}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="cor-addon-item__link"
                                          >
                                            {field.value}
                                          </a>
                                        ) : (
                                          <p className="cor-empty-text">Chưa nhập link</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </div>

                  {itemPromotions.length > 0 && (
                    <section className="cor-promo-section">
                      <h3 className="cor-block__title">Ưu đãi theo sản phẩm</h3>
                      <div className="cor-promo-list">
                        {itemPromotions.map((promotion) => (
                          <div key={promotion.id} className="cor-promo-item">
                            <div className="cor-promo-item__title-row">
                              <strong>{promotion.name}</strong>
                              <span>{getRewardSummary(promotion)}</span>
                            </div>
                            {!isRichTextEmpty(promotion.description) && (
                              <RichTextContent
                                value={promotion.description}
                                className="cor-promo-item__desc"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <div className="cor-pricing">
                    <div className="cor-pricing__row">
                      <span>Tạm tính sản phẩm</span>
                      <strong>{formatMoney(itemPricing?.subtotal ?? 0)}</strong>
                    </div>
                    {additionalOptionsTotal > 0 && (
                      <div className="cor-pricing__row">
                        <span>Trong đó mua thêm</span>
                        <strong>{formatMoney(additionalOptionsTotal)}</strong>
                      </div>
                    )}
                    {(itemPricing?.discountTotal ?? 0) > 0 && (
                      <div className="cor-pricing__row cor-pricing__row--discount">
                        <span>Giảm theo sản phẩm</span>
                        <strong>-{formatMoney(itemPricing?.discountTotal ?? 0)}</strong>
                      </div>
                    )}
                    <div className="cor-pricing__row cor-pricing__row--total">
                      <span>Thành tiền</span>
                      <strong>{formatMoney(itemPricing?.totalAfterDiscount ?? 0)}</strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="cor-summary">
            <div className="cor-summary__card">
              <h2 className="cor-summary__title">Tóm tắt đơn hàng</h2>

              <div className="cor-summary__rows">
                <div className="cor-summary__row">
                  <span>Sản phẩm đã chọn</span>
                  <strong>{selectedItems.length}</strong>
                </div>
                <div className="cor-summary__row">
                  <span>Tạm tính</span>
                  <strong>{formatMoney(pricing.subtotal)}</strong>
                </div>
                {hasProductDiscount && (
                  <div className="cor-summary__row cor-summary__row--discount">
                    <span>Giảm theo sản phẩm</span>
                    <strong>-{formatMoney(pricing.productDiscountTotal)}</strong>
                  </div>
                )}
                {hasOrderDiscount && (
                  <div className="cor-summary__row cor-summary__row--discount">
                    <span>Giảm theo set</span>
                    <strong>-{formatMoney(pricing.orderDiscountTotal)}</strong>
                  </div>
                )}
                <div className="cor-summary__row cor-summary__row--total">
                  <span>Tổng thanh toán tạm tính</span>
                  <strong>{formatMoney(pricing.finalTotal)}</strong>
                </div>
              </div>

              {activeCustomerInfoFields.length > 0 && (
                <div className="cor-summary__customer-info">
                  <div className="cor-summary__customer-info-header">
                    <h3>
                      <FiFileText size={14} /> Thông tin khách hàng
                    </h3>
                    <Link
                      to="/thong-tin-khach-hang"
                      state={{
                        selectedItemIds: selectedCartItemIds,
                        customerInfoEntries: effectiveCustomerInfoEntries,
                        backTo: "/thong-tin-don-hang",
                      }}
                    >
                      Chỉnh sửa
                    </Link>
                  </div>

                  {visibleCustomerInfoEntries.length > 0 ? (
                    <div className="cor-summary__customer-info-list">
                      {visibleCustomerInfoEntries.map((entry) => (
                        <div key={entry.key} className="cor-summary__customer-info-item">
                          <span>{entry.label}</span>
                          {entry.fieldType === "image_upload" ? (
                            typeof entry.value === "string" && entry.value.trim() ? (
                              <ImageWithFallback
                                src={entry.value}
                                alt={entry.label}
                                fallback={<strong>Ảnh không còn khả dụng</strong>}
                              />
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
                  ) : (
                    <p className="cor-summary__customer-info-empty">
                      Chưa có thông tin khách hàng. Vui lòng bấm "Chỉnh sửa" để điền biểu mẫu.
                    </p>
                  )}

                  {hasMissingRequiredCustomerInfo && (
                    <div className="cor-summary__customer-info-error">
                      {requiredCustomerInfoErrors.join(" ")}
                    </div>
                  )}
                </div>
              )}

              <div className="cor-summary__note">
                Giá cuối cùng sẽ được đội ngũ Soligant xác nhận lại trước khi chốt đơn và sản xuất.
              </div>

              <div className="cor-summary__field">
                <label htmlFor="order-note" className="cor-summary__field-label">
                  Ghi chú cho đơn hàng (không bắt buộc)
                </label>
                <RichTextEditor
                  value={customerNote}
                  onChange={(nextValue) => setCustomerNote(nextValue)}
                  placeholder="Ví dụ: Mình cần gói quà sinh nhật, giao trong giờ hành chính..."
                  minHeight={120}
                />
                <p className="cor-summary__field-counter">{customerNotePlainText.length}/2000</p>
                {isCustomerNoteTooLong && (
                  <div className="cor-summary__customer-info-error">
                    Ghi chú đơn hàng không được vượt quá 2000 ký tự.
                  </div>
                )}
              </div>

              <div className="cor-summary__actions">
                <button
                  type="button"
                  className="cor-btn"
                  onClick={() => placeOrderMutation.mutate()}
                  disabled={
                    placeOrderMutation.isPending ||
                    isCustomerInfoConfigLoading ||
                    selectedItems.length === 0 ||
                    hasMissingRequiredCustomerInfo ||
                    isCustomerNoteTooLong
                  }
                >
                  {placeOrderMutation.isPending ? "Đang đặt hàng..." : "Đặt hàng"}
                </button>
                <Link
                  to={firstCollectionSlug ? `/bo-suu-tap/${firstCollectionSlug}` : "/bo-suu-tap"}
                  className="cor-btn cor-btn--ghost"
                >
                  <FiArrowLeft size={16} /> Tiếp tục chọn sản phẩm
                </Link>
              </div>
            </div>

            {hasOrderPromotions && (
              <div className="cor-summary__card">
                <h2 className="cor-summary__title">Ưu đãi theo set</h2>
                <div className="cor-promo-list cor-promo-list--summary">
                  {pricing.orderPromotions.map((promotion) => (
                    <div key={promotion.id} className="cor-promo-item">
                      <div className="cor-promo-item__title-row">
                        <strong>{promotion.name}</strong>
                        <span>{getRewardSummary(promotion)}</span>
                      </div>
                      {!isRichTextEmpty(promotion.description) && (
                        <RichTextContent
                          value={promotion.description}
                          className="cor-promo-item__desc"
                        />
                      )}
                      {promotion.rewardType === "gift" && (
                        <p className="cor-promo-item__gift-note">
                          <FiGift size={13} /> Quà tặng sẽ được cộng theo điều kiện set đã đạt.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
};

export default CollectionOrderReview;
