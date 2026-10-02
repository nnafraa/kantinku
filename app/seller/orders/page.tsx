"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRequireRole } from "@/lib/useProfile";
import { STATUS_LABEL, STATUS_STYLE, formatDate, rupiah } from "@/lib/utils";
import { ui } from "@/lib/ui";
import type { OrderRow, OrderStatus } from "@/lib/types";

type Action = { label: string; next: OrderStatus; danger?: boolean };

// Tombol aksi yang tersedia untuk tiap status pesanan
const ACTIONS: Record<OrderStatus, Action[]> = {
  pending: [
    { label: "Terima", next: "accepted" },
    { label: "Tolak", next: "rejected", danger: true },
  ],
  accepted: [{ label: "Mulai proses", next: "preparing" }],
  preparing: [{ label: "Siap diambil", next: "ready" }],
  ready: [{ label: "Selesai, sudah diambil", next: "completed" }],
  rejected: [],
  completed: [],
  cancelled: [],
};

const FINAL: OrderStatus[] = ["completed", "rejected", "cancelled"];

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.1;
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // browser memblokir suara sebelum ada interaksi, abaikan
  }
}

export default function SellerOrdersPage() {
  const { profile, ready } = useRequireRole(["seller"]);
  const uid = profile?.id;
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [hasStore, setHasStore] = useState(true);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const prevPending = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    const { data: s } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", uid)
      .maybeSingle();
    if (!s) {
      setHasStore(false);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("orders")
      .select(
        "id, status, total, note, created_at, store_id, profiles!orders_buyer_id_fkey(full_name), order_items(qty, price_at_order, menus(name))"
      )
      .eq("store_id", s.id)
      .order("created_at", { ascending: false });
    setOrders((data ?? []) as unknown as OrderRow[]);
    setLoading(false);
  }, [uid]);

  // Perbarui otomatis tiap 8 detik supaya pesanan baru cepat terlihat
  useEffect(() => {
    if (!ready) return;
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [ready, load]);

  // Bunyi dan tampilkan peringatan kalau ada pesanan baru yang menunggu
  useEffect(() => {
    const pending = orders.filter((o) => o.status === "pending").length;
    if (prevPending.current !== null && pending > prevPending.current) {
      beep();
      setNewOrderAlert(true);
    }
    prevPending.current = pending;
  }, [orders]);

  async function setStatus(id: string, next: OrderStatus) {
    setError("");
    const { error } = await supabase
      .from("orders")
      .update({ status: next })
      .eq("id", id);
    if (error) setError(error.message);
    else load();
  }

  if (!ready || loading) return <p className="text-stone-500">Memuat...</p>;

  if (!hasStore) {
    return (
      <div className={ui.card}>
        <p>Kamu belum punya toko, jadi belum ada pesanan.</p>
        <Link href="/seller" className={`${ui.btnPrimary} mt-3`}>
          Buat toko
        </Link>
      </div>
    );
  }

  const done = orders.filter((o) => o.status === "completed");
  const revenue = done.reduce((n, o) => n + o.total, 0);
  const shown = orders.filter((o) =>
    tab === "active" ? !FINAL.includes(o.status) : FINAL.includes(o.status)
  );

  // Menu terlaris dan penjualan 7 hari terakhir (dari pesanan selesai)
  const qtyByMenu = done
    .flatMap((o) => o.order_items)
    .reduce<Record<string, number>>((acc, it) => {
      const n = it.menus?.name ?? "Menu";
      acc[n] = (acc[n] ?? 0) + it.qty;
      return acc;
    }, {});
  const topMenus = Object.entries(qtyByMenu)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const byDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      label: d.toLocaleDateString("id-ID", { weekday: "short" }),
      total: done
        .filter((o) => new Date(o.created_at).toDateString() === d.toDateString())
        .reduce((n, o) => n + o.total, 0),
    };
  });
  const maxDay = Math.max(1, ...byDay.map((d) => d.total));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pesanan masuk</h1>
        <button className={ui.btn} onClick={load}>
          Segarkan
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={ui.card}>
          <p className="text-xs text-stone-500">Pesanan selesai</p>
          <p className="text-xl font-bold">{done.length}</p>
        </div>
        <div className={ui.card}>
          <p className="text-xs text-stone-500">Total penjualan</p>
          <p className="text-xl font-bold text-orange-600">{rupiah(revenue)}</p>
        </div>
      </div>

      {newOrderAlert && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-orange-100 px-3 py-2 text-sm text-orange-900">
          <span>Ada pesanan baru yang menunggu konfirmasi.</span>
          <button className={ui.btn} onClick={() => setNewOrderAlert(false)}>
            Tutup
          </button>
        </div>
      )}

      {done.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={ui.card}>
            <p className="mb-2 text-sm font-semibold">Penjualan 7 hari terakhir</p>
            <div className="flex gap-2">
              {byDay.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-20 w-full items-end">
                    <div
                      className="w-full rounded-t bg-orange-400"
                      style={{
                        height: `${(d.total / maxDay) * 100}%`,
                        minHeight: d.total ? 4 : 0,
                      }}
                      title={rupiah(d.total)}
                    />
                  </div>
                  <span className="text-xs text-stone-500">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={ui.card}>
            <p className="mb-2 text-sm font-semibold">Menu terlaris</p>
            <ol className="space-y-1 text-sm">
              {topMenus.map(([name, qty], i) => (
                <li key={name} className="flex justify-between">
                  <span>
                    {i + 1}. {name}
                  </span>
                  <span className="text-stone-500">{qty} porsi</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button className={ui.chip(tab === "active")} onClick={() => setTab("active")}>
          Aktif
        </button>
        <button className={ui.chip(tab === "history")} onClick={() => setTab("history")}>
          Riwayat
        </button>
      </div>

      {error && <p className={ui.error}>{error}</p>}

      {shown.length === 0 ? (
        <p className="text-sm text-stone-500">
          {tab === "active"
            ? "Belum ada pesanan aktif. Halaman ini diperbarui otomatis."
            : "Belum ada riwayat pesanan."}
        </p>
      ) : (
        shown.map((o) => (
          <div key={o.id} className={ui.card}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {o.profiles?.full_name || "Pembeli"}
                </p>
                <p className="text-xs text-stone-500">
                  #{o.id.slice(0, 6)}, {formatDate(o.created_at)}
                </p>
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
            {ACTIONS[o.status].length > 0 && (
              <div className="mt-3 flex gap-2">
                {ACTIONS[o.status].map((a) => (
                  <button
                    key={a.next}
                    className={a.danger ? ui.btnDanger : ui.btnPrimary}
                    onClick={() => setStatus(o.id, a.next)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
