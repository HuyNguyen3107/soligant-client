import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { OrderStatus } from "../pages/Dashboard/types";

export interface SavedOrderEntry {
  orderCode: string;
  status: OrderStatus;
  itemsCount: number;
  finalTotal: number;
  createdAt: string;
  savedAt: string;
  productNames: string[];
  collectionName: string;
}

interface OrderHistoryStore {
  orders: SavedOrderEntry[];
  addOrder: (entry: SavedOrderEntry) => void;
  removeOrder: (orderCode: string) => void;
  clearHistory: () => void;
}

export const useOrderHistoryStore = create<OrderHistoryStore>()(
  persist(
    (set, get) => ({
      orders: [],
      addOrder: (entry) => {
        const already = get().orders.some(
          (o) => o.orderCode === entry.orderCode,
        );
        if (already) {
          return;
        }
        set((state) => ({ orders: [entry, ...state.orders] }));
      },
      removeOrder: (orderCode) => {
        set((state) => ({
          orders: state.orders.filter((o) => o.orderCode !== orderCode),
        }));
      },
      clearHistory: () => set({ orders: [] }),
    }),
    {
      name: "soligant-order-history",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
