import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Upload, Calculator, CreditCard, Boxes, Sparkles, Layers, Gauge, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import hero from "@/assets/hero-printer.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "وُکسِل‌فورج — چاپ سه‌بعدی حرفه‌ای و آنی" },
      { name: "description", content: "فایل STL خود را آپلود کنید، قیمت آنی دریافت کنید (هر گرم ۳۰٬۰۰۰ تومان)، پرداخت کارت‌به‌کارت و چاپ سریع." },
      { property: "og:title", content: "وُکسِل‌فورج — چاپ سه‌بعدی حرفه‌ای" },
      { property: "og:description", content: "اسلایس آنی STL، قیمت‌گذاری شفاف، چاپ سه‌بعدی حرفه‌ای." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-16 items-center relative">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/60 backdrop-blur text-xs text-muted-foreground mb-6">
              <span className="size-1.5 rounded-full bg-primary pulse-dot" />
              در حال پذیرش سفارش — مستقر در تهران
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.15]">
              از فایل STL تا <br />
              <span className="text-gradient">قطعه نهایی</span>
              <br />در چند روز.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-lg">
              مدل خود را آپلود کنید. سیستم ما به‌صورت آنی آن را اسلایس می‌کند و قیمت را با نرخ
              <span className="text-foreground font-semibold"> هر گرم ۳۰٬۰۰۰ تومان </span>
              محاسبه می‌نماید. پس از پرداخت کارت‌به‌کارت، فایل شما مستقیماً وارد صف چاپ می‌شود.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/quote" className="inline-flex items-center gap-2 rounded-lg btn-primary px-6 py-3 text-sm">
                دریافت قیمت آنی <ArrowLeft className="size-4" />
              </Link>
              <Link to="/orders" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 backdrop-blur px-6 py-3 text-sm hover:bg-secondary transition-colors">
                پیگیری سفارش
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
              {[
                { k: "۳۰٬۰۰۰", v: "تومان / گرم" },
                { k: "≤ ۱ ساعت", v: "زمان پاسخ" },
                { k: "۰٫۱ میلی‌متر", v: "دقت لایه" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="text-2xl font-bold text-gradient">{s.k}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 bg-gradient-to-tr from-primary/20 via-transparent to-accent/20 blur-3xl" />
            <div className="relative rounded-2xl overflow-hidden surface">
              <div className="scan-line"><div className="scan-line-beam" /></div>
              <img
                src={hero}
                alt="پرینتر سه‌بعدی در حال چاپ با فیلامنت فیروزه‌ای درخشان"
                width={1536}
                height={1024}
                className="w-full h-auto object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-background to-transparent">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-primary">● زنده</span>
                  <span className="text-muted-foreground">لایه ۱۴۲ / ۳۲۰ — اینفیل ۲۴٪</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs uppercase tracking-widest text-primary font-mono mb-3">روند کار</div>
          <h2 className="text-4xl font-bold tracking-tight">سه قدم ساده. بدون رفت و برگشت.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: Upload, title: "آپلود فایل STL", desc: "فایل .stl خود را بکشید و رها کنید. تحلیل هندسی در مرورگر شما انجام می‌شود — هیچ آپلودی هنوز انجام نشده." },
            { icon: Calculator, title: "اسلایس و قیمت آنی", desc: "موتور ما حجم، وزن و هزینه را به‌صورت زنده محاسبه می‌کند. اینفیل و جنس را تنظیم کنید و قیمت را آنی ببینید." },
            { icon: CreditCard, title: "پرداخت کارت‌به‌کارت", desc: "مبلغ را کارت‌به‌کارت پرداخت کنید و رسید را آپلود کنید. پس از تأیید، فایل وارد صف چاپ می‌شود." },
          ].map((s, i) => (
            <div key={i} className="group relative surface rounded-2xl p-7 hover:border-primary/40 transition-colors">
              <div className="size-12 rounded-xl bg-primary/10 grid place-items-center mb-5 text-primary group-hover:bg-primary/20 transition-colors">
                <s.icon className="size-6" />
              </div>
              <div className="font-mono text-xs text-muted-foreground mb-1">۰{["۱","۲","۳"][i]}</div>
              <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing strip */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="surface rounded-3xl p-10 md:p-14 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 size-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 size-64 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="text-xs uppercase tracking-widest text-accent font-mono mb-3">قیمت‌گذاری</div>
              <h2 className="text-4xl font-bold tracking-tight">یک عدد. بدون هیچ سورپرایزی.</h2>
              <p className="mt-4 text-muted-foreground max-w-md">
                ما <span className="text-foreground font-semibold">هر گرم را ۳۰٬۰۰۰ تومان</span> حساب می‌کنیم —
                به‌صورت خودکار از روی هندسه مدل و اینفیل انتخابی شما.
              </p>
              <Link to="/quote" className="mt-6 inline-flex items-center gap-2 rounded-lg btn-primary px-6 py-3 text-sm">
                امتحان ماشین‌حساب <ArrowLeft className="size-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 font-mono text-sm">
              {[
                { l: "جاکلیدی کوچک (~۵ گرم)", v: "۱۵۰٬۰۰۰" },
                { l: "پایه گوشی (~۳۰ گرم)", v: "۹۰۰٬۰۰۰" },
                { l: "قطعه کاسپلی (~۱۲۰ گرم)", v: "۳٬۶۰۰٬۰۰۰" },
                { l: "ماکت بزرگ (~۴۰۰ گرم)", v: "۱۲٬۰۰۰٬۰۰۰" },
              ].map((e) => (
                <div key={e.l} className="rounded-lg border border-border bg-background/40 p-4">
                  <div className="text-xs text-muted-foreground">{e.l}</div>
                  <div className="text-lg font-semibold mt-1">{e.v} <span className="text-xs text-muted-foreground">تومان</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-4 gap-5">
          {[
            { icon: Layers, t: "تنوع متریال", d: "PLA، PETG، ABS، TPU، رزین" },
            { icon: Gauge, t: "دقت بالا", d: "ضخامت لایه تا ۰٫۱ میلی‌متر" },
            { icon: Sparkles, t: "پس‌پردازش", d: "سنباده‌زنی و رنگ‌آمیزی به درخواست" },
            { icon: ShieldCheck, t: "حریم خصوصی", d: "فایل STL فقط در حساب شما می‌ماند" },
          ].map((f) => (
            <div key={f.t} className="surface rounded-2xl p-6">
              <f.icon className="size-5 text-primary mb-3" />
              <div className="font-semibold">{f.t}</div>
              <div className="text-sm text-muted-foreground mt-1">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <Boxes className="size-10 text-primary mx-auto mb-6" />
        <h2 className="text-5xl font-bold tracking-tight">آماده چاپ هستید؟</h2>
        <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
          فایل STL خود را آپلود کنید و قیمت را در چند ثانیه ببینید. برای دیدن قیمت نیازی به ثبت‌نام نیست.
        </p>
        <Link to="/quote" className="mt-8 inline-flex items-center gap-2 rounded-lg btn-primary px-7 py-3.5 text-sm">
          دریافت قیمت من <ArrowLeft className="size-4" />
        </Link>
      </section>

      <Footer />
    </div>
  );
}
