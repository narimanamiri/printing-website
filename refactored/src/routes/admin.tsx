import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Check, Hammer, PackageCheck, XCircle, Eye, ShieldAlert, FileBox } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatToman } from "@/lib/stl-parser";
import { confirmOrderPayment, setOrderStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — VoxelForge" },
      { name: "description", content: "Admin dashboard for the print queue." },
    ],
  }),
  component: AdminPage,
});

type AdminOrder = {
  id: string; user_id: string; filename: string; file_path: string;
  weight_g: number; infill: number; material: string; cost_toman: number;
  status: string; receipt_path: string | null; notes: string | null;
  created_at: string;
};

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const confirmFn = useServerFn(confirmOrderPayment);
  const setStatusFn = useServerFn(setOrderStatus);

  const [filter, setFilter] = useState<string>("awaiting_confirmation");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders", filter],
    enabled: !!user && isAdmin,
    queryFn: async () => {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter as "awaiting_confirmation" | "confirmed" | "printing" | "completed" | "cancelled" | "pending_payment");
      const { data, error } = await q;
      if (error) throw error;
      return data as AdminOrder[];
    },
  });

  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 grid place-items-center px-6 py-20">
          <div className="surface rounded-2xl p-10 max-w-md text-center">
            <ShieldAlert className="size-10 text-warning mx-auto mb-4" />
            <h1 className="text-xl font-bold">Admin access required</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Your account doesn't have the admin role. Ask the project owner to grant you access.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const onConfirm = async (id: string) => {
    try {
      await confirmFn({ data: { orderId: id } });
      toast.success("Payment confirmed. File moved to print queue.");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };
  const onSetStatus = async (id: string, status: "printing" | "completed" | "cancelled") => {
    try {
      await setStatusFn({ data: { orderId: id, status } });
      toast.success(`Marked as ${status}`);
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const viewSigned = async (bucket: string, path: string) => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
    if (error || !data) { toast.error("Couldn't open file"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const filters = [
    { v: "awaiting_confirmation", l: "Awaiting" },
    { v: "confirmed", l: "Confirmed" },
    { v: "printing", l: "Printing" },
    { v: "completed", l: "Completed" },
    { v: "all", l: "All" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-accent font-mono mb-2">Admin</div>
          <h1 className="text-4xl font-bold tracking-tight">Print queue</h1>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {filters.map((f) => (
            <button key={f.v} onClick={() => setFilter(f.v)}
              className={`px-4 py-2 rounded-lg text-sm border transition-colors ${filter === f.v ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary"}`}>
              {f.l}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : !orders || orders.length === 0 ? (
          <div className="surface rounded-2xl p-16 text-center text-muted-foreground">No orders in this view.</div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div key={o.id} className="surface rounded-2xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-semibold"><FileBox className="size-4 text-primary" />{o.filename}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gradient">{formatToman(o.cost_toman)}</div>
                    <div className="text-xs text-muted-foreground">{Number(o.weight_g).toFixed(1)}g · {o.material} · {o.infill}%</div>
                  </div>
                </div>

                {o.notes && <p className="mt-3 text-xs text-muted-foreground border-l-2 border-border pl-3">{o.notes}</p>}

                <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center gap-2">
                  <button onClick={() => viewSigned("stl-uploads", o.file_path)} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-secondary">
                    <Eye className="size-3.5" /> STL
                  </button>
                  {o.receipt_path && (
                    <button onClick={() => viewSigned("payment-receipts", o.receipt_path!)} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-secondary">
                      <Eye className="size-3.5" /> Receipt
                    </button>
                  )}
                  <div className="flex-1" />
                  {o.status === "awaiting_confirmation" && (
                    <button onClick={() => onConfirm(o.id)} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md btn-primary">
                      <Check className="size-3.5" /> Confirm payment
                    </button>
                  )}
                  {o.status === "confirmed" && (
                    <button onClick={() => onSetStatus(o.id, "printing")} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary text-primary hover:bg-primary/10">
                      <Hammer className="size-3.5" /> Start printing
                    </button>
                  )}
                  {o.status === "printing" && (
                    <button onClick={() => onSetStatus(o.id, "completed")} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-success text-success hover:bg-success/10">
                      <PackageCheck className="size-3.5" /> Mark completed
                    </button>
                  )}
                  {["awaiting_confirmation","confirmed","printing"].includes(o.status) && (
                    <button onClick={() => onSetStatus(o.id, "cancelled")} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-destructive text-destructive hover:bg-destructive/10">
                      <XCircle className="size-3.5" /> Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
