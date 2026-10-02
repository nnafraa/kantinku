"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { homeFor } from "@/lib/utils";
import { ui } from "@/lib/ui";
import type { Role } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setLoading(false);
      setError(error?.message ?? "Gagal masuk. Periksa email dan password.");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    setLoading(false);
    router.push(homeFor(profile?.role as Role | undefined));
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold">Masuk ke KantinKu</h1>
      <form onSubmit={handleSubmit} className={`${ui.card} mt-4 flex flex-col gap-3`}>
        <input
          className={ui.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={ui.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className={ui.error}>{error}</p>}
        <button className={ui.btnPrimary} disabled={loading}>
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        Belum punya akun?{" "}
        <Link href="/register" className="text-orange-600 underline">
          Daftar
        </Link>
      </p>
    </div>
  );
}
