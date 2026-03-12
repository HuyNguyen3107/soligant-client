import { http } from "../lib/http";
import type { AuthUser } from "../store/auth.store";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export async function login(payload: LoginPayload) {
  const { data } = await http.post<LoginResponse>("/auth/login", payload);
  return data;
}

export default login;
