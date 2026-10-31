-- =====================================================================
-- Gestión de inventario y pedidos · Esquema de base de datos (Supabase)
-- Ejecutar completo en: Supabase → SQL Editor → New query → Run
-- Datos 100 % sintéticos (sin datos personales reales).
-- =====================================================================

-- ---------- 1. TABLAS (modelo relacional SQL) ----------

-- Perfil de cada usuario de Supabase Auth, con su ROL de negocio (RBAC)
create table if not exists public.perfiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique,
  nombre     text,
  rol        text not null default 'usuario' check (rol in ('admin', 'usuario')),
  creado_en  timestamptz not null default now()
);

create table if not exists public.productos (
  id         bigint generated always as identity primary key,
  sku        text not null unique,
  nombre     text not null,
  categoria  text not null,
  precio     numeric(10, 2) not null check (precio >= 0),
  stock      integer not null default 0 check (stock >= 0),
  creado_en  timestamptz not null default now()
);

create table if not exists public.pedidos (
  id           bigint generated always as identity primary key,
  usuario_id   uuid not null default auth.uid() references public.perfiles (id),
  producto_id  bigint not null references public.productos (id),
  cantidad     integer not null check (cantidad > 0),
  total        numeric(10, 2) not null default 0,
  estado       text not null default 'pendiente' check (estado in ('pendiente', 'enviado', 'cancelado')),
  creado_en    timestamptz not null default now()
);

-- "Documentos" en tiempo real (parte NoSQL simulada): cada fila es un documento JSON libre
create table if not exists public.actividad (
  id         bigint generated always as identity primary key,
  tipo       text not null,            -- 'pedido_nuevo' | 'stock_bajo' | 'producto_nuevo'
  datos      jsonb not null,           -- documento sin esquema fijo
  creado_en  timestamptz not null default now()
);

-- ---------- 2. FUNCIONES AUXILIARES ----------

-- ¿El usuario actual es admin? Se consulta la tabla (fuente de verdad: un cambio de rol
-- surte efecto al instante). security definer → evita recursión de RLS sobre perfiles.
create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin');
$$;

-- Al registrarse un usuario en Auth se crea su perfil con rol 'usuario'
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, email, nombre)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil();

-- Antes de guardar un pedido: el total lo calcula el SERVIDOR (no se confía en el cliente)
-- y se comprueba/descuenta el stock
create or replace function public.preparar_pedido()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p public.productos;
begin
  select * into p from public.productos where id = new.producto_id for update;
  if p.stock < new.cantidad then
    raise exception 'Stock insuficiente para %', p.nombre;
  end if;
  new.total := p.precio * new.cantidad;
  update public.productos set stock = stock - new.cantidad where id = p.id;
  return new;
end $$;

drop trigger if exists antes_de_pedido on public.pedidos;
create trigger antes_de_pedido before insert on public.pedidos
  for each row execute function public.preparar_pedido();

-- Tras un pedido o un cambio de stock se publica un documento en "actividad"
create or replace function public.registrar_pedido()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.actividad (tipo, datos)
  select 'pedido_nuevo', jsonb_build_object(
    'pedido_id', new.id, 'producto', pr.nombre, 'cantidad', new.cantidad,
    'total', new.total, 'usuario', pe.nombre)
  from public.productos pr, public.perfiles pe
  where pr.id = new.producto_id and pe.id = new.usuario_id;
  return new;
end $$;

drop trigger if exists despues_de_pedido on public.pedidos;
create trigger despues_de_pedido after insert on public.pedidos
  for each row execute function public.registrar_pedido();

create or replace function public.vigilar_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stock < 5 and (tg_op = 'INSERT' or old.stock >= 5) then
    insert into public.actividad (tipo, datos)
    values ('stock_bajo', jsonb_build_object('producto', new.nombre, 'sku', new.sku, 'stock', new.stock));
  end if;
  if tg_op = 'INSERT' then
    insert into public.actividad (tipo, datos)
    values ('producto_nuevo', jsonb_build_object('producto', new.nombre, 'sku', new.sku, 'precio', new.precio));
  end if;
  return new;
end $$;

drop trigger if exists stock_cambiado on public.productos;
create trigger stock_cambiado after insert or update of stock on public.productos
  for each row execute function public.vigilar_stock();

-- Custom Access Token Hook: añade el claim "app_rol" al JWT (ver memoria de seguridad)
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare
  claims jsonb := event -> 'claims';
  v_rol  text;
begin
  select rol into v_rol from public.perfiles where id = (event ->> 'user_id')::uuid;
  claims := jsonb_set(claims, '{app_rol}', to_jsonb(coalesce(v_rol, 'usuario')));
  return jsonb_set(event, '{claims}', claims);
end $$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
grant select on table public.perfiles to supabase_auth_admin;

-- ---------- 3. ROW LEVEL SECURITY (autorización en el servidor) ----------

alter table public.perfiles  enable row level security;
alter table public.productos enable row level security;
alter table public.pedidos   enable row level security;
alter table public.actividad enable row level security;

drop policy if exists "auth admin lee perfiles" on public.perfiles;
create policy "auth admin lee perfiles" on public.perfiles
  for select to supabase_auth_admin using (true);

-- perfiles: cada uno ve el suyo; el admin ve todos. Nadie cambia su rol desde el cliente (no hay policy de update).
drop policy if exists "ver perfil" on public.perfiles;
create policy "ver perfil" on public.perfiles
  for select to authenticated using (id = auth.uid() or public.es_admin());

-- productos: todos los autenticados leen; solo admin escribe
drop policy if exists "leer productos" on public.productos;
create policy "leer productos" on public.productos
  for select to authenticated using (true);
drop policy if exists "admin escribe productos" on public.productos;
create policy "admin escribe productos" on public.productos
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- pedidos: el usuario ve y crea los suyos; el admin ve todos y cambia el estado
drop policy if exists "ver pedidos" on public.pedidos;
create policy "ver pedidos" on public.pedidos
  for select to authenticated using (usuario_id = auth.uid() or public.es_admin());
drop policy if exists "crear pedido propio" on public.pedidos;
create policy "crear pedido propio" on public.pedidos
  for insert to authenticated with check (usuario_id = auth.uid() and not public.es_admin());
drop policy if exists "admin actualiza pedidos" on public.pedidos;
create policy "admin actualiza pedidos" on public.pedidos
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- actividad: solo el admin la lee (la escriben los triggers)
drop policy if exists "admin lee actividad" on public.actividad;
create policy "admin lee actividad" on public.actividad
  for select to authenticated using (public.es_admin());

-- ---------- 4. TIEMPO REAL ----------
do $$ begin
  alter publication supabase_realtime add table public.actividad;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.pedidos;
exception when duplicate_object then null; end $$;

-- ---------- 5. DATOS DE EJEMPLO (sintéticos) ----------
insert into public.productos (sku, nombre, categoria, precio, stock) values
  ('TEC-001', 'Teclado mecánico',         'Periféricos', 59.90, 25),
  ('RAT-002', 'Ratón inalámbrico',        'Periféricos', 24.50, 40),
  ('MON-003', 'Monitor 27" IPS',          'Monitores',  219.00, 12),
  ('MON-004', 'Monitor 24" FHD',          'Monitores',  139.00,  4),
  ('POR-005', 'Portátil 14" i5',          'Equipos',    749.00,  8),
  ('POR-006', 'Portátil 15" Ryzen 7',     'Equipos',    899.00,  6),
  ('SSD-007', 'SSD NVMe 1 TB',            'Almacenamiento', 79.90, 30),
  ('HDD-008', 'Disco duro externo 2 TB',  'Almacenamiento', 69.00, 18),
  ('AUR-009', 'Auriculares con micro',    'Audio',       39.90, 22),
  ('ALT-010', 'Altavoces 2.0',            'Audio',       29.90,  3),
  ('WEB-011', 'Webcam 1080p',             'Periféricos', 34.90, 15),
  ('HUB-012', 'Hub USB-C 7 en 1',         'Accesorios',  27.50, 35),
  ('CAB-013', 'Cable HDMI 2 m',           'Accesorios',   7.90, 80),
  ('SIL-014', 'Silla ergonómica',         'Mobiliario', 189.00,  5),
  ('MES-015', 'Mesa elevable',            'Mobiliario', 329.00,  2)
on conflict (sku) do nothing;

-- ---------- 6. ROL ADMIN ----------
-- Después de crear los usuarios en Authentication → Users, ejecuta SOLO esta línea:
-- update public.perfiles set rol = 'admin' where email = 'admin@inventario.test';
