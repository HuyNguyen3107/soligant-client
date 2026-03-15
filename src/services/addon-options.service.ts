import { http } from "../lib/http";
import type { AddonOptionRow, AddonOptionFormState } from "../pages/Dashboard/types";

export interface AddonOptionPayload
  extends Omit<AddonOptionFormState, "price" | "fields"> {
  price: number;
  fields: Array<AddonOptionFormState["fields"][number] & { sortOrder: number }>;
}

export type PublicAddonOption = Pick<
  AddonOptionRow,
  "id" | "name" | "description" | "optionType" | "price" | "fields"
>;

export const getAddonOptions = async () => {
  const { data } = await http.get<AddonOptionRow[]>("/addon-options");
  return data;
};

export const getPublicAddonOptions = async (productId?: string) => {
  const { data } = await http.get<PublicAddonOption[]>("/public/addon-options", {
    params: productId ? { productId } : undefined,
  });
  return data;
};

export const createAddonOption = async (payload: AddonOptionPayload) => {
  const { data } = await http.post<AddonOptionRow>("/addon-options", payload);
  return data;
};

export const updateAddonOption = async (
  id: string,
  payload: AddonOptionPayload,
) => {
  const { data } = await http.patch<AddonOptionRow>(`/addon-options/${id}`, payload);
  return data;
};

export const deleteAddonOption = async (id: string) => {
  await http.delete(`/addon-options/${id}`);
};
