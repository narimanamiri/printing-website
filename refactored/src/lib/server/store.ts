// Local, offline-first JSON data store. No external services, no native deps —
// everything lives in <cwd>/data so the app works with the internet unplugged.
// Single Node process + synchronous, atomic writes is plenty for a print shop.
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import type { Role, OrderStatus, PrintParams, AppSettings } from "@/lib/types";
import { BUSINESS } from "@/lib/business";
import { PRICE_PER_GRAM_TOMAN, MIN_ORDER_TOMAN, BUILD_VOLUME } from "@/lib/stl-parser";

export type { Role, OrderStatus, PrintParams, AppSettings };

export function defaultSettings(): AppSettings {
  return {
    pricePerGram: PRICE_PER_GRAM_TOMAN,
    minOrderToman: MIN_ORDER_TOMAN,
    buildVolume: { ...BUILD_VOLUME },
    business: {
      name: BUSINESS.name,
      cardNumber: BUSINESS.cardNumber,
      cardHolder: BUSINESS.cardHolder,
      bankName: BUSINESS.bankName,
      sheba: BUSINESS.sheba,
      whatsapp: BUSINESS.whatsapp,
      phone: BUSINESS.phone,
      address: BUSINESS.address,
    },
  };
}

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
  quantity: number;
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
  settings: AppSettings;
}

export const DATA_DIR = join(process.cwd(), "data");
const DB_FILE = join(DATA_DIR, "voxelforge.json");
const TMP_FILE = join(DATA_DIR, "voxelforge.tmp.json");

// Keep the in-memory cache on globalThis so it stays a true singleton even when
// the dev server isolates modules or hot-reloads (otherwise writes from one
// server function wouldn't be seen by another). In production it's just a normal
// process-wide singleton.
const GLOBAL_KEY = "__voxelforge_db__";
const globalStore = globalThis as unknown as { [GLOBAL_KEY]?: DbShape | null };
function getCache(): DbShape | null { return globalStore[GLOBAL_KEY] ?? null; }
function setCache(c: DbShape | null) { globalStore[GLOBAL_KEY] = c; }

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function load(): DbShape {
  const existing = getCache();
  if (existing) return existing;
  ensureDir();
  let c: DbShape;
  if (existsSync(DB_FILE)) {
    try {
      const parsed = JSON.parse(readFileSync(DB_FILE, "utf8")) as Partial<DbShape>;
      c = {
        users: parsed.users ?? [],
        sessions: parsed.sessions ?? [],
        orders: parsed.orders ?? [],
        settings: { ...defaultSettings(), ...parsed.settings },
      };
    } catch {
      c = { users: [], sessions: [], orders: [], settings: defaultSettings() };
    }
  } else {
    c = { users: [], sessions: [], orders: [], settings: defaultSettings() };
  }
  setCache(c);
  return c;
}

function persist() {
  const c = getCache();
  if (!c) return;
  ensureDir();
  // Atomic write: temp file then rename, so a crash never corrupts the db.
  writeFileSync(TMP_FILE, JSON.stringify(c, null, 2), "utf8");
  renameSync(TMP_FILE, DB_FILE);
}

export function db(): DbShape {
  return load();
}

export function save() {
  persist();
}

// Restore a backup: replace users/orders/settings, keep current sessions so the
// admin performing the import stays logged in.
export function replaceDb(parsed: Partial<DbShape>) {
  const keepSessions = load().sessions;
  setCache({
    users: parsed.users ?? [],
    sessions: keepSessions,
    orders: parsed.orders ?? [],
    settings: { ...defaultSettings(), ...parsed.settings },
  });
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
