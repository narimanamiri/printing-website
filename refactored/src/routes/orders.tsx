import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Loader2, FileBox, Clock, Check, Hammer, PackageCheck, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatToman } from "@/lib/stl-parser";
import { BUSINESS } from "@/lib/business";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "My Orders — VoxelForge" },
      { name: "description", content: "Track your 3D printing orders." },
    ],
  }),
  component: OrdersPage,
});

type Order = {
  id: string;
  filename: string;
  weight_g: number;
  infill: number;
  material: string;
  cost_toman: number;
  status: string;
  receipt_path: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
};

function OrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders").select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary font-mono mb-2">Your Orders</div>
            <h1 className="text-4xl font-bold tracking-tight">Track & pay</h1>
          </div>
          <Link to="/quote" className="rounded-lg btn-primary px-5 py-2.5 text-sm">New order</Link>
        </div>

        {isLoading || loading ? (
          <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : !orders || orders.length === 0 ? (
          <div className="surface rounded-2xl p-16 text-center">
            <FileBox className="size-10 text-muted-foreground mx-auto mb-4" />
            <div className="font-semibold text-lg">No orders yet</div>
            <p className="text-sm text-muted-foreground mt-1">Upload an STL to get started.</p>
            <Link to="/quote" className="mt-6 inline-flex rounded-lg btn-primary px-5 py-2.5 text-sm">Get a quote</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} userId={user!.id} onChanged={() => qc.invalidateQueries({ queryKey: ["my-orders"] })} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

const STATUS_META: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending_payment: { label: "Pending payment", icon: Clock, color: "text-warning" },
  awaiting_confirmation: { label: "Awaiting confirmation", icon: AlertCircle, color: "text-accent" },
  confirmed: { label: "Confirmed", icon: Check, color: "text-primary" },
  printing: { label: "Printing", icon: Hammer, color: "text-primary" },
  completed: { label: "Completed", icon: PackageCheck, color: "text-success" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-destructive" },
};

function OrderCard({ order, userId, onChanged }: { order: Order; userId: string; onChanged: () => void }) {
  const [uploading, setUploading] = useState(false);
  const meta = STATUS_META[order.status] ?? STATUS_META.pending_payment;
  const Icon = meta.icon;

  const uploadReceipt = async (file: File) => {
    setUploading(true);
    try {
      const path = `${userId}/${order.id}_${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("payment-receipts").upload(path, file);
      if (upErr) throw upErr;
      const { error: updErr } = await supabase.from("orders")
        .update({ receipt_path: path, status: "awaiting_confirmation" })
        .eq("id", order.id);
      if (updErr) throw updErr;
      toast.success("Receipt uploaded. We'll confirm shortly.");
      onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="surface rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileBox className="size-4 text-primary" />
            <span className="font-semibold truncate">{order.filename}</span>
          </div>
          <div className="text-xs text-muted-foreground font-mono mt-1">
            #{order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleString()}
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-sm ${meta.color} font-medium`}>
          <Icon className="size-4" /> {meta.label}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 text-sm">
        <Stat label="Material" value={order.material} />
        <Stat label="Infill" value={`${order.infill}%`} />
        <Stat label="Weight" value={`${Number(order.weight_g).toFixed(1)} g`} />
        <Stat label="Cost" value={formatToman(order.cost_toman)} highlight />
      </div>

      {order.notes && <p className="mt-4 text-xs text-muted-foreground border-l-2 border-border pl-3">{order.notes}</p>}
      {order.admin_notes && <p className="mt-3 text-xs text-primary border-l-2 border-primary pl-3">From workshop: {order.admin_notes}</p>}

      {order.status === "pending_payment" && (
        <div className="mt-5 pt-5 border-t border-border">
          <div className="text-sm font-semibold mb-3">Pay & upload receipt</div>
          <div className="rounded-lg bg-background/60 border border-border p-4 mb-3 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="text-foreground font-semibold">{formatToman(order.cost_toman)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Card</span><span>{BUSINESS.cardNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Holder</span><span>{BUSINESS.cardHolder}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span>{BUSINESS.bankName}</span></div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Transfer the exact amount, then upload your receipt below. We'll confirm and start printing.
          </p>
          <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-4 py-2 text-sm cursor-pointer hover:bg-secondary transition-colors">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Upload receipt
            <input type="file" accept="image/*,application/pdf" className="hidden" disabled={uploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadReceipt(f); }} />
          </label>
        </div>
      )}

      {order.status === "awaiting_confirmation" && (
        <div className="mt-5 pt-5 border-t border-border text-xs text-muted-foreground">
          Receipt received. We'll verify the payment and move your file to the print queue.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">{label}</div>
      <div className={`mt-1 font-semibold ${highlight ? "text-gradient" : ""}`}>{value}</div>
    </div>
  );
}
