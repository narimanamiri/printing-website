import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, save, type Order } from "@/lib/server/store";
import { genId, requireUser } from "@/lib/server/session";
import { saveFile } from "@/lib/server/files";
import { toOrderDTO } from "@/lib/server/map";
import { parseStl, estimatePrint, QUALITY_PRESETS, MATERIALS } from "@/lib/stl-parser";

const Fields = z.object({
  filename: z.string().min(1).max(256),
  infill: z.number().int().min(10).max(100),
  material: z.enum(["PLA", "PETG", "ABS", "TPU", "Resin"]),
  quality: z.enum(["draft", "standard", "fine"]),
  support: z.boolean(),
  notes: z.string().max(500).nullable(),
});

function formFile(data: unknown, key: string): File {
  if (!(data instanceof FormData)) throw new Error("درخواست نامعتبر است.");
  const f = data.get(key);
  if (!(f instanceof File)) throw new Error("فایلی دریافت نشد.");
  return f;
}

// Authoritative, fully local order creation. The browser shows a live preview
// price; here the server saves the STL to disk, re-slices it with the same
// engine, and writes the trusted weight/cost. Works with no internet.
export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const file = formFile(data, "file");
    const fd = data as FormData;
    const fields = Fields.parse({
      filename: String(fd.get("filename") ?? file.name),
      infill: Number(fd.get("infill")),
      material: String(fd.get("material")),
      quality: String(fd.get("quality")),
      support: fd.get("support") === "true",
      notes: fd.get("notes") ? String(fd.get("notes")) : null,
    });
    return { file, ...fields };
  })
  .handler(async ({ data }) => {
    const user = requireUser();

    if (data.file.size > 60 * 1024 * 1024) throw new Error("حجم فایل بیش از حد است.");
    const buf = new Uint8Array(await data.file.arrayBuffer());

    const stats = await parseStl(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    if (stats.volumeCm3 <= 0) throw new Error("حجم معتبر محاسبه نشد. آیا مش بسته است؟");

    const quality = QUALITY_PRESETS.find((q) => q.key === data.quality) ?? QUALITY_PRESETS[1];
    const est = estimatePrint(stats, {
      quality, infill: data.infill, material: data.material, support: data.support,
    });

    const filePath = saveFile("uploads", user.id, data.filename, buf);

    const now = new Date().toISOString();
    const order: Order = {
      id: genId(),
      userId: user.id,
      filename: data.filename,
      filePath,
      receiptPath: null,
      volumeCm3: Number(stats.volumeCm3.toFixed(3)),
      weightG: Number(est.weightG.toFixed(3)),
      infill: data.infill,
      material: data.material,
      color: null,
      notes: data.notes,
      adminNotes: null,
      costToman: est.costToman,
      status: "pending_payment",
      printParams: {
        quality: quality.key,
        layerHeight: quality.layerHeight,
        walls: quality.wallCount,
        topLayers: quality.topLayers,
        bottomLayers: quality.bottomLayers,
        support: data.support,
        priceFactor: MATERIALS[data.material].priceFactor,
        surfaceAreaCm2: Number(stats.surfaceAreaCm2.toFixed(2)),
        bbox: {
          x: Number(stats.bbox.x.toFixed(1)),
          y: Number(stats.bbox.y.toFixed(1)),
          z: Number(stats.bbox.z.toFixed(1)),
        },
        filamentLengthM: Number(est.filamentLengthM.toFixed(2)),
        printTimeMin: Math.round(est.printTimeMin),
        shellG: Number(est.breakdown.shellG.toFixed(2)),
        infillG: Number(est.breakdown.infillG.toFixed(2)),
        supportG: Number(est.breakdown.supportG.toFixed(2)),
      },
      createdAt: now,
      updatedAt: now,
    };
    db().orders.push(order);
    save();
    return { order: toOrderDTO(order) };
  });

export const listMyOrders = createServerFn({ method: "GET" }).handler(async () => {
  const user = requireUser();
  const orders = db().orders
    .filter((o) => o.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toOrderDTO);
  return { orders };
});

export const uploadReceipt = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const file = formFile(data, "file");
    const orderId = String((data as FormData).get("orderId") ?? "");
    if (!orderId) throw new Error("شناسه سفارش نامعتبر است.");
    return { file, orderId };
  })
  .handler(async ({ data }) => {
    const user = requireUser();
    const order = db().orders.find((o) => o.id === data.orderId);
    if (!order || order.userId !== user.id) throw new Error("سفارش پیدا نشد.");
    if (!["pending_payment", "awaiting_confirmation"].includes(order.status)) {
      throw new Error("برای این سفارش امکان آپلود رسید نیست.");
    }
    if (data.file.size > 15 * 1024 * 1024) throw new Error("حجم رسید بیش از حد است (حداکثر ۱۵ مگابایت).");

    const bytes = new Uint8Array(await data.file.arrayBuffer());
    order.receiptPath = saveFile("receipts", user.id, data.file.name, bytes);
    order.status = "awaiting_confirmation";
    order.updatedAt = new Date().toISOString();
    save();
    return { ok: true };
  });
