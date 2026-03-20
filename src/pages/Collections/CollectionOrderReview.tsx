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
import { getPublicBearCustomizations } from "../../services/bear-customizations.service";
import {
  createPublicOrder,
  type OrderShippingPayer,
} from "../../services/orders.service";
import { getPublicPromotions } from "../../services/promotions.service";
import { useCustomCartStore } from "../../store/custom-cart.store";
import { useOrderHistoryStore } from "../../store/order-history.store";
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
          ? "(nhân theo số lượng tùy chỉnh)"
          : "(nhân theo số set)"
        : "";

    const giftSummary = promotion.rewardGifts
      .map(
        (gift) =>
          `${gift.optionName || gift.groupName || "Quà tặng"} x${gift.quantity}`,
      )
      .join(", ");

    const selectionPrefix =
      promotion.rewardGiftSelectionMode === "choose_one" ? "Chọn 1: " : "";

    return modeLabel
      ? `${selectionPrefix}${giftSummary} ${modeLabel}`
      : `${selectionPrefix}${giftSummary}`;
  }

  if (promotion.rewardType === "discount_fixed") {
    return `Giảm ${formatMoney(promotion.rewardDiscountValue)}`;
  }

  return `Giảm ${promotion.rewardDiscountValue}%`;
};

interface GiftSelectionEntry {
  key: string;
  promotion: AppliedPromotion;
  contextLabel: string;
}

const buildItemPromotionSelectionKey = (
  itemId: string,
  promotionId: string,
  promotionIndex: number,
) => `item:${itemId}:${promotionId}:${promotionIndex}`;

const buildOrderPromotionSelectionKey = (
  promotionId: string,
  eligibleItemIds: string[],
  promotionIndex: number,
) => {
  const normalizedEligibleIds = [...eligibleItemIds]
    .map((itemId) => itemId.trim())
    .filter(Boolean)
    .sort()
    .join(",");

  return `order:${promotionId}:${normalizedEligibleIds}:${promotionIndex}`;
};

const CollectionOrderReview = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const cartItems = useCustomCartStore((state) => state.items);
  const storedSelectedItemIds = useCustomCartStore(
    (state) => state.selectedItemIds,
  );
  const storedCustomerInfoEntries = useCustomCartStore(
    (state) => state.customerInfoEntries,
  );
  const setSelectedItemIds = useCustomCartStore(
    (state) => state.setSelectedItemIds,
  );
  const setCustomerInfoEntries = useCustomCartStore(
    (state) => state.setCustomerInfoEntries,
  );
  const clearCustomerInfoEntries = useCustomCartStore(
    (state) => state.clearCustomerInfoEntries,
  );
  const removeItem = useCustomCartStore((state) => state.removeItem);
  const removeItems = useCustomCartStore((state) => state.removeItems);

  const addOrderToHistory = useOrderHistoryStore((state) => state.addOrder);

  const locationState = location.state as ReviewLocationState | null;
  const [customerNote, setCustomerNote] = useState("");
  const [shippingPayer, setShippingPayer] =
    useState<OrderShippingPayer>("customer");
  const [selectedGiftByPromotionKey, setSelectedGiftByPromotionKey] = useState<
    Record<string, string>
  >({});
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
      effectiveSelectedIds.every(
        (itemId, index) => storedSelectedItemIds[index] === itemId,
      );

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
    if (
      locationState?.customerInfoEntries &&
      locationState.customerInfoEntries.length > 0
    ) {
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
  }, [
    locationState?.customerInfoEntries,
    setCustomerInfoEntries,
    storedCustomerInfoEntries,
  ]);

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

  const { data: bearCustomGroups = [] } = useQuery({
    queryKey: ["public-bear-customizations"],
    queryFn: getPublicBearCustomizations,
    enabled: selectedItems.length > 0,
  });

  const { data: customerInfoConfig, isLoading: isCustomerInfoConfigLoading } =
    useQuery({
      queryKey: ["public-customer-order-fields-config"],
      queryFn: getPublicCustomerOrderFieldsConfig,
      enabled: selectedItems.length > 0,
    });

  const customGroupLookup = useMemo(
    () => new Map(customGroups.map((group) => [group.id, group])),
    [customGroups],
  );

  const bearCustomGroupLookup = useMemo(
    () => new Map(bearCustomGroups.map((group) => [group.id, group])),
    [bearCustomGroups],
  );

  const pricing = useMemo(
    () => calculateCartPricing(selectedItems, promotions),
    [promotions, selectedItems],
  );

  const hasProductDiscount = pricing.productDiscountTotal > 0;
  const hasOrderDiscount = pricing.orderDiscountTotal > 0;
  const hasOrderPromotions = pricing.orderPromotions.length > 0;

  const pricingByItemId = useMemo(
    () =>
      new Map(pricing.itemResults.map((result) => [result.item.id, result])),
    [pricing.itemResults],
  );

  const requiredGiftSelections = useMemo<GiftSelectionEntry[]>(() => {
    const entries: GiftSelectionEntry[] = [];

    pricing.itemResults.forEach((result) => {
      result.appliedPromotions.forEach((promotion, promotionIndex) => {
        if (
          promotion.rewardType !== "gift" ||
          promotion.rewardGiftSelectionMode !== "choose_one" ||
          promotion.rewardGifts.length === 0
        ) {
          return;
        }

        entries.push({
          key: buildItemPromotionSelectionKey(
            result.item.id,
            promotion.id,
            promotionIndex,
          ),
          promotion,
          contextLabel: `Theo sản phẩm: ${result.item.product?.name ?? "Sản phẩm tùy chỉnh"}`,
        });
      });
    });

    pricing.orderPromotions.forEach((promotion, promotionIndex) => {
      if (
        promotion.rewardType !== "gift" ||
        promotion.rewardGiftSelectionMode !== "choose_one" ||
        promotion.rewardGifts.length === 0
      ) {
        return;
      }

      const eligibleItemNames = promotion.eligibleItemIds
        .map((itemId) => itemLookup.get(itemId)?.product?.name)
        .filter((name): name is string => Boolean(name));

      const scopeLabel =
        eligibleItemNames.length === 0
          ? "Theo ưu đãi theo set"
          : eligibleItemNames.length <= 2
            ? `Theo set: ${eligibleItemNames.join(", ")}`
            : `Theo set: ${eligibleItemNames.slice(0, 2).join(", ")} +${eligibleItemNames.length - 2} sản phẩm`;

      entries.push({
        key: buildOrderPromotionSelectionKey(
          promotion.id,
          promotion.eligibleItemIds,
          promotionIndex,
        ),
        promotion,
        contextLabel: scopeLabel,
      });
    });

    return entries;
  }, [itemLookup, pricing.itemResults, pricing.orderPromotions]);

  useEffect(() => {
    setSelectedGiftByPromotionKey((previousSelections) => {
      const nextSelections: Record<string, string> = {};

      requiredGiftSelections.forEach((entry) => {
        const availableOptionIds = entry.promotion.rewardGifts
          .map((gift) => String(gift.optionId ?? "").trim())
          .filter(Boolean);
        const optionSet = new Set(availableOptionIds);

        const previousOptionId = previousSelections[entry.key];
        if (previousOptionId && optionSet.has(previousOptionId)) {
          nextSelections[entry.key] = previousOptionId;
          return;
        }

        if (availableOptionIds.length === 1) {
          nextSelections[entry.key] = availableOptionIds[0];
        }
      });

      const previousKeys = Object.keys(previousSelections);
      const nextKeys = Object.keys(nextSelections);

      const hasChanged =
        previousKeys.length !== nextKeys.length ||
        nextKeys.some(
          (promotionKey) =>
            previousSelections[promotionKey] !== nextSelections[promotionKey],
        );

      return hasChanged ? nextSelections : previousSelections;
    });
  }, [requiredGiftSelections]);

  const hasMissingGiftSelections = useMemo(
    () =>
      requiredGiftSelections.some(
        (entry) => !selectedGiftByPromotionKey[entry.key],
      ),
    [requiredGiftSelections, selectedGiftByPromotionKey],
  );

  const customizationSummaries = useMemo(() => {
    const summaries = new Map<
      string,
      Array<{
        key: string;
        groupName: string;
        optionName: string;
        count: number;
      }>
    >();

    selectedItems.forEach((item) => {
      const isBear = item.product.productType === "bear";
      const selections = isBear
        ? (item.bearSelections ?? {})
        : item.legoSelections;
      const groupLookup = isBear ? bearCustomGroupLookup : customGroupLookup;

      const counts = new Map<
        string,
        { key: string; groupName: string; optionName: string; count: number }
      >();

      Object.values(selections).forEach((slotSelections) => {
        Object.entries(slotSelections).forEach(([groupId, optionId]) => {
          const group = groupLookup.get(groupId);
          const option = group?.options.find(
            (candidate) => candidate.id === optionId,
          );
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
  }, [bearCustomGroupLookup, customGroupLookup, selectedItems]);

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
    () =>
      new Map(effectiveCustomerInfoEntries.map((entry) => [entry.key, entry])),
    [effectiveCustomerInfoEntries],
  );

  const requiredCustomerInfoErrors = useMemo(() => {
    return activeCustomerInfoFields
      .map((field, index) => {
        const fieldKey = buildCustomerOrderFieldKey(
          index,
          field.label,
          field.fieldType,
        );
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
        .filter(
          (entry) =>
            !isCustomerOrderFieldValueEmpty(entry, entry.value) ||
            entry.required,
        )
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [effectiveCustomerInfoEntries],
  );

  const appliedGifts = useMemo(() => {
    const giftMap = new Map<string, number>();

    const addGift = (gift: { optionId?: string; quantity?: number }) => {
      const optionId = String(gift.optionId ?? "").trim();
      const quantity = Number(gift.quantity ?? 0);

      if (!optionId || !Number.isFinite(quantity) || quantity <= 0) {
        return;
      }

      const normalizedQuantity = Math.max(1, Math.floor(quantity));
      giftMap.set(optionId, (giftMap.get(optionId) ?? 0) + normalizedQuantity);
    };

    const collectPromotionGifts = (
      promotion: AppliedPromotion,
      promotionSelectionKey: string,
    ) => {
      if (promotion.rewardType !== "gift") {
        return;
      }

      if (promotion.rewardGiftSelectionMode === "choose_one") {
        const selectedOptionId = String(
          selectedGiftByPromotionKey[promotionSelectionKey] ?? "",
        ).trim();

        if (!selectedOptionId) {
          return;
        }

        const selectedGift = promotion.rewardGifts.find(
          (gift) => String(gift.optionId ?? "").trim() === selectedOptionId,
        );

        if (selectedGift) {
          addGift(selectedGift);
        }

        return;
      }

      promotion.rewardGifts.forEach((gift) => addGift(gift));
    };

    pricing.itemResults.forEach((result) => {
      result.appliedPromotions.forEach((promotion, promotionIndex) => {
        const promotionSelectionKey = buildItemPromotionSelectionKey(
          result.item.id,
          promotion.id,
          promotionIndex,
        );

        collectPromotionGifts(promotion, promotionSelectionKey);
      });
    });

    pricing.orderPromotions.forEach((promotion, promotionIndex) => {
      const promotionSelectionKey = buildOrderPromotionSelectionKey(
        promotion.id,
        promotion.eligibleItemIds,
        promotionIndex,
      );

      collectPromotionGifts(promotion, promotionSelectionKey);
    });

    return Array.from(giftMap.entries()).map(([optionId, quantity]) => ({
      optionId,
      quantity,
    }));
  }, [
    pricing.itemResults,
    pricing.orderPromotions,
    selectedGiftByPromotionKey,
  ]);

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      if (selectedItems.length === 0) {
        throw new Error("Không có sản phẩm nào để đặt hàng.");
      }

      if (isCustomerInfoConfigLoading) {
        throw new Error(
          "Đang tải cấu hình thông tin khách hàng. Vui lòng thử lại.",
        );
      }

      if (hasMissingRequiredCustomerInfo) {
        throw new Error(
          "Vui lòng hoàn tất thông tin khách hàng trước khi đặt hàng.",
        );
      }

      if (hasMissingGiftSelections) {
        throw new Error("Vui lòng chọn quà tặng ưu đãi trước khi đặt hàng.");
      }

      const hasInvalidSelectedItems = selectedItems.some((item) => {
        if (!item.product?.name?.trim()) {
          return true;
        }

        // Some product types (e.g. certain bear variants) do not require background.
        const productType = item.product?.productType;
        const hasBackgroundFlag = (
          item.product as {
            hasBackground?: boolean;
          }
        ).hasBackground;
        const requiresBackground =
          productType === "bear"
            ? hasBackgroundFlag === true
            : hasBackgroundFlag !== false;

        if (!requiresBackground) {
          return false;
        }

        return !item.background?.name?.trim();
      });

      if (hasInvalidSelectedItems) {
        throw new Error(
          "Có sản phẩm chưa đủ thông tin (sản phẩm hoặc nền). Vui lòng kiểm tra lại giỏ hàng.",
        );
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
            name: item.background?.name?.trim() || "Chưa chọn nền",
            fields: [...(item.background?.fields ?? [])].sort(
              (a, b) => a.sortOrder - b.sortOrder,
            ),
          },
          totalLegoCount: item.totalLegoCount,
          selectedAdditionalLegoCount: item.selectedAdditionalLegoCount,
          pricingSummary: {
            total: item.pricingSummary.total,
          },
          customizationSummary: customizationSummaries.get(item.id) ?? [],
          legoSlotDetails: (() => {
            const isBear = item.product.productType === "bear";
            if (isBear) return [];
            return Object.entries(item.legoSelections)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([slotIndex, slotSelections]) => ({
                slot: Number(slotIndex),
                selections: Object.entries(slotSelections)
                  .filter(([, optionId]) => Boolean(optionId))
                  .map(([groupId, optionId]) => {
                    const group = customGroupLookup.get(groupId);
                    const option = group?.options.find(
                      (candidate) => candidate.id === optionId,
                    );
                    return {
                      groupName: group?.name ?? groupId,
                      optionId,
                      optionName: option?.name ?? optionId,
                      colorCode: option?.colorCode ?? "",
                    };
                  }),
              }))
              .filter((slotDetail) => slotDetail.selections.length > 0);
          })(),
          bearSlotDetails: (() => {
            const isBear = item.product.productType === "bear";
            if (!isBear) return undefined;
            return Object.entries(item.bearSelections ?? {})
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([slotIndex, slotSelections]) => ({
                slot: Number(slotIndex),
                selections: Object.entries(slotSelections)
                  .filter(([, optionId]) => Boolean(optionId))
                  .map(([groupId, optionId]) => {
                    const group = bearCustomGroupLookup.get(groupId);
                    const option = group?.options.find(
                      (candidate) => candidate.id === optionId,
                    );
                    return {
                      groupName: group?.name ?? groupId,
                      optionId,
                      optionName: option?.name ?? optionId,
                      colorCode: option?.colorCode ?? "",
                    };
                  }),
              }))
              .filter((slotDetail) => slotDetail.selections.length > 0);
          })(),
          totalBearCount: item.totalBearCount,
          selectedAdditionalBearCount: item.selectedAdditionalBearCount,
          backgroundFieldValues: item.backgroundFieldValues,
          additionalOptions: (item.additionalOptions ?? []).map((option) => ({
            id: option.id,
            name: option.name,
            description: option.description,
            price: option.price,
            customFieldValues: option.customFieldValues,
          })),
        })),
        shippingPayer,
        pricingSummary: {
          subtotal: pricing.subtotal,
          productDiscountTotal: pricing.productDiscountTotal,
          orderDiscountTotal: pricing.orderDiscountTotal,
          finalTotal: pricing.finalTotal,
        },
        customerInfoEntries:
          activeCustomerInfoFields.length > 0
            ? effectiveCustomerInfoEntries
            : [],
        appliedGifts,
        note: customerNotePlainText.trim() || undefined,
      });
    },
    onSuccess: (createdOrder) => {
      addOrderToHistory({
        orderCode: createdOrder.orderCode,
        status: createdOrder.status,
        itemsCount: createdOrder.itemsCount,
        finalTotal: createdOrder.pricingSummary.finalTotal,
        createdAt: createdOrder.createdAt,
        savedAt: new Date().toISOString(),
        productNames: createdOrder.items
          .map((item) => item.productName)
          .filter(Boolean),
        collectionName: createdOrder.items[0]?.collectionName ?? "",
      });
      removeItems(selectedCartItemIds);
      setSelectedItemIds([]);
      clearCustomerInfoEntries();
      navigate(`/don-hang/${encodeURIComponent(createdOrder.orderCode)}`, {
        replace: true,
        state: { order: createdOrder },
      });
    },
    onError: (error) => {
      const message = getErrorMessage(
        error,
        "Không thể đặt hàng. Vui lòng thử lại.",
      );
      const isStockError =
        message.includes("tồn kho") ||
        message.includes("không đủ") ||
        message.includes("không còn tồn tại");
      toast.error(message, { autoClose: isStockError ? 8000 : 4000 });
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
              Hãy thêm ít nhất một sản phẩm đã tùy chỉnh vào giỏ hàng hoặc chọn
              sản phẩm từ giỏ để xem lại đơn hàng.
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
              <p className="cor-section-header__eyebrow">
                Xem lại trước khi đặt
              </p>
              <h1 className="cor-section-header__title">
                Thông tin đơn hàng cuối cùng
              </h1>
              <p className="cor-section-header__desc">
                Kiểm tra lại sản phẩm đã tùy chỉnh, nền đã chọn, option mua thêm
                và ưu đãi áp dụng trước khi chuyển sang bước chốt đơn.
              </p>
            </header>

            {selectedItems.map((item) => {
              const itemPricing = pricingByItemId.get(item.id);
              const additionalOptions = item.additionalOptions ?? [];
              const additionalOptionsTotal = getAdditionalOptionsPrice(item);
              const customizationSummary =
                customizationSummaries.get(item.id) ?? [];
              const productName =
                item.product?.name?.trim() || "Sản phẩm tùy chỉnh";
              const itemImage = getStaticAssetUrl(item.product?.image ?? "");
              const backgroundName =
                item.background?.name?.trim() || "Chưa chọn nền";
              const itemPromotions = itemPricing?.appliedPromotions ?? [];

              return (
                <article key={item.id} className="cor-card">
                  <div className="cor-card__head">
                    <div className="cor-card__product">
                      <div className="cor-card__thumb">
                        <ImageWithFallback
                          src={itemImage}
                          alt={productName}
                          fallback={
                            <div className="cor-card__thumb-placeholder">
                              <FiShoppingBag size={24} />
                            </div>
                          }
                        />
                      </div>

                      <div className="cor-card__body">
                        <span className="cor-card__collection">
                          {item.collectionName}
                        </span>
                        <h2 className="cor-card__title">{productName}</h2>
                        <p className="cor-card__meta">Nền: {backgroundName}</p>
                        <p className="cor-card__meta">
                          Tổng Lego: {item.totalLegoCount} | Lego thêm:{" "}
                          {item.selectedAdditionalLegoCount}
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
                          <FiTag size={12} /> {customizationSummary.length} lựa
                          chọn
                        </span>
                      </div>

                      {customizationSummary.length > 0 ? (
                        <div className="cor-chip-list">
                          {customizationSummary.map((entry) => (
                            <span key={entry.key} className="cor-chip">
                              {entry.groupName}: {entry.optionName} x
                              {entry.count}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="cor-empty-text">
                          Chưa có lựa chọn tùy chỉnh nào được ghi nhận.
                        </p>
                      )}
                    </section>

                    <section className="cor-block">
                      <h3 className="cor-block__title">Option mua thêm</h3>
                      {additionalOptions.length === 0 ? (
                        <p className="cor-empty-text">
                          Không có option mua thêm nào được chọn.
                        </p>
                      ) : (
                        <div className="cor-addon-list">
                          {additionalOptions.map((option) => {
                            const customFieldValues =
                              option.customFieldValues ?? [];

                            return (
                              <article
                                key={option.id}
                                className="cor-addon-item"
                              >
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
                                        <p className="cor-field-item__label">
                                          {field.label}
                                        </p>
                                        {field.fieldType === "image" ? (
                                          field.value.trim() ? (
                                            <ImageWithFallback
                                              src={field.value}
                                              alt={field.label}
                                              className="cor-field-item__image"
                                              fallback={
                                                <p className="cor-empty-text">
                                                  Ảnh không còn khả dụng
                                                </p>
                                              }
                                            />
                                          ) : (
                                            <p className="cor-empty-text">
                                              Chưa tải ảnh
                                            </p>
                                          )
                                        ) : field.fieldType === "text" ? (
                                          isRichTextEmpty(field.value) ? (
                                            <p className="cor-empty-text">
                                              Chưa nhập nội dung
                                            </p>
                                          ) : (
                                            <RichTextContent
                                              value={field.value}
                                            />
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
                                          <p className="cor-empty-text">
                                            Chưa nhập link
                                          </p>
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
                        <strong>
                          -{formatMoney(itemPricing?.discountTotal ?? 0)}
                        </strong>
                      </div>
                    )}
                    <div className="cor-pricing__row cor-pricing__row--total">
                      <span>Thành tiền</span>
                      <strong>
                        {formatMoney(itemPricing?.totalAfterDiscount ?? 0)}
                      </strong>
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
                    <strong>
                      -{formatMoney(pricing.productDiscountTotal)}
                    </strong>
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
                        <div
                          key={entry.key}
                          className="cor-summary__customer-info-item"
                        >
                          <span>{entry.label}</span>
                          {entry.fieldType === "image_upload" ? (
                            typeof entry.value === "string" &&
                            entry.value.trim() ? (
                              <ImageWithFallback
                                src={entry.value}
                                alt={entry.label}
                                fallback={
                                  <strong>Ảnh không còn khả dụng</strong>
                                }
                              />
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
                  ) : (
                    <p className="cor-summary__customer-info-empty">
                      Chưa có thông tin khách hàng. Vui lòng bấm "Chỉnh sửa" để
                      điền biểu mẫu.
                    </p>
                  )}

                  {hasMissingRequiredCustomerInfo && (
                    <div className="cor-summary__customer-info-error">
                      {requiredCustomerInfoErrors.join(" ")}
                    </div>
                  )}
                </div>
              )}

              {requiredGiftSelections.length > 0 && (
                <div className="cor-summary__gift-picker">
                  <div className="cor-summary__gift-picker-header">
                    <h3>
                      <FiGift size={14} /> Chọn quà tặng ưu đãi
                    </h3>
                  </div>
                  <p className="cor-summary__gift-picker-desc">
                    Với ưu đãi có chế độ khách chọn quà, vui lòng chọn 1 món cho
                    từng ưu đãi bên dưới trước khi đặt hàng.
                  </p>

                  <div className="cor-summary__gift-picker-list">
                    {requiredGiftSelections.map((entry) => (
                      <div
                        key={entry.key}
                        className="cor-summary__gift-picker-item"
                      >
                        <div className="cor-summary__gift-picker-item-title">
                          <strong>{entry.promotion.name}</strong>
                          <span>{entry.contextLabel}</span>
                        </div>

                        <div className="cor-summary__gift-picker-options">
                          {entry.promotion.rewardGifts.map((gift) => {
                            const optionId = String(gift.optionId ?? "").trim();
                            const isSelected =
                              selectedGiftByPromotionKey[entry.key] ===
                              optionId;

                            return (
                              <label
                                key={`${entry.key}-${optionId}`}
                                className={`cor-summary__gift-picker-option${isSelected ? " is-selected" : ""}`}
                              >
                                <input
                                  type="radio"
                                  name={`gift-choice-${entry.key}`}
                                  checked={isSelected}
                                  onChange={() =>
                                    setSelectedGiftByPromotionKey(
                                      (previous) => ({
                                        ...previous,
                                        [entry.key]: optionId,
                                      }),
                                    )
                                  }
                                />
                                <span>
                                  {gift.optionName ||
                                    gift.groupName ||
                                    "Quà tặng"}
                                  {` x${gift.quantity}`}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {hasMissingGiftSelections && (
                    <div className="cor-summary__customer-info-error">
                      Vui lòng chọn quà cho tất cả ưu đãi bắt buộc chọn quà.
                    </div>
                  )}
                </div>
              )}

              <div className="cor-summary__shipping-payer">
                <div className="cor-summary__shipping-payer-header">
                  <h3>Người trả phí vận chuyển</h3>
                </div>
                <p className="cor-summary__shipping-payer-desc">
                  Chọn phương án thanh toán phí ship cho đơn hàng này.
                </p>
                <div className="cor-summary__shipping-payer-options">
                  <label
                    className={`cor-summary__shipping-payer-option${shippingPayer === "customer" ? " is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="shipping-payer"
                      checked={shippingPayer === "customer"}
                      onChange={() => setShippingPayer("customer")}
                    />
                    <span>Khách hàng tự trả phí ship</span>
                  </label>
                  <label
                    className={`cor-summary__shipping-payer-option${shippingPayer === "shop" ? " is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="shipping-payer"
                      checked={shippingPayer === "shop"}
                      onChange={() => setShippingPayer("shop")}
                    />
                    <span>Shop trả phí ship</span>
                  </label>
                </div>
              </div>

              <div className="cor-summary__note">
                Giá cuối cùng sẽ được đội ngũ Soligant xác nhận lại trước khi
                chốt đơn và sản xuất.
              </div>

              <div className="cor-summary__field">
                <label
                  htmlFor="order-note"
                  className="cor-summary__field-label"
                >
                  Ghi chú cho đơn hàng (không bắt buộc)
                </label>
                <RichTextEditor
                  value={customerNote}
                  onChange={(nextValue) => setCustomerNote(nextValue)}
                  placeholder="Ví dụ: Mình cần gói quà sinh nhật, giao trong giờ hành chính..."
                  minHeight={120}
                />
                <p className="cor-summary__field-counter">
                  {customerNotePlainText.length}/2000
                </p>
                {isCustomerNoteTooLong && (
                  <div className="cor-summary__customer-info-error">
                    Ghi chú đơn hàng không được vượt quá 2000 ký tự.
                  </div>
                )}
              </div>

              {placeOrderMutation.isError && (
                <div className="cor-summary__customer-info-error cor-summary__order-error">
                  <strong>Đặt hàng không thành công</strong>
                  <br />
                  {getErrorMessage(
                    placeOrderMutation.error,
                    "Vui lòng thử lại.",
                  )}
                </div>
              )}

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
                    hasMissingGiftSelections ||
                    isCustomerNoteTooLong
                  }
                >
                  {placeOrderMutation.isPending
                    ? "Đang đặt hàng..."
                    : "Đặt hàng"}
                </button>
                <Link
                  to={
                    firstCollectionSlug
                      ? `/bo-suu-tap/${firstCollectionSlug}`
                      : "/bo-suu-tap"
                  }
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
                          <FiGift size={13} /> Quà tặng sẽ được cộng theo điều
                          kiện set đã đạt.
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
