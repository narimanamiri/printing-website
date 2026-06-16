import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Upload, Loader2, FileBox, Clock, Check, Hammer, PackageCheck, XCircle, AlertCircle, Copy, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { listMyOrders, uploadReceipt } from "@/lib/orders.functions";
import { formatToman, formatNumberFa, formatDurationFa } from "@/lib/stl-parser";
import { BUSINESS } from "@/lib/business";
import type { OrderDTO } from "@/lib/types";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "سفارش‌های من — وُکسِل‌فورج" },
      { name: "description", content: "پیگیری سفارش‌های چاپ سه‌بعدی شما." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { highlight?: string } => ({
    highlight: typeof search.highlight === "string" ? search.highlight : undefined,
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { highlight } = Route.useSearch();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => (await listMyOrders()).orders,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary font-mono mb-2">سفارش‌های شما</div>
            <h1 className="text-4xl font-bold tracking-tight">پیگیری و پرداخت</h1>
          </div>
          <Link to="/quote" className="rounded-lg btn-primary px-5 py-2.5 text-sm">سفارش جدید</Link>
        </div>

        {isLoading || loading ? (
          <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : !orders || orders.length === 0 ? (
          <div className="surface rounded-2xl p-16 text-center">
            <FileBox className="size-10 text-muted-foreground mx-auto mb-4" />
            <div className="font-semibold text-lg">هنوز سفارشی ندارید</div>
            <p className="text-sm text-muted-foreground mt-1">برای شروع یک فایل STL آپلود کنید.</p>
            <Link to="/quote" className="mt-6 inline-flex rounded-lg btn-primary px-5 py-2.5 text-sm">دریافت قیمت</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} highlighted={o.id === highlight} onChanged={() => qc.invalidateQueries({ queryKey: ["my-orders"] })} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

const STATUS_META: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending_payment: { label: "در انتظار پرداخت", icon: Clock, color: "text-warning" },
  awaiting_confirmation: { label: "در انتظار تأیید", icon: AlertCircle, color: "text-accent" },
  confirmed: { label: "تأیید شده", icon: Check, color: "text-primary" },
  printing: { label: "در حال چاپ", icon: Hammer, color: "text-primary" },
  completed: { label: "تکمیل شده", icon: PackageCheck, color: "text-success" },
  cancelled: { label: "لغو شده", icon: XCircle, color: "text-destructive" },
};

function OrderCard({ order, highlighted, onChanged }: { order: OrderDTO; highlighted?: boolean; onChanged: () => void }) {
  const [uploading, setUploading] = useState(false);
  const uploadReceiptFn = useServerFn(uploadReceipt);
  const meta = STATUS_META[order.status] ?? STATUS_META.pending_payment;
  const Icon = meta.icon;
  const pp = order.printParams;

  const doUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("orderId", order.id);
      await uploadReceiptFn({ data: fd });
      toast.success("رسید آپلود شد. به‌زودی تأیید می‌کنیم.");
      onChanged();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "آپلود ناموفق بود");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`surface rounded-2xl p-6 transition-all ${highlighted ? "glow border-primary" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileBox className="size-4 text-primary" />
            <span className="font-semibold truncate">{order.filename}</span>
          </div>
          <div className="text-xs text-muted-foreground font-mono mt-1">
            #{order.id.slice(0, 8)} · {new Date(order.createdAt).toLocaleString("fa-IR")}
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-sm ${meta.color} font-medium`}>
          <Icon className="size-4" /> {meta.label}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 text-sm">
        <Stat label="متریال" value={order.material} />
        <Stat label="اینفیل" value={`${formatNumberFa(order.infill)}٪`} />
        <Stat label="وزن" value={`${formatNumberFa(order.weightG, 1)} گرم`} />
        <Stat label="هزینه" value={formatToman(order.costToman)} highlight />
      </div>

      {pp && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-mono">
          {pp.printTimeMin != null && <span>⏱ {formatDurationFa(pp.printTimeMin)}</span>}
          {pp.filamentLengthM != null && <span>🧵 {formatNumberFa(pp.filamentLengthM, 1)} متر</span>}
          {pp.bbox && <span>📐 {formatNumberFa(pp.bbox.x)}×{formatNumberFa(pp.bbox.y)}×{formatNumberFa(pp.bbox.z)} mm</span>}
          {pp.layerHeight != null && <span>▦ لایه {formatNumberFa(pp.layerHeight, 2)}mm</span>}
          {pp.support && <span>⛰ ساپورت</span>}
        </div>
      )}

      {order.notes && <p className="mt-4 text-xs text-muted-foreground border-r-2 border-border pr-3">{order.notes}</p>}
      {order.adminNotes && <p className="mt-3 text-xs text-primary border-r-2 border-primary pr-3">از کارگاه: {order.adminNotes}</p>}

      {order.status === "pending_payment" && (
        <PaymentBlock amount={order.costToman} uploading={uploading} onUpload={doUpload} />
      )}

      {order.status === "awaiting_confirmation" && (
        <div className="mt-5 pt-5 border-t border-border text-xs text-muted-foreground">
          رسید دریافت شد. پرداخت بررسی و فایل شما وارد صف چاپ خواهد شد.
        </div>
      )}
    </div>
  );
}

function PaymentBlock({ amount, uploading, onUpload }: { amount: number; uploading: boolean; onUpload: (f: File) => void }) {
  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text.replace(/[-\s]/g, ""));
    toast.success(`${label} کپی شد`);
  };

  const toFa = (s: string) => s.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
  const cardGroups = BUSINESS.cardNumber.replace(/\D/g, "").match(/.{1,4}/g) ?? [];

  return (
    <div className="mt-6 pt-6 border-t border-border">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="size-4 text-primary" />
        <span className="text-sm font-semibold">پرداخت کارت‌به‌کارت</span>
      </div>

      <div className="relative mx-auto max-w-md">
        <div className="absolute -inset-1 bg-gradient-to-tr from-primary/40 via-accent/30 to-primary/40 blur-xl rounded-3xl" />
        <div
          dir="ltr"
          className="relative rounded-2xl p-6 text-white overflow-hidden"
          style={{
            background: "linear-gradient(135deg, oklch(0.30 0.08 250) 0%, oklch(0.20 0.06 260) 50%, oklch(0.28 0.10 220) 100%)",
            boxShadow: "0 20px 60px -20px oklch(0.30 0.10 240 / 0.7), inset 0 1px 0 0 rgba(255,255,255,0.1)",
          }}
        >
          <div className="absolute -top-16 -right-16 size-48 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 -left-20 size-56 rounded-full bg-white/[0.03]" />

          <div className="flex items-center justify-between mb-8">
            <div className="w-12 h-9 rounded-md bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 relative overflow-hidden">
              <div className="absolute inset-1 border border-yellow-700/30 rounded-sm grid grid-cols-3 grid-rows-3 gap-px p-px">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="bg-yellow-700/20" />
                ))}
              </div>
            </div>
            <div className="text-right" dir="rtl">
              <div className="text-[10px] uppercase tracking-widest opacity-70">بانک</div>
              <div className="text-sm font-semibold">{BUSINESS.bankName}</div>
            </div>
          </div>

          <div className="font-mono text-2xl tracking-[0.2em] text-center mb-6 select-all">
            {cardGroups.map((g, i) => (
              <span key={i} className="inline-block mx-1">{toFa(g)}</span>
            ))}
          </div>

          <div className="flex items-end justify-between" dir="rtl">
            <div>
              <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">به نام</div>
              <div className="text-sm font-semibold">{BUSINESS.cardHolder}</div>
            </div>
            <div className="text-left" dir="ltr">
              <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1 text-right">CVV2 / PIN2</div>
              <div className="text-sm font-mono opacity-80">●●●● / ●●●●</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <button type="button" onClick={() => copy(BUSINESS.cardNumber, "شماره کارت")}
            className="flex items-center justify-center gap-2 rounded-lg border border-border bg-secondary/60 hover:bg-secondary px-3 py-2.5 text-xs font-medium transition-colors">
            <Copy className="size-3.5" /> کپی شماره کارت
          </button>
          <button type="button" onClick={() => copy(String(amount), "مبلغ")}
            className="flex items-center justify-center gap-2 rounded-lg btn-primary px-3 py-2.5 text-xs">
            <Copy className="size-3.5" /> کپی مبلغ
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-border bg-background/60 p-4 space-y-3 text-sm">
        <Detail label="مبلغ قابل پرداخت" value={formatToman(amount)} highlight onCopy={() => copy(String(amount), "مبلغ")} />
        <Detail label="شماره شبا" value={BUSINESS.sheba} mono onCopy={() => copy(BUSINESS.sheba, "شماره شبا")} />
      </div>

      <ol className="mt-5 space-y-2 text-xs text-muted-foreground list-none">
        {[
          "مبلغ دقیق سفارش را به شماره کارت بالا کارت‌به‌کارت کنید.",
          "از صفحه تأیید پرداخت (یا پیامک بانک) عکس/اسکرین‌شات بگیرید.",
          "رسید را از طریق دکمه زیر آپلود کنید تا سفارش وارد صف چاپ شود.",
        ].map((t, i) => (
          <li key={i} className="flex gap-2">
            <span className="shrink-0 size-5 rounded-full bg-primary/15 text-primary grid place-items-center font-bold text-[10px]">{toFa(String(i + 1))}</span>
            <span>{t}</span>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex justify-center">
        <label className="inline-flex items-center gap-2 rounded-lg btn-primary px-5 py-2.5 text-sm cursor-pointer">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          آپلود رسید پرداخت
          <input type="file" accept="image/*,application/pdf" className="hidden" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
        </label>
      </div>
    </div>
  );
}

function Detail({ label, value, mono, highlight, onCopy }: { label: string; value: string; mono?: boolean; highlight?: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`truncate ${mono ? "font-mono" : ""} ${highlight ? "text-gradient font-bold text-base" : "font-semibold"}`}>
          {value}
        </span>
        <button onClick={onCopy} className="shrink-0 p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <Copy className="size-3.5" />
        </button>
      </div>
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
