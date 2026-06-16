import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Upload, FileBox, Loader2, Check, ArrowLeft, AlertCircle, ChevronDown, Clock, Ruler, Layers3, Box } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { StlViewer } from "@/components/StlViewer";
import { useAuth } from "@/hooks/use-auth";
import {
  parseStl, estimatePrint, formatToman, formatNumberFa, formatDurationFa,
  MATERIALS, QUALITY_PRESETS, type StlStats, type MaterialKey,
} from "@/lib/stl-parser";
import { createOrder } from "@/lib/orders.functions";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/quote")({
  head: () => ({
    meta: [
      { title: "دریافت قیمت آنی — وُکسِل‌فورج" },
      { name: "description", content: "فایل STL را آپلود کنید و قیمت واقعی چاپ سه‌بعدی را با تفکیک پوسته، اینفیل و ساپورت ببینید." },
    ],
  }),
  component: QuotePage,
});

function QuotePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createOrderFn = useServerFn(createOrder);

  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [stats, setStats] = useState<StlStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [qualityKey, setQualityKey] = useState("standard");
  const [infill, setInfill] = useState(20);
  const [material, setMaterial] = useState<MaterialKey>("PLA");
  const [support, setSupport] = useState(false);
  const [notes, setNotes] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const quality = useMemo(
    () => QUALITY_PRESETS.find((q) => q.key === qualityKey) ?? QUALITY_PRESETS[1],
    [qualityKey],
  );
  const est = useMemo(
    () => (stats ? estimatePrint(stats, { quality, infill, material, support }) : null),
    [stats, quality, infill, material, support],
  );

  const handleFile = async (f: File) => {
    setError(null);
    setStats(null);
    if (!f.name.toLowerCase().endsWith(".stl")) {
      setError("فقط فایل با پسوند .stl پشتیبانی می‌شود."); return;
    }
    if (f.size > 60 * 1024 * 1024) {
      setError("حجم فایل بیش از حد است (حداکثر ۶۰ مگابایت)."); return;
    }
    setFile(f);
    setParsing(true);
    try {
      const s = await parseStl(f);
      if (s.volumeCm3 <= 0) {
        setError("نتوانستیم حجم معتبر را محاسبه کنیم. آیا مش بسته (watertight) است؟"); return;
      }
      setStats(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در پردازش فایل STL");
    } finally {
      setParsing(false);
    }
  };

  const submitOrder = async () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!file || !stats || !est) return;
    setSubmitting(true);
    try {
      // Send the STL to the local server, which re-slices it and writes the
      // trusted price. The browser price is only a live preview.
      const fd = new FormData();
      fd.append("file", file);
      fd.append("filename", file.name);
      fd.append("infill", String(infill));
      fd.append("material", material);
      fd.append("quality", quality.key);
      fd.append("support", String(support));
      if (notes) fd.append("notes", notes);

      const res = await createOrderFn({ data: fd });
      await qc.invalidateQueries({ queryKey: ["my-orders"] });

      toast.success("سفارش ثبت شد. حالا رسید پرداخت را آپلود کنید.");
      navigate({ to: "/orders", search: { highlight: res.order.id } });
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
          <h1 className="text-4xl font-bold tracking-tight">قیمت واقعی خود را دریافت کنید</h1>
          <p className="text-muted-foreground mt-2">
            فایل STL را آپلود کنید — مدل در مرورگر شما اسلایس می‌شود و وزن واقعی بر اساس پوسته، اینفیل و ساپورت محاسبه می‌گردد. برای دیدن قیمت ثبت‌نام لازم نیست.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
          {/* Upload + preview + settings */}
          <div className="space-y-5">
            <DropZone file={file} parsing={parsing} onFile={handleFile} />
            {error && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <AlertCircle className="size-4 shrink-0 mt-0.5" /> {error}
              </div>
            )}

            {(file || parsing) && <StlViewer file={file} />}

            <div className="surface rounded-2xl p-6 space-y-5">
              {/* Quality preset */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">کیفیت چاپ</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {QUALITY_PRESETS.map((q) => (
                    <button key={q.key} onClick={() => setQualityKey(q.key)}
                      className={`rounded-lg border px-2 py-2.5 text-xs font-medium transition-all text-center ${qualityKey === q.key ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-border/80"}`}>
                      <div>{q.label}</div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{formatNumberFa(q.layerHeight, 2)}mm</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Material */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">جنس متریال</label>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {(Object.keys(MATERIALS) as MaterialKey[]).map((m) => (
                    <button key={m} onClick={() => setMaterial(m)}
                      className={`rounded-lg border px-2 py-2 text-sm font-medium transition-all ${material === m ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-border/80"}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Infill */}
              <div>
                <div className="flex items-baseline justify-between">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">درصد اینفیل</label>
                  <span className="font-mono text-sm">{formatNumberFa(infill)}٪</span>
                </div>
                <input type="range" min={10} max={100} step={5} value={infill}
                  onChange={(e) => setInfill(Number(e.target.value))}
                  className="w-full mt-3 accent-[oklch(0.86_0.16_195)]" />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1">
                  <span>سبک · ارزان‌تر</span><span>توپر · مقاوم‌تر</span>
                </div>
              </div>

              {/* Support toggle */}
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-sm font-medium">ساپورت (تکیه‌گاه)</div>
                  <div className="text-[11px] text-muted-foreground">برای قسمت‌های آویزان و اورهنگ‌دار</div>
                </div>
                <button type="button" role="switch" aria-checked={support}
                  onClick={() => setSupport((v) => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${support ? "bg-primary" : "bg-secondary"}`}>
                  <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${support ? "left-0.5" : "left-[1.375rem]"}`} />
                </button>
              </label>
              {est?.needsSupport && !support && (
                <div className="flex items-start gap-2 text-[11px] text-warning bg-warning/10 border border-warning/30 rounded-lg p-2.5">
                  <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                  این مدل اورهنگ قابل‌توجهی دارد؛ فعال‌کردن ساپورت توصیه می‌شود.
                </div>
              )}

              {/* Advanced */}
              <div>
                <button type="button" onClick={() => setAdvanced((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className={`size-3.5 transition-transform ${advanced ? "rotate-180" : ""}`} />
                  تنظیمات پیشرفته اسلایسر
                </button>
                {advanced && (
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-mono text-muted-foreground border-r-2 border-border pr-3">
                    <div>ارتفاع لایه: <span className="text-foreground">{formatNumberFa(quality.layerHeight, 2)} mm</span></div>
                    <div>دیواره: <span className="text-foreground">{formatNumberFa(quality.wallCount)} ×</span></div>
                    <div>لایه‌های رویی: <span className="text-foreground">{formatNumberFa(quality.topLayers)}</span></div>
                    <div>لایه‌های زیری: <span className="text-foreground">{formatNumberFa(quality.bottomLayers)}</span></div>
                    <div>قطر نازل: <span className="text-foreground">۰٫۴ mm</span></div>
                    <div>قطر فیلامنت: <span className="text-foreground">۱٫۷۵ mm</span></div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">توضیحات (اختیاری)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500}
                  placeholder="رنگ مورد نظر، مهلت تحویل، درخواست پس‌پردازش…"
                  className="mt-2 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            </div>
          </div>

          {/* Quote summary */}
          <div className="lg:sticky lg:top-24 self-start">
            <div className="surface rounded-2xl p-7">
              <div className="text-xs uppercase tracking-widest text-accent font-mono mb-2">قیمت زنده</div>
              <div className="text-4xl font-bold tracking-tight">{est ? formatToman(est.costToman) : "—"}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {est ? `${formatNumberFa(est.weightG, 1)} گرم فیلامنت مصرفی` : "برای دیدن قیمت یک فایل STL آپلود کنید"}
              </div>

              {est && (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <MiniStat icon={Clock} label="زمان چاپ تخمینی" value={formatDurationFa(est.printTimeMin)} />
                  <MiniStat icon={Layers3} label="طول فیلامنت" value={`${formatNumberFa(est.filamentLengthM, 1)} متر`} />
                </div>
              )}

              <div className="mt-6 space-y-3 text-sm">
                <Row label="تعداد مثلث" value={stats ? formatNumberFa(stats.triangles) : "—"} mono />
                <Row label="حجم توپر" value={stats ? `${formatNumberFa(stats.volumeCm3, 2)} cm³` : "—"} mono />
                <Row label="مساحت سطح" value={stats ? `${formatNumberFa(stats.surfaceAreaCm2, 1)} cm²` : "—"} mono />
                <Row label="ابعاد" value={stats ? `${formatNumberFa(stats.bbox.x)} × ${formatNumberFa(stats.bbox.y)} × ${formatNumberFa(stats.bbox.z)} mm` : "—"} mono icon={Ruler} />
              </div>

              {est && (
                <div className="mt-5 pt-5 border-t border-border">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono mb-3 flex items-center gap-1.5">
                    <Box className="size-3.5" /> تفکیک وزن
                  </div>
                  <WeightBar breakdown={est.breakdown} total={est.weightG} />
                  <div className="mt-3 space-y-2 text-sm">
                    <Row label="پوسته و دیواره" value={`${formatNumberFa(est.breakdown.shellG, 1)} گرم`} mono swatch="bg-primary" />
                    <Row label="اینفیل" value={`${formatNumberFa(est.breakdown.infillG, 1)} گرم`} mono swatch="bg-accent" />
                    {est.breakdown.supportG > 0 && (
                      <Row label="ساپورت" value={`${formatNumberFa(est.breakdown.supportG, 1)} گرم`} mono swatch="bg-warning" />
                    )}
                    <Row label="متریال" value={`${MATERIALS[material].label} (${MATERIALS[material].density} g/cm³)`} />
                  </div>
                </div>
              )}

              <button disabled={!est || submitting} onClick={submitOrder}
                className="mt-7 w-full rounded-lg btn-primary py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowLeft className="size-4" />}
                {user ? "ثبت سفارش و پرداخت" : "برای ثبت سفارش وارد شوید"}
              </button>
              <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                این تخمین با موتور اسلایس مدل‌سازی شده و معمولاً تا ±۱۰٪ با خروجی واقعی پرینتر تفاوت دارد. قیمت نهایی هنگام ثبت سفارش روی سرور بازمحاسبه می‌شود.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function WeightBar({ breakdown, total }: { breakdown: { shellG: number; infillG: number; supportG: number }; total: number }) {
  const t = total || 1;
  const seg = (g: number) => `${(g / t) * 100}%`;
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
      <div className="bg-primary" style={{ width: seg(breakdown.shellG) }} />
      <div className="bg-accent" style={{ width: seg(breakdown.infillG) }} />
      <div className="bg-warning" style={{ width: seg(breakdown.supportG) }} />
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="mt-1 font-semibold text-sm">{value}</div>
    </div>
  );
}

function Row({ label, value, mono, icon: Icon, swatch }: { label: string; value: string; mono?: boolean; icon?: typeof Ruler; swatch?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-2">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {swatch && <span className={`size-2.5 rounded-sm ${swatch}`} />}
        {Icon && <Icon className="size-3.5" />}
        {label}
      </span>
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
      <input type="file" accept=".stl,model/stl" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
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
          <div className="text-xs text-muted-foreground mt-1">یا برای انتخاب کلیک کنید · حداکثر ۶۰ مگابایت</div>
        </>
      )}
    </label>
  );
}
