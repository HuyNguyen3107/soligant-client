import type { LegoFrameSize } from "../types";

export const LEGO_PRODUCT_NAME = "Khung tranh Lego";

export const LEGO_SIZES: LegoFrameSize[] = ["20x20", "18x18", "15x15"];

export const LEGO_SIZE_ORDER: Record<LegoFrameSize, number> = {
  "20x20": 0,
  "18x18": 1,
  "15x15": 2,
};
