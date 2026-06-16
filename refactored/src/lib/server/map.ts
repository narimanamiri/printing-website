import type { Order, User } from "./store";
import type { OrderDTO, AdminOrderDTO } from "@/lib/types";

export function toOrderDTO(o: Order): OrderDTO {
  return {
    id: o.id,
    filename: o.filename,
    weightG: o.weightG,
    volumeCm3: o.volumeCm3,
    infill: o.infill,
    material: o.material,
    color: o.color,
    quantity: o.quantity ?? 1,
    costToman: o.costToman,
    status: o.status,
    hasReceipt: !!o.receiptPath,
    notes: o.notes,
    adminNotes: o.adminNotes,
    printParams: o.printParams,
    createdAt: o.createdAt,
  };
}

export function toAdminOrderDTO(o: Order, u: User | undefined): AdminOrderDTO {
  return {
    ...toOrderDTO(o),
    customerName: u?.fullName ?? "—",
    customerEmail: u?.email ?? "—",
    customerPhone: u?.phone ?? "—",
    hasFile: !!o.filePath,
  };
}
