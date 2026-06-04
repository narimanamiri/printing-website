import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Upload, FileBox, Loader2, Check, ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { parseStl, estimateWeight, calcCost, formatToman, formatNumberFa, MATERIAL_DENSITY, type StlStats } from "@/lib/stl-parser";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/quote")({
  head: () => ({
    meta: [
      { title: "دریافت قیمت آنی — وُکسِل‌فورج" },
      { name: "description", content: "فایل STL را آپلود کنید و قیمت چاپ سه‌بعدی را آنی ببینید." },
    ],
  }),
  component: QuotePage,
});

function QuotePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [stats, setStats] = useState<StlStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [infill, setInfill] = useState(20);
  const [material, setMaterial] = useState<keyof typeof MATERIAL_DENSITY>("PLA");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const weight = useMemo(() => stats ? estimateWeight(stats.volumeCm3, infill, material) : 0, [stats, infill, material]);
  const cost = useMemo(() => calcCost(weight), [weight]);

  const handleFile = async (f: File) => {
    setError(null);
    setStats(null);
    if (!f.name.toLowerCase().endsWith(".stl")) {
      setError("فقط فایل .stl پشتیبانی می‌شود."); return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError("حجم فایل بیش از حد است (حداکثر ۵۰ مگابایت)."); return;
    }
    setFile(f);
    setParsing(true);
    try {
      const s = await parseStl(f);
      if (s.volumeCm3 <= 0) {
        setError("نتوانستیم حجم معتبر را محاسبه کنیم. آیا مش بسته است؟"); return;
      }
      setStats(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در پردازش STL");
    } finally {
      setParsing(false);
    }
  };

  const submitOrder = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!file || !stats) return;
    setSubmitting(true);
    try {
      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("stl-uploads").upload(path, file, { contentType: "model/stl" });
      if (upErr) throw upErr;

      const { data: order, error: insErr } = await supabase
        .from("orders").insert({
          user_id: user.id,
          filename: file.name,
          file_path: path,
          volume_cm3: Number(stats.volumeCm3.toFixed(3)),
          weight_g: Number(weight.toFixed(3)),
          infill, material, notes: notes || null,
          cost_toman: cost,
          status: "pending_payment",
        }).select("id").single();
      if (insErr) throw insErr;

      toast.success("سفارش ثبت شد. حالا رسید پرداخت را آپلود کنید.");
      navigate({ to: "/orders", search: { highlight: order.id } as never });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "ثبت سفارش ناموفق بود");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        <div className="mb-10">
          <div className="text-xs uppercase tracking-widest text-primary font-mono mb-2">گام ۱ از ۲</div>
          <h1 className="text-4xl font-bold tracking-tight">قیمت آنی خود را دریافت کنید</h1>
          <p className="text-muted-foreground mt-2">فایل STL را آپلود کنید — اسلایس در مرورگر شما انجام می‌شود، برای دیدن قیمت ثبت‌نام لازم نیست.</p>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
          {/* Upload + settings */}
          <div className="space-y-5">
            <DropZone file={file} parsing={parsing} onFile={handleFile} />
            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <AlertCircle className="size-4 shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <div className="surface rounded-2xl p-6 space-y-5">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">جنس متریال</label>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {(Object.keys(MATERIAL_DENSITY) as Array<keyof typeof MATERIAL_DENSITY>).map((m) => (
                    <button key={m} onClick={() => setMaterial(m)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${material === m ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-border/80"}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">درصد اینفیل</label>
                  <span className="font-mono text-sm">{formatNumberFa(infill)}٪</span>
                </div>
                <input
                  type="range" min={10} max={100} step={5} value={infill}
                  onChange={(e) => setInfill(Number(e.target.value))}
                  className="w-full mt-3 accent-[oklch(0.86_0.16_195)]"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
                  <span>سبک · ارزان‌تر</span><span>توپر · مقاوم‌تر</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">توضیحات (اختیاری)</label>
                <textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500}
                  placeholder="رنگ مورد نظر، مهلت تحویل، درخواست پس‌پردازش…"
                  className="mt-2 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Quote summary */}
          <div className="lg:sticky lg:top-24 self-start">
            <div className="surface rounded-2xl p-7">
              <div className="text-xs uppercase tracking-widest text-accent font-mono mb-2">قیمت زنده</div>
              <div className="text-4xl font-bold tracking-tight">
                {stats ? formatToman(cost) : "—"}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {stats ? `${formatNumberFa(weight, 1)} گرم × ۳۰٬۰۰۰ تومان` : "برای دیدن قیمت یک فایل STL آپلود کنید"}
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <Row label="تعداد مثلث" value={stats ? formatNumberFa(stats.triangles) : "—"} mono />
                <Row label="حجم" value={stats ? `${formatNumberFa(stats.volumeCm3, 2)} سانتی‌متر مکعب` : "—"} mono />
                <Row label="ابعاد جعبه" value={stats ? `${formatNumberFa(stats.bbox.x)} × ${formatNumberFa(stats.bbox.y)} × ${formatNumberFa(stats.bbox.z)} میلی‌متر` : "—"} mono />
                <Row label="متریال" value={`${material} (${MATERIAL_DENSITY[material]} g/cm³)`} />
                <Row label="اینفیل" value={`${formatNumberFa(infill)}٪`} mono />
                <Row label="وزن تخمینی" value={stats ? `${formatNumberFa(weight, 1)} گرم` : "—"} mono />
              </div>

              <button
                disabled={!stats || submitting}
                onClick={submitOrder}
                className="mt-7 w-full rounded-lg btn-primary py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowLeft className="size-4" />}
                {user ? "ثبت سفارش و پرداخت" : "برای ثبت سفارش وارد شوید"}
              </button>
              <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                تخمین بر اساس هندسه است. وزن نهایی ممکن است ±۱۰٪ بسته به ساپورت و رفت تفاوت کند.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono" : ""}>{value}</span>
    </div>
  );
}

function DropZone({ file, parsing, onFile }: { file: File | null; parsing: boolean; onFile: (f: File) => void }) {
  const [drag, setDrag] = useState(false);
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`block surface rounded-2xl p-10 text-center cursor-pointer transition-all ${drag ? "border-primary glow" : "hover:border-primary/40"}`}
    >
      <input type="file" accept=".stl" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <div className="mx-auto size-14 rounded-xl bg-primary/10 grid place-items-center text-primary mb-4">
        {parsing ? <Loader2 className="size-7 animate-spin" /> : file ? <Check className="size-7" /> : <Upload className="size-7" />}
      </div>
      {file ? (
        <>
          <div className="font-semibold flex items-center justify-center gap-2"><FileBox className="size-4 text-primary" /> {file.name}</div>
          <div className="text-xs text-muted-foreground mt-1">{formatNumberFa(file.size / 1024 / 1024, 2)} مگابایت · برای انتخاب فایل دیگر کلیک کنید</div>
        </>
      ) : (
        <>
          <div className="font-semibold">فایل STL را اینجا رها کنید</div>
          <div className="text-xs text-muted-foreground mt-1">یا برای انتخاب کلیک کنید · حداکثر ۵۰ مگابایت</div>
        </>
      )}
    </label>
  );
}
