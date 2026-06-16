// Pure-JS STL parser + physically-based print estimator ("slicer engine").
//
// The estimator mirrors how a real slicer (Cura / PrusaSlicer) decides how much
// filament a part needs: it does NOT treat the part as a uniform blob scaled by
// infill. Instead it splits the model into:
//   • perimeter walls   — a shell of thickness (wallCount × lineWidth) wrapped
//                         around every (near-)vertical face,
//   • top / bottom skin — solid layers on every (near-)horizontal face,
//   • infill            — the hollow interior, filled to the chosen density,
//   • support           — material printed under steep overhangs.
// This tracks real slicer output far better than `volume × density × infill`.

export interface StlStats {
  volumeCm3: number; // solid volume of the watertight mesh
  surfaceAreaCm2: number; // total surface area
  verticalAreaCm2: number; // area of near-vertical faces  → perimeter walls
  horizontalAreaCm2: number; // area of near-horizontal faces → top/bottom skin
  overhangAreaCm2: number; // projected footprint of steep down-facing overhangs
  triangles: number;
  bbox: { x: number; y: number; z: number }; // mm
}

// Classification thresholds (on the unit normal's z component).
const HORIZONTAL_NZ = Math.cos((45 * Math.PI) / 180); // |nz| ≥ 0.707 → top/bottom skin
const OVERHANG_NZ = -0.5; // nz < -0.5 (face tilts >30° below horizontal) → needs support

// How the part is placed on the bed: uniform scale + Euler rotation (degrees).
// Rotating/scaling changes which faces overhang and the bounding box, so the
// estimate updates live as the user reorients the model.
export interface Orient {
  scale: number; // 1 = original size
  rotXDeg: number;
  rotYDeg: number;
  rotZDeg: number;
}
export const IDENTITY_ORIENT: Orient = { scale: 1, rotXDeg: 0, rotYDeg: 0, rotZDeg: 0 };

// ── Geometry parsing: return raw triangle positions (9 floats / triangle) ──
function parsePositionsBinary(buffer: ArrayBuffer): Float32Array | null {
  const view = new DataView(buffer);
  if (buffer.byteLength < 84) return null;
  const triCount = view.getUint32(80, true);
  if (buffer.byteLength < 84 + triCount * 50) return null;
  const out = new Float32Array(triCount * 9);
  let off = 84;
  for (let i = 0; i < triCount; i++) {
    off += 12; // skip stored normal
    for (let j = 0; j < 9; j++) { out[i * 9 + j] = view.getFloat32(off, true); off += 4; }
    off += 2; // attr byte count
  }
  return out;
}

function parsePositionsAscii(text: string): Float32Array | null {
  const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;
  const verts: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) verts.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  if (verts.length === 0 || verts.length % 9 !== 0) return null;
  return new Float32Array(verts);
}

// Parse an STL into a flat positions array. Reused by the estimator AND the 3D
// viewer so a model is only read once.
export async function parseGeometry(file: File | ArrayBuffer): Promise<Float32Array> {
  const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  if (buffer.byteLength < 84) throw new Error("فایل STL ناقص یا خراب است.");
  const triCountField = new DataView(buffer).getUint32(80, true);
  const looksBinary = buffer.byteLength === 84 + triCountField * 50;
  if (!looksBinary) {
    const header = new TextDecoder().decode(buffer.slice(0, 6)).trim().toLowerCase();
    if (header.startsWith("solid")) {
      const pos = parsePositionsAscii(new TextDecoder().decode(buffer));
      if (pos && pos.length > 0) return pos;
    }
  }
  const pos = parsePositionsBinary(buffer);
  if (!pos || pos.length === 0) throw new Error("نتوانستیم فایل STL را بخوانیم. مطمئن شوید فایل معتبر است.");
  return pos;
}

// Apply scale + Euler rotation (X then Y then Z) to a positions array.
export function applyOrient(pos: Float32Array, o: Orient): Float32Array {
  if (o.scale === 1 && o.rotXDeg === 0 && o.rotYDeg === 0 && o.rotZDeg === 0) return pos;
  const s = o.scale;
  const rx = (o.rotXDeg * Math.PI) / 180, ry = (o.rotYDeg * Math.PI) / 180, rz = (o.rotZDeg * Math.PI) / 180;
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  const out = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    const x = pos[i] * s, y = pos[i + 1] * s, z = pos[i + 2] * s;
    // Rx
    const y1 = y * cx - z * sx, z1 = y * sx + z * cx;
    // Ry
    const x2 = x * cy + z1 * sy, z2 = -x * sy + z1 * cy;
    // Rz
    const x3 = x2 * cz - y1 * sz, y3 = x2 * sz + y1 * cz;
    out[i] = x3; out[i + 1] = y3; out[i + 2] = z2;
  }
  return out;
}

// Compute slicer stats from positions, applying the orientation in one pass.
export function statsFromGeometry(pos: Float32Array, o: Orient = IDENTITY_ORIENT): StlStats {
  const triCount = Math.floor(pos.length / 9);
  const s = o.scale;
  const rx = (o.rotXDeg * Math.PI) / 180, ry = (o.rotYDeg * Math.PI) / 180, rz = (o.rotZDeg * Math.PI) / 180;
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);
  const xf = (x0: number, y0: number, z0: number): [number, number, number] => {
    const x = x0 * s, y = y0 * s, z = z0 * s;
    const y1 = y * cx - z * sx, z1 = y * sx + z * cx;
    const x2 = x * cy + z1 * sy, z2 = -x * sy + z1 * cy;
    return [x2 * cz - y1 * sz, x2 * sz + y1 * cz, z2];
  };

  let volume = 0, surface = 0, vertical = 0, horizontal = 0, downProj = 0, upProj = 0;
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < triCount * 9; i += 9) {
    const [ax, ay, az] = xf(pos[i], pos[i + 1], pos[i + 2]);
    const [bx, by, bz] = xf(pos[i + 3], pos[i + 4], pos[i + 5]);
    const [ccx, ccy, ccz] = xf(pos[i + 6], pos[i + 7], pos[i + 8]);

    volume += (ax * (by * ccz - ccy * bz) - bx * (ay * ccz - ccy * az) + ccx * (ay * bz - by * az)) / 6;

    const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
    const e2x = ccx - ax, e2y = ccy - ay, e2z = ccz - az;
    const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const nLen = Math.hypot(nx, ny, nz);
    const area = nLen / 2;
    if (area > 0) {
      surface += area;
      const nzUnit = nz / nLen, absNz = Math.abs(nzUnit);
      if (absNz >= HORIZONTAL_NZ) horizontal += area; else vertical += area;
      if (nzUnit < OVERHANG_NZ) downProj += area * absNz;
      else if (nzUnit > -OVERHANG_NZ) upProj += area * absNz;
    }
    if (ax < minX) minX = ax; if (ax > maxX) maxX = ax;
    if (bx < minX) minX = bx; if (bx > maxX) maxX = bx;
    if (ccx < minX) minX = ccx; if (ccx > maxX) maxX = ccx;
    if (ay < minY) minY = ay; if (ay > maxY) maxY = ay;
    if (by < minY) minY = by; if (by > maxY) maxY = by;
    if (ccy < minY) minY = ccy; if (ccy > maxY) maxY = ccy;
    if (az < minZ) minZ = az; if (az > maxZ) maxZ = az;
    if (bz < minZ) minZ = bz; if (bz > maxZ) maxZ = bz;
    if (ccz < minZ) minZ = ccz; if (ccz > maxZ) maxZ = ccz;
  }

  const overhangMm2 = volume >= 0 ? downProj : upProj;
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

export async function parseStl(file: File | ArrayBuffer, o: Orient = IDENTITY_ORIENT): Promise<StlStats> {
  const pos = await parseGeometry(file);
  return statsFromGeometry(pos, o);
}

// ───────────────────────── Material library ─────────────────────────
// Density g/cm³ (filament), pricePerGram multiplier relative to PLA baseline.
export interface MaterialSpec {
  density: number;
  label: string;
  priceFactor: number; // some materials cost more per gram
}

export const MATERIALS = {
  PLA: { density: 1.24, label: "PLA", priceFactor: 1.0 },
  PETG: { density: 1.27, label: "PETG", priceFactor: 1.15 },
  ABS: { density: 1.04, label: "ABS", priceFactor: 1.1 },
  TPU: { density: 1.21, label: "TPU (انعطاف‌پذیر)", priceFactor: 1.6 },
  Resin: { density: 1.15, label: "رزین", priceFactor: 1.8 },
} satisfies Record<string, MaterialSpec>;

export type MaterialKey = keyof typeof MATERIALS;

// Back-compat: a plain density map (older imports used this name).
export const MATERIAL_DENSITY: Record<MaterialKey, number> = Object.fromEntries(
  Object.entries(MATERIALS).map(([k, v]) => [k, v.density]),
) as Record<MaterialKey, number>;

// ───────────────────────── Quality presets ─────────────────────────
// Each preset fixes the shell geometry the way a slicer profile would.
export interface QualityPreset {
  key: string;
  label: string;
  layerHeight: number; // mm
  wallCount: number;
  topLayers: number;
  bottomLayers: number;
}

export const QUALITY_PRESETS: QualityPreset[] = [
  { key: "draft", label: "پیش‌نویس · سریع", layerHeight: 0.28, wallCount: 2, topLayers: 3, bottomLayers: 3 },
  { key: "standard", label: "استاندارد", layerHeight: 0.2, wallCount: 3, topLayers: 4, bottomLayers: 4 },
  { key: "fine", label: "دقیق · صاف", layerHeight: 0.12, wallCount: 4, topLayers: 5, bottomLayers: 5 },
];

// Fixed machine/material constants of the workshop's printers.
const NOZZLE_DIAMETER = 0.4; // mm
const LINE_WIDTH = 0.42; // mm extrusion width
const FILAMENT_DIAMETER = 1.75; // mm
const PRINT_SPEED = 50; // mm/s nominal
const TIME_EFFICIENCY = 0.42; // de-rates for travel, accel, retraction, first layers
const SUPPORT_DENSITY = 0.15;
const SUPPORT_HEIGHT_FRACTION = 0.5; // supports span ~half the height under an overhang

export const PRICE_PER_GRAM_TOMAN = 30000;
// Minimum charge per order (setup/handling) — tiny parts can't cost peanuts.
export const MIN_ORDER_TOMAN = 50000;
// The workshop's printable build volume in mm (an i3-class machine).
export const BUILD_VOLUME = { x: 250, y: 210, z: 210 };

type Vec3 = { x: number; y: number; z: number };

// Does the part fit on the bed (allowing free rotation)? Compares sorted dims.
export function fitsBuildVolume(bbox: Vec3, bv: Vec3 = BUILD_VOLUME): boolean {
  const m = [bbox.x, bbox.y, bbox.z].sort((a, b) => a - b);
  const b = [bv.x, bv.y, bv.z].sort((a, b) => a - b);
  return m[0] <= b[0] && m[1] <= b[1] && m[2] <= b[2];
}

export interface PrintSettings {
  quality: QualityPreset;
  infill: number; // 0–100
  material: MaterialKey;
  support: boolean;
  quantity?: number; // number of copies (default 1)
  pricePerGram?: number; // overrides the default (from business settings)
  minOrderToman?: number;
  buildVolume?: Vec3;
}

export interface PrintEstimate {
  weightG: number; // total for all copies
  filamentLengthM: number; // total
  printTimeMin: number; // total
  costToman: number; // total (after minimum-order floor)
  unitCostToman: number; // price of a single copy (before floor)
  quantity: number;
  minApplied: boolean; // true if the minimum-order floor was applied
  fitsBuildVolume: boolean;
  needsSupport: boolean;
  breakdown: {
    shellG: number; // walls + top/bottom skin (total)
    infillG: number; // total
    supportG: number; // total
  };
  volumeUsedCm3: number; // material volume actually extruded (total)
}

// The core estimator. Pure function — recompute live as the user tweaks settings.
export function estimatePrint(stats: StlStats, s: PrintSettings): PrintEstimate {
  const mat = MATERIALS[s.material] ?? MATERIALS.PLA;
  const q = s.quality;
  const qty = Math.max(1, Math.floor(s.quantity ?? 1));

  const wallThicknessCm = (q.wallCount * LINE_WIDTH) / 10; // mm → cm
  const skinThicknessCm = (((q.topLayers + q.bottomLayers) / 2) * q.layerHeight) / 10;

  // Shell = walls over vertical faces + solid skin over horizontal faces.
  let shellVolCm3 = stats.verticalAreaCm2 * wallThicknessCm + stats.horizontalAreaCm2 * skinThicknessCm;
  // A small/thin part can't have more shell than it has volume.
  shellVolCm3 = Math.min(shellVolCm3, stats.volumeCm3);

  const interiorCm3 = Math.max(0, stats.volumeCm3 - shellVolCm3);
  const infillVolCm3 = interiorCm3 * (s.infill / 100);

  const needsSupport = stats.overhangAreaCm2 > 0.5; // >0.5 cm² of real overhang
  const bboxZcm = stats.bbox.z / 10;
  const supportVolCm3 = s.support
    ? stats.overhangAreaCm2 * bboxZcm * SUPPORT_HEIGHT_FRACTION * SUPPORT_DENSITY
    : 0;

  // Per-unit masses, then scale everything by the number of copies.
  const shellG = shellVolCm3 * mat.density * qty;
  const infillG = infillVolCm3 * mat.density * qty;
  const supportG = supportVolCm3 * mat.density * qty;
  const weightG = shellG + infillG + supportG;

  // Filament length (exact for a given extruded volume).
  const usedCm3 = (shellVolCm3 + infillVolCm3 + supportVolCm3) * qty;
  const filamentAreaCm2 = Math.PI * (FILAMENT_DIAMETER / 20) ** 2; // (d/2 mm → cm)²·π
  const filamentLengthM = filamentAreaCm2 > 0 ? usedCm3 / filamentAreaCm2 / 100 : 0;

  // Print time ≈ extruded volume / volumetric flow, de-rated for real motion.
  const flowMm3PerS = PRINT_SPEED * LINE_WIDTH * q.layerHeight; // mm³/s
  const printTimeMin = flowMm3PerS > 0 ? (usedCm3 * 1000) / flowMm3PerS / 60 / TIME_EFFICIENCY : 0;

  const price = s.pricePerGram ?? PRICE_PER_GRAM_TOMAN;
  const minOrder = s.minOrderToman ?? MIN_ORDER_TOMAN;
  const unitWeightG = weightG / qty;
  const unitCostToman = Math.ceil(unitWeightG * price * mat.priceFactor);
  const rawCost = unitCostToman * qty;
  const costToman = Math.max(rawCost, minOrder);

  return {
    weightG,
    filamentLengthM,
    printTimeMin,
    costToman,
    unitCostToman,
    quantity: qty,
    minApplied: costToman > rawCost,
    fitsBuildVolume: fitsBuildVolume(stats.bbox, s.buildVolume),
    needsSupport,
    breakdown: { shellG, infillG, supportG },
    volumeUsedCm3: usedCm3,
  };
}

// Back-compat helper (kept for any older import). Prefer estimatePrint().
export function estimateWeight(volumeCm3: number, infillPercent: number, material: MaterialKey = "PLA"): number {
  const density = MATERIALS[material]?.density ?? 1.24;
  return volumeCm3 * density * (0.15 + (infillPercent / 100) * 0.85);
}

export function calcCost(weightG: number, priceFactor = 1): number {
  return Math.ceil(weightG * PRICE_PER_GRAM_TOMAN * priceFactor);
}

// ───────────────────────── Persian formatting ─────────────────────────
export function formatToman(n: number): string {
  return new Intl.NumberFormat("fa-IR").format(Math.round(n)) + " تومان";
}

export function formatNumberFa(n: number, digits = 0): string {
  return new Intl.NumberFormat("fa-IR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function formatDurationFa(minutes: number): string {
  if (!isFinite(minutes) || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${formatNumberFa(m)} دقیقه`;
  if (m === 0) return `${formatNumberFa(h)} ساعت`;
  return `${formatNumberFa(h)} ساعت و ${formatNumberFa(m)} دقیقه`;
}

export { NOZZLE_DIAMETER };
