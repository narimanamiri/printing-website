# مرجع توابع سرور (Server Functions)

همه‌ی منطق سرور با `createServerFn` تعریف شده و از کلاینت مثل یک تابع معمولی فراخوانی می‌شود
(از طریق RPC داخلی TanStack). نشست با کوکی `httpOnly` خودکار همراه هر درخواست می‌رود.

سطوح دسترسی:
- **عمومی** — بدون نیاز به ورود.
- **کاربر** — `requireUser()` (وارد شده).
- **مدیر** — `requireAdmin()` (نقش admin).

نمونه‌ی فراخوانی از کلاینت:

```ts
import { createOrder } from "@/lib/orders.functions";
const { order } = await createOrder({ data: formData });
```

---

## احراز هویت — `auth.functions.ts`

| تابع | متد | دسترسی | ورودی | خروجی |
|---|---|---|---|---|
| `signUp` | POST | عمومی | `{ email, password(min 6), fullName, phone }` | `{ user }` + ست کوکی |
| `signIn` | POST | عمومی | `{ email, password }` | `{ user }` + ست کوکی |
| `signOut` | POST | عمومی | — | `{ ok }` + حذف کوکی |
| `me` | GET | عمومی | — | `{ user: PublicUser \| null }` |

> اولین `signUp` در کل سامانه نقش **admin** می‌گیرد؛ بقیه `customer`.

---

## سفارش‌ها — `orders.functions.ts`

| تابع | متد | دسترسی | ورودی | خروجی |
|---|---|---|---|---|
| `createOrder` | POST | کاربر | **FormData**: `file`, `filename`, `infill`, `material`, `quality`, `support`, `quantity`, `color?`, `notes?`, `scalePercent`, `rotX`, `rotY`, `rotZ` | `{ order: OrderDTO }` |
| `listMyOrders` | GET | کاربر | — | `{ orders: OrderDTO[] }` |
| `uploadReceipt` | POST | کاربر (صاحب) | **FormData**: `file`, `orderId` | `{ ok }` |
| `getOrderInvoice` | GET | کاربر (صاحب) یا مدیر | `{ orderId }` | `{ order, business, customerName, customerPhone }` |

`createOrder` فایل را روی سرور **دوباره اسلایس** می‌کند (با همان جهت‌گیری و تنظیمات قیمت) و
قیمت/وزن معتبر را می‌نویسد. `uploadReceipt` وضعیت سفارش را به `awaiting_confirmation` می‌برد.

---

## مدیریت — `admin.functions.ts`

| تابع | متد | دسترسی | ورودی | خروجی |
|---|---|---|---|---|
| `dashboardStats` | GET | مدیر | — | `DashboardStats` (درآمد، شمارش‌ها، سری ۱۴ روزه) |
| `listOrders` | GET | مدیر | `{ filter }` (`all` یا یک وضعیت) | `{ orders: AdminOrderDTO[] }` |
| `confirmOrderPayment` | POST | مدیر | `{ orderId }` | `{ ok }` → وضعیت `confirmed` |
| `setOrderStatus` | POST | مدیر | `{ orderId, status: 'printing'\|'completed'\|'cancelled' }` | `{ ok }` |
| `setAdminNotes` | POST | مدیر | `{ orderId, notes }` | `{ ok }` |
| `getOrderFile` | GET | مدیر | `{ orderId, kind: 'stl'\|'receipt' }` | `{ dataUrl, mime, filename }` |

`getOrderFile` فایل را به‌صورت **data-url base64** برمی‌گرداند تا بدون استوریج ابری قابل
دانلود/مشاهده باشد.

---

## تنظیمات — `settings.functions.ts`

| تابع | متد | دسترسی | ورودی | خروجی |
|---|---|---|---|---|
| `getSettings` | GET | عمومی | — | `AppSettings` |
| `updateSettings` | POST | مدیر | `AppSettings` کامل | `AppSettings` ذخیره‌شده |

`AppSettings = { pricePerGram, minOrderToman, buildVolume{x,y,z}, business{ name, cardNumber, cardHolder, bankName, sheba, whatsapp, phone, address } }`.
کلاینت آن را با هوک `useSettings()` می‌گیرد (cached).

---

## پشتیبان‌گیری — `backup.functions.ts`

| تابع | متد | دسترسی | ورودی | خروجی |
|---|---|---|---|---|
| `exportData` | GET | مدیر | — | `{ users, orders, settings, exportedAt }` |
| `importData` | POST | مدیر | `{ json: string }` | `{ ok, users, orders }` |

`importData` ساختار را اعتبارسنجی می‌کند (باید `users` و `orders` داشته باشد) و داده‌ی فعلی
را جایگزین می‌کند؛ نشست مدیرِ در حال بازیابی حفظ می‌شود.

---

## پروفایل — `profile.functions.ts`

| تابع | متد | دسترسی | ورودی | خروجی |
|---|---|---|---|---|
| `updateProfile` | POST | کاربر | `{ fullName, phone }` | `{ user }` |
| `changePassword` | POST | کاربر | `{ current, next(min 6) }` | `{ ok }` |

`changePassword` ابتدا رمز فعلی را با `verifyPassword` بررسی می‌کند.

---

## تایپ‌های خروجی (DTO)

در [`src/lib/types.ts`](../src/lib/types.ts):

- **PublicUser** — `{ id, email, fullName, phone, role }` (بدون هش رمز).
- **OrderDTO** — فیلدهای سفارش برای مشتری (بدون `userId`/`filePath`؛ `hasReceipt: boolean`).
- **AdminOrderDTO** — `OrderDTO` + `{ customerName, customerEmail, customerPhone, hasFile }`.
- **DashboardStats** — `{ totalOrders, todayOrders, customers, revenueToman, awaitingConfirmation, byStatus, daily[] }`.

---

## خطاها

توابع سرور هنگام خطا یک `Error` با پیام فارسی پرتاب می‌کنند (مثلاً «برای این کار باید وارد شوید.»).
کلاینت آن را در `try/catch` گرفته و با `toast.error(...)` نمایش می‌دهد. اعتبارسنجی ورودی با
`zod` انجام می‌شود.
