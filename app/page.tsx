"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import MenuCard from "@/components/MenuCard";
import AiRecommend from "@/components/AiRecommend";
import { ui } from "@/lib/ui";
import type { Category, Menu, Store } from "@/lib/types";

type StoreCard = Pick<Store, "id" | "name" | "description" | "is_open">;
type MenuWithStore = Menu & {
  stores: { id: string; name: string; is_open: boolean };
};

export default function Home() {
  const [stores, setStores] = useState<StoreCard[]>([]);
  const [menus, setMenus] = useState<MenuWithStore[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const [s, m, c] = await Promise.all([
        supabase
          .from("stores")
          .select("id, name, description, is_open")
          .eq("is_verified", true)
          .order("is_open", { ascending: false }),
        // stores!inner: menu hanya muncul kalau tokonya terlihat (terverifikasi)
        supabase
          .from("menus")
          .select("*, stores!inner(id, name, is_open)")
          .eq("is_available", true)
          .gt("stock", 0)
          .limit(200),
        supabase.from("categories").select("*").order("name"),
      ]);
      const firstError = s.error ?? m.error ?? c.error;
      if (firstError) setError(firstError.message);
      setStores((s.data ?? []) as StoreCard[]);
      setMenus((m.data ?? []) as unknown as MenuWithStore[]);
      setCategories((c.data ?? []) as Category[]);
      setLoading(false);
    }
    load();
  }, []);

  const term = q.trim().toLowerCase();

  const filteredMenus = useMemo(() => {
    const max = Number(maxPrice);
    return menus.filter(
      (m) =>
        (!term ||
          m.name.toLowerCase().includes(term) ||
          m.stores.name.toLowerCase().includes(term)) &&
        (cat === null || m.category_id === cat) &&
        (!max || m.price <= max)
    );
  }, [menus, term, cat, maxPrice]);

  const filteredStores = stores.filter(
    (s) => !term || s.name.toLowerCase().includes(term)
  );

  const categoryName = (id: number | null) =>
    categories.find((c) => c.id === id)?.name;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">Mau makan apa hari ini?</h1>
        <p className="text-sm text-stone-600">
          Pesan dari kantin, ambil tanpa antre.
        </p>
        <div className="mt-4">
          <AiRecommend />
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className={ui.input}
            placeholder="Cari makanan atau nama toko"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <input
            className={`${ui.input} sm:w-52`}
            type="number"
            min={0}
            placeholder="Budget maksimal (Rp)"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button className={ui.chip(cat === null)} onClick={() => setCat(null)}>
            Semua
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={ui.chip(cat === c.id)}
              onClick={() => setCat(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </section>

      {error && <p className={ui.error}>{error}</p>}
      {loading && <p className="text-stone-500">Memuat...</p>}

      {!loading && (
        <>
          <section>
            <h2 className="mb-3 text-lg font-semibold">Toko</h2>
            {filteredStores.length === 0 ? (
              <p className="text-sm text-stone-500">
                Belum ada toko yang cocok. Toko baru muncul setelah diverifikasi
                admin.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredStores.map((s) => (
                  <Link
                    key={s.id}
                    href={`/store/${s.id}`}
                    className={`${ui.card} hover:border-orange-300`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold">{s.name}</h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                          s.is_open
                            ? "bg-green-100 text-green-800"
                            : "bg-stone-200 text-stone-600"
                        }`}
                      >
                        {s.is_open ? "Buka" : "Tutup"}
                      </span>
                    </div>
                    {s.description && (
                      <p className="mt-1 text-sm text-stone-600">
                        {s.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold">Menu</h2>
            {filteredMenus.length === 0 ? (
              <p className="text-sm text-stone-500">
                Tidak ada menu yang cocok dengan pencarianmu. Coba ubah kata
                kunci, kategori, atau budget.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMenus.map((m) => (
                  <MenuCard
                    key={m.id}
                    menu={m}
                    store={m.stores}
                    categoryName={categoryName(m.category_id)}
                    showStore
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
