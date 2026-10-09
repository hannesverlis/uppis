# Uppis

Tervisehäkaton 2026 prototüüp: kodus kukkunud eakas saab kiiresti mitte-meditsiinilist abi oma lähedastelt, naabritelt või sotsiaalvalvelt. Terviseohu korral suunab rakendus alati 112-le. Korduvatest kukkumistest jõuab info (nõusolekul) kohaliku omavalitsuse sotsiaaltöötajani.

> ⚠️ Demo. Hädaohu korral helista 112.

## Dokumendid
- [AGENTS.md](AGENTS.md) — juhised Cursorile
- [docs/PRD.md](docs/PRD.md) — mida ehitame ja miks
- [docs/ROLLID.md](docs/ROLLID.md) — Kliendid, Täitjad, Admin ja nende rollid
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — tehnoloogia ja andmemudel
- [docs/PLAN.md](docs/PLAN.md) — tööplaan 5 × 1 tund
- [docs/MOCK_ANDMED.md](docs/MOCK_ANDMED.md) — abivajajate ja töötajate profiilid, mock-andmed (viimane faas)
- [docs/TAUST.md](docs/TAUST.md) — numbrid ja allikas pitch'i jaoks

## Avaleht
Avaleht `/` on kolme telefoni demo: abisaaja, täitja ja lähedane ühel ekraanil. Üksikud vaated (Kliendid, Täitjad, Admin) on aadressil `/valik`. Vana aadress `/demo` suunab avalehele.

## Ülesehitus
- `backend/` — äriloogika, õigused, triaaž ja demoandmed
- `app/api/` — HTTP API, mida kasutajaliides kutsub
- `app/` ja `components/` — kasutajaliides

Ilma Supabase võtmeteta töötab demo kohaliku JSON-hoidlaga (`data/demo-db.json`). Skeem ja SQL-seed on kaustas `supabase/`.

## Käivitamine
```bash
npm install
cp .env.example .env.local   # demo PIN on 1234; Supabase võtmed on valikulised
npm run dev
```
