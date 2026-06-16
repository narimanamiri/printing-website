import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, replaceDb } from "@/lib/server/store";
import { requireAdmin } from "@/lib/server/session";

// Full offline backup — admin downloads the entire local database as JSON.
export const exportData = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const d = db();
  return { users: d.users, orders: d.orders, settings: d.settings, exportedAt: new Date().toISOString() };
});

const ImportInput = z.object({
  json: z.string().min(2).max(200_000_000),
});

// Restore a previously exported backup.
export const importData = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ImportInput.parse(d))
  .handler(async ({ data }) => {
    requireAdmin();
    let parsed: unknown;
    try {
      parsed = JSON.parse(data.json);
    } catch {
      throw new Error("فایل پشتیبان معتبر نیست (JSON خراب).");
    }
    if (!parsed || typeof parsed !== "object") throw new Error("ساختار فایل پشتیبان نامعتبر است.");
    const obj = parsed as Record<string, unknown>;
    if (!Array.isArray(obj.users) || !Array.isArray(obj.orders)) {
      throw new Error("فایل پشتیبان باید شامل users و orders باشد.");
    }
    replaceDb({
      users: obj.users as never,
      orders: obj.orders as never,
      settings: obj.settings as never,
    });
    return { ok: true, users: (obj.users as unknown[]).length, orders: (obj.orders as unknown[]).length };
  });
