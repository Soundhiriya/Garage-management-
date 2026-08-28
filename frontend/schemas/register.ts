import { z } from "zod";

export const registerSchema = z.object({
  chassisNumber: z.string().trim().min(1, "Chassis number is required").transform((value) => value.toUpperCase()),
  registrationNumber: z.string().trim().min(1, "Vehicle number is required").transform((value) => value.toUpperCase()),
  customerName: z.string().min(1, "Customer name is required"),
  phoneNumber: z.string().regex(/^\d{10}$/, "Phone number must be 10 digits"),
  address: z.string().min(1, "Address is required"),
  currentKm: z.coerce.number().optional(),
  serviceTypes: z.array(z.string()).optional(),
  complaint: z.string().optional(),
  fuelLevel: z.string().optional(),
  vehicleCondition: z.string().optional(),
  expectedDeliveryAt: z.string().optional()
});

export type RegisterInput = z.infer<typeof registerSchema>;
