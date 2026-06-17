# VoxelForge Chrome Extension

Adds a floating button on **MakerWorld**, **Thingiverse** and **Printables** that:

1. finds the model's **STL or 3MF** file on the page (or takes a pasted link),
2. estimates weight, time and **price** with the *same* VoxelForge slicer engine,
3. hands the model off to your VoxelForge site and opens the order page in one click.

The site itself also shows an "install the extension" banner to users.

> فارسی: see [`README.md`](./README.md).

---

## Install (load unpacked)

The extension is not published to the Chrome Web Store, so load it manually:

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and pick the `refactored/extension` folder.
4. Click the extension icon and set your **VoxelForge site URL** in the popup
   (default `http://localhost:8088`). You can also set default material,
   infill, quality and price-per-gram there.

> For a production domain, the extension automatically registers its bridge
> content script on the URL you configured — no manual manifest edits needed.

---

## Usage

1. Open a model page on MakerWorld / Thingiverse / Printables.
2. Click the floating **"◈ قیمت چاپ"** (Print price) button, bottom-right.
3. Pick the detected STL/3MF file (or paste a link), choose material and infill,
   and click **Estimate**.
4. Click **Order on VoxelForge** — the model is transferred and the quote page
   opens. (3MF is converted to STL automatically.)

---

## How it works

| File | Role |
|---|---|
| `manifest.json` | MV3 definition, permissions, scripts |
| `slicer.js` | Standalone port of `src/lib/stl-parser.ts` (+ `positionsToStl`) |
| `parse3mf.js` | Reads a 3MF (ZIP) without a DOM/zip lib: central-directory parse + `DecompressionStream` inflate + XML mesh extraction with build/component transforms |
| `background.js` | Fetches the model (host permissions bypass page CORS), detects STL vs 3MF, estimates, and hands the model off; dynamically registers the bridge on your domain |
| `content-maker.js` / `.css` | The on-site widget (detects `.stl`/`.3mf` links or accepts a pasted URL; material/infill controls; estimate + order) |
| `content-bridge.js` | On the VoxelForge site, delivers the pending model to the page via `postMessage` |
| `popup.html/js/css` | Onboarding + settings (site URL, default material/infill/price) |

**Handoff:** the model is stored in `chrome.storage.local`; a new `/quote?import=1`
tab opens; the bridge posts it to the page with
`window.postMessage({ source: "voxelforge-ext", type: "import-stl" })`, and the
quote page loads it like a normal upload.

---

## Format support

- **STL** — binary and ASCII.
- **3MF** — ZIP entries that are stored (method 0) or deflated (method 8); mesh
  vertices/triangles with build-item and one-level component transforms
  (scale / rotation / translation). Verified against a unit cube (identical
  output to the STL path; 2× transform → 8× volume).

---

## Limitations

- Auto-detection works best when the page exposes a **direct `.stl`/`.3mf` link**
  (common on Thingiverse/Printables). Some MakerWorld pages only expose files
  behind auth — paste the link manually or download and upload on the site.
- Files are fetched with your cookies (for login-gated downloads).
- The price is an **estimate**; the final price is recomputed on the server at
  order time.
