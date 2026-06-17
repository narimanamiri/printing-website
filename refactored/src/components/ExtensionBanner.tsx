import { useEffect, useState } from "react";
import { Chrome, X } from "lucide-react";

const KEY = "vf_ext_banner_dismissed";
const INSTALL_URL = "https://github.com/narimanamiri/printing-website/tree/main/refactored/extension";

// Suggests installing the Chrome extension so users get instant quotes while
// browsing MakerWorld / Thingiverse / Printables. Dismissible (persisted).
export function ExtensionBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try { setShow(localStorage.getItem(KEY) !== "1"); } catch { setShow(true); }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    setShow(false);
  };

  return (
    <div className="surface rounded-2xl p-4 mb-6 flex items-center gap-3 border-primary/30">
      <div className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
        <Chrome className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">افزونه‌ی کروم وُکسِل‌فورج را نصب کنید</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          روی MakerWorld، Thingiverse و Printables قیمت چاپ را آنی ببینید و با یک کلیک سفارش دهید.
        </div>
      </div>
      <a href={INSTALL_URL} target="_blank" rel="noreferrer"
        className="shrink-0 rounded-lg btn-primary px-4 py-2 text-xs">راهنمای نصب</a>
      <button onClick={dismiss} aria-label="بستن" className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
        <X className="size-4" />
      </button>
    </div>
  );
}
