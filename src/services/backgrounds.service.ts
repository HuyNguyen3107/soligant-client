import { http } from "../lib/http";
import type { Background, BackgroundFormState } from "../pages/Dashboard/types";

export type BackgroundPayload = BackgroundFormState & {
  fields: (BackgroundFormState["fields"][0] & { sortOrder: number })[];
};

export type PublicBackground = Pick<
  Background,
  "id" | "name" | "description" | "themeId" | "themeName" | "image" | "fields"
>;

export const getPublicBackgrounds = async (): Promise<PublicBackground[]> => {
  const { data } = await http.get<PublicBackground[]>("/public/backgrounds");
  return data;
};

export const getBackgrounds = async () => {
  const { data } = await http.get<Background[]>("/backgrounds");
  return data;
};

export const createBackground = async (payload: BackgroundPayload) => {
  const { data } = await http.post<Background>("/backgrounds", payload);
  return data;
};

export const updateBackground = async (
  id: string,
  payload: BackgroundPayload,
) => {
  const { data } = await http.patch<Background>(`/backgrounds/${id}`, payload);
  return data;
};

export const deleteBackground = async (id: string) => {
  await http.delete(`/backgrounds/${id}`);
};
