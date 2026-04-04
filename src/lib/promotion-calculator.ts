import type { PromotionGift, PromotionRewardType, PromotionRow } from "../pages/Dashboard/types";
import {
  getCustomizedCartItemSubtotal,
  type CustomizedCartItem,
} from "./custom-cart";

export interface AppliedPromotion {
  id: string;
  name: string;
  description: string;
  conditionType: PromotionRow["conditionType"];
  rewardTypes: PromotionRewardType[];
  rewardGiftSelectionMode: PromotionRow["rewardGiftSelectionMode"];
  rewardGiftQuantityMode: PromotionRow["rewardGiftQuantityMode"];
  rewardDiscountValue: number;
  rewardGifts: PromotionGift[];
  applicableProductIds: string[];
  discountAmount: number;
  hasFreeship: boolean;
  eligibleItemIds: string[];
}

export interface EvaluatedCartItem {
  item: CustomizedCartItem;
  subtotal: number;
  appliedPromotions: AppliedPromotion[];
  discountTotal: number;
  totalAfterDiscount: number;
}

export interface EvaluatedCartPricing {
  itemResults: EvaluatedCartItem[];
  subtotal: number;
  productDiscountTotal: number;
  orderPromotions: AppliedPromotion[];
  orderDiscountTotal: number;
  hasFreeship: boolean;
  finalTotal: number;
}

const isPromotionWithinDateRange = (promotion: PromotionRow, now: Date) => {
  const startDate = promotion.startDate ? new Date(promotion.startDate) : null;
  const endDate = promotion.endDate ? new Date(promotion.endDate) : null;

  if (startDate && startDate > now) {
    return false;
  }

  if (endDate && endDate < now) {
    return false;
  }

  return promotion.isActive;
};

const resolveCartItemProductType = (item: CustomizedCartItem) =>
  item.product.productType === "bear" ? "bear" : "lego";

const matchesProductScope = (
  promotion: PromotionRow,
  item: CustomizedCartItem,
) => {
  const productType = resolveCartItemProductType(item);

  if (promotion.applicableProductType !== productType) {
    return false;
  }

  return (
    promotion.applicableProductIds.length === 0 ||
    promotion.applicableProductIds.includes(item.product.id)
  );
};

const calculateDiscountAmount = (promotion: PromotionRow, subtotal: number) => {
  if (promotion.rewardTypes.includes("discount_fixed")) {
    return Math.min(subtotal, promotion.rewardDiscountValue);
  }

  if (promotion.rewardTypes.includes("discount_percent")) {
    return subtotal * (promotion.rewardDiscountValue / 100);
  }

  return 0;
};

const getScaledRewardGifts = (
  promotion: PromotionRow,
  multiplier: number,
): PromotionGift[] => {
  if (!promotion.rewardTypes.includes("gift")) {
    return [];
  }

  const safeMultiplier = Number.isFinite(multiplier)
    ? Math.max(1, Math.floor(multiplier))
    : 1;
  const effectiveMultiplier =
    promotion.rewardGiftQuantityMode === "multiply_by_condition"
      ? safeMultiplier
      : 1;

  return promotion.rewardGifts.map((gift) => {
    const parsedBaseQuantity = Number(gift.quantity);
    const baseQuantity = Number.isFinite(parsedBaseQuantity)
      ? Math.max(1, Math.floor(parsedBaseQuantity))
      : 1;

    return {
      ...gift,
      quantity: baseQuantity * effectiveMultiplier,
    };
  });
};

const buildAppliedPromotion = (
  promotion: PromotionRow,
  subtotal: number,
  multiplier: number,
  eligibleItemIds: string[],
): AppliedPromotion => ({
  id: promotion.id,
  name: promotion.name,
  description: promotion.description,
  conditionType: promotion.conditionType,
  rewardTypes: promotion.rewardTypes,
  rewardGiftSelectionMode: promotion.rewardGiftSelectionMode ?? "all",
  rewardGiftQuantityMode: promotion.rewardGiftQuantityMode,
  rewardDiscountValue: promotion.rewardDiscountValue,
  rewardGifts: getScaledRewardGifts(promotion, multiplier),
  applicableProductIds: promotion.applicableProductIds,
  discountAmount: calculateDiscountAmount(promotion, subtotal),
  hasFreeship: promotion.rewardTypes.includes("freeship"),
  eligibleItemIds,
});

export const calculateCartPricing = (
  items: CustomizedCartItem[],
  promotions: PromotionRow[],
): EvaluatedCartPricing => {
  const now = new Date();
  const activePromotions = promotions.filter((promotion) =>
    isPromotionWithinDateRange(promotion, now),
  );

  const itemResults = items.map<EvaluatedCartItem>((item) => {
    const subtotal = getCustomizedCartItemSubtotal(item);
    const appliedPromotions = activePromotions
      .filter(
        (promotion) =>
          promotion.conditionType === "lego_quantity" &&
          matchesProductScope(promotion, item) &&
          item.totalLegoCount >= promotion.conditionMinQuantity &&
          (promotion.conditionMaxQuantity == null ||
            item.totalLegoCount <= promotion.conditionMaxQuantity),
      )
      .map<AppliedPromotion>((promotion) =>
        buildAppliedPromotion(promotion, subtotal, item.totalLegoCount, [
          item.id,
        ]),
      );

    const discountTotal = Math.min(
      subtotal,
      appliedPromotions.reduce(
        (sum, promotion) => sum + promotion.discountAmount,
        0,
      ),
    );

    return {
      item,
      subtotal,
      appliedPromotions,
      discountTotal,
      totalAfterDiscount: Math.max(0, subtotal - discountTotal),
    };
  });

  const subtotal = itemResults.reduce(
    (sum, result) => sum + result.subtotal,
    0,
  );
  const productDiscountTotal = itemResults.reduce(
    (sum, result) => sum + result.discountTotal,
    0,
  );
  const orderSubtotalAfterProductDiscounts = itemResults.reduce(
    (sum, result) => sum + result.totalAfterDiscount,
    0,
  );

  const orderPromotions = activePromotions
    .filter((promotion) => promotion.conditionType === "set_quantity")
    .map<AppliedPromotion | null>((promotion) => {
      const eligibleItems = itemResults.filter((result) =>
        matchesProductScope(promotion, result.item),
      );

      if (eligibleItems.length < promotion.conditionMinQuantity) {
        return null;
      }

      if (
        promotion.conditionMaxQuantity != null &&
        eligibleItems.length > promotion.conditionMaxQuantity
      ) {
        return null;
      }

      const eligibleSubtotal = eligibleItems.reduce(
        (sum, result) => sum + result.totalAfterDiscount,
        0,
      );

      return buildAppliedPromotion(
        promotion,
        eligibleSubtotal,
        eligibleItems.length,
        eligibleItems.map((result) => result.item.id),
      );
    })
    .filter((promotion): promotion is AppliedPromotion => promotion !== null);

  const orderDiscountTotal = Math.min(
    orderSubtotalAfterProductDiscounts,
    orderPromotions.reduce(
      (sum, promotion) => sum + promotion.discountAmount,
      0,
    ),
  );

  // Check if any applied promotion (product-level or order-level) has freeship
  const hasFreeship =
    itemResults.some((r) =>
      r.appliedPromotions.some((p) => p.hasFreeship),
    ) || orderPromotions.some((p) => p.hasFreeship);

  return {
    itemResults,
    subtotal,
    productDiscountTotal,
    orderPromotions,
    orderDiscountTotal,
    hasFreeship,
    finalTotal: Math.max(
      0,
      orderSubtotalAfterProductDiscounts - orderDiscountTotal,
    ),
  };
};
