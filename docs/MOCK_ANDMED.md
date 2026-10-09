# Mock-andmebaas: abivajajad ja töötajad (viimane faas)

> **Millal:** viimases faasis (vt `PLAN.md`, Faas 6), kui põhivoog (Kliendid → Täitjad → Admin) juba töötab.
> **Eesmärk:** demo näeks elus välja ja saaks näidata, kuidas süsteem valib abipalvele **sobiva** täitja.
> **Kõik andmed on väljamõeldud.** Ei mingeid päris nimesid, aadresse, isikukoode ega uksekoode.

## 1. Abivajaja (kliendi) profiil

| Plokk | Väli (kood) | Tüüp | Näide |
|---|---|---|---|
| **Aadress ja elukoht** | `address` | text | Pae 12-34, Tallinn |
| | `municipality_id` | viide | Tallinn |
| | `lat`, `lng` | number | 59.4300, 24.8000 (kauguse arvutamiseks) |
| | `living_situation` | enum | `alone` · `with_spouse` · `with_family` |
| **Terviseandmed** (ainult abistamiseks vajalik) | `mobility` | enum | `independent` · `walker` · `wheelchair` · `bedridden` |
| | `weight_class` | enum | `<70` · `70-100` · `>100` kg (tõstmise planeerimiseks) |
| | `can_assist_lifting` | bool | kas suudab ise tõusmisel kaasa aidata |
| | `cognitive_note` | text | "kerge mäluhäire, räägi rahulikult" |
| | `hearing_vision_note` | text | "kuuleb halvasti, koputa tugevalt" |
| | `fall_risk_level` | enum | `low` · `medium` · `high` |
| | `blood_thinners` | bool | jah → iga kukkumine pea löömisega = 112 |
| **Kodu omapära** | `dwelling_type` | enum | `apartment` · `house` · `farmhouse` |
| | `floor`, `has_elevator` | int, bool | 4. korrus, lift puudub |
| | `home_notes` | text | "kitsas koridor, vannitoas lävi" |
| | `pets` | text | "koer, sõbralik" |
| **Tehniline kirjeldus** | `alarm_button` | bool | häirenupp olemas |
| | `fall_sensor` | bool | kukkumisandur olemas |
| | `smart_lock` | bool | nutilukk olemas |
| | `phone_type` | enum | `smartphone` · `basic` · `none` |
| **Olemasolevad abivahendid** | `aids` | text[] | `rulaator`, `ratastool`, `tõstevöö`, `voodipiire`, `dušitool`, `käetoed` |
| **Sissepääs** | `entry_description` | text | "trepikoda B, 2. uks paremal" |
| | `door_code` 🔒 | text | `#4521` (väljamõeldud) |
| | `key_location` 🔒 | text | "võti naabri juures (korter 33)" / "võtmekarp, kood 1234" |
| | `key_holders` 🔒 | viide[] | kellel on võti (kasutajad) |
| | `parking_note` | text | "parkimine maja ees" |

🔒 = **tundlik**: näidatakse ainult täitjale, kes on vajutanud "Lähen appi" aktiivsele juhtumile, ning kliendi lähedasele/esindajale ja süsteemi adminile. Iga vaatamine logitakse (`access_log`).

## 2. Töötaja (täitja) profiil

| Plokk | Väli (kood) | Tüüp | Näide |
|---|---|---|---|
| **Kvalifikatsioon** | `qualification` | enum | `none` (vabatahtlik) · `caregiver` (hooldustöötaja) · `nurse` (õde) · `social_worker` |
| | `organization_id` | viide | "Sotsiaalvalve OÜ" (väljamõeldud) |
| **Asukoht** | `home_lat`, `home_lng` | number | kodu/baas |
| | `current_lat`, `current_lng` | number | demos käsitsi seatud |
| **Liikumise võimalus** | `transport` | enum | `on_foot` · `bicycle` · `car` · `public_transport` |
| | `max_distance_km` | number | 2 (jalgsi) / 15 (autoga) |
| **Eelistatud tegevuspiirkond** | `preferred_areas` | text[] | `Lasnamäe`, `Kesklinn` |
| | `availability` | jsonb | `{"mon-fri":"18-08","sat-sun":"24h"}` |
| **Läbitud koolitused** | `trainings` | seos | vt tabel allpool |

### Koolitused (`trainings` kataloog)

| Kood | Nimetus | Kehtivus |
|---|---|---|
| `first_aid` | Esmaabi (põhikursus) | 3 a |
| `elder_lifting` | Vanuri ohutu tõstmine kukkumise järel | 2 a |
| `lifting_aids` | Tõsteabivahendite (tõstevöö, tõstepadi) kasutamine | 2 a |
| `dementia_communication` | Suhtlemine mäluhäirega inimesega | — |
| `fall_risk_assessment` | Kodukeskkonna kukkumisriski hindamine | — |

Töötaja koolitus: `worker_trainings(user_id, training_code, completed_at, valid_until)`.

## 3. Sobivuse reeglid (matching)

Abipalve korral sorteeritakse kliendi täitjad nii (`lib/matching.ts`):

1. **Välista**, kui täitja pole hetkel saadaval (`availability`) või on kaugemal kui `max_distance_km`.
2. **Nõua** koolitust `elder_lifting`, kui `weight_class = '>100'` või `can_assist_lifting = false` — või saada **kaks** täitjat.
3. **Eelista** täitjat, kellel on `first_aid` kehtiv.
4. **Eelista** `dementia_communication`, kui kliendil on `cognitive_note`.
5. Sorteeri **hinnangulise kohalejõudmise aja** järgi (kaugus ÷ kiirus transpordi järgi: jalgsi 5, ratas 15, auto 30 km/h).
6. Kui ühtegi sobivat pole → kohe "Helista 112" ja teavita koordinaatorit.

Täitja vaates kuvatakse põhjus: "Sobib: tõstekoolitus ✓, 6 min autoga".

## 4. Skeemi lisandused (`supabase/schema_mock.sql`)

```sql
alter table clients add column
  lat double precision, add column lng double precision,
  add column living_situation text,
  add column mobility text, add column weight_class text,
  add column can_assist_lifting boolean, add column cognitive_note text,
  add column hearing_vision_note text, add column fall_risk_level text,
  add column blood_thinners boolean,
  add column dwelling_type text, add column floor int, add column has_elevator boolean,
  add column home_notes text, add column pets text,
  add column alarm_button boolean, add column fall_sensor boolean,
  add column smart_lock boolean, add column phone_type text,
  add column aids text[], add column entry_description text, add column parking_note text;

create table client_secrets (               -- tundlik sissepääsuinfo eraldi tabelis
  client_id uuid primary key references clients(id) on delete cascade,
  door_code text,
  key_location text
);
create table client_key_holders (
  client_id uuid references clients(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  primary key (client_id, user_id)
);

create table worker_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  qualification text,
  home_lat double precision, home_lng double precision,
  current_lat double precision, current_lng double precision,
  transport text, max_distance_km numeric,
  preferred_areas text[], availability jsonb
);
create table trainings (code text primary key, name text, validity_years int);
create table worker_trainings (
  user_id uuid references users(id) on delete cascade,
  training_code text references trainings(code),
  completed_at date, valid_until date,
  primary key (user_id, training_code)
);
create table access_log (                   -- kes vaatas tundlikku infot
  id bigserial primary key,
  user_id uuid references users(id),
  client_id uuid references clients(id),
  field text, viewed_at timestamptz default now()
);
```

## 5. Mock-andmete maht ja genereerimine

- **20 abivajajat** 3 omavalitsuses (Tallinn, Narva, Pärnu), erinevad profiilid: üksi elav ratastoolis, >100 kg ilma liftita 5. korrusel, mäluhäirega, verevedeldajatega jne.
- **15 täitjat**: 8 vabatahtlikku/naabrit, 2 lähedast, 4 sotsiaalvalve töötajat, 1 koordinaator; erinevad koolitused ja transport.
- **40 ajaloolist juhtumit** viimase 60 päeva kohta, sh 3 korduvkukkujat (et KOV vaade näitaks midagi).
- Genereeri skriptiga `scripts/generate-mock.ts` (fikseeritud seed, et tulemus oleks iga kord sama) → `supabase/seed_mock.sql`. Nimed eesti eesnimede+perenimede loendist, aadressid väljamõeldud tänavanimedega.
- Admini lehel nupp **"Lähtesta demoandmed"** jooksutab `seed_mock.sql` uuesti.

**Cursori prompt (Faas 6):**
"Loe docs/MOCK_ANDMED.md. Lisa skeemi täiendused failina supabase/schema_mock.sql, kirjuta scripts/generate-mock.ts, mis genereerib seed_mock.sql (20 klienti, 15 täitjat, 40 juhtumit, fikseeritud seed), ja lib/matching.ts sobivuse reeglitega. Kuva kliendi profiil lähedase vaates ja täitja profiil koordinaatori vaates. Tundlikud väljad ainult lib/permissions.ts reeglite järgi."
