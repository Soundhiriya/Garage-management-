export type UserRole = "ADMIN" | "MANAGER" | "TECHNICIAN";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  mobile: string | null;
  role: UserRole;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  code: string | null;
  data: T;
};

