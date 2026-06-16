import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { save } from "@/lib/server/store";
import { requireUser, hashPassword, verifyPassword, toPublic } from "@/lib/server/session";

const ProfileInput = z.object({
  fullName: z.string().min(1).max(120),
  phone: z.string().min(3).max(40),
});

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ProfileInput.parse(d))
  .handler(async ({ data }) => {
    const user = requireUser();
    user.fullName = data.fullName.trim();
    user.phone = data.phone.trim();
    save();
    return { user: toPublic(user) };
  });

const PasswordInput = z.object({
  current: z.string().min(1).max(200),
  next: z.string().min(6).max(200),
});

export const changePassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PasswordInput.parse(d))
  .handler(async ({ data }) => {
    const user = requireUser();
    if (!verifyPassword(data.current, user.salt, user.passwordHash)) {
      throw new Error("رمز عبور فعلی نادرست است.");
    }
    const { hash, salt } = hashPassword(data.next);
    user.passwordHash = hash;
    user.salt = salt;
    save();
    return { ok: true };
  });
