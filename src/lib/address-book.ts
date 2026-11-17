import { z } from "zod";
import { checkoutSchema } from "@/lib/validation";

export const addressSchema = z.object({
  id: z.string().cuid().optional(),
  label: z.string().trim().min(1, "Укажите название адреса").max(60),
  recipient: z.string().trim().min(2, "Укажите получателя").max(100),
  phone: checkoutSchema.shape.phone,
  address: checkoutSchema.shape.address,
  isDefault: z.boolean(),
});
export const addressSelect = {
  id: true,
  label: true,
  recipient: true,
  phone: true,
  address: true,
  isDefault: true,
} as const;
export type AddressEntry = z.infer<typeof addressSchema> & { id: string };
