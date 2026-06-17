/* VoxelForge extension — background service worker.
   - Fetches model STL files (host_permissions bypass page CORS).
   - Estimates price with the bundled slicer.
   - Hands a model off to the VoxelForge site (stored, then opened). */
importScripts("slicer.js");

const DEFAULTS = {
  siteUrl: "http://localhost:8088",
  material: "PLA",
  quality: "standard",
  infill: 20,
  pricePerGram: 30000,
};

async function getSettings() {
  const s = await chrome.storage.sync.get(DEFAULTS);
  return { ...DEFAULTS, ...s };
}

async function fetchStl(url) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("دانلود فایل ناموفق بود (" + res.status + ")");
  const buf = await res.arrayBuffer();
  if (buf.byteLength < 84) throw new Error("فایل خیلی کوچک/نامعتبر است.");
  return buf;
}

function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

// Dynamically register the bridge on the user's configured site (besides the
// static localhost match) so the handoff works on any deployed domain.
async function registerBridge(siteUrl) {
  try {
    const origin = new URL(siteUrl).origin;
    const pattern = origin + "/*";
    const existing = await chrome.scripting.getRegisteredContentScripts({ ids: ["vf-bridge"] }).catch(() => []);
    if (existing && existing.length) await chrome.scripting.unregisterContentScripts({ ids: ["vf-bridge"] });
    if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(origin)) return; // already static
    await chrome.scripting.registerContentScripts([{
      id: "vf-bridge",
      matches: [pattern],
      js: ["content-bridge.js"],
      runAt: "document_start",
    }]);
  } catch (e) { /* invalid url or perms — ignore */ }
}

chrome.runtime.onInstalled.addListener(async () => {
  const s = await getSettings();
  registerBridge(s.siteUrl);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.siteUrl) registerBridge(changes.siteUrl.newValue);
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      const settings = await getSettings();
      if (msg.type === "estimate") {
        const buf = await fetchStl(msg.url);
        const stats = self.VFSlicer.parse(buf);
        const est = self.VFSlicer.estimate(stats, {
          material: msg.material || settings.material,
          quality: msg.quality || settings.quality,
          infill: msg.infill != null ? msg.infill : settings.infill,
          pricePerGram: settings.pricePerGram,
        });
        sendResponse({ ok: true, stats, est });
      } else if (msg.type === "order") {
        const buf = await fetchStl(msg.url);
        const base64 = bufToBase64(buf);
        await chrome.storage.local.set({
          vf_pending_import: {
            filename: msg.filename || "model.stl",
            base64,
            material: msg.material || settings.material,
            quality: msg.quality || settings.quality,
            infill: msg.infill != null ? msg.infill : settings.infill,
            at: Date.now(),
          },
        });
        await chrome.tabs.create({ url: settings.siteUrl.replace(/\/+$/, "") + "/quote?import=1" });
        sendResponse({ ok: true });
      } else if (msg.type === "getSettings") {
        sendResponse({ ok: true, settings });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e && e.message ? e.message : String(e) });
    }
  })();
  return true; // async
});
