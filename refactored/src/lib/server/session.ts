// Local auth primitives: password hashing (scrypt), id/token generation, and
// cookie-backed sessions. All standard Node crypto — works fully offline.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { db, save, gcSessions, type User } from "./store";
import type { PublicUser } from "@/lib/types";

const COOKIE = "vf_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function genId(): string {
  return randomBytes(16).toString("hex");
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, salt: string, expected: string): boolean {
  const got = scryptSync(password, salt, 64);
  const exp = Buffer.from(expected, "hex");
  return got.length === exp.length && timingSafeEqual(got, exp);
}

export function startSession(userId: string) {
  const d = db();
  const token = randomBytes(32).toString("hex");
  d.sessions.push({ token, userId, expiresAt: Date.now() + SESSION_TTL_MS });
  save();
  setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function endSession() {
  const token = getCookie(COOKIE);
  if (token) {
    const d = db();
    const before = d.sessions.length;
    d.sessions = d.sessions.filter((s) => s.token !== token);
    if (d.sessions.length !== before) save();
  }
  deleteCookie(COOKIE, { path: "/" });
}

// Returns the logged-in user or null. Cleans up expired sessions.
export function currentUser(): User | null {
  gcSessions();
  const token = getCookie(COOKIE);
  if (!token) return null;
  const d = db();
  const session = d.sessions.find((s) => s.token === token);
  if (!session || session.expiresAt <= Date.now()) return null;
  return d.users.find((u) => u.id === session.userId) ?? null;
}

export function requireUser(): User {
  const u = currentUser();
  if (!u) throw new Error("برای این کار باید وارد شوید.");
  return u;
}

export function requireAdmin(): User {
  const u = requireUser();
  if (u.role !== "admin") throw new Error("دسترسی مدیریت لازم است.");
  return u;
}

export function toPublic(u: User): PublicUser {
  return { id: u.id, email: u.email, fullName: u.fullName, phone: u.phone, role: u.role };
}
