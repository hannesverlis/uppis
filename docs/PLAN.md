# Tööplaan — 5 × 1 tund + lisafaas

Iga sessiooni lõpus: `npm run build` → commit → push → kontrolli Verceli linki telefonis.

## Sessioon 1 — Vundament + avaleht menüüga (live Vercelis)
- [ ] `npx create-next-app@latest . --ts --tailwind --app --eslint` (olemasolevaid faile mitte kustutada)
- [ ] Ühenda GitHubi repo Verceliga, esimene deploy
- [ ] Supabase projekt, jooksuta `supabase/schema.sql` ja `supabase/seed.sql` (vähemalt 1 kasutaja igast rollist)
- [ ] Avaleht: kolm suurt kaarti **Kliendid · Täitjad · Admin**; ülemine menüü kõigil lehtedel
- [ ] `lib/session.ts`: demokasutaja valik (rippmenüü) → küpsis `uppis_user`

**Cursori prompt:** "Loe AGENTS.md, docs/ROLLID.md ja docs/ARCHITECTURE.md. Tee sessioon 1 failist docs/PLAN.md: andmebaasi skeem, seed-andmed kõigi 9 rolli jaoks, avaleht kolme menüüjaotusega ja demokasutaja valik."

## Sessioon 2 — Kliendid
- [ ] `lib/permissions.ts` reeglitega failist ROLLID.md
- [ ] `/kliendid`: valitud kasutaja kliendid (abisaajale otse tema abi-vaade)
- [ ] `/kliendid/[id]/abi`: "Ma kukkusin" + triaaž (`lib/triage.ts`) + "Helista 112" (`tel:112`)
- [ ] `/kliendid/[id]`: lähedasele/esindajale profiili muutmine, täitjate lisamine, KOV nõusolek (ainult esindaja)

## Sessioon 3 — Täitjad + reaalaeg
- [ ] `/taitjad`: aktiivsed abipalved klientidele, kellega täitja (või tema organisatsioon) on seotud
- [ ] `/taitjad/juhtum/[id]`: "Lähen appi" + ETA (5/10/20 min), aadress ja ligipääs, sulgemine
- [ ] Realtime: abisaaja näeb "Mari tuleb, ~10 min"; 10 min taimer → "Helista 112"
- [ ] `/taitjad/organisatsioon`: koordinaator näeb org juhtumeid ja määrab töötaja

## Sessioon 4 — Admin
- [ ] `/admin` PIN-iga, alammenüü vastavalt rollile
- [ ] `admin_system`: kasutajad + rollid (lisa/eemalda), kliendid ja nende täitjad, demoandmete lähtestamine
- [ ] `admin_kov`: juhtumite tabel, korduvkukkujad (≥2 / 30 päeva, nõusolekuga), "võetud menetlusse"
- [ ] Seed: paar ajaloolist juhtumit, et korduvkukkuja ilmuks

## Sessioon 5 — Viimistlus ja demo
- [ ] Mobiilivaade (375 px), abisaaja vaates suured nupud
- [ ] Jalus: "Demo. Hädaohu korral helista 112."
- [ ] Demo stsenaarium (3 min) kahe telefoniga: abisaaja + naaber, sülearvutil Admin
- [ ] Pitch: probleem → numbrid (`docs/TAUST.md`) → demo → mis edasi

## Faas 6 (viimane, kui aega jääb) — Mock-andmebaas ja sobivus
- [ ] Abivajaja profiil: aadress, elukoht, terviseandmed, kodu omapära, tehnika, abivahendid, sissepääs (uksekood, võtmed)
- [ ] Töötaja profiil: kvalifikatsioon, asukoht, liikumisvõimalus, tegevuspiirkond, koolitused (esmaabi, vanuri tõstmine)
- [ ] `scripts/generate-mock.ts` → `supabase/seed_mock.sql` (20 klienti, 15 täitjat, 40 juhtumit)
- [ ] `lib/matching.ts`: sobiva täitja valik (koolitus, kaugus, saadavus)
- [ ] Tundlik sissepääsuinfo ainult "Lähen appi" vajutanud täitjale + logi

Detailid ja Cursori prompt: [MOCK_ANDMED.md](MOCK_ANDMED.md).
