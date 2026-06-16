import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer, ArrowRight, Loader2 } from "lucide-react";
import { getOrderInvoice } from "@/lib/orders.functions";
import { formatToman, formatNumberFa } from "@/lib/stl-parser";

export const Route = createFileRoute("/invoice/$orderId")({
  head: () => ({ meta: [{ title: "فاکتور سفارش — وُکسِل‌فورج" }] }),
  component: InvoicePage,
});

const STATUS_FA: Record<string, string> = {
  pending_payment: "در انتظار پرداخت",
  awaiting_confirmation: "در انتظار تأیید",
  confirmed: "تأیید شده",
  printing: "در حال چاپ",
  completed: "تکمیل شده",
  cancelled: "لغو شده",
};

function InvoicePage() {
  const { orderId } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["invoice", orderId],
    queryFn: async () => getOrderInvoice({ data: { orderId } }),
    retry: false,
  });

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }
  if (error || !data) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <p className="text-muted-foreground">{error instanceof Error ? error.message : "فاکتور پیدا نشد."}</p>
          <Link to="/orders" className="mt-4 inline-flex rounded-lg btn-primary px-5 py-2.5 text-sm">بازگشت به سفارش‌ها</Link>
        </div>
      </div>
    );
  }

  const { order, business, customerName, customerPhone } = data;
  const pp = order.printParams;
  const unit = pp?.unitCostToman ?? order.costToman;

  return (
    <div className="min-h-screen bg-neutral-100 py-8 px-4 print:bg-white print:py-0">
      <div className="max-w-2xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900">
          <ArrowRight className="size-4" /> بازگشت
        </Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 text-white px-5 py-2.5 text-sm">
          <Printer className="size-4" /> چاپ / ذخیره PDF
        </button>
      </div>

      {/* The invoice itself — always light for clean printing */}
      <div className="max-w-2xl mx-auto bg-white text-neutral-900 rounded-xl shadow-sm print:shadow-none p-8" dir="rtl">
        <div className="flex items-start justify-between border-b border-neutral-200 pb-5">
          <div>
            <div className="text-2xl font-bold">{business.name}</div>
            <div className="text-sm text-neutral-500 mt-1">{business.phone} · {business.address}</div>
          </div>
          <div className="text-left">
            <div className="text-lg font-bold">فاکتور</div>
            <div className="text-xs text-neutral-500 font-mono mt-1">#{order.id.slice(0, 8)}</div>
            <div className="text-xs text-neutral-500 mt-1">{new Date(order.createdAt).toLocaleDateString("fa-IR")}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-5 text-sm">
          <div>
            <div className="text-neutral-400 text-xs mb-1">مشتری</div>
            <div className="font-medium">{customerName || "—"}</div>
            <div className="text-neutral-500" dir="ltr">{customerPhone}</div>
          </div>
          <div className="text-left">
            <div className="text-neutral-400 text-xs mb-1">وضعیت</div>
            <div className="font-medium">{STATUS_FA[order.status] ?? order.status}</div>
          </div>
        </div>

        <table className="w-full text-sm border-t border-neutral-200">
          <thead>
            <tr className="text-neutral-400 text-xs">
              <th className="text-right font-normal py-2">شرح</th>
              <th className="text-center font-normal py-2">تعداد</th>
              <th className="text-center font-normal py-2">قیمت واحد</th>
              <th className="text-left font-normal py-2">مبلغ</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-neutral-100">
              <td className="py-3">
                <div className="font-medium">{order.filename}</div>
                <div className="text-xs text-neutral-500">
                  {order.material} · اینفیل {formatNumberFa(order.infill)}٪ · {formatNumberFa(order.weightG, 1)} گرم
                  {order.color ? ` · ${order.color}` : ""}
                </div>
              </td>
              <td className="text-center">{formatNumberFa(order.quantity)}</td>
              <td className="text-center">{formatToman(unit)}</td>
              <td className="text-left">{formatToman(order.costToman)}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-end mt-4 pt-4 border-t border-neutral-200">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between text-lg font-bold">
              <span>مبلغ کل</span><span>{formatToman(order.costToman)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-neutral-200 text-xs text-neutral-500 space-y-1">
          <div>پرداخت کارت‌به‌کارت — {business.bankName}</div>
          <div dir="ltr" className="font-mono">{business.cardNumber} · {business.cardHolder}</div>
          {business.sheba && <div dir="ltr" className="font-mono">شبا: {business.sheba}</div>}
          <div className="pt-2">با تشکر از سفارش شما 🚀</div>
        </div>
      </div>
    </div>
  );
}
