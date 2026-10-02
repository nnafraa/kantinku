"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/lib/cart";
import { rupiah } from "@/lib/utils";
import { ui } from "@/lib/ui";

export default function CartPage() {
  const cart = useCart();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkout() {
    setError("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    setLoading(true);
    // place_order adalah fungsi di database: menghitung total, mengecek dan
    // mengurangi stok, lalu membuat pesanan, semuanya dalam satu transaksi
    const { error } = await supabase.rpc("place_order", {
      p_store_id: cart.storeId,
      p_note: note.trim() || null,
      p_items: cart.items.map((i) => ({ menu_id: i.menuId, qty: i.qty })),
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    cart.clear();
    router.push("/orders");
  }

  if (cart.items.length === 0) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Keranjang kosong</h1>
        <p className="mt-1 text-stone-600">
          Pilih menu dari salah satu toko dulu.
        </p>
        <Link href="/" className={`${ui.btnPrimary} mt-4`}>
          Lihat menu
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Keranjang</h1>
        <p className="text-sm text-stone-600">Pesanan dari {cart.storeName}</p>
      </div>

      <div className={`${ui.card} divide-y divide-stone-100`}>
        {cart.items.map((i) => (
          <div key={i.menuId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <div className="flex-1">
              <p className="font-medium">{i.name}</p>
              <p className="text-sm text-stone-500">{rupiah(i.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className={ui.btn}
                onClick={() => cart.changeQty(i.menuId, -1)}
                aria-label={`Kurangi ${i.name}`}
              >
                -
              </button>
              <span className="w-6 text-center">{i.qty}</span>
              <button
                className={ui.btn}
                onClick={() => cart.changeQty(i.menuId, 1)}
                disabled={i.qty >= i.maxStock}
                aria-label={`Tambah ${i.name}`}
              >
                +
              </button>
            </div>
            <p className="w-24 text-right font-semibold">
              {rupiah(i.price * i.qty)}
            </p>
          </div>
        ))}
      </div>

      <textarea
        className={ui.input}
        rows={2}
        placeholder="Catatan untuk penjual (opsional), misalnya tidak pakai sambal"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="flex items-center justify-between text-lg font-bold">
        <span>Total</span>
        <span className="text-orange-600">{rupiah(cart.total)}</span>
      </div>
      <p className="text-sm text-stone-500">
        Pembayaran dilakukan di tempat saat kamu mengambil pesanan.
      </p>

      {error && <p className={ui.error}>{error}</p>}
      <button
        className={`${ui.btnPrimary} w-full`}
        onClick={checkout}
        disabled={loading}
      >
        {loading ? "Memproses..." : "Buat pesanan"}
      </button>
    </div>
  );
}
