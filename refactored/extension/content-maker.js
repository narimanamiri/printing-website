/* VoxelForge widget injected on MakerWorld / Thingiverse / Printables.
   Finds STL links, estimates the print price, and orders on VoxelForge. */
(function () {
  "use strict";
  if (window.__vfInjected) return;
  window.__vfInjected = true;

  var V = window.VFSlicer;

  // ---- find candidate STL urls on the page -------------------------------
  function findStlUrls() {
    var set = new Set();
    document.querySelectorAll("a[href]").forEach(function (a) {
      var h = a.href || "";
      if (/\.stl(\?|#|$)/i.test(h)) set.add(h);
    });
    // also scan raw HTML for .stl urls (lazy/JSON-embedded links)
    try {
      var re = /https?:\/\/[^\s"'<>]+\.stl(\?[^\s"'<>]*)?/gi, m;
      var html = document.documentElement.innerHTML;
      while ((m = re.exec(html)) !== null) set.add(m[0]);
    } catch (e) {}
    return Array.from(set);
  }

  function fileNameFromUrl(u) {
    try {
      var p = new URL(u).pathname.split("/").pop() || "model.stl";
      return decodeURIComponent(p).replace(/[^\w.\-]+/g, "_") || "model.stl";
    } catch (e) { return "model.stl"; }
  }

  function send(msg) {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage(msg, function (res) { resolve(res || { ok: false, error: "no response" }); });
    });
  }

  // ---- UI -----------------------------------------------------------------
  var panel, launcher;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function buildLauncher() {
    launcher = el("button", "vf-launcher", "◈ قیمت چاپ");
    launcher.title = "وُکسِل‌فورج — تخمین قیمت چاپ سه‌بعدی";
    launcher.addEventListener("click", togglePanel);
    document.body.appendChild(launcher);
  }

  function materialOptions(sel) {
    return Object.keys(V.MATERIALS).map(function (k) {
      return '<option value="' + k + '"' + (k === sel ? " selected" : "") + ">" + k + "</option>";
    }).join("");
  }

  function buildPanel(settings) {
    panel = el("div", "vf-panel");
    var urls = findStlUrls();
    var urlOptions = urls.length
      ? urls.map(function (u) { return '<option value="' + u + '">' + fileNameFromUrl(u) + "</option>"; }).join("")
      : "";

    panel.innerHTML =
      '<div class="vf-head"><span class="vf-logo">◈ وُکسِل‌فورج</span>' +
      '<button class="vf-x" title="بستن">×</button></div>' +
      '<div class="vf-body">' +
      (urls.length
        ? '<label class="vf-l">فایل STL یافته‌شده (' + V.formatFa(urls.length) + ')</label>' +
          '<select class="vf-url">' + urlOptions + "</select>"
        : '<div class="vf-note">روی این صفحه فایل STL مستقیم پیدا نشد. لینک فایل STL را بچسبانید یا سایت را باز کنید.</div>') +
      '<label class="vf-l">یا لینک STL</label>' +
      '<input class="vf-manual" type="text" placeholder="https://…/model.stl" />' +
      '<div class="vf-row">' +
      '<div><label class="vf-l">متریال</label><select class="vf-mat">' + materialOptions(settings.material) + "</select></div>" +
      '<div><label class="vf-l">اینفیل: <span class="vf-iv">' + V.formatFa(settings.infill) + "٪</span></label>" +
      '<input class="vf-infill" type="range" min="10" max="100" step="5" value="' + settings.infill + '" /></div>' +
      "</div>" +
      '<button class="vf-estimate">تخمین قیمت</button>' +
      '<div class="vf-result" hidden></div>' +
      '<div class="vf-actions" hidden>' +
      '<button class="vf-order">سفارش در وُکسِل‌فورج</button>' +
      "</div>" +
      '<button class="vf-open">باز کردن وُکسِل‌فورج</button>' +
      "</div>";

    document.body.appendChild(panel);

    var q = function (s) { return panel.querySelector(s); };
    q(".vf-x").addEventListener("click", togglePanel);
    q(".vf-infill").addEventListener("input", function (e) { q(".vf-iv").textContent = V.formatFa(+e.target.value) + "٪"; });

    function chosenUrl() {
      var manual = q(".vf-manual").value.trim();
      if (manual) return manual;
      var sel = q(".vf-url");
      return sel ? sel.value : "";
    }
    function opts() {
      return { material: q(".vf-mat").value, infill: +q(".vf-infill").value, quality: settings.quality };
    }

    q(".vf-estimate").addEventListener("click", async function () {
      var url = chosenUrl();
      var res = q(".vf-result"), act = q(".vf-actions");
      if (!url) { res.hidden = false; res.className = "vf-result vf-err"; res.textContent = "ابتدا یک فایل/لینک STL انتخاب کنید."; return; }
      res.hidden = false; res.className = "vf-result"; res.textContent = "در حال محاسبه…"; act.hidden = true;
      var r = await send({ type: "estimate", url: url, material: opts().material, infill: opts().infill, quality: opts().quality });
      if (!r.ok) { res.className = "vf-result vf-err"; res.textContent = r.error || "خطا در تخمین."; return; }
      var e = r.est;
      res.className = "vf-result";
      res.innerHTML =
        '<div class="vf-price">' + V.formatToman(e.costToman) + "</div>" +
        '<div class="vf-sub">' + V.formatFa(e.weightG, 1) + " گرم · " + V.formatFa(e.printTimeMin / 60, 1) + " ساعت · " +
        V.formatFa(r.stats.bbox.x) + "×" + V.formatFa(r.stats.bbox.y) + "×" + V.formatFa(r.stats.bbox.z) + " mm</div>" +
        (e.needsSupport ? '<div class="vf-warn">این مدل احتمالاً به ساپورت نیاز دارد.</div>' : "");
      act.hidden = false;
    });

    q(".vf-order").addEventListener("click", async function () {
      var url = chosenUrl();
      if (!url) return;
      var btn = q(".vf-order"); btn.disabled = true; btn.textContent = "در حال انتقال…";
      var r = await send({ type: "order", url: url, filename: fileNameFromUrl(url), material: opts().material, infill: opts().infill, quality: opts().quality });
      if (!r.ok) { btn.disabled = false; btn.textContent = "سفارش در وُکسِل‌فورج"; alert("خطا: " + (r.error || "")); return; }
      btn.textContent = "✓ منتقل شد";
    });

    q(".vf-open").addEventListener("click", function () {
      window.open(settings.siteUrl.replace(/\/+$/, "") + "/quote", "_blank");
    });
  }

  async function togglePanel() {
    if (panel) { panel.remove(); panel = null; return; }
    var r = await send({ type: "getSettings" });
    buildPanel((r && r.settings) || { material: "PLA", quality: "standard", infill: 20, siteUrl: "http://localhost:8088" });
  }

  if (document.body) buildLauncher();
  else window.addEventListener("DOMContentLoaded", buildLauncher);
})();
