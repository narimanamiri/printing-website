import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { User, Lock, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { updateProfile, changePassword } from "@/lib/profile.functions";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "حساب من — وُکسِل‌فورج" },
      { name: "description", content: "ویرایش مشخصات حساب و تغییر رمز عبور." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) { setFullName(user.fullName); setPhone(user.phone); }
  }, [user]);

  if (!user) return null;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await updateProfile({ data: { fullName, phone } });
      qc.setQueryData(["me"], res.user);
      toast.success("مشخصات ذخیره شد.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "ذخیره ناموفق بود");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) { toast.error("رمز جدید و تکرارش یکسان نیستند."); return; }
    setSavingPw(true);
    try {
      await changePassword({ data: { current, next } });
      toast.success("رمز عبور تغییر کرد.");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "تغییر رمز ناموفق بود");
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto px-6 py-12 w-full">
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-primary font-mono mb-2">حساب کاربری</div>
          <h1 className="text-4xl font-bold tracking-tight">حساب من</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span dir="ltr">{user.email}</span>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 text-primary"><Shield className="size-3.5" /> مدیر</span>
            )}
          </div>
        </div>

        {/* Profile */}
        <form onSubmit={saveProfile} className="surface rounded-2xl p-7 space-y-5">
          <div className="flex items-center gap-2 text-sm font-semibold"><User className="size-4 text-primary" /> مشخصات</div>
          <Field label="نام و نام خانوادگی" value={fullName} onChange={setFullName} required />
          <Field label="شماره تماس" type="tel" value={phone} onChange={setPhone} required />
          <button type="submit" disabled={savingProfile}
            className="rounded-lg btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-50">
            {savingProfile && <Loader2 className="size-4 animate-spin" />} ذخیره مشخصات
          </button>
        </form>

        {/* Password */}
        <form onSubmit={savePassword} className="surface rounded-2xl p-7 space-y-5 mt-6">
          <div className="flex items-center gap-2 text-sm font-semibold"><Lock className="size-4 text-primary" /> تغییر رمز عبور</div>
          <Field label="رمز عبور فعلی" type="password" value={current} onChange={setCurrent} required />
          <Field label="رمز عبور جدید" type="password" value={next} onChange={setNext} required minLength={6} />
          <Field label="تکرار رمز جدید" type="password" value={confirm} onChange={setConfirm} required minLength={6} />
          <button type="submit" disabled={savingPw}
            className="rounded-lg btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-50">
            {savingPw && <Loader2 className="size-4 animate-spin" />} تغییر رمز
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, minLength }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; minLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        required={required} minLength={minLength}
        dir={type === "password" ? "ltr" : undefined}
        className="mt-1.5 w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
      />
    </label>
  );
}
