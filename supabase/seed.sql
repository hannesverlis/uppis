-- Fictional demo data. The running app uses backend/seed.ts until Supabase keys are set.
insert into municipalities (id, name) values
  ('10000000-0000-4000-8000-000000000001', 'Tallinn'),
  ('10000000-0000-4000-8000-000000000002', 'Narva linn'),
  ('10000000-0000-4000-8000-000000000003', 'Pärnu');

insert into organizations (id, name, municipality_id) values
  ('20000000-0000-4000-8000-000000000001', 'Sotsiaalvalve OÜ', '10000000-0000-4000-8000-000000000001');

insert into users (id, name, phone, organization_id, municipality_id) values
  ('30000000-0000-4000-8000-000000000001', 'Helgi Tamm', '5123 1001', null, null),
  ('30000000-0000-4000-8000-000000000002', 'Mari Tamm', '5123 1002', null, null),
  ('30000000-0000-4000-8000-000000000003', 'Kalle Saar', '5123 1003', null, null),
  ('30000000-0000-4000-8000-000000000004', 'Jüri Mets', '5123 1004', null, null),
  ('30000000-0000-4000-8000-000000000005', 'Liis Kask', '5123 1005', '20000000-0000-4000-8000-000000000001', null),
  ('30000000-0000-4000-8000-000000000006', 'Peeter Org', '5123 1006', '20000000-0000-4000-8000-000000000001', null),
  ('30000000-0000-4000-8000-000000000007', 'Anna Admin', '5123 1007', null, null),
  ('30000000-0000-4000-8000-000000000008', 'Eva KOV', '5123 1008', null, '10000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000009', 'Aino Levin', '5123 1009', null, null),
  ('30000000-0000-4000-8000-000000000010', 'Lembit Kask', '5123 1010', null, null);

insert into user_roles (user_id, role) values
  ('30000000-0000-4000-8000-000000000001', 'client_elder'),
  ('30000000-0000-4000-8000-000000000002', 'client_relative'),
  ('30000000-0000-4000-8000-000000000002', 'helper_relative'),
  ('30000000-0000-4000-8000-000000000003', 'client_guardian'),
  ('30000000-0000-4000-8000-000000000004', 'helper_volunteer'),
  ('30000000-0000-4000-8000-000000000005', 'helper_pro'),
  ('30000000-0000-4000-8000-000000000006', 'helper_coordinator'),
  ('30000000-0000-4000-8000-000000000007', 'admin_system'),
  ('30000000-0000-4000-8000-000000000008', 'admin_kov'),
  ('30000000-0000-4000-8000-000000000009', 'client_elder'),
  ('30000000-0000-4000-8000-000000000010', 'client_elder');

insert into clients (id, elder_user_id, address, municipality_id, access_notes, kov_consent) values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Pae 12-34, Tallinn', '10000000-0000-4000-8000-000000000001', 'Trepikoda B, 2. uks paremal. Võti on naabri Jüri juures, korter 33.', true),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000010', 'Sõle 8-2, Tallinn', '10000000-0000-4000-8000-000000000001', 'Uksekood #4521. Lift on olemas.', false),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000009', 'Puškini 4-15, Narva', '10000000-0000-4000-8000-000000000002', 'Võti on sotsiaalvalve kontoris.', true);

insert into client_contacts (client_id, user_id, relation) values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'tütar'),
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 'eestkostja'),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003', 'eestkostja');

insert into client_helpers (client_id, user_id, organization_id, priority) values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', null, 1),
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', null, 2),
  ('40000000-0000-4000-8000-000000000001', null, '20000000-0000-4000-8000-000000000001', 3),
  ('40000000-0000-4000-8000-000000000002', null, '20000000-0000-4000-8000-000000000001', 1);

insert into incidents (id, client_id, created_at, triage, status, helper_user_id, helper_eta_min, resolved_at, outcome, kov_status) values
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', now() - interval '8 days', '{"hitHead":false,"severePainOrCantMove":false,"bleeding":false,"breathingOrChestPain":false,"onFloorOverHour":false}', 'resolved', '30000000-0000-4000-8000-000000000004', 10, now() - interval '8 days' + interval '30 minutes', 'helped_up', 'new'),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', now() - interval '6 days', '{"hitHead":false,"severePainOrCantMove":false,"bleeding":false,"breathingOrChestPain":false,"onFloorOverHour":false}', 'resolved', '30000000-0000-4000-8000-000000000005', 10, now() - interval '6 days' + interval '30 minutes', 'helped_up', 'new'),
  ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002', now() - interval '2 days', '{"hitHead":false,"severePainOrCantMove":false,"bleeding":false,"breathingOrChestPain":false,"onFloorOverHour":false}', 'resolved', '30000000-0000-4000-8000-000000000005', 10, now() - interval '2 days' + interval '30 minutes', 'helped_up', 'new'),
  ('50000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000003', now() - interval '12 days', '{"hitHead":false,"severePainOrCantMove":false,"bleeding":false,"breathingOrChestPain":false,"onFloorOverHour":false}', 'resolved', null, null, now() - interval '12 days' + interval '40 minutes', 'helped_up', 'new'),
  ('50000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000003', now() - interval '3 days', '{"hitHead":false,"severePainOrCantMove":false,"bleeding":false,"breathingOrChestPain":false,"onFloorOverHour":false}', 'resolved', null, null, now() - interval '3 days' + interval '40 minutes', 'helped_up', 'new');
