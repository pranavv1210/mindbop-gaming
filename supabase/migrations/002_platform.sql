-- MindBop durable player platform. Run after 001_feedback.sql.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Player' check (char_length(display_name) between 1 and 24),
  avatar smallint not null default 0 check (avatar between 0 and 5),
  is_ranked boolean not null default false,
  xp integer not null default 0 check (xp >= 0),
  rank_score integer not null default 1000,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.player_game_stats (
  profile_id uuid references public.profiles(id) on delete cascade,
  game_id text not null, rating integer not null default 1000,
  played integer not null default 0, wins integer not null default 0,
  losses integer not null default 0, draws integer not null default 0,
  primary key (profile_id, game_id)
);
create table if not exists public.matches (
  id uuid primary key, game_id text not null, room_code text not null,
  status text not null default 'completed', ranked boolean not null default false,
  state jsonb, started_at timestamptz, completed_at timestamptz default now()
);
create table if not exists public.match_players (
  match_id uuid references public.matches(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  result text not null check (result in ('win','loss','draw','finished')),
  score integer not null default 0, rating_before integer, rating_after integer,
  xp_earned integer not null default 0, primary key (match_id, profile_id)
);
create table if not exists public.rooms (
  code text primary key, game_id text not null, host_user_id uuid references public.profiles(id),
  phase text not null, state jsonb not null, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), expires_at timestamptz not null default (now() + interval '1 hour')
);
create table if not exists public.tutorial_progress (
  profile_id uuid references public.profiles(id) on delete cascade,
  game_id text not null, completed boolean not null default false,
  skipped boolean not null default false, updated_at timestamptz not null default now(),
  primary key (profile_id, game_id)
);
alter table public.profiles enable row level security;
alter table public.player_game_stats enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.rooms enable row level security;
alter table public.tutorial_progress enable row level security;
create policy "profiles public read" on public.profiles for select using (true);
create policy "profiles own insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles own update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "stats public read" on public.player_game_stats for select using (true);
create policy "own match rows" on public.match_players for select using (auth.uid() = profile_id);
create policy "own matches" on public.matches for select using (exists (select 1 from public.match_players mp where mp.match_id=id and mp.profile_id=auth.uid()));
create policy "own tutorials" on public.tutorial_progress for select using (auth.uid() = profile_id);
create policy "own tutorial insert" on public.tutorial_progress for insert with check (auth.uid() = profile_id);
create policy "own tutorial update" on public.tutorial_progress for update using (auth.uid() = profile_id);
revoke update on public.profiles from authenticated;
grant update (display_name, avatar) on public.profiles to authenticated;
create or replace view public.global_leaderboard as
  select id, display_name, avatar, xp, rank_score,
    dense_rank() over (order by rank_score desc, xp desc) as global_rank
  from public.profiles where is_ranked = true;
grant select on public.global_leaderboard to anon, authenticated;

create or replace function public.sync_player_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id, display_name, is_ranked) values(new.id, coalesce(new.raw_user_meta_data->>'name','Player'), not coalesce(new.is_anonymous,false))
  on conflict(id) do update set is_ranked=not coalesce(new.is_anonymous,false), updated_at=now();
  return new;
end $$;
drop trigger if exists sync_player_profile on auth.users;
create trigger sync_player_profile after insert or update of is_anonymous on auth.users for each row execute function public.sync_player_profile();

create or replace function public.record_match_result(p_match_id uuid, p_game_id text, p_room_code text, p_results jsonb, p_state jsonb default null)
returns void language plpgsql security definer set search_path=public as $$
declare item jsonb; ranked_match boolean; uid uuid; outcome text; gain integer;
begin
  select coalesce(bool_and(p.is_ranked),false) into ranked_match from jsonb_array_elements(p_results) r join profiles p on p.id=(r->>'profile_id')::uuid;
  insert into matches(id,game_id,room_code,ranked,state) values(p_match_id,p_game_id,p_room_code,ranked_match,p_state) on conflict do nothing;
  for item in select * from jsonb_array_elements(p_results) loop
    uid := (item->>'profile_id')::uuid; outcome := item->>'result'; gain := case outcome when 'win' then 30 when 'draw' then 20 else 10 end;
    insert into match_players(match_id,profile_id,result,score,xp_earned) values(p_match_id,uid,outcome,coalesce((item->>'score')::int,0),gain) on conflict do nothing;
    insert into player_game_stats(profile_id,game_id,played,wins,losses,draws) values(uid,p_game_id,1,(outcome='win')::int,(outcome='loss')::int,(outcome='draw')::int)
      on conflict(profile_id,game_id) do update set played=player_game_stats.played+1,wins=player_game_stats.wins+(outcome='win')::int,losses=player_game_stats.losses+(outcome='loss')::int,draws=player_game_stats.draws+(outcome='draw')::int;
    update profiles set xp=xp+gain, rank_score=rank_score+(case when ranked_match then case outcome when 'win' then 20 when 'draw' then 5 else -10 end else 0 end), updated_at=now() where id=uid;
  end loop;
end $$;
revoke all on function public.record_match_result(uuid,text,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.record_match_result(uuid,text,text,jsonb,jsonb) to service_role;
