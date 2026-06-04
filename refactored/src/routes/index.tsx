import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Upload, Calculator, CreditCard, Boxes, Sparkles, Layers, Gauge, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import hero from "@/assets/hero-printer.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VoxelForge — Precision 3D Printing on Demand" },
      { name: "description", content: "Upload your STL file, get an instant quote at 30,000 Toman/gram, and we print and ship it. Fast, transparent, professional." },
      { property: "og:title", content: "VoxelForge — Precision 3D Printing on Demand" },
      { property: "og:description", content: "Instant STL slicing, transparent pricing, professional 3D printing." },
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
              Now accepting orders — Tehran-based
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
              From STL to <br />
              <span className="text-gradient">finished part</span>
              <br />in days.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-lg">
              Upload your model, our engine slices it instantly and quotes you at
              <span className="text-foreground font-semibold"> 30,000 Toman per gram</span>.
              Pay, and your file goes straight to the print queue.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/quote" className="inline-flex items-center gap-2 rounded-lg btn-primary px-6 py-3 text-sm">
                Get instant quote <ArrowRight className="size-4" />
              </Link>
              <Link to="/orders" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 backdrop-blur px-6 py-3 text-sm hover:bg-secondary transition-colors">
                Track an order
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
              {[
                { k: "30k", v: "Toman / gram" },
                { k: "≤ 1h", v: "Quote turnaround" },
                { k: "0.1mm", v: "Layer precision" },
              ].map((s) => (
                <div key={s.k}>
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
                alt="3D printer extruding glowing cyan filament onto a print bed"
                width={1536}
                height={1024}
                className="w-full h-auto object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-background to-transparent">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-primary">● LIVE</span>
                  <span className="text-muted-foreground">Layer 142 / 320 — 24% infill</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs uppercase tracking-widest text-primary font-mono mb-3">Workflow</div>
          <h2 className="text-4xl font-bold tracking-tight">Three steps. No back-and-forth.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: Upload, title: "Upload your STL", desc: "Drag in any .stl file. We parse the geometry in your browser — no uploads to anywhere yet." },
            { icon: Calculator, title: "Instant slice & quote", desc: "Our slicer estimates volume, weight, and cost in real time. Adjust infill & material to see live pricing." },
            { icon: CreditCard, title: "Pay & we print", desc: "Pay via bank transfer, upload your receipt. Once confirmed, your file moves straight to the print queue." },
          ].map((s, i) => (
            <div key={i} className="group relative surface rounded-2xl p-7 hover:border-primary/40 transition-colors">
              <div className="size-12 rounded-xl bg-primary/10 grid place-items-center mb-5 text-primary group-hover:bg-primary/20 transition-colors">
                <s.icon className="size-6" />
              </div>
              <div className="font-mono text-xs text-muted-foreground mb-1">0{i + 1}</div>
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
              <div className="text-xs uppercase tracking-widest text-accent font-mono mb-3">Pricing</div>
              <h2 className="text-4xl font-bold tracking-tight">One number. Zero surprises.</h2>
              <p className="mt-4 text-muted-foreground max-w-md">
                We charge <span className="text-foreground font-semibold">30,000 Toman per gram</span> of printed material —
                calculated automatically from your model's geometry and chosen infill.
              </p>
              <Link to="/quote" className="mt-6 inline-flex items-center gap-2 rounded-lg btn-primary px-6 py-3 text-sm">
                Try the calculator <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 font-mono text-sm">
              {[
                { l: "Small keychain (~5g)", v: "150,000" },
                { l: "Phone stand (~30g)", v: "900,000" },
                { l: "Cosplay piece (~120g)", v: "3,600,000" },
                { l: "Large prop (~400g)", v: "12,000,000" },
              ].map((e) => (
                <div key={e.l} className="rounded-lg border border-border bg-background/40 p-4">
                  <div className="text-xs text-muted-foreground">{e.l}</div>
                  <div className="text-lg font-semibold mt-1">{e.v} <span className="text-xs text-muted-foreground">Toman</span></div>
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
            { icon: Layers, t: "Multi-material", d: "PLA, PETG, ABS, TPU, Resin" },
            { icon: Gauge, t: "Fine resolution", d: "Down to 0.1mm layer height" },
            { icon: Sparkles, t: "Post-processing", d: "Sanding, painting on request" },
            { icon: ShieldCheck, t: "File privacy", d: "Your STL stays in your account" },
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
        <h2 className="text-5xl font-bold tracking-tight">Ready to print?</h2>
        <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
          Drop in your STL and see your quote in seconds. No signup required to get a price.
        </p>
        <Link to="/quote" className="mt-8 inline-flex items-center gap-2 rounded-lg btn-primary px-7 py-3.5 text-sm">
          Get my quote <ArrowRight className="size-4" />
        </Link>
      </section>

      <Footer />
    </div>
  );
}
