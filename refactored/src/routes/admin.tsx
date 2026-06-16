import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Check, Hammer, PackageCheck, XCircle, Eye, Download, ShieldAlert, FileBox, Wallet, Inbox, Users, CalendarDays, Search, FileSpreadsheet, FileText } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { formatToman, formatNumberFa, formatDurationFa } from "@/lib/stl-parser";
import { listOrders, dashboardStats, confirmOrderPayment, setOrderStatus, setAdminNotes, getOrderFile } from "@/lib/admin.functions";
import type { AdminOrderDTO } from "@/lib/types";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "مدیریت — وُکسِل‌فورج" },
      { name: "description", content: "پنل مدیریت صف چاپ." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const listFn = useServerFn(listOrders);
  const statsFn = useServerFn(dashboardStats);
  const confirmFn = useServerFn(confirmOrderPayment);
  const setStatusFn = useServerFn(setOrderStatus);
  const fileFn = useServerFn(getOrderFile);

  const [filter, setFilter] = useState<string>("awaiting_confirmation");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PER_PAGE = 10;

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders", filter],
    enabled: !!user && isAdmin,
    queryFn: async () => (await listFn({ data: { filter } })).orders,
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: !!user && isAdmin,
    queryFn: async () => statsFn(),
  });

  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 grid place-items-center px-6 py-20">
          <div className="surface rounded-2xl p-10 max-w-md text-center">
            <ShieldAlert className="size-10 text-warning mx-auto mb-4" />
            <h1 className="text-xl font-bold">دسترسی مدیریت لازم است</h1>
            <p className="text-sm text-muted-foreground mt-2">
              حساب شما نقش مدیر ندارد. اولین حسابی که در سامانه ساخته شود مدیر است.
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
      toast.success("پرداخت تأیید شد. فایل وارد صف چاپ شد.");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "خطا");
    }
  };
  const onSetStatus = async (id: string, status: "printing" | "completed" | "cancelled") => {
    const labels = { printing: "در حال چاپ", completed: "تکمیل شده", cancelled: "لغو شده" } as const;
    try {
      await setStatusFn({ data: { orderId: id, status } });
      toast.success(`وضعیت: ${labels[status]}`);
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "خطا");
    }
  };

  const viewFile = async (orderId: string, kind: "stl" | "receipt") => {
    try {
      const { dataUrl, filename } = await fileFn({ data: { orderId, kind } });
      const blob = await (await fetch(dataUrl)).blob();
      const url = URL.createObjectURL(blob);
      if (kind === "stl") {
        const a = document.createElement("a");
        a.href = url; a.download = filename; a.click();
      } else {
        window.open(url, "_blank");
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فایل باز نشد");
    }
  };

  const filters = [
    { v: "awaiting_confirmation", l: "در انتظار تأیید" },
    { v: "confirmed", l: "تأیید شده" },
    { v: "printing", l: "در حال چاپ" },
    { v: "completed", l: "تکمیل شده" },
    { v: "all", l: "همه" },
  ];

  const filtered = (orders ?? []).filter((o) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return o.filename.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q) || o.customerPhone.includes(q) || o.id.includes(q);
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageSafe = Math.min(page, pageCount - 1);
  const paged = filtered.slice(pageSafe * PER_PAGE, pageSafe * PER_PAGE + PER_PAGE);

  const exportCsv = () => {
    const head = ["id", "filename", "customer", "email", "phone", "material", "infill", "quantity", "weight_g", "cost_toman", "status", "created_at"];
    const rows = [head, ...filtered.map((o) => [
      o.id, o.filename, o.customerName, o.customerEmail, o.customerPhone, o.material,
      String(o.infill), String(o.quantity), String(o.weightG), String(o.costToman), o.status, o.createdAt,
    ])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `orders-${filter}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-accent font-mono mb-2">مدیریت</div>
          <h1 className="text-4xl font-bold tracking-tight">صف چاپ</h1>
        </div>

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Wallet} label="درآمد (تأییدشده)" value={formatToman(stats.revenueToman)} accent />
            <StatCard icon={Inbox} label="در انتظار تأیید" value={formatNumberFa(stats.awaitingConfirmation)} />
            <StatCard icon={CalendarDays} label="سفارش‌های امروز" value={formatNumberFa(stats.todayOrders)} />
            <StatCard icon={Users} label="مشتریان" value={formatNumberFa(stats.customers)} />
          </div>
        )}

        {stats && stats.daily.some((d) => d.revenue > 0 || d.count > 0) && (
          <RevenueChart daily={stats.daily} />
        )}

        <div className="flex flex-wrap items-center gap-2 mb-6">
          {filters.map((f) => (
            <button key={f.v} onClick={() => { setFilter(f.v); setPage(0); }}
              className={`px-4 py-2 rounded-lg text-sm border transition-colors ${filter === f.v ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary"}`}>
              {f.l}
            </button>
          ))}
          <div className="flex-1" />
          <div className="relative">
            <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="جست‌وجو…"
              className="rounded-lg border border-border bg-input pr-9 pl-3 py-2 text-sm w-44 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
          </div>
          <button onClick={exportCsv} disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-border hover:bg-secondary disabled:opacity-40">
            <FileSpreadsheet className="size-4" /> CSV
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="surface rounded-2xl p-16 text-center text-muted-foreground">هیچ سفارشی در این بخش نیست.</div>
        ) : (
          <div className="space-y-4">
            {paged.map((o: AdminOrderDTO) => (
              <div key={o.id} className="surface rounded-2xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-semibold"><FileBox className="size-4 text-primary" />{o.filename}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">#{o.id.slice(0, 8)} · {new Date(o.createdAt).toLocaleString("fa-IR")}</div>
                    <div className="text-xs text-muted-foreground mt-1">{o.customerName} · {o.customerPhone} · {o.customerEmail}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gradient">{formatToman(o.costToman)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumberFa(o.weightG, 1)} گرم · {o.material} · {formatNumberFa(o.infill)}٪
                      {o.quantity > 1 && ` · ${formatNumberFa(o.quantity)} عدد`}
                      {o.color && ` · ${o.color}`}
                    </div>
                  </div>
                </div>

                {o.printParams && (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-mono">
                    {o.printParams.printTimeMin != null && <span>⏱ {formatDurationFa(o.printParams.printTimeMin)}</span>}
                    {o.printParams.filamentLengthM != null && <span>🧵 {formatNumberFa(o.printParams.filamentLengthM, 1)} متر</span>}
                    {o.printParams.bbox && <span>📐 {formatNumberFa(o.printParams.bbox.x)}×{formatNumberFa(o.printParams.bbox.y)}×{formatNumberFa(o.printParams.bbox.z)} mm</span>}
                    {o.printParams.layerHeight != null && <span>▦ {formatNumberFa(o.printParams.layerHeight, 2)}mm</span>}
                    {o.printParams.support && <span>⛰ ساپورت</span>}
                  </div>
                )}

                {o.notes && <p className="mt-3 text-xs text-muted-foreground border-r-2 border-border pr-3">یادداشت مشتری: {o.notes}</p>}

                <AdminNoteBox orderId={o.id} initial={o.adminNotes ?? ""} />

                <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center gap-2">
                  {o.hasFile && (
                    <button onClick={() => viewFile(o.id, "stl")} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-secondary">
                      <Download className="size-3.5" /> دانلود STL
                    </button>
                  )}
                  {o.hasReceipt && (
                    <button onClick={() => viewFile(o.id, "receipt")} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-secondary">
                      <Eye className="size-3.5" /> رسید پرداخت
                    </button>
                  )}
                  <Link to="/invoice/$orderId" params={{ orderId: o.id }} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-secondary">
                    <FileText className="size-3.5" /> فاکتور
                  </Link>
                  <div className="flex-1" />
                  {o.status === "awaiting_confirmation" && (
                    <button onClick={() => onConfirm(o.id)} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md btn-primary">
                      <Check className="size-3.5" /> تأیید پرداخت
                    </button>
                  )}
                  {o.status === "confirmed" && (
                    <button onClick={() => onSetStatus(o.id, "printing")} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary text-primary hover:bg-primary/10">
                      <Hammer className="size-3.5" /> شروع چاپ
                    </button>
                  )}
                  {o.status === "printing" && (
                    <button onClick={() => onSetStatus(o.id, "completed")} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-success text-success hover:bg-success/10">
                      <PackageCheck className="size-3.5" /> تکمیل شد
                    </button>
                  )}
                  {["awaiting_confirmation", "confirmed", "printing"].includes(o.status) && (
                    <button onClick={() => onSetStatus(o.id, "cancelled")} className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-destructive text-destructive hover:bg-destructive/10">
                      <XCircle className="size-3.5" /> لغو
                    </button>
                  )}
                </div>
              </div>
            ))}

            {pageCount > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={pageSafe === 0}
                  className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-secondary disabled:opacity-40">قبلی</button>
                <span className="text-sm text-muted-foreground font-mono">{formatNumberFa(pageSafe + 1)} / {formatNumberFa(pageCount)}</span>
                <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={pageSafe >= pageCount - 1}
                  className="px-3 py-1.5 rounded-md border border-border text-sm hover:bg-secondary disabled:opacity-40">بعدی</button>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function RevenueChart({ daily }: { daily: { day: string; revenue: number; count: number }[] }) {
  const data = daily.map((d) => ({
    label: new Date(d.day).toLocaleDateString("fa-IR", { month: "numeric", day: "numeric" }),
    revenue: d.revenue,
  }));
  return (
    <div className="surface rounded-2xl p-5 mb-8">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-3">درآمد ۱۴ روز اخیر</div>
      <div className="h-40" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.86 0.16 195)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="oklch(0.86 0.16 195)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "oklch(0.66 0.02 240)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "oklch(0.17 0.018 240)", border: "1px solid oklch(0.27 0.02 240)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "oklch(0.97 0.005 240)" }}
              formatter={(v: number) => [formatToman(v), "درآمد"]}
            />
            <Area type="monotone" dataKey="revenue" stroke="oklch(0.86 0.16 195)" strokeWidth={2} fill="url(#rev)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: typeof Wallet; label: string; value: string; accent?: boolean }) {
  return (
    <div className="surface rounded-2xl p-5">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        <Icon className={`size-4 ${accent ? "text-accent" : "text-primary"}`} /> {label}
      </div>
      <div className={`mt-2 text-2xl font-bold ${accent ? "text-gradient" : ""}`}>{value}</div>
    </div>
  );
}

function AdminNoteBox({ orderId, initial }: { orderId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const saveFn = useServerFn(setAdminNotes);
  const dirty = value !== initial;

  const save = async () => {
    setSaving(true);
    try {
      await saveFn({ data: { orderId, notes: value } });
      toast.success("یادداشت ذخیره شد");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 flex items-center gap-2">
      <input
        value={value} onChange={(e) => setValue(e.target.value)} maxLength={500}
        placeholder="یادداشت به مشتری (اختیاری)…"
        className="flex-1 rounded-md border border-border bg-input px-3 py-1.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
      <button onClick={save} disabled={!dirty || saving}
        className="text-xs px-3 py-1.5 rounded-md btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
        {saving ? "…" : "ذخیره"}
      </button>
    </div>
  );
}
