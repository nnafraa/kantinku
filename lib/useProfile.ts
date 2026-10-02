"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";
import type { Profile, Role } from "./types";

// Mengambil profil pengguna yang sedang login (null kalau belum login)
export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (active) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .single();
      if (active) {
        setProfile(data as Profile | null);
        setLoading(false);
      }
    }

    load();
    // setTimeout menghindari deadlock saat memanggil Supabase di dalam callback auth
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setTimeout(load, 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { profile, loading };
}

// Menjaga halaman: hanya peran tertentu yang boleh masuk.
// Belum login -> /login, peran salah -> beranda.
export function useRequireRole(roles: Role[]) {
  const router = useRouter();
  const { profile, loading } = useProfile();
  const key = roles.join(",");
  const allowed = !!profile && key.split(",").includes(profile.role);

  useEffect(() => {
    if (loading) return;
    if (!profile) router.replace("/login");
    else if (!key.split(",").includes(profile.role)) router.replace("/");
  }, [loading, profile, key, router]);

  return { profile: allowed ? profile : null, ready: !loading && allowed };
}
