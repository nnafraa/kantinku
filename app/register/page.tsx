"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { homeFor } from "@/lib/utils";
import { ui } from "@/lib/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(homeFor(role));
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold">Daftar KantinKu</h1>
      <form onSubmit={handleSubmit} className={`${ui.card} mt-4 flex flex-col gap-3`}>
        <input
          className={ui.input}
          placeholder="Nama lengkap"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
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
          placeholder="Password (minimal 6 karakter)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <select
          className={ui.input}
          value={role}
          onChange={(e) => setRole(e.target.value as "buyer" | "seller")}
        >
          <option value="buyer">Saya pembeli</option>
          <option value="seller">Saya penjual</option>
        </select>
        {error && <p className={ui.error}>{error}</p>}
        <button className={ui.btnPrimary} disabled={loading}>
          {loading ? "Memproses..." : "Daftar"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        Sudah punya akun?{" "}
        <Link href="/login" className="text-orange-600 underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
