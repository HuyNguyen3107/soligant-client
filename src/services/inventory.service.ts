import { http } from "../lib/http";
import type { InventoryItemRow } from "../pages/Dashboard/types";

export interface UpdateInventoryItemPayload {
  stockQuantity?: number;
  stockDelta?: number;
  lowStockThreshold?: number;
}

export const getInventoryItems = async () => {
  const { data } = await http.get<InventoryItemRow[]>("/inventory");
  return data;
};

export const updateInventoryItem = async (
  id: string,
  payload: UpdateInventoryItemPayload,
) => {
  const { data } = await http.patch<InventoryItemRow>(`/inventory/${id}`, payload);
  return data;
};
