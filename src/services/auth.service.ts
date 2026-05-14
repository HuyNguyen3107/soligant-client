import { http } from "../lib/http";
import type { AuthUser } from "../store/auth.store";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
}

export async function login(payload: LoginPayload) {
  const { data } = await http.post<LoginResponse>("/auth/login", payload);
  return data;
}

export async function logout() {
  // Backend clears the httpOnly auth cookies. Ignore errors so logout always
  // proceeds locally even when the network call fails.
  await http.post("/auth/logout").catch(() => undefined);
}

export async function getCurrentUser() {
  const { data } = await http.get<AuthUser>("/auth/me");
  return data;
}

export default login;
