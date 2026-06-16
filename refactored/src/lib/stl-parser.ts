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

interface MeshAccumulator {
  volume: number; // signed, mm³
  surface: number; // mm²
  vertical: number; // mm²
  horizontal: number; // mm²
  downProj: number; // mm² projected (assuming normals as computed)
  upProj: number; // mm² projected (if winding is inverted)
  min: [number, number, number];
  max: [number, number, number];
}

function emptyAcc(): MeshAccumulator {
  return {
    volume: 0,
    surface: 0,
    vertical: 0,
    horizontal: 0,
    downProj: 0,
    upProj: 0,
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
}

function addTriangle(
  acc: MeshAccumulator,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
) {
  // signed volume of tetrahedron (a,b,c,origin)
  acc.volume +=
    (ax * (by * cz - cy * bz) -
      bx * (ay * cz - cy * az) +
      cx * (ay * bz - by * az)) /
    6;

  // edges & cross product → area + normal
  const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
  const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
  const nx = e1y * e2z - e1z * e2y;
  const ny = e1z * e2x - e1x * e2z;
  const nz = e1x * e2y - e1y * e2x;
  const nLen = Math.hypot(nx, ny, nz);
  const area = nLen / 2;
  if (area > 0) {
    acc.surface += area;
    const nzUnit = nz / nLen;
    const absNz = Math.abs(nzUnit);
    if (absNz >= HORIZONTAL_NZ) acc.horizontal += area;
    else acc.vertical += area;
    // projected footprint of down-/up-facing overhangs (area × |cos to vertical|)
    if (nzUnit < OVERHANG_NZ) acc.downProj += area * absNz;
    else if (nzUnit > -OVERHANG_NZ) acc.upProj += area * absNz;
  }

  for (const [x, y, z] of [[ax, ay, az], [bx, by, bz], [cx, cy, cz]] as const) {
    if (x < acc.min[0]) acc.min[0] = x; if (x > acc.max[0]) acc.max[0] = x;
    if (y < acc.min[1]) acc.min[1] = y; if (y > acc.max[1]) acc.max[1] = y;
    if (z < acc.min[2]) acc.min[2] = z; if (z > acc.max[2]) acc.max[2] = z;
  }
}

function finalize(acc: MeshAccumulator, triangles: number): StlStats {
  // If the mesh winding is inverted, "down-facing" is actually the up-projection.
  const overhangMm2 = acc.volume >= 0 ? acc.downProj : acc.upProj;
  return {
    volumeCm3: Math.abs(acc.volume) / 1000,
    surfaceAreaCm2: acc.surface / 100,
    verticalAreaCm2: acc.vertical / 100,
    horizontalAreaCm2: acc.horizontal / 100,
    overhangAreaCm2: overhangMm2 / 100,
    triangles,
    bbox: {
      x: acc.max[0] - acc.min[0],
      y: acc.max[1] - acc.min[1],
      z: acc.max[2] - acc.min[2],
    },
  };
}

function parseBinary(buffer: ArrayBuffer): StlStats | null {
  const view = new DataView(buffer);
  if (buffer.byteLength < 84) return null;
  const triCount = view.getUint32(80, true);
  if (buffer.byteLength < 84 + triCount * 50) return null;

  const acc = emptyAcc();
  let off = 84;
  for (let i = 0; i < triCount; i++) {
    off += 12; // skip stored normal (often unreliable — we compute our own)
    const ax = view.getFloat32(off, true); const ay = view.getFloat32(off + 4, true); const az = view.getFloat32(off + 8, true);
    const bx = view.getFloat32(off + 12, true); const by = view.getFloat32(off + 16, true); const bz = view.getFloat32(off + 20, true);
    const cx = view.getFloat32(off + 24, true); const cy = view.getFloat32(off + 28, true); const cz = view.getFloat32(off + 32, true);
    off += 36 + 2; // 9 floats + attr byte count
    addTriangle(acc, ax, ay, az, bx, by, bz, cx, cy, cz);
  }
  return finalize(acc, triCount);
}

function parseAscii(text: string): StlStats | null {
  const re = /vertex\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)/g;
  const verts: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    verts.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  }
  if (verts.length === 0 || verts.length % 9 !== 0) return null;

  const acc = emptyAcc();
  const triCount = verts.length / 9;
  for (let i = 0; i < verts.length; i += 9) {
    addTriangle(
      acc,
      verts[i], verts[i + 1], verts[i + 2],
      verts[i + 3], verts[i + 4], verts[i + 5],
      verts[i + 6], verts[i + 7], verts[i + 8],
    );
  }
  return finalize(acc, triCount);
}

export async function parseStl(file: File | ArrayBuffer): Promise<StlStats> {
  const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  if (buffer.byteLength < 84) throw new Error("فایل STL ناقص یا خراب است.");

  // A valid binary STL has a body of exactly 84 + triCount*50 bytes.
  const triCountField = new DataView(buffer).getUint32(80, true);
  const looksBinary = buffer.byteLength === 84 + triCountField * 50;

  if (!looksBinary) {
    const header = new TextDecoder().decode(buffer.slice(0, 6)).trim().toLowerCase();
    if (header.startsWith("solid")) {
      const result = parseAscii(new TextDecoder().decode(buffer));
      if (result && result.triangles > 0) return result;
    }
  }
  const result = parseBinary(buffer);
  if (!result || result.triangles === 0) {
    throw new Error("نتوانستیم فایل STL را بخوانیم. مطمئن شوید فایل معتبر است.");
  }
  return result;
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

export interface PrintSettings {
  quality: QualityPreset;
  infill: number; // 0–100
  material: MaterialKey;
  support: boolean;
}

export interface PrintEstimate {
  weightG: number;
  filamentLengthM: number;
  printTimeMin: number;
  costToman: number;
  needsSupport: boolean;
  breakdown: {
    shellG: number; // walls + top/bottom skin
    infillG: number;
    supportG: number;
  };
  volumeUsedCm3: number; // material volume actually extruded
}

// The core estimator. Pure function — recompute live as the user tweaks settings.
export function estimatePrint(stats: StlStats, s: PrintSettings): PrintEstimate {
  const mat = MATERIALS[s.material] ?? MATERIALS.PLA;
  const q = s.quality;

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

  const shellG = shellVolCm3 * mat.density;
  const infillG = infillVolCm3 * mat.density;
  const supportG = supportVolCm3 * mat.density;
  const weightG = shellG + infillG + supportG;

  // Filament length (exact for a given extruded volume).
  const usedCm3 = shellVolCm3 + infillVolCm3 + supportVolCm3;
  const filamentAreaCm2 = Math.PI * (FILAMENT_DIAMETER / 20) ** 2; // (d/2 mm → cm)²·π
  const filamentLengthM = filamentAreaCm2 > 0 ? usedCm3 / filamentAreaCm2 / 100 : 0;

  // Print time ≈ extruded volume / volumetric flow, de-rated for real motion.
  const flowMm3PerS = PRINT_SPEED * LINE_WIDTH * q.layerHeight; // mm³/s
  const printTimeMin = flowMm3PerS > 0 ? (usedCm3 * 1000) / flowMm3PerS / 60 / TIME_EFFICIENCY : 0;

  const costToman = Math.ceil(weightG * PRICE_PER_GRAM_TOMAN * mat.priceFactor);

  return {
    weightG,
    filamentLengthM,
    printTimeMin,
    costToman,
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
