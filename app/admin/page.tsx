"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { STATUS_LABEL, STATUS_STYLE, formatDate, rupiah } from "@/lib/utils";
import { ui } from "@/lib/ui";
import type { Category, OrderStatus, Profile } from "@/lib/types";

type StoreRow = {
  id: string;
  name: string;
  is_open: boolean;
  is_verified: boolean;
  profiles: { full_name: string } | null;
};

type AdminOrder = {
  id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  stores: { name: string } | null;
};

const ROLE_LABEL = { buyer: "Pembeli", seller: "Penjual", admin: "Admin" };

export default function AdminPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useProfile();
  const ready = profile?.role === "admin";

  useEffect(() => {
    if (!authLoading && !profile) router.replace("/login");
  }, [authLoading, profile, router]);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [s, u, c, o] = await Promise.all([
      supabase
        .from("stores")
        .select("id, name, is_open, is_verified, profiles!stores_owner_id_fkey(full_name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name, role")
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
      supabase
        .from("orders")
        .select("id, status, total, created_at, stores!orders_store_id_fkey(name)")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setStores((s.data ?? []) as unknown as StoreRow[]);
    setUsers((u.data ?? []) as Profile[]);
    setCategories((c.data ?? []) as Category[]);
    setOrders((o.data ?? []) as unknown as AdminOrder[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  async function setVerified(id: string, value: boolean) {
    setError("");
    const { error } = await supabase
      .from("stores")
      .update({ is_verified: value })
      .eq("id", id);
    if (error) setError(error.message);
    else load();
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error } = await supabase
      .from("categories")
      .insert({ name: newCategory.trim() });
    if (error) {
      setError(error.message);
      return;
    }
    setNewCategory("");
    load();
  }

  async function removeCategory(id: number) {
    setError("");
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      setError(
        error.code === "23503"
          ? "Kategori ini masih dipakai oleh menu, jadi tidak bisa dihapus."
          : error.message
      );
    } else load();
  }

  if (profile && profile.role !== "admin") {
    return (
      <div className={`${ui.card} mx-auto max-w-lg space-y-2`}>
        <h1 className="text-lg font-bold">Halaman ini khusus admin</h1>
        <p className="text-sm text-stone-600">
          Akun yang sedang masuk berperan sebagai {ROLE_LABEL[profile.role]}. Untuk
          menjadikannya admin, buka Supabase, pilih Table Editor, tabel profiles,
          ubah kolom role di baris akunmu menjadi admin, lalu muat ulang halaman ini.
        </p>
      </div>
    );
  }
  if (!ready || loading) return <p className="text-stone-500">Memuat...</p>;

  const pending = stores.filter((s) => !s.is_verified);
  const verified = stores.filter((s) => s.is_verified);

  const renderStore = (s: StoreRow) => (
    <div key={s.id} className={`${ui.card} flex items-center justify-between gap-3`}>
      <div>
        <p className="font-semibold">{s.name}</p>
        <p className="text-xs text-stone-500">
          Pemilik: {s.profiles?.full_name || "-"}
        </p>
      </div>
      {s.is_verified ? (
        <button className={ui.btnDanger} onClick={() => setVerified(s.id, false)}>
          Cabut verifikasi
        </button>
      ) : (
        <button className={ui.btnPrimary} onClick={() => setVerified(s.id, true)}>
          Verifikasi
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard admin</h1>
      {error && <p className={ui.error}>{error}</p>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Menunggu verifikasi ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-stone-500">Tidak ada toko yang menunggu.</p>
        ) : (
          pending.map(renderStore)
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Toko terverifikasi ({verified.length})
        </h2>
        {verified.map(renderStore)}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Kategori menu</h2>
        <form onSubmit={addCategory} className="flex gap-2">
          <input
            className={ui.input}
            placeholder="Nama kategori baru"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            required
          />
          <button className={ui.btnPrimary}>Tambah</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white py-1 pl-3 pr-2 text-sm"
            >
              {c.name}
              <button
                onClick={() => removeCategory(c.id)}
                className="rounded-full px-1.5 text-stone-500 hover:bg-stone-100"
                aria-label={`Hapus kategori ${c.name}`}
              >
                x
              </button>
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pengguna ({users.length})</h2>
        <div className={`${ui.card} divide-y divide-stone-100`}>
          {users.map((u) => (
            <div key={u.id} className="flex justify-between py-2 first:pt-0 last:pb-0 text-sm">
              <span>{u.full_name || "(tanpa nama)"}</span>
              <span className="text-stone-500">{ROLE_LABEL[u.role]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pesanan terbaru</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-stone-500">Belum ada pesanan.</p>
        ) : (
          <div className={`${ui.card} divide-y divide-stone-100`}>
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0 text-sm">
                <div>
                  <p className="font-medium">{o.stores?.name ?? "Toko"}</p>
                  <p className="text-xs text-stone-500">
                    #{o.id.slice(0, 6)}, {formatDate(o.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span>{rupiah(o.total)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[o.status]}`}
                  >
                    {STATUS_LABEL[o.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
