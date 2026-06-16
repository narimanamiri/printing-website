// Local, offline-first JSON data store. No external services, no native deps —
// everything lives in <cwd>/data so the app works with the internet unplugged.
// Single Node process + synchronous, atomic writes is plenty for a print shop.
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import type { Role, OrderStatus, PrintParams } from "@/lib/types";

export type { Role, OrderStatus, PrintParams };

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  fullName: string;
  phone: string;
  role: Role;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: number; // epoch ms
}

export interface Order {
  id: string;
  userId: string;
  filename: string;
  filePath: string; // relative path under data/
  receiptPath: string | null;
  volumeCm3: number;
  weightG: number;
  infill: number;
  material: string;
  color: string | null;
  notes: string | null;
  adminNotes: string | null;
  costToman: number;
  status: OrderStatus;
  printParams: PrintParams | null;
  createdAt: string;
  updatedAt: string;
}

interface DbShape {
  users: User[];
  sessions: Session[];
  orders: Order[];
}

export const DATA_DIR = join(process.cwd(), "data");
const DB_FILE = join(DATA_DIR, "voxelforge.json");
const TMP_FILE = join(DATA_DIR, "voxelforge.tmp.json");

let cache: DbShape | null = null;

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function load(): DbShape {
  if (cache) return cache;
  ensureDir();
  if (existsSync(DB_FILE)) {
    try {
      const raw = readFileSync(DB_FILE, "utf8");
      const parsed = JSON.parse(raw) as Partial<DbShape>;
      cache = {
        users: parsed.users ?? [],
        sessions: parsed.sessions ?? [],
        orders: parsed.orders ?? [],
      };
    } catch {
      cache = { users: [], sessions: [], orders: [] };
    }
  } else {
    cache = { users: [], sessions: [], orders: [] };
  }
  return cache;
}

function persist() {
  if (!cache) return;
  ensureDir();
  // Atomic write: temp file then rename, so a crash never corrupts the db.
  writeFileSync(TMP_FILE, JSON.stringify(cache, null, 2), "utf8");
  renameSync(TMP_FILE, DB_FILE);
}

export function db(): DbShape {
  return load();
}

export function save() {
  persist();
}

// Remove expired sessions opportunistically.
export function gcSessions() {
  const d = load();
  const now = Date.now();
  const before = d.sessions.length;
  d.sessions = d.sessions.filter((s) => s.expiresAt > now);
  if (d.sessions.length !== before) persist();
}
