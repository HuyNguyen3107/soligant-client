import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createCustomCartItemId,
  type CustomizedCartItem,
} from "../lib/custom-cart";
import type { CustomerOrderFieldEntry } from "../lib/customer-order-fields";

interface CustomCartStore {
  items: CustomizedCartItem[];
  selectedItemIds: string[];
  customerInfoEntries: CustomerOrderFieldEntry[];
  isDrawerOpen: boolean;
  addItem: (
    item: Omit<CustomizedCartItem, "id" | "createdAt">,
  ) => CustomizedCartItem;
  removeItem: (itemId: string) => void;
  removeItems: (itemIds: string[]) => void;
  toggleItemSelection: (itemId: string) => void;
  setSelectedItemIds: (itemIds: string[]) => void;
  setCustomerInfoEntries: (entries: CustomerOrderFieldEntry[]) => void;
  clearCustomerInfoEntries: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const uniqueIds = (itemIds: string[]) => [...new Set(itemIds.filter(Boolean))];

export const useCustomCartStore = create<CustomCartStore>()(
  persist(
    (set, get) => ({
      items: [],
      selectedItemIds: [],
      customerInfoEntries: [],
      isDrawerOpen: false,
      addItem: (item) => {
        const nextItem: CustomizedCartItem = {
          ...item,
          additionalOptions: item.additionalOptions ?? [],
          id: createCustomCartItemId(),
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          items: [nextItem, ...state.items],
          selectedItemIds: uniqueIds([nextItem.id, ...state.selectedItemIds]),
        }));

        return nextItem;
      },
      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
          selectedItemIds: state.selectedItemIds.filter((id) => id !== itemId),
        }));
      },
      removeItems: (itemIds) => {
        const itemIdSet = new Set(uniqueIds(itemIds));

        if (itemIdSet.size === 0) {
          return;
        }

        set((state) => ({
          items: state.items.filter((item) => !itemIdSet.has(item.id)),
          selectedItemIds: state.selectedItemIds.filter((id) => !itemIdSet.has(id)),
        }));
      },
      toggleItemSelection: (itemId) => {
        const isSelected = get().selectedItemIds.includes(itemId);

        set((state) => ({
          selectedItemIds: isSelected
            ? state.selectedItemIds.filter((id) => id !== itemId)
            : uniqueIds([...state.selectedItemIds, itemId]),
        }));
      },
      setSelectedItemIds: (itemIds) => {
        const availableIds = new Set(get().items.map((item) => item.id));
        set({
          selectedItemIds: uniqueIds(itemIds).filter((itemId) => availableIds.has(itemId)),
        });
      },
      setCustomerInfoEntries: (entries) => {
        set({
          customerInfoEntries: entries,
        });
      },
      clearCustomerInfoEntries: () => {
        set({ customerInfoEntries: [] });
      },
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
    }),
    {
      name: "soligant-custom-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        selectedItemIds: state.selectedItemIds,
        customerInfoEntries: state.customerInfoEntries,
      }),
    },
  ),
);