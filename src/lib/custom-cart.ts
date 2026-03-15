import type { PublicBackground } from "../services/backgrounds.service";
import type { CollectionProduct } from "../services/collections.service";
import type { CustomerOrderFieldEntry } from "./customer-order-fields";

export type LegoSelections = Record<string, Record<string, string>>;
export type BackgroundFieldValue = string | string[];
export type AddonCustomFieldType = "image" | "link" | "text";

export interface CartPricingSummary {
  baseVariantPrice: number;
  extraLegoPrice: number;
  customizationPrice: number;
  total: number;
}

export interface CustomizerNavigationState {
  legoSelections: LegoSelections;
  pricingSummary: CartPricingSummary;
  selectedAdditionalLegoCount: number;
  totalLegoCount: number;
}

export interface AdditionalOptionsNavigationState extends CustomizerNavigationState {
  selectedBackground: PublicBackground;
  backgroundFieldValues: Record<string, BackgroundFieldValue>;
}

export interface CustomerInfoNavigationState {
  selectedItemIds?: string[];
  customerInfoEntries?: CustomerOrderFieldEntry[];
  backTo?: string;
}

export interface SelectedAddonCustomFieldValue {
  label: string;
  fieldType: AddonCustomFieldType;
  value: string;
}

export interface SelectedAddonOption {
  id: string;
  name: string;
  description: string;
  optionType: "basic" | "customizable";
  price: number;
  customFieldValues: SelectedAddonCustomFieldValue[];
}

export interface CustomizedCartItem {
  id: string;
  createdAt: string;
  collectionSlug: string;
  collectionName: string;
  product: CollectionProduct;
  background: PublicBackground;
  legoSelections: LegoSelections;
  totalLegoCount: number;
  selectedAdditionalLegoCount: number;
  pricingSummary: CartPricingSummary;
  backgroundFieldValues: Record<string, BackgroundFieldValue>;
  additionalOptions?: SelectedAddonOption[];
}

export const buildBackgroundFieldKey = (
  index: number,
  fieldLabel: string,
  fieldType: string,
) => `${index}-${fieldType}-${fieldLabel}`;

export const createCustomCartItemId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `cart-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizePrice = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.floor(value);
};

export const getAdditionalOptionsPrice = (
  item: Pick<CustomizedCartItem, "additionalOptions">,
) => {
  return (item.additionalOptions ?? []).reduce(
    (sum, option) => sum + normalizePrice(Number(option.price ?? 0)),
    0,
  );
};

export const getCustomizedCartItemSubtotal = (
  item: Pick<CustomizedCartItem, "pricingSummary" | "additionalOptions">,
) => {
  const baseTotal = normalizePrice(Number(item.pricingSummary.total ?? 0));
  return baseTotal + getAdditionalOptionsPrice(item);
};