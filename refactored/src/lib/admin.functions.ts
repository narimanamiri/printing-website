import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, save } from "@/lib/server/store";
import { requireAdmin } from "@/lib/server/session";
import { toAdminOrderDTO } from "@/lib/server/map";
import { readAsDataUrl } from "@/lib/server/files";

const REVENUE_STATUSES = new Set(["confirmed", "printing", "completed"]);

export const dashboardStats = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const d = db();
  const byStatus = {
    pending_payment: 0, awaiting_confirmation: 0, confirmed: 0,
    printing: 0, completed: 0, cancelled: 0,
  } as Record<string, number>;
  let revenueToman = 0, todayOrders = 0;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  // Last 14 days revenue/count series for the chart.
  const daily: { day: string; revenue: number; count: number }[] = [];
  const idx = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const dt = new Date(todayStart); dt.setDate(dt.getDate() - i);
    const day = dt.toISOString().slice(0, 10);
    idx.set(day, daily.length);
    daily.push({ day, revenue: 0, count: 0 });
  }

  for (const o of d.orders) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    if (REVENUE_STATUSES.has(o.status)) revenueToman += o.costToman;
    if (o.createdAt >= todayIso) todayOrders++;
    const dayKey = o.createdAt.slice(0, 10);
    const di = idx.get(dayKey);
    if (di !== undefined) {
      daily[di].count++;
      if (REVENUE_STATUSES.has(o.status)) daily[di].revenue += o.costToman;
    }
  }

  return {
    totalOrders: d.orders.length,
    todayOrders,
    customers: d.users.filter((u) => u.role === "customer").length,
    revenueToman,
    awaitingConfirmation: byStatus.awaiting_confirmation,
    byStatus,
    daily,
  };
});

export const listOrders = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ filter: z.string() }).parse(d ?? { filter: "all" }),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const d = db();
    const userById = new Map(d.users.map((u) => [u.id, u]));
    const orders = d.orders
      .filter((o) => data.filter === "all" || o.status === data.filter)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((o) => toAdminOrderDTO(o, userById.get(o.userId)));
    return { orders };
  });

export const confirmOrderPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ orderId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    requireAdmin();
    const order = db().orders.find((o) => o.id === data.orderId);
    if (!order) throw new Error("سفارش پیدا نشد.");
    order.status = "confirmed";
    order.updatedAt = new Date().toISOString();
    save();
    return { ok: true };
  });

export const setOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      orderId: z.string(),
      status: z.enum(["printing", "completed", "cancelled"]),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const order = db().orders.find((o) => o.id === data.orderId);
    if (!order) throw new Error("سفارش پیدا نشد.");
    order.status = data.status;
    order.updatedAt = new Date().toISOString();
    save();
    return { ok: true };
  });

export const setAdminNotes = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ orderId: z.string(), notes: z.string().max(500) }).parse(d),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const order = db().orders.find((o) => o.id === data.orderId);
    if (!order) throw new Error("سفارش پیدا نشد.");
    order.adminNotes = data.notes || null;
    order.updatedAt = new Date().toISOString();
    save();
    return { ok: true };
  });

// Return a file as a base64 data URL so the admin can view/download it without
// any extra route or cloud storage.
export const getOrderFile = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ orderId: z.string(), kind: z.enum(["stl", "receipt"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const order = db().orders.find((o) => o.id === data.orderId);
    if (!order) throw new Error("سفارش پیدا نشد.");
    const path = data.kind === "stl" ? order.filePath : order.receiptPath;
    if (!path) throw new Error("فایلی موجود نیست.");
    return readAsDataUrl(path);
  });
