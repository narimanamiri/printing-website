import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const ConfirmInput = z.object({
  orderId: z.string().uuid(),
});

// Admin confirms a paid order: copy STL file from stl-uploads to print-queue
// and set status to 'confirmed'.
export const confirmOrderPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ConfirmInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Verify admin via service role (bypasses RLS) to avoid relying on user policies
    const { data: role, error: rerr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (rerr) throw new Error("Failed to verify role");
    if (!role) throw new Error("Forbidden: admin only");

    // Load order
    const { data: order, error: oerr } = await supabaseAdmin
      .from("orders")
      .select("id, file_path, filename, status")
      .eq("id", data.orderId)
      .single();
    if (oerr || !order) throw new Error("Order not found");

    // Download from stl-uploads
    const { data: blob, error: dlerr } = await supabaseAdmin.storage
      .from("stl-uploads")
      .download(order.file_path);
    if (dlerr || !blob) throw new Error("Could not download STL file");

    // Upload to print-queue with order id prefix
    const queuePath = `${order.id}__${order.filename}`;
    const buf = await blob.arrayBuffer();
    const { error: uperr } = await supabaseAdmin.storage
      .from("print-queue")
      .upload(queuePath, buf, {
        contentType: "model/stl",
        upsert: true,
      });
    if (uperr) throw new Error("Failed to copy to print queue: " + uperr.message);

    // Update order
    const { error: uerr } = await supabaseAdmin
      .from("orders")
      .update({ status: "confirmed", queue_path: queuePath })
      .eq("id", order.id);
    if (uerr) throw new Error("Failed to update order status");

    return { ok: true, queuePath };
  });

const SetStatusInput = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["printing", "completed", "cancelled"]),
});

export const setOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SetStatusInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: role } = await supabaseAdmin
      .from("user_roles").select("role")
      .eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden");

    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
