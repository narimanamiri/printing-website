// Pure-JS STL parser. Supports binary and ASCII STL. Returns volume in cm³
// using the signed tetrahedron volume sum method.

export interface StlStats {
  volumeCm3: number;
  triangles: number;
  bbox: { x: number; y: number; z: number }; // mm
}

function parseBinary(buffer: ArrayBuffer): StlStats | null {
  const view = new DataView(buffer);
  if (buffer.byteLength < 84) return null;
  const triCount = view.getUint32(80, true);
  if (buffer.byteLength < 84 + triCount * 50) return null;

  let volume = 0;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  let off = 84;
  for (let i = 0; i < triCount; i++) {
    off += 12; // skip normal
    const v1x = view.getFloat32(off, true); off += 4;
    const v1y = view.getFloat32(off, true); off += 4;
    const v1z = view.getFloat32(off, true); off += 4;
    const v2x = view.getFloat32(off, true); off += 4;
    const v2y = view.getFloat32(off, true); off += 4;
    const v2z = view.getFloat32(off, true); off += 4;
    const v3x = view.getFloat32(off, true); off += 4;
    const v3y = view.getFloat32(off, true); off += 4;
    const v3z = view.getFloat32(off, true); off += 4;
    off += 2; // attr

    // signed volume of tetrahedron with apex at origin
    volume +=
      (v1x * (v2y * v3z - v3y * v2z) -
        v2x * (v1y * v3z - v3y * v1z) +
        v3x * (v1y * v2z - v2y * v1z)) /
      6;

    if (v1x < minX) minX = v1x; if (v1x > maxX) maxX = v1x;
    if (v2x < minX) minX = v2x; if (v2x > maxX) maxX = v2x;
    if (v3x < minX) minX = v3x; if (v3x > maxX) maxX = v3x;
    if (v1y < minY) minY = v1y; if (v1y > maxY) maxY = v1y;
    if (v2y < minY) minY = v2y; if (v2y > maxY) maxY = v2y;
    if (v3y < minY) minY = v3y; if (v3y > maxY) maxY = v3y;
    if (v1z < minZ) minZ = v1z; if (v1z > maxZ) maxZ = v1z;
    if (v2z < minZ) minZ = v2z; if (v2z > maxZ) maxZ = v2z;
    if (v3z < minZ) minZ = v3z; if (v3z > maxZ) maxZ = v3z;
  }

  const volMm3 = Math.abs(volume);
  return {
    volumeCm3: volMm3 / 1000,
    triangles: triCount,
    bbox: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
  };
}

function parseAscii(text: string): StlStats | null {
  const verts: number[] = [];
  const re = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    verts.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  }
  if (verts.length === 0 || verts.length % 9 !== 0) return null;

  let volume = 0;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  const triCount = verts.length / 9;
  for (let i = 0; i < verts.length; i += 9) {
    const [v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z] = verts.slice(i, i + 9);
    volume +=
      (v1x * (v2y * v3z - v3y * v2z) -
        v2x * (v1y * v3z - v3y * v1z) +
        v3x * (v1y * v2z - v2y * v1z)) /
      6;
    for (const [x, y, z] of [[v1x, v1y, v1z], [v2x, v2y, v2z], [v3x, v3y, v3z]]) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
  }
  const volMm3 = Math.abs(volume);
  return {
    volumeCm3: volMm3 / 1000,
    triangles: triCount,
    bbox: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
  };
}

export async function parseStl(file: File): Promise<StlStats> {
  const buffer = await file.arrayBuffer();
  // Detect ASCII: starts with "solid" and no binary triangle count match
  const header = new TextDecoder().decode(buffer.slice(0, 5)).toLowerCase();
  const triCountField = buffer.byteLength >= 84 ? new DataView(buffer).getUint32(80, true) : 0;
  const expectedBinarySize = 84 + triCountField * 50;
  const looksBinary = buffer.byteLength === expectedBinarySize;

  if (!looksBinary && header === "solid") {
    const text = new TextDecoder().decode(buffer);
    const result = parseAscii(text);
    if (result) return result;
  }
  const result = parseBinary(buffer);
  if (!result) throw new Error("Could not parse STL file. Make sure it's a valid STL.");
  return result;
}

// Density of common 3D-printing materials in g/cm³
export const MATERIAL_DENSITY: Record<string, number> = {
  PLA: 1.24,
  PETG: 1.27,
  ABS: 1.04,
  TPU: 1.21,
  Resin: 1.15,
};

// Estimate printed weight in grams given solid volume, infill %, material.
// Model: shells ~15% of volume always solid, interior scales with infill.
export function estimateWeight(
  volumeCm3: number,
  infillPercent: number,
  material: keyof typeof MATERIAL_DENSITY = "PLA",
): number {
  const density = MATERIAL_DENSITY[material] ?? 1.24;
  const factor = 0.15 + (infillPercent / 100) * 0.85;
  return volumeCm3 * density * factor;
}

export const PRICE_PER_GRAM_TOMAN = 30000;

export function calcCost(weightG: number): number {
  return Math.ceil(weightG * PRICE_PER_GRAM_TOMAN);
}

export function formatToman(n: number): string {
  return new Intl.NumberFormat("en-US").format(n) + " Toman";
}
