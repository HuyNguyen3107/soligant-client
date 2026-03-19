import { http } from "../lib/http";
import type { BearVariant } from "../pages/Dashboard/types";

export interface BearVariantPayload {
  collectionId: string;
  categoryId: string;
  name: string;
  variantSymbol: string;
  description: string;
  image: string;
  price: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
}

export const getBearVariants = async () => {
  const { data } = await http.get<BearVariant[]>("/bear-variants");
  return data;
};

export const createBearVariant = async (
  payload: BearVariantPayload,
) => {
  const { data } = await http.post<BearVariant>("/bear-variants", payload);
  return data;
};

export const updateBearVariant = async (
  id: string,
  payload: BearVariantPayload,
) => {
  const { data } = await http.patch<BearVariant>(`/bear-variants/${id}`, payload);
  return data;
};

export const deleteBearVariant = async (id: string) => {
  await http.delete(`/bear-variants/${id}`);
};
