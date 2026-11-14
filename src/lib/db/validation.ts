import { z } from "zod";

export const createChargeSchema = z.object({
  amount: z.number().positive().max(1_000_000),
  concept: z.string().min(1).max(140),
  channel: z.enum(["CODI_QR", "CODI_PUSH"]),
  phone: z.string().min(10).max(15).optional(),
  expirationSeconds: z.number().int().min(60).max(3600).optional(),
});

export type CreateChargeBody = z.infer<typeof createChargeSchema>;