"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import MenuCard from "@/components/MenuCard";
import { ui } from "@/lib/ui";
import { formatDate } from "@/lib/utils";
import type { Category, Menu, Store } from "@/lib/types";

type Review = { rating: number; comment: string | null; created_at: string };

export default function StorePage() {
  const { id } = useParams<{ id: string }>();
  const [store, setStore] = useState<Store | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [s, m, c, r] = await Promise.all([
        supabase.from("stores").select("*").eq("id", id).maybeSingle(),
        supabase.from("menus").select("*").eq("store_id", id).order("name"),
        supabase.from("categories").select("*"),
        supabase
          .from("reviews")
          .select("rating, comment, created_at")
          .eq("store_id", id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      setStore(s.data as Store | null);
      setMenus((m.data ?? []) as Menu[]);
      setCategories((c.data ?? []) as Category[]);
      setReviews((r.data ?? []) as Review[]);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <p className="text-stone-500">Memuat...</p>;
  if (!store) return <p>Toko tidak ditemukan atau belum diverifikasi.</p>;

  const avg = reviews.length
    ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length
    : null;
  const categoryName = (cid: number | null) =>
    categories.find((c) => c.id === cid)?.name;

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{store.name}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              store.is_open
                ? "bg-green-100 text-green-800"
                : "bg-stone-200 text-stone-600"
            }`}
          >
            {store.is_open ? "Buka" : "Tutup"}
          </span>
        </div>
        {store.description && (
          <p className="mt-1 text-stone-600">{store.description}</p>
        )}
        <p className="mt-1 text-sm text-stone-500">
          {avg !== null
            ? `Rating ${avg.toFixed(1)} dari ${reviews.length} ulasan`
            : "Belum ada ulasan"}
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Menu</h2>
        {menus.length === 0 ? (
          <p className="text-sm text-stone-500">Toko ini belum punya menu.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {menus.map((m) => (
              <MenuCard
                key={m.id}
                menu={m}
                store={store}
                categoryName={categoryName(m.category_id)}
              />
            ))}
          </div>
        )}
      </section>

      {reviews.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Ulasan</h2>
          <div className="space-y-2">
            {reviews.map((r, i) => (
              <div key={i} className={ui.card}>
                <p className="text-sm font-medium text-amber-600">
                  {"★".repeat(r.rating)}
                  <span className="text-stone-300">
                    {"★".repeat(5 - r.rating)}
                  </span>
                  <span className="ml-2 text-xs font-normal text-stone-500">
                    {formatDate(r.created_at)}
                  </span>
                </p>
                {r.comment && <p className="mt-1 text-sm">{r.comment}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
