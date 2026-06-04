import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Boxes } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "ورود — وُکسِل‌فورج" },
      { name: "description", content: "وارد حساب خود شوید یا ثبت‌نام کنید تا سفارش چاپ سه‌بعدی ثبت نمایید." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/quote" });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/quote`,
            data: { full_name: fullName, phone },
          },
        });
        if (error) throw error;
        toast.success("حساب شما ساخته شد! خوش آمدید.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("خوش برگشتید.");
      }
      navigate({ to: "/quote" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "ورود ناموفق بود");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-6 py-12 bg-grid">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="size-10 rounded-lg btn-primary grid place-items-center">
            <Boxes className="size-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tight">وُکسِل<span className="text-gradient">فورج</span></span>
        </Link>

        <div className="surface rounded-2xl p-8">
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "signup" ? "ساخت حساب کاربری" : "خوش برگشتید"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signup" ? "در چند دقیقه چاپ را شروع کنید." : "برای مدیریت سفارش‌ها وارد شوید."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <Field label="نام و نام خانوادگی" value={fullName} onChange={setFullName} required />
                <Field label="شماره تماس" type="tel" value={phone} onChange={setPhone} required />
              </>
            )}
            <Field label="ایمیل" type="email" value={email} onChange={setEmail} required />
            <Field label="رمز عبور" type="password" value={password} onChange={setPassword} required minLength={6} />

            <button
              type="submit" disabled={submitting}
              className="w-full rounded-lg btn-primary py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "لطفاً صبر کنید…" : mode === "signup" ? "ساخت حساب" : "ورود"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "signup" ? "حساب کاربری دارید؟ وارد شوید" : "حساب کاربری ندارید؟ ثبت‌نام کنید"}
          </button>
        </div>
      </div>
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
        dir={type === "email" || type === "password" ? "ltr" : "rtl"}
        className="mt-1.5 w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
      />
    </label>
  );
}
