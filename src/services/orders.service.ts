import { http } from "../lib/http";
import type {
  OrderRow,
  OrderStatus,
} from "../pages/Dashboard/types";
import type { CustomizedCartItem } from "../lib/custom-cart";
import type { CustomerOrderFieldEntry } from "../lib/customer-order-fields";

export interface PlaceOrderPricingSummaryPayload {
  subtotal: number;
  productDiscountTotal: number;
  orderDiscountTotal: number;
  finalTotal: number;
}

export interface PlaceOrderItemPayload {
  id: string;
  collectionSlug: string;
  collectionName: string;
  product: Pick<
    CustomizedCartItem["product"],
    "id" | "name" | "image" | "categoryName" | "size" | "variantSymbol"
  >;
  background: {
    name: CustomizedCartItem["background"]["name"];
    fields?: CustomizedCartItem["background"]["fields"];
  };
  totalLegoCount: number;
  selectedAdditionalLegoCount: number;
  pricingSummary: {
    total: number;
  };
  customizationSummary?: Array<{
    key: string;
    groupName: string;
    optionName: string;
    count: number;
  }>;
  legoSlotDetails?: Array<{
    slot: number;
    selections: Array<{
      groupName: string;
      optionId?: string;
      optionName: string;
      colorCode: string;
    }>;
  }>;
  backgroundFieldValues?: Record<string, unknown>;
  additionalOptions: Array<{
    id?: string;
    name: string;
    description?: string;
    price: number;
    customFieldValues?: Array<{
      label: string;
      fieldType: "image" | "link" | "text";
      value: string;
    }>;
  }>;
}

export interface PlaceOrderPayload {
  selectedItemIds: string[];
  items: PlaceOrderItemPayload[];
  customerInfoEntries?: CustomerOrderFieldEntry[];
  pricingSummary: PlaceOrderPricingSummaryPayload;
  appliedGifts?: Array<{ optionId: string; quantity: number }>;
  note?: string;
}

export const getOrders = async () => {
  const { data } = await http.get<OrderRow[]>("/orders");
  return data;
};

export const updateOrderStatus = async (id: string, status: OrderStatus) => {
  const { data } = await http.patch<OrderRow>(`/orders/${id}/status`, { status });
  return data;
};

export const updateOrderShippingFee = async (
  id: string,
  payload: { shippingName?: string; shippingFee: number },
) => {
  const { data } = await http.patch<OrderRow>(`/orders/${id}/shipping-fee`, payload);
  return data;
};

export const createPublicOrder = async (payload: PlaceOrderPayload) => {
  const { data } = await http.post<OrderRow>("/public/orders", payload);
  return data;
};

export const getPublicOrderByCode = async (orderCode: string) => {
  const normalizedOrderCode = orderCode.trim();
  const { data } = await http.get<OrderRow>(
    `/public/orders/${encodeURIComponent(normalizedOrderCode)}`,
  );
  return data;
};
