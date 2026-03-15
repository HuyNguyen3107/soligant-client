import { http } from "../lib/http";
import type { LegoFrameVariant } from "../pages/Dashboard/types";

export interface LegoFrameVariantPayload {
  collectionId: string;
  categoryId: string;
  name: string;
  variantSymbol: string;
  description: string;
  image: string;
  size: "20x20" | "18x18" | "15x15";
  legoQuantity: number;
  allowVariableLegoCount: boolean;
  legoCountMin: number;
  legoCountMax: number;
  additionalLegoPrice: number;
  price: number;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
}

export const getLegoFrameVariants = async () => {
  const { data } = await http.get<LegoFrameVariant[]>("/lego-frame-variants");
  return data;
};

export const createLegoFrameVariant = async (
  payload: LegoFrameVariantPayload,
) => {
  const { data } = await http.post<LegoFrameVariant>("/lego-frame-variants", payload);
  return data;
};

export const updateLegoFrameVariant = async (
  id: string,
  payload: LegoFrameVariantPayload,
) => {
  const { data } = await http.patch<LegoFrameVariant>(`/lego-frame-variants/${id}`, payload);
  return data;
};

export const deleteLegoFrameVariant = async (id: string) => {
  await http.delete(`/lego-frame-variants/${id}`);
};