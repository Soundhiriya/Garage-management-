import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(1, "Mobile number or email is required"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["ADMIN", "MANAGER", "TECHNICIAN"], { message: "Select a role" })
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, "Mobile number or email is required")
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
