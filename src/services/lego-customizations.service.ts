import { http } from "../lib/http";
import type {
  LegoCustomizationGroup,
  LegoCustomizationOption,
} from "../pages/Dashboard/types";

export interface LegoCustomizationGroupPayload {
  name: string;
  helper: string;
}

export interface LegoCustomizationOptionPayload {
  groupId: string;
  name: string;
  description: string;
  price: number;
  allowImageUpload: boolean;
  image?: string;
  colorCode?: string;
}

export interface PublicLegoCustomizationOption {
  id: string;
  name: string;
  description: string;
  price: number;
  allowImageUpload: boolean;
  image: string;
  colorCode: string;
}

export interface PublicLegoCustomizationGroup {
  id: string;
  name: string;
  helper: string;
  options: PublicLegoCustomizationOption[];
}

export const getLegoCustomizationGroups = async () => {
  const { data } = await http.get<LegoCustomizationGroup[]>("/lego-customizations/groups");
  return data;
};

export const createLegoCustomizationGroup = async (
  payload: LegoCustomizationGroupPayload,
) => {
  const { data } = await http.post<LegoCustomizationGroup>(
    "/lego-customizations/groups",
    payload,
  );
  return data;
};

export const updateLegoCustomizationGroup = async (
  id: string,
  payload: LegoCustomizationGroupPayload,
) => {
  const { data } = await http.patch<LegoCustomizationGroup>(
    `/lego-customizations/groups/${id}`,
    payload,
  );
  return data;
};

export const deleteLegoCustomizationGroup = async (id: string) => {
  await http.delete(`/lego-customizations/groups/${id}`);
};

export const createLegoCustomizationOption = async (
  payload: LegoCustomizationOptionPayload,
) => {
  const { data } = await http.post<LegoCustomizationOption>(
    "/lego-customizations/options",
    payload,
  );
  return data;
};

export const updateLegoCustomizationOption = async (
  id: string,
  payload: LegoCustomizationOptionPayload,
) => {
  const { data } = await http.patch<LegoCustomizationOption>(
    `/lego-customizations/options/${id}`,
    payload,
  );
  return data;
};

export const deleteLegoCustomizationOption = async (id: string) => {
  await http.delete(`/lego-customizations/options/${id}`);
};

export const getPublicLegoCustomizations = async () => {
  const { data } = await http.get<PublicLegoCustomizationGroup[]>(
    "/public/lego-customizations",
  );
  return data;
};
