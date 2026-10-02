"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  menuId: string;
  name: string;
  price: number;
  qty: number;
  maxStock: number;
};

type CartState = { storeId: string | null; storeName: string; items: CartItem[] };

const EMPTY: CartState = { storeId: null, storeName: "", items: [] };
const KEY = "kantinku-cart";

type CartCtx = {
  storeId: string | null;
  storeName: string;
  items: CartItem[];
  count: number;
  total: number;
  addItem: (
    store: { id: string; name: string },
    item: Omit<CartItem, "qty">,
    replace?: boolean
  ) => boolean;
  replaceCart: (store: { id: string; name: string }, items: CartItem[]) => void;
  changeQty: (menuId: string, delta: number) => void;
  removeItem: (menuId: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  // Baca keranjang tersimpan saat halaman pertama dibuka
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {
      // abaikan data rusak
    }
    setHydrated(true);
  }, []);

  // Simpan setiap kali keranjang berubah
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // abaikan kalau storage penuh/diblokir
    }
  }, [state, hydrated]);

  const value: CartCtx = {
    ...state,
    count: state.items.reduce((n, i) => n + i.qty, 0),
    total: state.items.reduce((n, i) => n + i.qty * i.price, 0),

    // Mengembalikan false kalau keranjang berisi menu dari toko lain
    addItem(store, item, replace = false) {
      if (
        !replace &&
        state.storeId &&
        state.storeId !== store.id &&
        state.items.length > 0
      ) {
        return false;
      }
      setState((prev) => {
        const base: CartState =
          prev.storeId === store.id
            ? prev
            : { storeId: store.id, storeName: store.name, items: [] };
        const existing = base.items.find((i) => i.menuId === item.menuId);
        const items = existing
          ? base.items.map((i) =>
              i.menuId === item.menuId
                ? { ...i, qty: Math.min(i.qty + 1, i.maxStock) }
                : i
            )
          : [...base.items, { ...item, qty: 1 }];
        return { ...base, items };
      });
      return true;
    },

    // Mengganti seluruh isi keranjang (dipakai fitur "Pesan lagi")
    replaceCart(store, items) {
      setState(items.length ? { storeId: store.id, storeName: store.name, items } : EMPTY);
    },

    changeQty(menuId, delta) {
      setState((prev) => {
        const items = prev.items.flatMap((i) => {
          if (i.menuId !== menuId) return [i];
          const qty = Math.min(i.qty + delta, i.maxStock);
          return qty <= 0 ? [] : [{ ...i, qty }];
        });
        return items.length ? { ...prev, items } : EMPTY;
      });
    },

    removeItem(menuId) {
      setState((prev) => {
        const items = prev.items.filter((i) => i.menuId !== menuId);
        return items.length ? { ...prev, items } : EMPTY;
      });
    },

    clear() {
      setState(EMPTY);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart harus dipakai di dalam CartProvider");
  return ctx;
}
