import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseStl, estimatePrint, QUALITY_PRESETS, MATERIALS } from "@/lib/stl-parser";

const CreateOrderInput = z.object({
  filePath: z.string().min(1).max(512),
  filename: z.string().min(1).max(256),
  infill: z.number().int().min(10).max(100),
  material: z.enum(["PLA", "PETG", "ABS", "TPU", "Resin"]),
  quality: z.enum(["draft", "standard", "fine"]),
  support: z.boolean(),
  color: z.string().max(64).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

// Authoritative order creation. The price the client shows is only a preview —
// here the server re-downloads the uploaded STL, re-slices it with the SAME
// engine, and writes the trusted volume / weight / cost. This makes price
// tampering impossible even though the client computes a live estimate.
export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateOrderInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // The file must live inside the caller's own folder: <user_id>/<name>
    if (!data.filePath.startsWith(`${userId}/`)) {
      throw new Error("Forbidden: file does not belong to you");
    }

    const { data: blob, error: dlErr } = await supabaseAdmin.storage
      .from("stl-uploads")
      .download(data.filePath);
    if (dlErr || !blob) throw new Error("آپلود فایل ناموفق بود. دوباره تلاش کنید.");

    const stats = await parseStl(await blob.arrayBuffer());
    if (stats.volumeCm3 <= 0) throw new Error("حجم معتبر محاسبه نشد. آیا مش بسته است؟");

    const quality = QUALITY_PRESETS.find((q) => q.key === data.quality) ?? QUALITY_PRESETS[1];
    const est = estimatePrint(stats, {
      quality,
      infill: data.infill,
      material: data.material,
      support: data.support,
    });

    const printParams = {
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
    };

    const { data: order, error: insErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        filename: data.filename,
        file_path: data.filePath,
        volume_cm3: Number(stats.volumeCm3.toFixed(3)),
        weight_g: Number(est.weightG.toFixed(3)),
        infill: data.infill,
        material: data.material,
        color: data.color ?? null,
        notes: data.notes ?? null,
        cost_toman: est.costToman,
        status: "pending_payment",
        print_params: printParams,
      })
      .select("id")
      .single();
    if (insErr || !order) throw new Error("ثبت سفارش ناموفق بود.");

    return { id: order.id as string, weightG: est.weightG, costToman: est.costToman };
  });
