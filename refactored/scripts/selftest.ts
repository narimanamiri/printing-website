// Offline self-test for the slicer engine. Run with:
//   node --experimental-strip-types scripts/selftest.ts
import { parseStl, estimatePrint, QUALITY_PRESETS, MATERIALS } from "../src/lib/stl-parser.ts";

// Build a binary STL of an axis-aligned cube [0,S]^3 (12 triangles, outward CCW).
function cubeStl(S: number): ArrayBuffer {
  const tris: number[][] = [];
  const v = (x: number, y: number, z: number) => [x, y, z];
  const quad = (a: number[], b: number[], c: number[], d: number[]) => {
    tris.push([...a, ...b, ...c], [...a, ...c, ...d]);
  };
  const p = [
    v(0, 0, 0), v(S, 0, 0), v(S, S, 0), v(0, S, 0), // bottom z=0
    v(0, 0, S), v(S, 0, S), v(S, S, S), v(0, S, S), // top z=S
  ];
  quad(p[0], p[3], p[2], p[1]); // bottom (normal -z)
  quad(p[4], p[5], p[6], p[7]); // top (+z)
  quad(p[0], p[1], p[5], p[4]); // front (-y)
  quad(p[2], p[3], p[7], p[6]); // back (+y)
  quad(p[1], p[2], p[6], p[5]); // right (+x)
  quad(p[3], p[0], p[4], p[7]); // left (-x)

  const buf = new ArrayBuffer(84 + tris.length * 50);
  const dv = new DataView(buf);
  dv.setUint32(80, tris.length, true);
  let off = 84;
  for (const t of tris) {
    off += 12; // zero normal
    for (let i = 0; i < 9; i++) { dv.setFloat32(off, t[i], true); off += 4; }
    off += 2;
  }
  return buf;
}

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
}

const S = 20;
const stats = await parseStl(cubeStl(S));
check("triangles = 12", stats.triangles === 12, String(stats.triangles));
check("volume = 8 cm³", Math.abs(stats.volumeCm3 - 8) < 0.01, `${stats.volumeCm3}`);
check("surface area = 24 cm²", Math.abs(stats.surfaceAreaCm2 - 24) < 0.05, `${stats.surfaceAreaCm2}`);
check("bbox = 20×20×20", stats.bbox.x === S && stats.bbox.y === S && stats.bbox.z === S,
  `${stats.bbox.x}×${stats.bbox.y}×${stats.bbox.z}`);
check("vertical area = 16 cm² (4 walls)", Math.abs(stats.verticalAreaCm2 - 16) < 0.05, `${stats.verticalAreaCm2}`);
check("horizontal area = 8 cm² (top+bottom)", Math.abs(stats.horizontalAreaCm2 - 8) < 0.05, `${stats.horizontalAreaCm2}`);

const standard = QUALITY_PRESETS.find((q) => q.key === "standard")!;
const est = estimatePrint(stats, { quality: standard, infill: 20, material: "PLA", support: false });
console.log(`\nCube 20mm · standard · 20% · PLA → weight ${est.weightG.toFixed(2)} g, ` +
  `cost ${est.costToman} T, filament ${est.filamentLengthM.toFixed(2)} m, time ${Math.round(est.printTimeMin)} min`);
console.log(`   breakdown: shell ${est.breakdown.shellG.toFixed(2)} g, infill ${est.breakdown.infillG.toFixed(2)} g, support ${est.breakdown.supportG.toFixed(2)} g`);

// Sanity bounds — a hollow 20mm cube at 20% in a real slicer is ~3.5–6 g.
check("weight in realistic range (3–7 g)", est.weightG > 3 && est.weightG < 7, `${est.weightG.toFixed(2)} g`);
check("shell dominates at low infill", est.breakdown.shellG > est.breakdown.infillG);
check("cost = ceil(weight × 30000 × priceFactor)",
  est.costToman === Math.ceil(est.weightG * 30000 * MATERIALS.PLA.priceFactor));
check("filament length positive", est.filamentLengthM > 0);
check("print time positive", est.printTimeMin > 0);

// Higher infill must increase weight; solid (100%) must approach material mass.
const solid = estimatePrint(stats, { quality: standard, infill: 100, material: "PLA", support: false });
check("100% infill heavier than 20%", solid.weightG > est.weightG, `${solid.weightG.toFixed(2)} vs ${est.weightG.toFixed(2)}`);
check("100% infill ≈ solid cube mass (~9.9 g)", Math.abs(solid.weightG - 8 * MATERIALS.PLA.density) < 0.5,
  `${solid.weightG.toFixed(2)} g`);

// Material density affects weight.
const petg = estimatePrint(stats, { quality: standard, infill: 20, material: "PETG", support: false });
check("PETG differs from PLA", Math.abs(petg.weightG - est.weightG) > 0.01);

console.log(`\n${failures === 0 ? "ALL PASSED ✅" : `${failures} FAILED ❌`}`);
process.exit(failures === 0 ? 0 : 1);
