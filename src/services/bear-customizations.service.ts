import { http } from "../lib/http";
import type {
  BearCustomizationGroup,
  BearCustomizationOption,
} from "../pages/Dashboard/types";

export type BearCustomizationGroupPayload = {
  name: string;
  helper?: string;
  isActive?: boolean;
};

export type BearCustomizationOptionPayload = {
  groupId: string;
  name: string;
  description?: string;
  price: number;
  stockQuantity?: number;
  lowStockThreshold?: number;
  allowImageUpload?: boolean;
  image?: string;
  colorCode?: string;
  isActive?: boolean;
};

export const getBearCustomizationGroups = async (): Promise<
  BearCustomizationGroup[]
> => {
  const { data } = await http.get<BearCustomizationGroup[]>(
    "/bear-customizations/groups",
  );
  return data;
};

export const createBearCustomizationGroup = async (
  payload: BearCustomizationGroupPayload,
) => {
  const { data } = await http.post<BearCustomizationGroup>(
    "/bear-customizations/groups",
    payload,
  );
  return data;
};

export const updateBearCustomizationGroup = async (
  id: string,
  payload: BearCustomizationGroupPayload,
) => {
  const { data } = await http.patch<BearCustomizationGroup>(
    `/bear-customizations/groups/${id}`,
    payload,
  );
  return data;
};

export const deleteBearCustomizationGroup = async (id: string) => {
  await http.delete(`/bear-customizations/groups/${id}`);
};

export const createBearCustomizationOption = async (
  payload: BearCustomizationOptionPayload,
) => {
  const { data } = await http.post<BearCustomizationOption>(
    "/bear-customizations/options",
    payload,
  );
  return data;
};

export const updateBearCustomizationOption = async (
  id: string,
  payload: BearCustomizationOptionPayload,
) => {
  const { data } = await http.patch<BearCustomizationOption>(
    `/bear-customizations/options/${id}`,
    payload,
  );
  return data;
};

export const deleteBearCustomizationOption = async (id: string) => {
  await http.delete(`/bear-customizations/options/${id}`);
};
