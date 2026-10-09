# Arhitektuur

## Ülevaade
```
/            avaleht: menüü Kliendid · Täitjad · Admin
/kliendid    ─┐
/taitjad     ─┼──> Next.js (Vercel) ──> Supabase Postgres
/admin       ─┘         │                    │
                        └──── Realtime <─────┘
```
- Next.js renderdab lehed; kirjutused käivad route handlerite (`app/api/*`) või server actions'i kaudu, mis kontrollivad õigusi (`lib/permissions.ts`).
- Supabase Realtime (`postgres_changes` tabelil `incidents`) uuendab abisaaja ja täitja ekraani. Varuvariant: 3 s polling.

## Lehtede struktuur
```
app/
  page.tsx                         # avaleht, 3 suurt menüükaarti
  layout.tsx                       # ülemine menüü: Kliendid | Täitjad | Admin + aktiivne kasutaja
  kliendid/
    page.tsx                       # demokasutaja valik + minu kliendid
    [clientId]/page.tsx            # kliendi profiil, kontaktid, täitjad, juhtumite ajalugu (lähedane/esindaja)
    [clientId]/abi/page.tsx        # abisaaja vaade: "Ma kukkusin" + triaaž + staatus
  taitjad/
    page.tsx                       # demokasutaja valik + aktiivsed abipalved
    juhtum/[incidentId]/page.tsx   # "Lähen appi", ETA, sulgemine
    organisatsioon/page.tsx        # koordinaator: kõik org juhtumid, töötajad
  admin/
    page.tsx                       # PIN + ülevaade
    kasutajad/page.tsx             # kasutajad ja rollid (admin_system)
    kliendid/page.tsx              # kliendid, seosed täitjatega (admin_system)
    kov/page.tsx                   # KOV juhtumid ja korduvkukkujad (admin_kov)
lib/
  supabase.ts, triage.ts, permissions.ts, session.ts, types.ts
```

## Andmemudel (`supabase/schema.sql`)
```sql
create table municipalities (
  id uuid primary key default gen_random_uuid(),
  name text not null                         -- "Tallinn", "Narva linn"
);

create table organizations (                 -- teenuseosutajad (sotsiaalvalve jne)
  id uuid primary key default gen_random_uuid(),
  name text not null,
  municipality_id uuid references municipalities(id)
);

create table users (                         -- kõik inimesed
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  organization_id uuid references organizations(id),
  municipality_id uuid references municipalities(id)  -- admin_kov jaoks
);

create table user_roles (                    -- üks kasutaja võib omada mitut rolli
  user_id uuid references users(id) on delete cascade,
  role text not null check (role in (
    'client_elder','client_relative','client_guardian',
    'helper_volunteer','helper_relative','helper_pro','helper_coordinator',
    'admin_system','admin_kov')),
  primary key (user_id, role)
);

create table clients (                       -- abisaaja profiil
  id uuid primary key default gen_random_uuid(),
  elder_user_id uuid references users(id),   -- roll client_elder
  address text,
  municipality_id uuid references municipalities(id),
  access_notes text,                         -- "võti naabri juures, korter 12"
  kov_consent boolean default false
);

create table client_contacts (               -- kliendi poole lähedased/esindajad
  client_id uuid references clients(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  relation text,                             -- 'tütar', 'eestkostja'
  primary key (client_id, user_id)
);

create table client_helpers (                -- kes tohivad kliendile appi minna
  client_id uuid references clients(id) on delete cascade,
  user_id uuid references users(id),         -- konkreetne täitja või
  organization_id uuid references organizations(id),  -- terve organisatsioon
  priority int default 1
);

create table incidents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  created_at timestamptz default now(),
  triage jsonb,
  status text not null default 'open'
    check (status in ('open','escalated_112','helper_on_way','resolved','cancelled')),
  helper_user_id uuid references users(id),
  helper_eta_min int,
  resolved_at timestamptz,
  outcome text,                              -- 'helped_up' | 'called_112' | 'other'
  outcome_note text,
  kov_status text default 'new'              -- 'new' | 'in_progress' | 'done'
);
```

Korduvkukkujad (KOV vaade):
```sql
select c.id, u.name, count(*) as falls_30d
from incidents i
join clients c on c.id = i.client_id
join users u on u.id = c.elder_user_id
where i.created_at > now() - interval '30 days'
  and c.kov_consent and c.municipality_id = :kov_id
group by c.id, u.name having count(*) >= 2;
```

## Laiendus viimases faasis
Abivajaja ja töötaja detailprofiilid, koolitused, tundlik sissepääsuinfo ja sobivuse loogika: [MOCK_ANDMED.md](MOCK_ANDMED.md).

## Sessioon ja õigused (MVP)
- `lib/session.ts`: aktiivne kasutaja on küpsises `uppis_user` (valitakse demokasutajate rippmenüüst). Kasutaja rollid loetakse `user_roles` tabelist.
- `lib/permissions.ts`: `can(user, action, resource)` — üks koht, kus on reeglid tabelist [ROLLID.md](ROLLID.md). UI peidab nupud, server keelab tegevuse.
- `/admin` nõuab lisaks `ADMIN_DEMO_PIN`.
- Päristootes: Supabase Auth + RLS reeglid samade rollide põhjal.

## Triaaž (`lib/triage.ts`)
```ts
export type TriageAnswers = {
  hitHead: boolean | null;
  severePainOrCantMove: boolean | null;
  bleeding: boolean | null;
  breathingOrChestPain: boolean | null;
  onFloorOverHour: boolean | null;
};
// null = vastamata -> käsitle nagu "jah"
export function needsEmergency(a: TriageAnswers): boolean;
```

## Keskkonnamuutujad
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # ainult serveris
ADMIN_DEMO_PIN=
```
