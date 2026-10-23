-- Power House Auction Hub backend
-- Run this once in Supabase SQL Editor.
-- The browser must never receive a service-role key.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);

create table if not exists public.auction_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{6,12}$'),
  sport text not null check (sport in ('ipl','wpl','kabaddi','bbl')),
  host_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'lobby' check (status in ('lobby','live','paused','finished','cancelled')),
  purse numeric(12,2) not null default 120000000 check (purse >= 0),
  bid_timer_seconds integer not null default 8 check (bid_timer_seconds between 3 and 60),
  current_player_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  sport text not null check (sport in ('ipl','wpl','kabaddi','bbl')),
  name text not null check (char_length(name) between 1 and 100),
  role text,
  base_price numeric(12,2) not null default 0 check (base_price >= 0),
  created_at timestamptz not null default now()
);

alter table public.auction_rooms
  add constraint auction_rooms_current_player_fk
  foreign key (current_player_id) references public.players(id) on delete set null;

create table if not exists public.room_members (
  room_id uuid not null references public.auction_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'spectator' check (role in ('host','bidder','spectator')),
  team_name text,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.bids (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.auction_rooms(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  bidder_id uuid not null references auth.users(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.auction_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  author_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists bids_room_player_time_idx on public.bids(room_id, player_id, created_at desc);
create index if not exists chat_room_time_idx on public.chat_messages(room_id, created_at desc);
create index if not exists room_members_user_idx on public.room_members(user_id);

-- Keep updated_at controlled by the database.
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists auction_rooms_touch_updated_at on public.auction_rooms;
create trigger auction_rooms_touch_updated_at
before update on public.auction_rooms
for each row execute function public.touch_updated_at();

-- Server-side bid validation. The client cannot bypass these checks by editing JS.
create or replace function public.place_bid(p_room_id uuid, p_player_id uuid, p_amount numeric)
returns public.bids
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_room public.auction_rooms;
  v_member public.room_members;
  v_highest numeric;
  v_bid public.bids;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into v_room from public.auction_rooms where id = p_room_id for update;
  if not found then raise exception 'room not found'; end if;
  if v_room.status <> 'live' then raise exception 'room is not live'; end if;
  if v_room.current_player_id is distinct from p_player_id then raise exception 'player is not currently on auction'; end if;

  select * into v_member from public.room_members
  where room_id = p_room_id and user_id = auth.uid();
  if not found or v_member.role <> 'bidder' then raise exception 'bidder access required'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > v_room.purse then raise exception 'invalid bid amount'; end if;

  select coalesce(max(amount), 0) into v_highest
  from public.bids where room_id = p_room_id and player_id = p_player_id;
  if p_amount <= v_highest then raise exception 'bid must be higher than the current bid'; end if;

  insert into public.bids(room_id, player_id, bidder_id, amount)
  values (p_room_id, p_player_id, auth.uid(), p_amount)
  returning * into v_bid;
  return v_bid;
end;
$$;

alter table public.profiles enable row level security;
alter table public.auction_rooms enable row level security;
alter table public.players enable row level security;
alter table public.room_members enable row level security;
alter table public.bids enable row level security;
alter table public.chat_messages enable row level security;
alter table public.reviews enable row level security;

-- Profiles are visible only to signed-in users; users edit only their own profile.
create policy profiles_read_signed_in on public.profiles for select to authenticated using (true);
create policy profiles_insert_self on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Room data is visible only to members. Creation and state changes are host-only.
create policy rooms_read_member on public.auction_rooms for select to authenticated
  using (exists (select 1 from public.room_members m where m.room_id = id and m.user_id = auth.uid()));
create policy rooms_insert_host on public.auction_rooms for insert to authenticated
  with check (host_id = auth.uid());
create policy rooms_update_host on public.auction_rooms for update to authenticated
  using (host_id = auth.uid()) with check (host_id = auth.uid());

create policy players_read_signed_in on public.players for select to authenticated using (true);

create policy members_read_room on public.room_members for select to authenticated
  using (exists (select 1 from public.room_members mine where mine.room_id = public.room_members.room_id and mine.user_id = auth.uid()));
create policy members_insert_self on public.room_members for insert to authenticated
  with check (user_id = auth.uid());
create policy members_update_self on public.room_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy bids_read_member on public.bids for select to authenticated
  using (exists (select 1 from public.room_members m where m.room_id = public.bids.room_id and m.user_id = auth.uid()));
-- Direct bid inserts are blocked; clients must call place_bid().

create policy chat_read_member on public.chat_messages for select to authenticated
  using (exists (select 1 from public.room_members m where m.room_id = public.chat_messages.room_id and m.user_id = auth.uid()));
create policy chat_insert_member on public.chat_messages for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.room_members m where m.room_id = public.chat_messages.room_id and m.user_id = auth.uid()));

create policy reviews_read_public on public.reviews for select to anon, authenticated using (true);
create policy reviews_insert_self on public.reviews for insert to authenticated
  with check (author_id = auth.uid());

-- Safe room entry points: clients never need direct permission to discover or
-- insert arbitrary rooms. These functions validate the room code and caller.
create or replace function public.create_room(p_sport text, p_code text, p_purse numeric default 120000000)
returns public.auction_rooms
language plpgsql security definer set search_path = public
as $$
declare r public.auction_rooms;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_sport not in ('ipl','wpl','kabaddi','bbl') then raise exception 'invalid sport'; end if;
  if p_code !~ '^[A-Z0-9-]{6,12}$' then raise exception 'invalid room code'; end if;
  insert into public.auction_rooms(code,sport,host_id,purse)
  values (p_code, p_sport, auth.uid(), greatest(0, coalesce(p_purse,120000000)))
  returning * into r;
  insert into public.room_members(room_id,user_id,role) values(r.id,auth.uid(),'host');
  return r;
exception when unique_violation then
  raise exception 'room code already exists';
end;
$$;

create or replace function public.join_room(p_code text, p_role text default 'spectator', p_team text default null)
returns public.auction_rooms
language plpgsql security definer set search_path = public
as $$
declare r public.auction_rooms;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_role not in ('bidder','spectator') then raise exception 'invalid room role'; end if;
  select * into r from public.auction_rooms where code = upper(trim(p_code));
  if not found then raise exception 'room not found'; end if;
  if r.status in ('finished','cancelled') then raise exception 'room is closed'; end if;
  insert into public.room_members(room_id,user_id,role,team_name)
  values(r.id,auth.uid(),p_role,nullif(left(trim(coalesce(p_team,'')),40),''))
  on conflict (room_id,user_id) do update set role=excluded.role,team_name=excluded.team_name;
  return r;
end;
$$;

grant execute on function public.create_room(text,text,numeric) to authenticated;
grant execute on function public.join_room(text,text,text) to authenticated;

insert into public.players(sport,name,role,base_price)
select v.sport,v.name,v.role,v.base_price from (values
 ('ipl','Virat Kohli','BAT',20000000::numeric),('ipl','Jasprit Bumrah','BOWL',20000000),('ipl','Rohit Sharma','BAT',20000000),
 ('wpl','Smriti Mandhana','BAT',10000000),('wpl','Harmanpreet Kaur','AR',10000000),('wpl','Ellyse Perry','AR',10000000),
 ('kabaddi','Pardeep Narwal','RAIDER',5000000),('kabaddi','Fazel Atrachali','DEFENDER',5000000),('kabaddi','Naveen Kumar','RAIDER',5000000),
 ('bbl','Glenn Maxwell','AR',10000000),('bbl','David Warner','BAT',10000000),('bbl','Rashid Khan','BOWL',10000000)
) as v(sport,name,role,base_price)
where not exists (select 1 from public.players p where p.sport=v.sport and p.name=v.name);

-- Realtime is opt-in and limited to the tables the client needs.
alter publication supabase_realtime add table public.bids;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.auction_rooms;
