"use client";

import { useState } from "react";
import MenuCard from "./MenuCard";
import { ui } from "@/lib/ui";
import type { Menu } from "@/lib/types";

type Pick = {
  reason: string;
  menu: Menu;
  store: { id: string; name: string; is_open: boolean };
  category: string | null;
};
type Reply = { source: "ai" | "keyword"; summary: string; picks: Pick[] };

const EXAMPLES = [
  "Budget 15 ribu, pengen yang pedas",
  "Minuman segar di bawah 10 ribu",
  "Makan berat paling murah",
];

export default function AiRecommend() {
  const [query, setQuery] = useState("");
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask(text: string) {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal mengambil rekomendasi");
      setReply(data as Reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
    setLoading(false);
  }

  return (
    <section className={`${ui.card} space-y-3 border-orange-200 bg-orange-50/50`}>
      <div>
        <h2 className="font-semibold">Bingung mau makan apa?</h2>
        <p className="text-sm text-stone-600">
          Ceritakan budget dan seleramu, nanti dicarikan menu yang cocok.
        </p>
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          ask(query);
        }}
      >
        <input
          className={ui.input}
          placeholder="Contoh: budget 15 ribu, pengen yang pedas"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={200}
        />
        <button className={ui.btnPrimary} disabled={loading}>
          {loading ? "Mencari..." : "Cari rekomendasi"}
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            className={ui.chip(false)}
            onClick={() => {
              setQuery(ex);
              ask(ex);
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      {error && <p className={ui.error}>{error}</p>}

      {reply && (
        <div className="space-y-3">
          <p className="text-sm">
            {reply.summary}{" "}
            <span className="text-xs text-stone-500">
              ({reply.source === "ai" ? "disarankan oleh AI" : "hasil pencarian kata kunci"})
            </span>
          </p>
          {reply.picks.length === 0 ? (
            <p className="text-sm text-stone-500">
              Belum ada menu dari toko yang sedang buka yang cocok. Coba ubah permintaanmu.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {reply.picks.map((p) => (
                <div key={p.menu.id}>
                  <MenuCard
                    menu={p.menu}
                    store={p.store}
                    categoryName={p.category ?? undefined}
                    showStore
                  />
                  <p className="mt-1 px-1 text-xs text-stone-600">{p.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
