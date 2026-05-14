import axios, { AxiosError } from "axios";
import { useAuthStore } from "../store/auth.store";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export const SERVER_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL;
  }
})();

export const getStaticAssetUrl = (input: string | null | undefined) => {
  const normalizedInput = input?.trim();

  if (!normalizedInput) return null;
  if (/^(https?:|data:|blob:)/.test(normalizedInput)) return normalizedInput;

  return `${SERVER_ORIGIN}/${normalizedInput.replace(/^\/+/, "")}`;
};

// Tokens live in httpOnly cookies set by the API. The browser attaches them
// automatically when `withCredentials` is true, so we never touch them from JS.
export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const requestUrl = String(error.config?.url ?? "");
      if (
        !requestUrl.includes("/auth/login") &&
        !requestUrl.includes("/auth/me")
      ) {
        useAuthStore.getState().clearSession();
      }
    }

    return Promise.reject(error);
  },
);
