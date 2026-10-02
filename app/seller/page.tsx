"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRequireRole } from "@/lib/useProfile";
import { rupiah } from "@/lib/utils";
import { uploadMenuImage } from "@/lib/images";
import { ui } from "@/lib/ui";
import type { Category, Menu, Store } from "@/lib/types";

function CreateStoreForm({
  ownerId,
  onCreated,
}: {
  ownerId: string;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.from("stores").insert({
      owner_id: ownerId,
      name: name.trim(),
      description: description.trim() || null,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    onCreated();
  }

  return (
    <form onSubmit={submit} className={`${ui.card} mx-auto flex max-w-md flex-col gap-3`}>
      <h2 className="text-lg font-semibold">Buat tokomu</h2>
      <p className="text-sm text-stone-600">
        Setelah dibuat, toko perlu diverifikasi admin sebelum muncul di
        beranda pembeli.
      </p>
      <input
        className={ui.input}
        placeholder="Nama toko"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <textarea
        className={ui.input}
        rows={2}
        placeholder="Deskripsi singkat (opsional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {error && <p className={ui.error}>{error}</p>}
      <button className={ui.btnPrimary} disabled={loading}>
        {loading ? "Menyimpan..." : "Buat toko"}
      </button>
    </form>
  );
}

function AddMenuForm({
  storeId,
  categories,
  onAdded,
  onError,
}: {
  storeId: string;
  categories: Category[];
  onAdded: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    let image_url: string | null = null;
    if (file) {
      try {
        image_url = await uploadMenuImage(storeId, file);
      } catch (err) {
        setLoading(false);
        onError(err instanceof Error ? err.message : "Gagal mengunggah foto");
        return;
      }
    }
    const { error } = await supabase.from("menus").insert({
      store_id: storeId,
      image_url,
      name: name.trim(),
      price: Number(price),
      stock: Number(stock),
      category_id: categoryId ? Number(categoryId) : null,
      description: description.trim() || null,
    });
    setLoading(false);
    if (error) {
      onError(error.message);
      return;
    }
    setName("");
    setPrice("");
    setStock("");
    setCategoryId("");
    setDescription("");
    setFile(null);
    setFileKey((k) => k + 1);
    onAdded();
  }

  return (
    <form onSubmit={submit} className={`${ui.card} grid gap-3 sm:grid-cols-2`}>
      <input
        className={ui.input}
        placeholder="Nama menu"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <select
        className={ui.input}
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
      >
        <option value="">Tanpa kategori</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        className={ui.input}
        type="number"
        min={0}
        placeholder="Harga (Rp)"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        required
      />
      <input
        className={ui.input}
        type="number"
        min={0}
        placeholder="Stok"
        value={stock}
        onChange={(e) => setStock(e.target.value)}
        required
      />
      <input
        className={`${ui.input} sm:col-span-2`}
        placeholder="Deskripsi singkat (opsional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <label className="text-xs text-stone-500 sm:col-span-2">
        Foto menu (opsional)
        <input
          key={fileKey}
          className={`${ui.input} mt-0.5`}
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
      <button className={`${ui.btnPrimary} sm:col-span-2`} disabled={loading}>
        {loading ? "Menyimpan..." : "Tambah menu"}
      </button>
    </form>
  );
}

function MenuRow({
  menu,
  categoryName,
  onChanged,
  onError,
}: {
  menu: Menu;
  categoryName?: string;
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const [price, setPrice] = useState(String(menu.price));
  const [stock, setStock] = useState(String(menu.stock));
  const [uploading, setUploading] = useState(false);
  const dirty = Number(price) !== menu.price || Number(stock) !== menu.stock;

  async function save() {
    const { error } = await supabase
      .from("menus")
      .update({ price: Number(price), stock: Number(stock) })
      .eq("id", menu.id);
    if (error) onError(error.message);
    else onChanged();
  }

  async function toggle() {
    const { error } = await supabase
      .from("menus")
      .update({ is_available: !menu.is_available })
      .eq("id", menu.id);
    if (error) onError(error.message);
    else onChanged();
  }

  async function changePhoto(file: File) {
    setUploading(true);
    try {
      const url = await uploadMenuImage(menu.store_id, file);
      const { error } = await supabase
        .from("menus")
        .update({ image_url: url })
        .eq("id", menu.id);
      if (error) onError(error.message);
      else onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Gagal mengunggah foto");
    }
    setUploading(false);
  }

  async function remove() {
    if (!confirm(`Hapus menu ${menu.name}?`)) return;
    const { error } = await supabase.from("menus").delete().eq("id", menu.id);
    if (error) {
      // 23503 = pelanggaran foreign key: menu sudah ada di riwayat pesanan
      onError(
        error.code === "23503"
          ? "Menu ini sudah pernah dipesan sehingga tidak bisa dihapus. Nonaktifkan saja."
          : error.message
      );
    } else onChanged();
  }

  return (
    <div className={`${ui.card} flex flex-col gap-3 sm:flex-row sm:items-center`}>
      {menu.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={menu.image_url}
          alt={menu.name}
          className="h-16 w-16 shrink-0 rounded-lg bg-stone-100 object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-xs text-stone-400">
          Tanpa foto
        </div>
      )}
      <div className="flex-1">
        <p className="font-semibold">
          {menu.name}{" "}
          {!menu.is_available && (
            <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-normal text-stone-600">
              Nonaktif
            </span>
          )}
        </p>
        <p className="text-xs text-stone-500">
          {categoryName ?? "Tanpa kategori"}, saat ini {rupiah(menu.price)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-stone-500">
          Harga
          <input
            className={`${ui.input} mt-0.5 w-28`}
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label className="text-xs text-stone-500">
          Stok
          <input
            className={`${ui.input} mt-0.5 w-20`}
            type="number"
            min={0}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </label>
        <button className={ui.btnPrimary} onClick={save} disabled={!dirty}>
          Simpan
        </button>
        <button className={ui.btn} onClick={toggle}>
          {menu.is_available ? "Nonaktifkan" : "Aktifkan"}
        </button>
        <label className={`${ui.btn} cursor-pointer`}>
          {uploading ? "Mengunggah..." : "Ganti foto"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) changePhoto(f);
              e.target.value = "";
            }}
          />
        </label>
        <button className={ui.btnDanger} onClick={remove}>
          Hapus
        </button>
      </div>
    </div>
  );
}

function EditStoreForm({
  store,
  onSaved,
  onError,
}: {
  store: Store;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState(store.name);
  const [description, setDescription] = useState(store.description ?? "");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from("stores")
      .update({ name: name.trim(), description: description.trim() || null })
      .eq("id", store.id);
    setLoading(false);
    if (error) onError(error.message);
    else onSaved();
  }

  return (
    <form onSubmit={submit} className={`${ui.card} flex flex-col gap-3`}>
      <input
        className={ui.input}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nama toko"
        required
      />
      <textarea
        className={ui.input}
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Deskripsi toko"
      />
      <button className={ui.btnPrimary} disabled={loading}>
        {loading ? "Menyimpan..." : "Simpan perubahan"}
      </button>
    </form>
  );
}

export default function SellerPage() {
  const { profile, ready } = useRequireRole(["seller"]);
  const uid = profile?.id;
  const [store, setStore] = useState<Store | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    const { data: s } = await supabase
      .from("stores")
      .select("*")
      .eq("owner_id", uid)
      .maybeSingle();
    setStore(s as Store | null);
    if (s) {
      const { data: m } = await supabase
        .from("menus")
        .select("*")
        .eq("store_id", s.id)
        .order("name");
      setMenus((m ?? []) as Menu[]);
    }
    const { data: c } = await supabase.from("categories").select("*").order("name");
    setCategories((c ?? []) as Category[]);
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  async function toggleOpen() {
    if (!store) return;
    setError("");
    const { error } = await supabase
      .from("stores")
      .update({ is_open: !store.is_open })
      .eq("id", store.id);
    if (error) setError(error.message);
    else load();
  }

  if (!ready || loading) return <p className="text-stone-500">Memuat...</p>;

  if (!store && uid) {
    return <CreateStoreForm ownerId={uid} onCreated={load} />;
  }
  if (!store) return null;

  const categoryName = (id: number | null) =>
    categories.find((c) => c.id === id)?.name;

  return (
    <div className="space-y-6">
      <section className={`${ui.card} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <h1 className="text-2xl font-bold">{store.name}</h1>
          {store.description && (
            <p className="text-sm text-stone-600">{store.description}</p>
          )}
          <div className="mt-2 flex gap-2 text-xs">
            <span
              className={`rounded-full px-2 py-0.5 ${
                store.is_verified
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {store.is_verified ? "Terverifikasi" : "Menunggu verifikasi admin"}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 ${
                store.is_open
                  ? "bg-green-100 text-green-800"
                  : "bg-stone-200 text-stone-600"
              }`}
            >
              {store.is_open ? "Toko buka" : "Toko tutup"}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className={ui.btn} onClick={() => setEditing((v) => !v)}>
            {editing ? "Batal ubah" : "Ubah info toko"}
          </button>
          <button className={ui.btnPrimary} onClick={toggleOpen}>
            {store.is_open ? "Tutup toko" : "Buka toko"}
          </button>
        </div>
      </section>

      {editing && (
        <EditStoreForm
          store={store}
          onSaved={() => {
            setEditing(false);
            setError("");
            load();
          }}
          onError={setError}
        />
      )}

      {!store.is_verified && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Tokomu belum tampil di beranda pembeli. Kamu bisa menyiapkan menu
          sambil menunggu admin memverifikasi.
        </p>
      )}
      {error && <p className={ui.error}>{error}</p>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Tambah menu</h2>
        <AddMenuForm
          storeId={store.id}
          categories={categories}
          onAdded={() => {
            setError("");
            load();
          }}
          onError={setError}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Menu ({menus.length})</h2>
        {menus.length === 0 ? (
          <p className="text-sm text-stone-500">
            Belum ada menu. Tambahkan menu pertamamu di atas.
          </p>
        ) : (
          menus.map((m) => (
            <MenuRow
              key={`${m.id}-${m.price}-${m.stock}`}
              menu={m}
              categoryName={categoryName(m.category_id)}
              onChanged={() => {
                setError("");
                load();
              }}
              onError={setError}
            />
          ))
        )}
      </section>
    </div>
  );
}
