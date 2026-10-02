import type { OrderStatus, Role } from "./types";

export function rupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Halaman tujuan setelah login, sesuai peran
export function homeFor(role?: Role | null) {
  if (role === "seller") return "/seller";
  if (role === "admin") return "/admin";
  return "/";
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Menunggu konfirmasi",
  accepted: "Pesanan diterima",
  preparing: "Sedang dibuat",
  ready: "Siap diambil",
  completed: "Selesai",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};

export const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  preparing: "bg-indigo-100 text-indigo-800",
  ready: "bg-green-100 text-green-800",
  completed: "bg-stone-200 text-stone-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-stone-200 text-stone-600",
};
