const DEFAULTS = { siteUrl: "http://localhost:8088", material: "PLA", quality: "standard", infill: 20, pricePerGram: 30000 };
const $ = (id) => document.getElementById(id);
const faNum = (n) => new Intl.NumberFormat("fa-IR").format(n);

async function load() {
  const s = { ...DEFAULTS, ...(await chrome.storage.sync.get(DEFAULTS)) };
  $("siteUrl").value = s.siteUrl;
  $("material").value = s.material;
  $("quality").value = s.quality;
  $("infill").value = s.infill;
  $("iv").textContent = faNum(s.infill) + "٪";
  $("pricePerGram").value = s.pricePerGram;
}

$("infill").addEventListener("input", (e) => { $("iv").textContent = faNum(+e.target.value) + "٪"; });

$("save").addEventListener("click", async () => {
  let url = $("siteUrl").value.trim() || DEFAULTS.siteUrl;
  url = url.replace(/\/+$/, "");
  await chrome.storage.sync.set({
    siteUrl: url,
    material: $("material").value,
    quality: $("quality").value,
    infill: Math.max(10, Math.min(100, +$("infill").value || 20)),
    pricePerGram: Math.max(0, +$("pricePerGram").value || 0),
  });
  const m = $("msg"); m.hidden = false; setTimeout(() => (m.hidden = true), 1500);
});

$("open").addEventListener("click", async () => {
  const s = { ...DEFAULTS, ...(await chrome.storage.sync.get(DEFAULTS)) };
  chrome.tabs.create({ url: s.siteUrl.replace(/\/+$/, "") + "/quote" });
});

load();
