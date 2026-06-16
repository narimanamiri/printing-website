// Local file storage on disk under data/. Replaces cloud object storage.
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { DATA_DIR } from "./store";

function sanitize(name: string): string {
  return name.replace(/[^\w.-]+/g, "_").slice(-120) || "file";
}

// Save bytes under data/<sub>/<userId>/<unique>_<name>. Returns the relative path.
export function saveFile(
  sub: "uploads" | "receipts",
  userId: string,
  filename: string,
  bytes: Uint8Array,
): string {
  const rel = join(sub, userId, `${Date.now()}_${sanitize(filename)}`);
  const abs = join(DATA_DIR, rel);
  if (!existsSync(dirname(abs))) mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, bytes);
  return rel.replace(/\\/g, "/");
}

export function readFile(relPath: string): Buffer {
  // Guard against path traversal — only allow files inside DATA_DIR.
  const abs = join(DATA_DIR, relPath);
  if (!abs.startsWith(DATA_DIR)) throw new Error("Invalid path");
  if (!existsSync(abs)) throw new Error("File not found");
  return readFileSync(abs);
}

const MIME: Record<string, string> = {
  ".stl": "model/stl",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

export function mimeFor(path: string): string {
  return MIME[extname(path).toLowerCase()] ?? "application/octet-stream";
}

// A base64 data URL the browser can open/embed/download without an extra route.
export function readAsDataUrl(relPath: string): { dataUrl: string; mime: string; filename: string } {
  const buf = readFile(relPath);
  const mime = mimeFor(relPath);
  const filename = relPath.split("/").pop() ?? "file";
  return { dataUrl: `data:${mime};base64,${buf.toString("base64")}`, mime, filename };
}
