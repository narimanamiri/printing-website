/* VoxelForge slicer engine — standalone port of src/lib/stl-parser.ts.
   Classic script: exposes globalThis.VFSlicer. Used by both the content script
   and the background service worker (via importScripts). Keep in sync with the
   site's engine. */
(function (root) {
  "use strict";

  var HORIZONTAL_NZ = Math.cos((45 * Math.PI) / 180); // top/bottom skin
  var OVERHANG_NZ = -0.5; // needs support

  var MATERIALS = {
    PLA: { density: 1.24, label: "PLA", priceFactor: 1.0 },
    PETG: { density: 1.27, label: "PETG", priceFactor: 1.15 },
    ABS: { density: 1.04, label: "ABS", priceFactor: 1.1 },
    TPU: { density: 1.21, label: "TPU", priceFactor: 1.6 },
    Resin: { density: 1.15, label: "Resin", priceFactor: 1.8 },
  };

  var QUALITY_PRESETS = {
    draft: { layerHeight: 0.28, wallCount: 2, topLayers: 3, bottomLayers: 3 },
    standard: { layerHeight: 0.2, wallCount: 3, topLayers: 4, bottomLayers: 4 },
    fine: { layerHeight: 0.12, wallCount: 4, topLayers: 5, bottomLayers: 5 },
  };

  var LINE_WIDTH = 0.42, FILAMENT_DIAMETER = 1.75, PRINT_SPEED = 50, TIME_EFFICIENCY = 0.42;
  var SUPPORT_DENSITY = 0.15, SUPPORT_HEIGHT_FRACTION = 0.5;
  var DEFAULT_PRICE_PER_GRAM = 30000, DEFAULT_MIN_ORDER = 50000;

  function parsePositions(buffer) {
    if (buffer.byteLength < 84) return null;
    var view = new DataView(buffer);
    var triCount = view.getUint32(80, true);
    var looksBinary = buffer.byteLength === 84 + triCount * 50;
    if (looksBinary) {
      var out = new Float32Array(triCount * 9), off = 84;
      for (var i = 0; i < triCount; i++) {
        off += 12;
        for (var j = 0; j < 9; j++) { out[i * 9 + j] = view.getFloat32(off, true); off += 4; }
        off += 2;
      }
      return out;
    }
    // ASCII
    var text = new TextDecoder().decode(buffer);
    if (text.trim().slice(0, 5).toLowerCase() !== "solid") return null;
    var re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g, verts = [], m;
    while ((m = re.exec(text)) !== null) verts.push(+m[1], +m[2], +m[3]);
    if (verts.length === 0 || verts.length % 9 !== 0) return null;
    return new Float32Array(verts);
  }

  function statsFromGeometry(pos) {
    var triCount = Math.floor(pos.length / 9);
    var volume = 0, surface = 0, vertical = 0, horizontal = 0, downProj = 0, upProj = 0;
    var minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (var i = 0; i < triCount * 9; i += 9) {
      var ax = pos[i], ay = pos[i + 1], az = pos[i + 2];
      var bx = pos[i + 3], by = pos[i + 4], bz = pos[i + 5];
      var cx = pos[i + 6], cy = pos[i + 7], cz = pos[i + 8];
      volume += (ax * (by * cz - cy * bz) - bx * (ay * cz - cy * az) + cx * (ay * bz - by * az)) / 6;
      var e1x = bx - ax, e1y = by - ay, e1z = bz - az;
      var e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
      var nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      var nLen = Math.hypot(nx, ny, nz), area = nLen / 2;
      if (area > 0) {
        surface += area;
        var nzU = nz / nLen, absNz = Math.abs(nzU);
        if (absNz >= HORIZONTAL_NZ) horizontal += area; else vertical += area;
        if (nzU < OVERHANG_NZ) downProj += area * absNz;
        else if (nzU > -OVERHANG_NZ) upProj += area * absNz;
      }
      if (ax < minX) minX = ax; if (ax > maxX) maxX = ax; if (bx < minX) minX = bx; if (bx > maxX) maxX = bx; if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
      if (ay < minY) minY = ay; if (ay > maxY) maxY = ay; if (by < minY) minY = by; if (by > maxY) maxY = by; if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
      if (az < minZ) minZ = az; if (az > maxZ) maxZ = az; if (bz < minZ) minZ = bz; if (bz > maxZ) maxZ = bz; if (cz < minZ) minZ = cz; if (cz > maxZ) maxZ = cz;
    }
    var overhangMm2 = volume >= 0 ? downProj : upProj;
    return {
      volumeCm3: Math.abs(volume) / 1000,
      surfaceAreaCm2: surface / 100,
      verticalAreaCm2: vertical / 100,
      horizontalAreaCm2: horizontal / 100,
      overhangAreaCm2: overhangMm2 / 100,
      triangles: triCount,
      bbox: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
    };
  }

  function parse(buffer) {
    var pos = parsePositions(buffer);
    if (!pos || pos.length === 0) throw new Error("فایل STL خوانده نشد.");
    return statsFromGeometry(pos);
  }

  function estimate(stats, opts) {
    opts = opts || {};
    var mat = MATERIALS[opts.material] || MATERIALS.PLA;
    var q = QUALITY_PRESETS[opts.quality] || QUALITY_PRESETS.standard;
    var infill = opts.infill != null ? opts.infill : 20;
    var support = !!opts.support;
    var qty = Math.max(1, Math.floor(opts.quantity || 1));
    var price = opts.pricePerGram || DEFAULT_PRICE_PER_GRAM;
    var minOrder = opts.minOrderToman != null ? opts.minOrderToman : DEFAULT_MIN_ORDER;

    var wallCm = (q.wallCount * LINE_WIDTH) / 10;
    var skinCm = (((q.topLayers + q.bottomLayers) / 2) * q.layerHeight) / 10;
    var shellVol = Math.min(stats.verticalAreaCm2 * wallCm + stats.horizontalAreaCm2 * skinCm, stats.volumeCm3);
    var interior = Math.max(0, stats.volumeCm3 - shellVol);
    var infillVol = interior * (infill / 100);
    var bboxZcm = stats.bbox.z / 10;
    var supportVol = support ? stats.overhangAreaCm2 * bboxZcm * SUPPORT_HEIGHT_FRACTION * SUPPORT_DENSITY : 0;

    var shellG = shellVol * mat.density * qty;
    var infillG = infillVol * mat.density * qty;
    var supportG = supportVol * mat.density * qty;
    var weightG = shellG + infillG + supportG;
    var usedCm3 = (shellVol + infillVol + supportVol) * qty;
    var filArea = Math.PI * Math.pow(FILAMENT_DIAMETER / 20, 2);
    var filamentLengthM = filArea > 0 ? usedCm3 / filArea / 100 : 0;
    var flow = PRINT_SPEED * LINE_WIDTH * q.layerHeight;
    var printTimeMin = flow > 0 ? (usedCm3 * 1000) / flow / 60 / TIME_EFFICIENCY : 0;
    var unitCost = Math.ceil((weightG / qty) * price * mat.priceFactor);
    var costToman = Math.max(unitCost * qty, minOrder);

    return {
      weightG: weightG, filamentLengthM: filamentLengthM, printTimeMin: printTimeMin,
      unitCostToman: unitCost, costToman: costToman, quantity: qty,
      needsSupport: stats.overhangAreaCm2 > 0.5,
      breakdown: { shellG: shellG, infillG: infillG, supportG: supportG },
    };
  }

  // Write a binary STL from a flat positions array (9 floats / triangle). Used
  // to hand a parsed 3MF mesh to the site as a normal STL upload.
  function positionsToStl(pos) {
    var triCount = Math.floor(pos.length / 9);
    var buf = new ArrayBuffer(84 + triCount * 50);
    var dv = new DataView(buf);
    dv.setUint32(80, triCount, true);
    var off = 84;
    for (var i = 0; i < triCount * 9; i += 9) {
      var ax = pos[i], ay = pos[i + 1], az = pos[i + 2];
      var bx = pos[i + 3], by = pos[i + 4], bz = pos[i + 5];
      var cx = pos[i + 6], cy = pos[i + 7], cz = pos[i + 8];
      var nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
      var ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
      var nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      var nl = Math.hypot(nx, ny, nz) || 1;
      dv.setFloat32(off, nx / nl, true); dv.setFloat32(off + 4, ny / nl, true); dv.setFloat32(off + 8, nz / nl, true);
      off += 12;
      var v = [ax, ay, az, bx, by, bz, cx, cy, cz];
      for (var k = 0; k < 9; k++) { dv.setFloat32(off, v[k], true); off += 4; }
      off += 2;
    }
    return buf;
  }

  function formatToman(n) { return new Intl.NumberFormat("fa-IR").format(Math.round(n)) + " تومان"; }
  function formatFa(n, d) { return new Intl.NumberFormat("fa-IR", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }).format(n); }

  root.VFSlicer = {
    parse: parse,
    parsePositions: parsePositions,
    statsFromGeometry: statsFromGeometry,
    positionsToStl: positionsToStl,
    estimate: estimate,
    MATERIALS: MATERIALS,
    QUALITY_PRESETS: QUALITY_PRESETS,
    formatToman: formatToman,
    formatFa: formatFa,
    DEFAULT_PRICE_PER_GRAM: DEFAULT_PRICE_PER_GRAM,
  };
})(typeof self !== "undefined" ? self : this);
