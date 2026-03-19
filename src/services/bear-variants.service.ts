import { http } from "../lib/http";
import type { BearVariant } from "../pages/Dashboard/types";

export interface BearVariantPayload {
  collectionId: string;
  categoryId: string;
  name: string;
  variantSymbol: string;
  description: string;
  image: string;
  bearQuantity: number;
  allowVariableBearCount: boolean;
  bearCountMin: number;
  bearCountMax: number;
  additionalBearPrice: number;
  price: number;
  stockQuantity: number;
  lowStockThreshold: number;
  hasBackground: boolean;
  isActive: boolean;
}

export const getBearVariants = async () => {
  const { data } = await http.get<BearVariant[]>("/bear-variants");
  return data;
};

export const createBearVariant = async (payload: BearVariantPayload) => {
  const { data } = await http.post<BearVariant>("/bear-variants", payload);
  return data;
};

export const updateBearVariant = async (
  id: string,
  payload: BearVariantPayload,
) => {
  const { data } = await http.patch<BearVariant>(
    `/bear-variants/${id}`,
    payload,
  );
  return data;
};

export const deleteBearVariant = async (id: string) => {
  await http.delete(`/bear-variants/${id}`);
};
