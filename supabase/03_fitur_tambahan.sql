-- ============================================================
-- KantinKu, tahap 4: pembatalan pesanan, validasi status, foto menu
-- Jalankan SEKALI di Supabase SQL Editor, setelah 02_pesanan_dan_admin.sql.
-- Kalau muncul error soal "unsafe use of new enum value", jalankan baris
-- "alter type" saja dulu (Run), lalu jalankan sisanya.
-- ============================================================

-- 1. Status baru: dibatalkan pembeli
alter type order_status add value if not exists 'cancelled';

-- 2. Pembeli membatalkan pesanannya sendiri selama masih menunggu konfirmasi
create function public.cancel_order(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_status order_status;
begin
  select status into v_status from orders
  where id = p_order_id and buyer_id = auth.uid()
  for update;

  if not found then
    raise exception 'Pesanan tidak ditemukan';
  end if;
  if v_status::text <> 'pending' then
    raise exception 'Pesanan sudah diproses penjual dan tidak bisa dibatalkan';
  end if;

  update orders set status = 'cancelled' where id = p_order_id;
end; $$;

-- 3. Stok dikembalikan kalau pesanan ditolak ATAU dibatalkan
create or replace function public.restore_stock_on_reject() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status::text in ('rejected', 'cancelled')
     and old.status::text not in ('rejected', 'cancelled') then
    update menus m set stock = m.stock + oi.qty
    from order_items oi
    where oi.order_id = new.id and oi.menu_id = m.id;
  end if;
  return new;
end; $$;

-- 4. place_order dibuat ulang: total dihitung SEBELUM pesanan dibuat,
--    supaya kolom total tidak perlu diubah lagi setelahnya
create or replace function public.place_order(
  p_store_id uuid,
  p_note text,
  p_items jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid;
  v_total int := 0;
  v_item jsonb;
  v_menu menus%rowtype;
  v_qty int;
begin
  if auth.uid() is null then
    raise exception 'Kamu harus login dulu';
  end if;

  if not exists (
    select 1 from stores where id = p_store_id and is_verified and is_open
  ) then
    raise exception 'Toko sedang tutup atau tidak tersedia';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang kosong';
  end if;

  -- Tahap 1: cek semua menu dan hitung total
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::int;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Jumlah menu tidak valid';
    end if;

    select * into v_menu from menus
    where id = (v_item->>'menu_id')::uuid and store_id = p_store_id
    for update;

    if not found or not v_menu.is_available then
      raise exception 'Ada menu yang tidak tersedia';
    end if;
    if v_menu.stock < v_qty then
      raise exception 'Stok % tinggal %', v_menu.name, v_menu.stock;
    end if;

    v_total := v_total + v_menu.price * v_qty;
  end loop;

  insert into orders (buyer_id, store_id, total, note)
  values (auth.uid(), p_store_id, v_total, p_note)
  returning id into v_order_id;

  -- Tahap 2: kurangi stok dan simpan item pesanan
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::int;
    select * into v_menu from menus
    where id = (v_item->>'menu_id')::uuid;

    update menus set stock = stock - v_qty where id = v_menu.id;
    insert into order_items (order_id, menu_id, qty, price_at_order)
    values (v_order_id, v_menu.id, v_qty, v_menu.price);
  end loop;

  return v_order_id;
end; $$;

-- 5. Validasi perubahan pesanan: penjual hanya boleh mengubah status,
--    dan hanya mengikuti urutan yang benar.
--    (auth.uid() null = dari SQL Editor, admin juga dikecualikan)
create function public.validate_order_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or my_role() = 'admin' then
    return new;
  end if;

  if new.buyer_id is distinct from old.buyer_id
     or new.store_id is distinct from old.store_id
     or new.total is distinct from old.total
     or new.note is distinct from old.note
     or new.created_at is distinct from old.created_at then
    raise exception 'Hanya status pesanan yang boleh diubah';
  end if;

  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status::text = 'pending'   and new.status::text in ('accepted', 'rejected'))
    or (old.status::text = 'accepted'  and new.status::text = 'preparing')
    or (old.status::text = 'preparing' and new.status::text = 'ready')
    or (old.status::text = 'ready'     and new.status::text = 'completed')
    or (old.status::text = 'pending'   and new.status::text = 'cancelled'
        and old.buyer_id = auth.uid())
  ) then
    raise exception 'Perubahan status tidak valid';
  end if;

  return new;
end; $$;

create trigger orders_validate_update
before update on orders
for each row execute function public.validate_order_update();

-- 6. Penyimpanan foto menu (Supabase Storage)
--    Bucket publik, maksimal 1 MB per file, hanya gambar.
--    Penjual hanya boleh mengelola file di folder bernama id tokonya.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-images', 'menu-images', true, 1048576,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "menu_images_insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'menu-images'
  and (storage.foldername(name))[1] in (
    select id::text from public.stores where owner_id = auth.uid()
  )
);

create policy "menu_images_update" on storage.objects for update to authenticated
using (
  bucket_id = 'menu-images'
  and (storage.foldername(name))[1] in (
    select id::text from public.stores where owner_id = auth.uid()
  )
);

create policy "menu_images_delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'menu-images'
  and (storage.foldername(name))[1] in (
    select id::text from public.stores where owner_id = auth.uid()
  )
);
