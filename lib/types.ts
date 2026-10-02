export type Role = "buyer" | "seller" | "admin";

export type OrderStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type Profile = { id: string; full_name: string; role: Role };

export type Store = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  is_open: boolean;
  is_verified: boolean;
};

export type Category = { id: number; name: string };

export type Menu = {
  id: string;
  store_id: string;
  category_id: number | null;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  is_available: boolean;
  image_url: string | null;
};

export type OrderItemRow = {
  menu_id?: string;
  qty: number;
  price_at_order: number;
  menus: { name: string } | null;
};

export type OrderRow = {
  id: string;
  status: OrderStatus;
  total: number;
  note: string | null;
  created_at: string;
  store_id: string;
  stores?: { name: string } | null;
  profiles?: { full_name: string } | null;
  order_items: OrderItemRow[];
};
