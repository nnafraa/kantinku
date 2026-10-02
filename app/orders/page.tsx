"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/lib/cart";
import { useRequireRole } from "@/lib/useProfile";
import { STATUS_LABEL, STATUS_STYLE, formatDate, rupiah } from "@/lib/utils";
import { ui } from "@/lib/ui";
import type { OrderRow } from "@/lib/types";

function ReviewForm({
  order,
  buyerId,
  onDone,
}: {
  order: OrderRow;
  buyerId: string;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.from("reviews").insert({
      order_id: order.id,
      buyer_id: buyerId,
      store_id: order.store_id,
      rating,
      comment: comment.trim() || null,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 border-t border-stone-100 pt-3">
      <p className="text-sm font-medium">Beri rating untuk pesanan ini</p>
      <div className="flex gap-2">
        <select
          className={`${ui.input} w-28`}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} bintang
            </option>
          ))}
        </select>
        <input
          className={ui.input}
          placeholder="Ulasan singkat (opsional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      {error && <p className={ui.error}>{error}</p>}
      <button className={ui.btnPrimary} disabled={loading}>
        {loading ? "Mengirim..." : "Kirim ulasan"}
      </button>
    </form>
  );
}

export default function OrdersPage() {
  const { profile, ready } = useRequireRole(["buyer"]);
  const uid = profile?.id;
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const cart = useCart();
  const router = useRouter();

  const load = useCallback(async () => {
    if (!uid) return;
    const [o, r] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, status, total, note, created_at, store_id, stores!orders_store_id_fkey(name), order_items(menu_id, qty, price_at_order, menus(name))"
        )
        .eq("buyer_id", uid)
        .order("created_at", { ascending: false }),
      supabase.from("reviews").select("order_id").eq("buyer_id", uid),
    ]);
    setOrders((o.data ?? []) as unknown as OrderRow[]);
    setReviewed(
      new Set((r.data ?? []).map((x: { order_id: string }) => x.order_id))
    );
    setLoading(false);
  }, [uid]);

  // Ambil data, lalu perbarui otomatis tiap 10 detik supaya status terlihat berubah
  useEffect(() => {
    if (!ready) return;
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [ready, load]);

  async function cancelOrder(id: string) {
    if (!confirm("Batalkan pesanan ini?")) return;
    setError("");
    const { error } = await supabase.rpc("cancel_order", { p_order_id: id });
    if (error) setError(error.message);
    load();
  }

  // Isi ulang keranjang dari pesanan lama, hanya menu yang masih tersedia
  async function reorder(o: OrderRow) {
    setError("");
    if (cart.items.length > 0 && !confirm("Isi keranjang saat ini akan diganti. Lanjutkan?")) {
      return;
    }
    const ids = o.order_items.map((it) => it.menu_id).filter(Boolean) as string[];
    const { data, error } = await supabase
      .from("menus")
      .select("*, stores!inner(id, name, is_open)")
      .in("id", ids);
    if (error) {
      setError(error.message);
      return;
    }
    const rows = (data ?? []) as unknown as {
      id: string;
      name: string;
      price: number;
      stock: number;
      is_available: boolean;
      stores: { id: string; name: string };
    }[];
    const items = o.order_items.flatMap((it) => {
      const m = rows.find((r) => r.id === it.menu_id);
      if (!m || !m.is_available || m.stock <= 0) return [];
      return [{
        menuId: m.id,
        name: m.name,
        price: m.price,
        maxStock: m.stock,
        qty: Math.min(it.qty, m.stock),
      }];
    });
    if (items.length === 0) {
      setError("Menu dari pesanan ini sedang tidak tersedia.");
      return;
    }
    cart.replaceCart(rows[0].stores, items);
    router.push("/cart");
  }

  if (!ready || loading) return <p className="text-stone-500">Memuat...</p>;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pesanan saya</h1>
        <button className={ui.btn} onClick={load}>
          Segarkan
        </button>
      </div>

      {error && <p className={ui.error}>{error}</p>}

      {orders.length === 0 ? (
        <div className={ui.card}>
          <p>Kamu belum punya pesanan.</p>
          <Link href="/" className={`${ui.btnPrimary} mt-3`}>
            Mulai pesan
          </Link>
        </div>
      ) : (
        orders.map((o) => (
          <div key={o.id} className={ui.card}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{o.stores?.name ?? "Toko"}</p>
                <p className="text-xs text-stone-500">{formatDate(o.created_at)}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[o.status]}`}
              >
                {STATUS_LABEL[o.status]}
              </span>
            </div>

            <ul className="mt-2 text-sm text-stone-700">
              {o.order_items.map((it, i) => (
                <li key={i} className="flex justify-between">
                  <span>
                    {it.qty} x {it.menus?.name ?? "Menu"}
                  </span>
                  <span>{rupiah(it.qty * it.price_at_order)}</span>
                </li>
              ))}
            </ul>
            {o.note && (
              <p className="mt-1 text-sm text-stone-500">Catatan: {o.note}</p>
            )}
            <p className="mt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>{rupiah(o.total)}</span>
            </p>

            {o.status === "ready" && (
              <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                Pesananmu sudah siap. Ambil di kantin dan bayar di tempat.
              </p>
            )}

            {o.status === "pending" && (
              <button
                className={`${ui.btnDanger} mt-3`}
                onClick={() => cancelOrder(o.id)}
              >
                Batalkan pesanan
              </button>
            )}
            {["completed", "rejected", "cancelled"].includes(o.status) && (
              <button className={`${ui.btn} mt-3`} onClick={() => reorder(o)}>
                Pesan lagi
              </button>
            )}

            {o.status === "completed" &&
              uid &&
              (reviewed.has(o.id) ? (
                <p className="mt-2 text-sm text-stone-500">
                  Terima kasih, ulasanmu sudah terkirim.
                </p>
              ) : (
                <ReviewForm order={o} buyerId={uid} onDone={load} />
              ))}
          </div>
        ))
      )}
    </div>
  );
}
