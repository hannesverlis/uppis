# AGENTS.md — juhised Cursorile (Uppis)

Loe enne iga suuremat muudatust ka: `docs/PRD.md`, `docs/ROLLID.md`, `docs/ARCHITECTURE.md`, `docs/PLAN.md`.

## Projekt lühidalt
**Uppis** aitab koju kukkunud eakal kiiresti saada **mitte-meditsiinilist** abi (püsti aitamine) lähedastelt, naabritelt või sotsiaalvalvelt, ilma et politsei/pääste peaks kohale sõitma. Kui on terviseoht, suunab rakendus **alati 112-le**. Pärast juhtumit jõuab info (nõusolekul) kohaliku omavalitsuse sotsiaaltöötajani, et korduvkukkujad märgataks varakult.

Lehekülg jaguneb kolmeks osaks: **Kliendid**, **Täitjad**, **Admin** (avalehe menüü). Igas osas on mitu rolli, vt `docs/ROLLID.md`. Üks kasutaja võib omada mitut rolli.

Tegemist on **häkatoni MVP-ga** (Tervisehäkaton, 9.–10.10.2026). Eesmärk: töötav demo Vercelis, mitte tootmissüsteem.

## Tehnoloogia
- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Realtime) andmebaasiks
- Deploy: Vercel (GitHub `hannesverlis/uppis`, haru `main` → automaatne deploy)
- Pakihaldur: npm

## Reeglid
1. **Hoia lihtne.** Ei mingit päris sisselogimist ega makseid. Kasutaja valitakse demos rippmenüüst (küpsis `uppis_user`). Õigused kontrolli alati serveris `lib/permissions.ts` kaudu. Ära lisa uusi teeke, kui sama saab teha olemasolevaga.
2. **Mobiil eelkõige.** Iga vaade peab töötama 375 px laiusel. Eaka vaade: suured nupud (min 64 px kõrgus), suur kiri (min 20 px), kõrge kontrast, max 1–2 valikut ekraanil.
3. **Turvalisus ennekõike.** Triaaži loogika (`lib/triage.ts`) on kriitiline: kahtluse korral näita alati "Helista 112" nuppu (`tel:112`). Ära kunagi kirjuta UI-sse, et 112-le pole vaja helistada. Ära nimeta teenust "kiirabiks".
4. **Kasutajaliides eesti keeles**, kood (muutujad, funktsioonid, kommentaarid, commit'id) inglise keeles.
5. **Andmed:** ainult väljamõeldud demoandmed. Ära salvesta isikukoodi. Abivajaja terviseandmed ainult abistamiseks vajalikus ulatuses (`docs/MOCK_ANDMED.md`). Uksekoodid ja võtmed eraldi tabelis `client_secrets`, nähtavad ainult `lib/permissions.ts` reeglite järgi ja iga vaatamine logitakse.
6. **Saladused** ainult `.env.local` failis ja Verceli keskkonnamuutujates. `NEXT_PUBLIC_` eesliidet kasuta ainult Supabase URL-i ja anon-võtme jaoks. Service role võtit ära kunagi kliendikoodi pane.
7. **Väikeste sammudena.** Iga muudatuse järel peab `npm run build` õnnestuma. Pärast töötava osa valmimist tee commit ja push, et Vercel deploy'ks.
8. Kui midagi on ebaselge, küsi enne, kui hakkad suurt muudatust tegema.

## Kaustastruktuur (siht)
```
app/
  page.tsx                 # avaleht: menüü Kliendid · Täitjad · Admin
  kliendid/...             # abisaaja, lähedane, esindaja
  taitjad/...              # vabatahtlik, lähedane-täitja, sotsiaalvalve, koordinaator
  admin/...                # süsteemi admin, KOV sotsiaaltöötaja
  api/...                  # serveripoolsed route handlerid
lib/
  supabase.ts  session.ts  permissions.ts  triage.ts  matching.ts  types.ts
supabase/
  schema.sql  seed.sql
docs/                      # PRD, ROLLID, arhitektuur, plaan, taust, MOCK_ANDMED
```
Täpne lehtede loetelu: `docs/ARCHITECTURE.md`.

## Käsud
```bash
npm run dev     # lokaalne arendus, http://localhost:3000
npm run build   # kontrolli enne commit'i
npm run lint
```
