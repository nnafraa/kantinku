"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { rupiah } from "@/lib/utils";
import { ui } from "@/lib/ui";
import type { Menu } from "@/lib/types";

type Props = {
  menu: Menu;
  store: { id: string; name: string; is_open: boolean };
  categoryName?: string;
  showStore?: boolean;
};

export default function MenuCard({ menu, store, categoryName, showStore }: Props) {
  const cart = useCart();
  const inCart = cart.items.find((i) => i.menuId === menu.id)?.qty ?? 0;
  const soldOut = !menu.is_available || menu.stock <= 0;
  const maxed = inCart >= menu.stock;
  const disabled = soldOut || !store.is_open || maxed;

  const label = soldOut
    ? "Habis"
    : !store.is_open
    ? "Toko tutup"
    : maxed
    ? "Stok maksimal"
    : "Tambah";

  function add() {
    const item = {
      menuId: menu.id,
      name: menu.name,
      price: menu.price,
      maxStock: menu.stock,
    };
    if (!cart.addItem(store, item)) {
      const ok = confirm(
        `Keranjangmu berisi menu dari ${cart.storeName}. Kosongkan keranjang dan pesan dari ${store.name}?`
      );
      if (ok) cart.addItem(store, item, true);
    }
  }

  return (
    <div className={`${ui.card} flex flex-col justify-between gap-3`}>
      <div>
        {menu.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={menu.image_url}
            alt={menu.name}
            loading="lazy"
            className="mb-2 aspect-[4/3] w-full rounded-lg bg-stone-100 object-cover"
          />
        )}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{menu.name}</h3>
          {categoryName && (
            <span className="shrink-0 rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
              {categoryName}
            </span>
          )}
        </div>
        {showStore && (
          <Link
            href={`/store/${store.id}`}
            className="text-xs text-stone-500 hover:underline"
          >
            {store.name}
          </Link>
        )}
        {menu.description && (
          <p className="mt-1 text-sm text-stone-600">{menu.description}</p>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="font-bold text-orange-600">{rupiah(menu.price)}</p>
          <p className="text-xs text-stone-500">
            Sisa {menu.stock}
            {inCart > 0 ? `, di keranjang ${inCart}` : ""}
          </p>
        </div>
        <button className={ui.btnPrimary} disabled={disabled} onClick={add}>
          {label}
        </button>
      </div>
    </div>
  );
}
