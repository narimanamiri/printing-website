// Shared, client-safe types (no server/node imports — safe to import anywhere).

export type Role = "customer" | "admin";

export type OrderStatus =
  | "pending_payment"
  | "awaiting_confirmation"
  | "confirmed"
  | "printing"
  | "completed"
  | "cancelled";

export interface PrintParams {
  quality: string;
  layerHeight: number;
  walls: number;
  topLayers: number;
  bottomLayers: number;
  support: boolean;
  priceFactor: number;
  surfaceAreaCm2: number;
  bbox: { x: number; y: number; z: number };
  filamentLengthM: number;
  printTimeMin: number;
  shellG: number;
  infillG: number;
  supportG: number;
  unitCostToman?: number;
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: Role;
}

export interface OrderDTO {
  id: string;
  filename: string;
  weightG: number;
  volumeCm3: number;
  infill: number;
  material: string;
  color: string | null;
  quantity: number;
  costToman: number;
  status: OrderStatus;
  hasReceipt: boolean;
  notes: string | null;
  adminNotes: string | null;
  printParams: PrintParams | null;
  createdAt: string;
}

export interface AdminOrderDTO extends OrderDTO {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  hasFile: boolean;
}

export interface DashboardStats {
  totalOrders: number;
  todayOrders: number;
  customers: number;
  revenueToman: number; // from confirmed/printing/completed orders
  awaitingConfirmation: number; // orders needing the admin's attention
  byStatus: Record<OrderStatus, number>;
}
