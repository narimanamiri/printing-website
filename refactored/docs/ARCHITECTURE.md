# معماری

## پشته‌ی فنی

| لایه | فناوری |
|---|---|
| فریم‌ورک | [TanStack Start](https://tanstack.com/start) (React 19 + SSR) |
| روتر | TanStack Router (مسیریابی فایل‌محور + `validateSearch`) |
| داده‌ی کلاینت | TanStack Query (react-query) |
| استایل | Tablewind CSS 4 + تم «Industrial Neon» (`src/styles.css`) |
| نمودار | recharts |
| اعتبارسنجی | zod |
| باندلر/دِو | Vite 7 |
| بک‌اند | توابع سرور TanStack (`createServerFn`) + Node (fs/crypto) |
| دیتابیس | فایل JSON محلی (بدون وابستگی native) |

**هیچ سرویس ابری‌ای استفاده نمی‌شود.** کل بک‌اند روی همان فرایند Node ای که اپ را سرو می‌کند اجرا می‌شود.

---

## طراحی آفلاین

سه ستون «محلی»:

1. **احراز هویت** — رمز با `scrypt` هش می‌شود؛ نشست با کوکی `httpOnly` و توکن تصادفی
   (`src/lib/server/session.ts`).
2. **دیتابیس** — یک فایل JSON با نوشتن **اتمیک** (نوشتن موقت + `rename`) در
   `data/voxelforge.json` (`src/lib/server/store.ts`).
3. **ذخیره‌ی فایل** — فایل‌های STL و رسیدها روی دیسک در `data/uploads/` و `data/receipts/`
   (`src/lib/server/files.ts`).

### تک‌نمونه بودن کش (نکته‌ی مهم)

کش حافظه‌ی store روی `globalThis` نگه‌داری می‌شود تا حتی وقتی سرور توسعه ماژول‌ها را
ایزوله یا hot-reload می‌کند، یک **تک‌نمونه‌ی واقعی** باقی بماند؛ وگرنه نوشتن یک تابع سرور
(مثلاً تغییر تنظیمات) در تابع دیگری (مثلاً ساخت سفارش) دیده نمی‌شد. در پروداکشن این صرفاً
یک singleton عادی در سطح فرایند است.

---

## مدل داده

فایل `data/voxelforge.json`:

```jsonc
{
  "users":    [ User ],
  "sessions": [ Session ],
  "orders":   [ Order ],
  "settings": AppSettings
}
```

تایپ‌ها در `src/lib/types.ts` (مشترک کلاینت/سرور) و `src/lib/server/store.ts` (رکوردهای سرور):

- **User** — `{ id, email, passwordHash, salt, fullName, phone, role: 'customer'|'admin', createdAt }`
- **Session** — `{ token, userId, expiresAt }`
- **Order** — `{ id, userId, filename, filePath, receiptPath, volumeCm3, weightG, infill, material, color, quantity, notes, adminNotes, costToman, status, printParams, createdAt, updatedAt }`
- **AppSettings** — `{ pricePerGram, minOrderToman, buildVolume{x,y,z}, business{...} }`
- **PrintParams** (داخل سفارش) — جزئیات اسلایس: کیفیت، ارتفاع لایه، دیواره‌ها، ساپورت،
  ضریب قیمت، مساحت سطح، ابعاد، طول فیلامنت، زمان چاپ، تفکیک وزن، مقیاس و چرخش.

### وضعیت‌های سفارش

`pending_payment → awaiting_confirmation → confirmed → printing → completed`
(و `cancelled` به‌عنوان حالت پایانی خارج از مسیر).

---

## جریان داده‌ی یک سفارش

```
مرورگر (quote.tsx)                        سرور (orders.functions.ts)
─────────────────                         ──────────────────────────
parseGeometry(file)  ─ یک‌بار پارس
   │
applyOrient + statsFromGeometry  ─ زنده، با هر تغییر چرخش/مقیاس/اینفیل
   │
estimatePrint(...)   ─ قیمت «پیش‌نمایش»
   │
[ثبت سفارش] FormData(file, settings, orient) ──►  createOrder()
                                                     │ requireUser()
                                                     │ parseGeometry + statsFromGeometry(orient)
                                                     │ estimatePrint(settings از store)  ← قیمت معتبر
                                                     │ saveFile(STL) → دیسک
                                                     │ db().orders.push(order); save()
                                                  ◄──┘ بازگشت OrderDTO
```

قیمتی که در مرورگر دیده می‌شود فقط **پیش‌نمایش** است؛ سرور همان مدل را با همان تنظیمات
**دوباره اسلایس می‌کند** و قیمت معتبر را می‌نویسد.

---

## ساختار پوشه‌ها (کامل)

```
src/
├── routes/
│   ├── __root.tsx           # پوسته‌ی HTML (lang=fa, dir=rtl)، Providerها، 404/خطا
│   ├── index.tsx            # صفحه‌ی اصلی (لندینگ)
│   ├── auth.tsx             # ورود / ثبت‌نام
│   ├── quote.tsx            # آپلود STL + اسلایس + چرخش/مقیاس + قیمت زنده
│   ├── orders.tsx           # سفارش‌های من + پرداخت + خط زمانی + فاکتور
│   ├── admin.tsx            # داشبورد + صف چاپ + جست‌وجو/CSV
│   ├── settings.tsx         # تنظیمات کسب‌وکار + بکاپ (ادمین)
│   ├── profile.tsx          # ویرایش مشخصات + تغییر رمز
│   └── invoice.$orderId.tsx # فاکتور قابل‌چاپ
├── lib/
│   ├── stl-parser.ts        # موتور اسلایس (هندسه، آمار، تخمین، فرمت)
│   ├── types.ts             # تایپ‌های مشترک
│   ├── business.ts          # مقادیر اولیه‌ی کسب‌وکار
│   ├── auth.functions.ts    # signUp / signIn / signOut / me
│   ├── orders.functions.ts  # createOrder / listMyOrders / uploadReceipt / getOrderInvoice
│   ├── admin.functions.ts   # listOrders / dashboardStats / confirm / setStatus / setAdminNotes / getOrderFile
│   ├── settings.functions.ts# getSettings / updateSettings
│   ├── backup.functions.ts  # exportData / importData
│   ├── profile.functions.ts # updateProfile / changePassword
│   └── server/              # فقط سرور (node:fs/crypto)
│       ├── store.ts         # دیتابیس JSON + کش globalThis + اتمیک
│       ├── session.ts       # هش رمز + نشست کوکی + requireUser/requireAdmin
│       ├── files.ts         # ذخیره/خواندن فایل + data-url
│       └── map.ts           # نگاشت رکورد → DTO کلاینت
├── components/  Navbar.tsx · Footer.tsx · StlViewer.tsx
├── hooks/       use-auth.ts · use-settings.ts
└── styles.css   تم Industrial Neon
```

> فایل‌های `*.functions.ts` فقط در باندل سرور قرار می‌گیرند؛ کلاینت صرفاً یک stub فراخوانی
> RPC می‌بیند، پس importهای `node:fs`/`node:crypto` هیچ‌وقت به مرورگر نشت نمی‌کنند.

---

## امنیت

- رمز عبور هرگز به‌صورت متن ذخیره نمی‌شود (scrypt + salt تصادفی، مقایسه‌ی `timingSafeEqual`).
- نقش‌ها سمت سرور بررسی می‌شوند: `requireUser()` و `requireAdmin()`.
- **اولین کاربر = مدیر**؛ هیچ کاربری نمی‌تواند نقش خود را ارتقا دهد.
- قیمت و وزن فقط سمت سرور (با اسلایس مجدد) نوشته می‌شوند → غیرقابل دستکاری.
- خواندن فایل با محافظت در برابر path-traversal (فقط داخل `data/`).
