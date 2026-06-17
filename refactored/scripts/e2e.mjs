// Comprehensive E2E against a running dev server. Run: node scripts/e2e.mjs
import { toJSONAsync } from "seroval";

const BASE = process.env.BASE || "http://localhost:8088";
const RPC = BASE + "/_serverFn/";
let cookie = "";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { console.log(`${cond ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`); cond ? pass++ : fail++; };

function id(file, exp) {
  return Buffer.from(JSON.stringify({ file: `/src/lib/${file}.functions.ts?tss-serverfn-split`, export: `${exp}_createServerFn_handler` })).toString("base64url");
}
function dec(n) {
  if (!n || typeof n !== "object") return n;
  switch (n.t) {
    case 0: case 1: return n.s;
    case 2: return [undefined, null, true, false][n.s];
    case 9: return n.a.map(dec); // array
    case 10: case 11: { const o = {}; for (let i = 0; i < n.p.k.length; i++) o[n.p.k[i]] = dec(n.p.v[i]); return o; } // object
    default: return n.s;
  }
}
async function decodeRes(res) {
  const sc = res.headers.getSetCookie?.() || [];
  for (const c of sc) if (c.startsWith("vf_session=")) cookie = c.split(";")[0];
  const text = await res.text();
  try { return dec(JSON.parse(text)); }
  catch { return { error: { message: `non-JSON response (HTTP ${res.status})` } }; }
}
async function callJson(fnId, data, method = "POST") {
  const headers = { "x-tsr-serverFn": "true" };
  if (cookie) headers.cookie = cookie;
  let url = RPC + fnId;
  const init = { method, headers };
  if (data !== undefined) {
    const serial = JSON.stringify(await toJSONAsync({ data }));
    if (method === "GET") {
      url += "?payload=" + encodeURIComponent(serial); // GET fns take input via query
    } else {
      headers["content-type"] = "application/json";
      init.body = serial;
    }
  }
  return decodeRes(await fetch(url, init));
}
async function callForm(fnId, fd) {
  const headers = { "x-tsr-serverFn": "true" };
  if (cookie) headers.cookie = cookie;
  return decodeRes(await fetch(RPC + fnId, { method: "POST", headers, body: fd }));
}

function cubeStl(S = 20) {
  const tris = [];
  const q = (a, b, c, d) => { tris.push([...a, ...b, ...c], [...a, ...c, ...d]); };
  const p = [[0, 0, 0], [S, 0, 0], [S, S, 0], [0, S, 0], [0, 0, S], [S, 0, S], [S, S, S], [0, S, S]];
  q(p[0], p[3], p[2], p[1]); q(p[4], p[5], p[6], p[7]); q(p[0], p[1], p[5], p[4]); q(p[2], p[3], p[7], p[6]); q(p[1], p[2], p[6], p[5]); q(p[3], p[0], p[4], p[7]);
  const b = Buffer.alloc(84 + tris.length * 50); b.writeUInt32LE(tris.length, 80);
  let o = 84; for (const t of tris) { o += 12; for (let i = 0; i < 9; i++) { b.writeFloatLE(t[i], o); o += 4; } o += 2; }
  return b;
}

const I = {
  signUp: id("auth", "signUp"), signIn: id("auth", "signIn"), me: id("auth", "me"),
  updateProfile: id("profile", "updateProfile"), changePassword: id("profile", "changePassword"),
  getSettings: id("settings", "getSettings"), updateSettings: id("settings", "updateSettings"),
  createOrder: id("orders", "createOrder"), listMyOrders: id("orders", "listMyOrders"),
  uploadReceipt: id("orders", "uploadReceipt"), getOrderInvoice: id("orders", "getOrderInvoice"),
  dashboardStats: id("admin", "dashboardStats"), listOrders: id("admin", "listOrders"),
  confirmOrderPayment: id("admin", "confirmOrderPayment"), setOrderStatus: id("admin", "setOrderStatus"),
  setAdminNotes: id("admin", "setAdminNotes"), getOrderFile: id("admin", "getOrderFile"),
  exportData: id("backup", "exportData"), importData: id("backup", "importData"),
};

async function main() {
  // warm up routes so server fns register
  for (const r of ["", "auth", "quote", "orders", "admin", "settings", "profile", "invoice/x"]) await fetch(`${BASE}/${r}`).catch(() => {});

  const email = `e2e${Date.now()}@test.local`;

  // auth
  let r = await callJson(I.signUp, { email, password: "pass1234", fullName: "ادمین تست", phone: "09120000000" });
  ok("signUp → admin + cookie", r.result?.user?.role === "admin" && !!cookie, r.error?.message || "");
  r = await callJson(I.me, undefined, "GET");
  ok("me returns user", r.result?.user?.email === email);

  // profile
  r = await callJson(I.updateProfile, { fullName: "نام جدید", phone: "09121112233" });
  ok("updateProfile", r.result?.user?.fullName === "نام جدید", r.error?.message || "");
  r = await callJson(I.me, undefined, "GET");
  ok("me reflects new phone", r.result?.user?.phone === "09121112233");

  // password
  r = await callJson(I.changePassword, { current: "WRONG", next: "newpass99" });
  ok("changePassword wrong rejected", !!r.error);
  r = await callJson(I.changePassword, { current: "pass1234", next: "newpass99" });
  ok("changePassword correct", r.result?.ok === true, r.error?.message || "");
  r = await callJson(I.signIn, { email, password: "newpass99" });
  ok("signIn with new password", r.result?.user?.email === email, r.error?.message || "");

  // settings
  r = await callJson(I.updateSettings, {
    pricePerGram: 40000, minOrderToman: 50000, buildVolume: { x: 250, y: 210, z: 210 },
    business: { name: "تست‌شاپ", cardNumber: "6037991122334455", cardHolder: "X", bankName: "ملی", sheba: "IR1", whatsapp: "", phone: "021", address: "تهران" },
  });
  ok("updateSettings", r.result?.pricePerGram === 40000, r.error?.message || "");

  // order (scale 100) — should use 40000/g
  let fd = new FormData();
  fd.append("file", new Blob([cubeStl(20)], { type: "model/stl" }), "cube.stl");
  for (const [k, v] of Object.entries({ filename: "cube.stl", infill: "20", material: "PLA", quality: "standard", support: "false", quantity: "1", scalePercent: "100", rotX: "0", rotY: "0", rotZ: "0" })) fd.append(k, v);
  r = await callForm(I.createOrder, fd);
  const order1 = r.result?.order;
  ok("createOrder ok", !!order1, r.error?.message || "");
  ok("order price uses settings (~40000/g)", order1 && Math.abs(order1.costToman / order1.weightG - 40000) < 5, order1 ? String(Math.round(order1.costToman / order1.weightG)) : "");

  // order (scale 200) — orientation stored, heavier
  fd = new FormData();
  fd.append("file", new Blob([cubeStl(20)], { type: "model/stl" }), "cube2.stl");
  for (const [k, v] of Object.entries({ filename: "cube2.stl", infill: "20", material: "PETG", quality: "fine", support: "true", quantity: "2", color: "قرمز", scalePercent: "200", rotX: "90", rotY: "0", rotZ: "0" })) fd.append(k, v);
  r = await callForm(I.createOrder, fd);
  const order2 = r.result?.order;
  ok("createOrder (scaled/oriented)", !!order2 && order2.printParams?.scalePercent === 200 && order2.quantity === 2 && order2.color === "قرمز", r.error?.message || "");
  ok("scaled order is heavier", order2 && order1 && order2.weightG > order1.weightG);

  // list my orders
  r = await callJson(I.listMyOrders, undefined, "GET");
  ok("listMyOrders returns 2", r.result?.orders?.length === 2);

  // upload receipt for order1
  fd = new FormData();
  fd.append("file", new Blob([Buffer.from("fake receipt png")], { type: "image/png" }), "receipt.png");
  fd.append("orderId", order1.id);
  r = await callForm(I.uploadReceipt, fd);
  ok("uploadReceipt", r.result?.ok === true, r.error?.message || "");
  r = await callJson(I.listMyOrders, undefined, "GET");
  ok("order1 now awaiting_confirmation", r.result?.orders?.find((o) => o.id === order1.id)?.status === "awaiting_confirmation");

  // invoice
  r = await callJson(I.getOrderInvoice, { orderId: order1.id }, "GET");
  ok("getOrderInvoice", r.result?.order?.id === order1.id && r.result?.business?.name === "تست‌شاپ", r.error?.message || "");

  // admin
  r = await callJson(I.dashboardStats, undefined, "GET");
  ok("dashboardStats", r.result?.totalOrders === 2 && r.result?.daily?.length === 14, r.error?.message || "");
  r = await callJson(I.listOrders, { filter: "awaiting_confirmation" }, "GET");
  ok("listOrders filter", r.result?.orders?.some((o) => o.id === order1.id));
  r = await callJson(I.confirmOrderPayment, { orderId: order1.id });
  ok("confirmOrderPayment", r.result?.ok === true, r.error?.message || "");
  r = await callJson(I.setOrderStatus, { orderId: order1.id, status: "printing" });
  ok("setOrderStatus printing", r.result?.ok === true, r.error?.message || "");
  r = await callJson(I.setAdminNotes, { orderId: order1.id, notes: "آماده‌سازی شد" });
  ok("setAdminNotes", r.result?.ok === true, r.error?.message || "");
  r = await callJson(I.getOrderFile, { orderId: order1.id, kind: "stl" }, "GET");
  ok("getOrderFile stl dataUrl", typeof r.result?.dataUrl === "string" && r.result.dataUrl.startsWith("data:"), r.error?.message || "");

  // backup round-trip
  r = await callJson(I.exportData, undefined, "GET");
  ok("exportData", Array.isArray(r.result?.users) && Array.isArray(r.result?.orders) && !!r.result?.settings, r.error?.message || "");
  const backup = r.result;
  r = await callJson(I.importData, { json: JSON.stringify(backup) });
  ok("importData round-trip", r.result?.ok === true && r.result?.orders === 2, r.error?.message || "");

  // public settings
  r = await callJson(I.getSettings, undefined, "GET");
  ok("getSettings (public) price", r.result?.pricePerGram === 40000);

  console.log(`\n${fail === 0 ? `ALL ${pass} PASSED ✅` : `${fail} FAILED / ${pass} passed ❌`}`);
  process.exit(fail === 0 ? 0 : 1);
}
main().catch((e) => { console.error("E2E crashed:", e); process.exit(2); });
