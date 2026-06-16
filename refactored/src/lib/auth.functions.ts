import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db, save } from "@/lib/server/store";
import {
  genId, hashPassword, verifyPassword, startSession, endSession,
  currentUser, toPublic,
} from "@/lib/server/session";

const SignUpInput = z.object({
  email: z.string().email().max(160),
  password: z.string().min(6).max(200),
  fullName: z.string().min(1).max(120),
  phone: z.string().min(3).max(40),
});

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SignUpInput.parse(d))
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const d = db();
    if (d.users.some((u) => u.email === email)) {
      throw new Error("این ایمیل قبلاً ثبت شده است. وارد شوید.");
    }
    const { hash, salt } = hashPassword(data.password);
    // The very first account becomes the workshop admin automatically.
    const role = d.users.length === 0 ? "admin" : "customer";
    const user = {
      id: genId(),
      email,
      passwordHash: hash,
      salt,
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      role,
      createdAt: new Date().toISOString(),
    } as const;
    d.users.push({ ...user });
    save();
    startSession(user.id);
    return { user: toPublic({ ...user }) };
  });

const SignInInput = z.object({
  email: z.string().email().max(160),
  password: z.string().min(1).max(200),
});

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SignInInput.parse(d))
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const d = db();
    const user = d.users.find((u) => u.email === email);
    if (!user || !verifyPassword(data.password, user.salt, user.passwordHash)) {
      throw new Error("ایمیل یا رمز عبور نادرست است.");
    }
    startSession(user.id);
    return { user: toPublic(user) };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  endSession();
  return { ok: true };
});

export const me = createServerFn({ method: "GET" }).handler(async () => {
  const u = currentUser();
  return { user: u ? toPublic(u) : null };
});
