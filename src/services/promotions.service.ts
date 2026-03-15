import { http } from "../lib/http";
import type { PromotionRow } from "../pages/Dashboard/types";

export interface PromotionGiftPayload {
  groupId: string;
  optionId: string;
  quantity: number;
}

export interface PromotionPayload {
  name: string;
  description: string;
  conditionType: "lego_quantity" | "set_quantity";
  conditionMinQuantity: number;
  applicableProductIds?: string[];
  rewardType: "gift" | "discount_fixed" | "discount_percent";
  rewardGiftQuantityMode?: "fixed" | "multiply_by_condition";
  rewardGifts?: PromotionGiftPayload[];
  rewardDiscountValue?: number;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
}

export const getPromotions = async () => {
  const { data } = await http.get<PromotionRow[]>("/promotions");
  return data;
};

export const getPublicPromotions = async () => {
  const { data } = await http.get<PromotionRow[]>("/public/promotions");
  return data;
};

export const createPromotion = async (payload: PromotionPayload) => {
  const { data } = await http.post<PromotionRow>("/promotions", payload);
  return data;
};

export const updatePromotion = async (
  id: string,
  payload: PromotionPayload,
) => {
  const { data } = await http.patch<PromotionRow>(
    `/promotions/${id}`,
    payload,
  );
  return data;
};

export const deletePromotion = async (id: string) => {
  await http.delete(`/promotions/${id}`);
};
