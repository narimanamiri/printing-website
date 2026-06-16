import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, save } from "@/lib/server/store";
import { requireAdmin } from "@/lib/server/session";

// Public: the client needs price-per-gram, build volume and payment details.
export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  return db().settings;
});

const SettingsInput = z.object({
  pricePerGram: z.number().int().min(1000).max(100_000_000),
  minOrderToman: z.number().int().min(0).max(100_000_000),
  buildVolume: z.object({
    x: z.number().min(10).max(2000),
    y: z.number().min(10).max(2000),
    z: z.number().min(10).max(2000),
  }),
  business: z.object({
    name: z.string().min(1).max(80),
    cardNumber: z.string().max(40),
    cardHolder: z.string().max(80),
    bankName: z.string().max(60),
    sheba: z.string().max(40),
    whatsapp: z.string().max(40),
    phone: z.string().max(40),
    address: z.string().max(160),
  }),
});

export const updateSettings = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SettingsInput.parse(d))
  .handler(async ({ data }) => {
    requireAdmin();
    db().settings = data;
    save();
    return db().settings;
  });
