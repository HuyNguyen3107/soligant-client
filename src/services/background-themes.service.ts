import { http } from "../lib/http";
import type { BackgroundTheme } from "../pages/Dashboard/types";

export interface BackgroundThemePayload {
  name: string;
  isActive: boolean;
}

export const getBackgroundThemes = async () => {
  const { data } = await http.get<BackgroundTheme[]>("/background-themes");
  return data;
};

export const createBackgroundTheme = async (payload: BackgroundThemePayload) => {
  const { data } = await http.post<BackgroundTheme>(
    "/background-themes",
    payload,
  );
  return data;
};

export const updateBackgroundTheme = async (
  id: string,
  payload: BackgroundThemePayload,
) => {
  const { data } = await http.patch<BackgroundTheme>(
    `/background-themes/${id}`,
    payload,
  );
  return data;
};

export const deleteBackgroundTheme = async (id: string) => {
  await http.delete(`/background-themes/${id}`);
};
