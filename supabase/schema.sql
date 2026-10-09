create table municipalities (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  municipality_id uuid references municipalities(id)
);

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  organization_id uuid references organizations(id),
  municipality_id uuid references municipalities(id)
);

create table user_roles (
  user_id uuid references users(id) on delete cascade,
  role text not null check (role in (
    'client_elder','client_relative','client_guardian',
    'helper_volunteer','helper_relative','helper_pro','helper_coordinator',
    'admin_system','admin_kov')),
  primary key (user_id, role)
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  elder_user_id uuid references users(id),
  address text,
  municipality_id uuid references municipalities(id),
  access_notes text,
  kov_consent boolean default false
);

create table client_contacts (
  client_id uuid references clients(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  relation text,
  primary key (client_id, user_id)
);

create table client_helpers (
  client_id uuid references clients(id) on delete cascade,
  user_id uuid references users(id),
  organization_id uuid references organizations(id),
  priority int default 1
);

create table incidents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  created_at timestamptz default now(),
  triage jsonb,
  status text not null default 'open'
    check (status in ('open','escalated_112','helper_on_way','helper_arrived','resolved','cancelled')),
  helper_user_id uuid references users(id),
  helper_eta_min int,
  accepted_at timestamptz,
  arrived_at timestamptz,
  resolved_at timestamptz,
  outcome text,
  outcome_note text,
  kov_status text default 'new'
);
