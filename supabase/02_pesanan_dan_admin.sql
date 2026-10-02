-- ============================================================
-- KantinKu, tahap 3: pesanan aman, verifikasi toko, dan admin
-- Jalankan SEKALI di Supabase SQL Editor (setelah skema + RLS tahap 2)
-- ============================================================

-- 1. Satu penjual hanya boleh punya satu toko
alter table stores add constraint stores_owner_unique unique (owner_id);

-- 2. Menu hanya terlihat kalau tokonya terlihat (terverifikasi),
--    kecuali oleh pemilik toko dan admin
drop policy if exists "menus_select" on menus;
create policy "menus_select" on menus for select using (
  exists (
    select 1 from stores s
    where s.id = store_id
      and (s.is_verified or s.owner_id = auth.uid() or my_role() = 'admin')
  )
);

-- 3. Penjual boleh melihat nama pembeli yang memesan di tokonya
create policy "profiles_select_seller" on profiles for select using (
  exists (
    select 1 from orders o
    join stores s on s.id = o.store_id
    where o.buyer_id = profiles.id and s.owner_id = auth.uid()
  )
);

-- 4. Hanya admin yang boleh mengubah is_verified
--    (auth.uid() null = dijalankan dari SQL Editor, jadi tetap diizinkan)
create function public.protect_verified() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and my_role() is distinct from 'admin' then
    if tg_op = 'INSERT' then
      new.is_verified := false;
    elsif new.is_verified is distinct from old.is_verified then
      new.is_verified := old.is_verified;
    end if;
  end if;
  return new;
end; $$;

create trigger stores_protect_verified
before insert or update on stores
for each row execute function public.protect_verified();

-- 5. Checkout lewat fungsi database.
--    Total dihitung dari harga di database (bukan dari browser), stok dicek
--    dan dikurangi, semuanya dalam satu transaksi.
create function public.place_order(
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
    select 1 from stores
    where id = p_store_id and is_verified and is_open
  ) then
    raise exception 'Toko sedang tutup atau tidak tersedia';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang kosong';
  end if;

  insert into orders (buyer_id, store_id, total, note)
  values (auth.uid(), p_store_id, 0, p_note)
  returning id into v_order_id;

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

    update menus set stock = stock - v_qty where id = v_menu.id;
    insert into order_items (order_id, menu_id, qty, price_at_order)
    values (v_order_id, v_menu.id, v_qty, v_menu.price);

    v_total := v_total + v_menu.price * v_qty;
  end loop;

  update orders set total = v_total where id = v_order_id;
  return v_order_id;
end; $$;

-- 6. Pesanan hanya boleh dibuat lewat place_order, jadi insert langsung ditutup
drop policy if exists "orders_insert" on orders;
drop policy if exists "items_insert" on order_items;

-- 7. Stok dikembalikan kalau penjual menolak pesanan
create function public.restore_stock_on_reject() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'rejected' and old.status <> 'rejected' then
    update menus m set stock = m.stock + oi.qty
    from order_items oi
    where oi.order_id = new.id and oi.menu_id = m.id;
  end if;
  return new;
end; $$;

create trigger orders_restore_stock
after update of status on orders
for each row execute function public.restore_stock_on_reject();

-- ============================================================
-- LANGKAH MANUAL (jalankan terpisah setelah blok di atas berhasil)
-- ============================================================

-- A. Jadikan akunmu admin (ganti emailnya, lalu hapus tanda -- di depan):
-- update profiles set role = 'admin'
-- where id = (select id from auth.users where email = 'EMAIL_KAMU@contoh.com');

-- B. Verifikasi semua toko yang ada (opsional, untuk tes cepat):
-- update stores set is_verified = true;
