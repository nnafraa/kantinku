"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { useCart } from "@/lib/cart";
import { ui } from "@/lib/ui";

const linkClass =
  "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-orange-50";

export default function Navbar() {
  const { profile, loading } = useProfile();
  const { count } = useCart();
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const role = profile?.role;

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
        <Link href="/" className="mr-2 text-lg font-extrabold text-orange-600">
          KantinKu
        </Link>

        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {(!role || role === "buyer") && (
            <>
              <Link href="/" className={linkClass}>
                Beranda
              </Link>
              <Link href="/cart" className={linkClass}>
                Keranjang{count > 0 ? ` (${count})` : ""}
              </Link>
            </>
          )}
          {role === "buyer" && (
            <Link href="/orders" className={linkClass}>
              Pesanan
            </Link>
          )}
          {role === "seller" && (
            <>
              <Link href="/seller" className={linkClass}>
                Toko saya
              </Link>
              <Link href="/seller/orders" className={linkClass}>
                Pesanan masuk
              </Link>
            </>
          )}
          {role === "admin" && (
            <Link href="/admin" className={linkClass}>
              Admin
            </Link>
          )}
        </div>

        {!loading &&
          (profile ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-stone-600 sm:inline">
                {profile.full_name}
              </span>
              <button onClick={logout} className={ui.btn}>
                Keluar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className={ui.btn}>
                Masuk
              </Link>
              <Link href="/register" className={ui.btnPrimary}>
                Daftar
              </Link>
            </div>
          ))}
      </nav>
    </header>
  );
}
