import { api } from "@/services/api";
import type { ApiResponse, AuthUser } from "@/types/auth";
import type { ForgotPasswordInput, LoginInput } from "@/schemas/auth";

export async function login(input: LoginInput) {
  const response = await api.post<ApiResponse<{ accessToken: string; user: AuthUser }>>("/auth/login", input);
  sessionStorage.setItem("garage_access_token", response.data.data.accessToken);
  return response.data.data.user;
}

export async function me() {
  const response = await api.get<ApiResponse<AuthUser>>("/auth/me");
  return response.data.data;
}

export async function logout() {
  await api.post("/auth/logout");
  sessionStorage.removeItem("garage_access_token");
}

export async function forgotPassword(input: ForgotPasswordInput) {
  const response = await api.post<ApiResponse<null>>("/auth/forgot-password", input);
  return response.data.message;
}

