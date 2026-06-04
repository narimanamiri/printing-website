import { Boxes } from "lucide-react";
import { BUSINESS } from "@/lib/business";

export function Footer() {
  return (
    <footer className="border-t border-border mt-32">
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Boxes className="size-4 text-primary" />
          <span>{BUSINESS.name} — چاپ سه‌بعدی دقیق و حرفه‌ای</span>
        </div>
        <div>© {new Date().toLocaleDateString("fa-IR", { year: "numeric" })} {BUSINESS.name}. تمامی حقوق محفوظ است.</div>
      </div>
    </footer>
  );
}
