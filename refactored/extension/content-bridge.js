/* Runs on the VoxelForge site. If the extension stored a pending STL import
   (from a maker site), hand it to the page via postMessage and clear it. */
(function () {
  "use strict";
  function deliver() {
    chrome.storage.local.get("vf_pending_import", function (data) {
      var p = data && data.vf_pending_import;
      if (!p || !p.base64) return;
      // Stale guard: ignore handoffs older than 5 minutes.
      if (p.at && Date.now() - p.at > 5 * 60 * 1000) {
        chrome.storage.local.remove("vf_pending_import");
        return;
      }
      window.postMessage(
        {
          source: "voxelforge-ext",
          type: "import-stl",
          filename: p.filename,
          base64: p.base64,
          material: p.material,
          quality: p.quality,
          infill: p.infill,
        },
        window.location.origin
      );
      chrome.storage.local.remove("vf_pending_import");
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", deliver);
  } else {
    deliver();
  }
})();
