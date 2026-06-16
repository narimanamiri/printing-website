import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldAlert, Settings as Cog, CreditCard, Ruler, Database, DownloadCloud, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { updateSettings } from "@/lib/settings.functions";
import { exportData, importData } from "@/lib/backup.functions";
import { formatNumberFa } from "@/lib/stl-parser";
import type { AppSettings } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "تنظیمات — وُکسِل‌فورج" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const current = useSettings();

  const [form, setForm] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);
  useEffect(() => { if (current && !form) setForm(structuredClone(current)); }, [current, form]);

  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 grid place-items-center px-6 py-20">
          <div className="surface rounded-2xl p-10 max-w-md text-center">
            <ShieldAlert className="size-10 text-warning mx-auto mb-4" />
            <h1 className="text-xl font-bold">دسترسی مدیریت لازم است</h1>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const saved = await updateSettings({ data: form });
      qc.setQueryData(["settings"], saved);
      toast.success("تنظیمات ذخیره شد.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const set = (patch: Partial<AppSettings>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const setBiz = (patch: Partial<AppSettings["business"]>) => setForm((f) => (f ? { ...f, business: { ...f.business, ...patch } } : f));

  const doExport = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "voxelforge-backup.json"; a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "خروجی ناموفق بود");
    }
  };

  const doImport = async (f: File) => {
    if (!confirm("بازیابی، داده‌های فعلی (کاربران و سفارش‌ها) را جایگزین می‌کند. ادامه می‌دهید؟")) return;
    try {
      const text = await f.text();
      const res = await importData({ data: { json: text } });
      await qc.invalidateQueries();
      toast.success(`بازیابی شد: ${res.users} کاربر، ${res.orders} سفارش`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "بازیابی ناموفق بود");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-accent font-mono mb-2">مدیریت</div>
          <h1 className="text-4xl font-bold tracking-tight">تنظیمات کسب‌وکار</h1>
          <p className="text-muted-foreground mt-2 text-sm">قیمت، حجم چاپ و اطلاعات پرداخت را اینجا تغییر دهید — بدون نیاز به ویرایش کد.</p>
        </div>

        {!form ? (
          <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-6">
            {/* Pricing */}
            <section className="surface rounded-2xl p-7 space-y-5">
              <div className="flex items-center gap-2 text-sm font-semibold"><Cog className="size-4 text-primary" /> قیمت‌گذاری</div>
              <div className="grid sm:grid-cols-2 gap-4">
                <NumField label="قیمت هر گرم (تومان)" value={form.pricePerGram} onChange={(v) => set({ pricePerGram: v })} />
                <NumField label="حداقل مبلغ سفارش (تومان)" value={form.minOrderToman} onChange={(v) => set({ minOrderToman: v })} />
              </div>
            </section>

            {/* Build volume */}
            <section className="surface rounded-2xl p-7 space-y-5">
              <div className="flex items-center gap-2 text-sm font-semibold"><Ruler className="size-4 text-primary" /> حجم چاپ (میلی‌متر)</div>
              <div className="grid grid-cols-3 gap-4">
                <NumField label="طول X" value={form.buildVolume.x} onChange={(v) => set({ buildVolume: { ...form.buildVolume, x: v } })} />
                <NumField label="عرض Y" value={form.buildVolume.y} onChange={(v) => set({ buildVolume: { ...form.buildVolume, y: v } })} />
                <NumField label="ارتفاع Z" value={form.buildVolume.z} onChange={(v) => set({ buildVolume: { ...form.buildVolume, z: v } })} />
              </div>
            </section>

            {/* Business / payment */}
            <section className="surface rounded-2xl p-7 space-y-5">
              <div className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="size-4 text-primary" /> اطلاعات پرداخت و تماس</div>
              <div className="grid sm:grid-cols-2 gap-4">
                <TxtField label="نام کسب‌وکار" value={form.business.name} onChange={(v) => setBiz({ name: v })} />
                <TxtField label="بانک" value={form.business.bankName} onChange={(v) => setBiz({ bankName: v })} />
                <TxtField label="شماره کارت" value={form.business.cardNumber} onChange={(v) => setBiz({ cardNumber: v })} ltr />
                <TxtField label="به نام" value={form.business.cardHolder} onChange={(v) => setBiz({ cardHolder: v })} />
                <TxtField label="شماره شبا" value={form.business.sheba} onChange={(v) => setBiz({ sheba: v })} ltr />
                <TxtField label="واتساپ" value={form.business.whatsapp} onChange={(v) => setBiz({ whatsapp: v })} ltr />
                <TxtField label="تلفن" value={form.business.phone} onChange={(v) => setBiz({ phone: v })} ltr />
                <TxtField label="آدرس" value={form.business.address} onChange={(v) => setBiz({ address: v })} />
              </div>
            </section>

            <div className="flex items-center gap-3">
              <button onClick={save} disabled={saving}
                className="rounded-lg btn-primary px-6 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-50">
                {saving && <Loader2 className="size-4 animate-spin" />} ذخیره تنظیمات
              </button>
              <span className="text-xs text-muted-foreground">قیمت هر گرم فعلی: {formatNumberFa(form.pricePerGram)} تومان</span>
            </div>

            {/* Backup / restore */}
            <section className="surface rounded-2xl p-7 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><Database className="size-4 text-primary" /> پشتیبان‌گیری داده‌ها</div>
              <p className="text-xs text-muted-foreground">چون همه‌چیز محلی و آفلاین است، مرتب از داده‌ها نسخه‌ی پشتیبان بگیرید.</p>
              <div className="flex flex-wrap gap-3">
                <button onClick={doExport}
                  className="rounded-lg border border-border hover:bg-secondary px-4 py-2.5 text-sm inline-flex items-center gap-2">
                  <DownloadCloud className="size-4" /> دانلود پشتیبان (JSON)
                </button>
                <label className="rounded-lg border border-border hover:bg-secondary px-4 py-2.5 text-sm inline-flex items-center gap-2 cursor-pointer">
                  <UploadCloud className="size-4" /> بازیابی از فایل
                  <input type="file" accept="application/json,.json" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); e.target.value = ""; }} />
                </label>
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <input type="number" value={value} dir="ltr"
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="mt-1.5 w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm font-mono outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
    </label>
  );
}

function TxtField({ label, value, onChange, ltr }: { label: string; value: string; onChange: (v: string) => void; ltr?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <input type="text" value={value} dir={ltr ? "ltr" : undefined} maxLength={160}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
    </label>
  );
}
