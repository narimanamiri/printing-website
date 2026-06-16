import { useEffect, useRef, useState } from "react";
import { Loader2, Move3d } from "lucide-react";

// Lightweight, dependency-free STL preview. Takes already-oriented triangle
// positions and renders them on a 2D canvas with orthographic projection, flat
// Lambert shading, back-face culling and a painter's-algorithm depth sort.
// Drag to rotate the camera; idle auto-rotation. Overhang faces are highlighted.
// Huge meshes are sampled for smoothness.

const MAX_RENDER_TRIS = 16000;

interface Prepared {
  tris: Float32Array; // centered + scaled, possibly sampled
  overhang: Uint8Array; // 1 = face needs support (steep down-facing in print)
  count: number;
}

// Same overhang rule as the slicer engine (normal tilts >30° below horizontal).
const OVERHANG_NZ = -0.5;

function prepare(raw: Float32Array): Prepared | null {
  const total = raw.length / 9;
  if (total === 0) return null;

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let signedVol = 0;
  for (let i = 0; i < raw.length; i += 3) {
    const x = raw[i], y = raw[i + 1], z = raw[i + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
  const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
  const scale = 1.7 / span;

  const step = total > MAX_RENDER_TRIS ? Math.ceil(total / MAX_RENDER_TRIS) : 1;
  const count = Math.ceil(total / step);
  const tris = new Float32Array(count * 9);
  const nz = new Float32Array(count); // per-face model-space unit normal z
  let w = 0, f = 0;
  for (let t = 0; t < total; t += step) {
    const b = t * 9;
    // model-space normal z (before axis remap), for overhang detection
    const ax = raw[b], ay = raw[b + 1], az = raw[b + 2];
    const bx = raw[b + 3], by = raw[b + 4], bz = raw[b + 5];
    const ccx = raw[b + 6], ccy = raw[b + 7], ccz = raw[b + 8];
    const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
    const e2x = ccx - ax, e2y = ccy - ay, e2z = ccz - az;
    const nX = e1y * e2z - e1z * e2y;
    const nY = e1z * e2x - e1x * e2z;
    const nZ = e1x * e2y - e1y * e2x;
    const nl = Math.hypot(nX, nY, nZ) || 1;
    nz[f++] = nZ / nl;
    signedVol += (ax * (by * ccz - ccy * bz) - bx * (ay * ccz - ccy * az) + ccx * (ay * bz - by * az));

    for (let v = 0; v < 3; v++) {
      // map model axes → view: STL Z is up, we keep Y up on screen so swap.
      tris[w++] = (raw[b + v * 3] - cx) * scale;
      tris[w++] = (raw[b + v * 3 + 2] - cz) * scale;
      tris[w++] = (raw[b + v * 3 + 1] - cy) * scale;
    }
  }
  // Flip if winding is inverted so "down-facing" is meaningful.
  const flip = signedVol < 0 ? -1 : 1;
  const overhang = new Uint8Array(count);
  for (let i = 0; i < count; i++) overhang[i] = nz[i] * flip < OVERHANG_NZ ? 1 : 0;

  return { tris, overhang, count };
}

export function StlViewer({ positions, parsing = false, highlightOverhang = true }: { positions: Float32Array | null; parsing?: boolean; highlightOverhang?: boolean }) {
  const overhangRef = useRef(highlightOverhang);
  overhangRef.current = highlightOverhang;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prepRef = useRef<Prepared | null>(null);
  const rotRef = useRef({ x: -0.5, y: 0.6 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const autoRef = useRef(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!positions || positions.length === 0) { prepRef.current = null; setReady(false); return; }
    prepRef.current = prepare(positions);
    setReady(!!prepRef.current);
  }, [positions]);

  const loading = parsing && !ready;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const render = () => {
      raf = requestAnimationFrame(render);
      const prep = prepRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr; canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (!prep) return;

      if (autoRef.current && !dragRef.current) rotRef.current.y += 0.005;
      const { x: rx, y: ry } = rotRef.current;
      const cosX = Math.cos(rx), sinX = Math.sin(rx);
      const cosY = Math.cos(ry), sinY = Math.sin(ry);

      const R = Math.min(w, h) * 0.42;
      const ox = w / 2, oy = h / 2;
      const { tris, count, overhang } = prep;

      // light direction
      const lx = 0.4, ly = 0.5, lz = 0.75;

      type Face = { z: number; px: number[]; py: number[]; shade: number; over: boolean };
      const faces: Face[] = [];
      const showOver = overhangRef.current;

      for (let i = 0; i < count; i++) {
        const b = i * 9;
        const vx: number[] = [], vy: number[] = [], vz: number[] = [];
        for (let v = 0; v < 3; v++) {
          const x = tris[b + v * 3], y = tris[b + v * 3 + 1], z = tris[b + v * 3 + 2];
          // rotate around Y then X
          const x1 = x * cosY - z * sinY;
          const z1 = x * sinY + z * cosY;
          const y1 = y * cosX - z1 * sinX;
          const z2 = y * sinX + z1 * cosX;
          vx.push(x1); vy.push(y1); vz.push(z2);
        }
        // face normal (after rotation) for shading + back-face cull
        const ux = vx[1] - vx[0], uy = vy[1] - vy[0], uz = vz[1] - vz[0];
        const wx = vx[2] - vx[0], wy = vy[2] - vy[0], wz = vz[2] - vz[0];
        let nx = uy * wz - uz * wy;
        let ny = uz * wx - ux * wz;
        let nz = ux * wy - uy * wx;
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl; ny /= nl; nz /= nl;
        if (nz < 0) continue; // back-face cull (viewer looks down +z)
        const diff = Math.max(0, nx * lx + ny * ly + nz * lz);
        const shade = 0.22 + 0.78 * diff;
        faces.push({
          z: (vz[0] + vz[1] + vz[2]) / 3,
          px: [ox + vx[0] * R, ox + vx[1] * R, ox + vx[2] * R],
          py: [oy - vy[0] * R, oy - vy[1] * R, oy - vy[2] * R],
          shade,
          over: showOver && overhang[i] === 1,
        });
      }

      faces.sort((a, b) => a.z - b.z); // far → near
      for (const f of faces) {
        let r: number, g: number, bl: number;
        if (f.over) {
          // amber/red highlight for overhang faces that need support
          r = Math.round(210 + f.shade * 45);
          g = Math.round(70 + f.shade * 60);
          bl = Math.round(30 + f.shade * 30);
        } else {
          // neon-cyan tinted material
          r = Math.round(40 + f.shade * 60);
          g = Math.round(150 + f.shade * 105);
          bl = Math.round(170 + f.shade * 85);
        }
        ctx.fillStyle = `rgb(${r},${g},${bl})`;
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(f.px[0], f.py[0]);
        ctx.lineTo(f.px[1], f.py[1]);
        ctx.lineTo(f.px[2], f.py[2]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onDown = (e: React.PointerEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY };
    autoRef.current = false;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    rotRef.current.y += dx * 0.01;
    rotRef.current.x += dy * 0.01;
    dragRef.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = () => { dragRef.current = null; };

  return (
    <div className="relative surface rounded-2xl overflow-hidden aspect-[4/3] select-none">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <canvas
        ref={canvasRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        className="relative w-full h-full cursor-grab active:cursor-grabbing touch-none"
      />
      {loading && (
        <div className="absolute inset-0 grid place-items-center text-primary">
          <Loader2 className="size-6 animate-spin" />
        </div>
      )}
      {!loading && !ready && (
        <div className="absolute inset-0 grid place-items-center text-center px-6">
          <div className="text-sm text-muted-foreground">
            <Move3d className="size-8 mx-auto mb-3 opacity-60" />
            پیش‌نمایش سه‌بعدی مدل شما اینجا نمایش داده می‌شود
          </div>
        </div>
      )}
      {ready && highlightOverhang && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono pointer-events-none bg-background/60 backdrop-blur px-2 py-1 rounded-md">
          <span className="size-2 rounded-sm" style={{ background: "rgb(230,100,50)" }} /> نیازمند ساپورت
        </div>
      )}
      {ready && (
        <div className="absolute bottom-2 inset-x-0 text-center text-[10px] text-muted-foreground font-mono pointer-events-none">
          برای چرخاندن بکشید
        </div>
      )}
    </div>
  );
}
