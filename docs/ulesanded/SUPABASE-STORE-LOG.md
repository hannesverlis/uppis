# Supabase store – öine logi

Töötasin üksi, kinnitust ei oodanud. Haru on `supabase-store`. `main` harusse ei commit'inud ega merge'inud.

## Otsused
- Andmehoidla valitakse iga `readDb` / `updateDb` / `resetDb` kutse ajal keskkonnamuutujate järgi, mitte mooduli laadimisel. Vitest tõstab `import` rea faili algusesse, nii et `tests/unit/setup.ts` saab `SUPABASE_URL` ja `SUPABASE_SERVICE_ROLE_KEY` tühjendada enne esimest lugemist. Ühiktestid kasutavad ajutist faili.
- Kui mõlemad `SUPABASE_*` muutujad on olemas, läheb kogu `Db` tabelisse `demo_state` reale `main`. Muul juhul jääb JSON-fail (`UPPIS_DB_FILE` või `data/demo-db.json`).
- Kui `VERCEL` on seatud ja Supabase'i muutujaid pole, kirjutatakse `os.tmpdir()/uppis-demo-db.json` ja logisse tuleb üks hoiatus. Nii ei tule Vercelil kohe 500.
- Uus `sb_secret_` võti saadetakse ainult päises `apikey`. `Authorization: Bearer` lisatakse ainult võtmele, mis algab `eyJ`.
- Vea 401 korral logitakse võtme eesliide (`sb_secret_` või `eyJ`), mitte võtit ennast. Veatekstist eemaldatakse võti, kui see vastuses juhuslikult esineb.
- Faili kirjutamine kasutab unikaalset ajutist faili, et kaks samaaegset kirjutamist ei jagaks ühte `.tmp` faili.
- Sammud 1 ja 3 on ühes commit'is, sest asünkroonsed allkirjad peavad teenuse ja API-ga koos minema, muidu `npm run build` ei läheks läbi.

## Commit'id
- `a4beca1` Keep the demo database in Supabase when the server has a service role key.
- `785d912` Cover the Supabase store with a fake REST client and await the async database in unit tests.
- `f616130` Record how the demo database moved to Supabase and what to check in the morning.

## Testid
- `npm test`: 9 faili, 136 testi, kõik läbisid (sh 6 Supabase'i võlts-REST testi).
- `npm run build`: läbis. Lint hoiatab olemasolevate piltide ja kasutamata `isArrivalLate` impordi eest; need ei tulnud sellest ülesandest.

## Päris Supabase
Õnnestus. Kohalik `npm run dev` kasutas `.env.local` väärtusi `SUPABASE_URL` ja `SUPABASE_SERVICE_ROLE_KEY`. REST-kontroll tabelist `demo_state` (rida `main`):

- enne voogu `version` oli 2 (esimene katse, kus JSON-keha ei jõudnud serverini ja kutse läks triaažita olekusse `escalated_112`);
- pärast puhast voogu `version` oli 7.

Puhas voog (`curl.exe`, keha failist):

1. Anna reset → 200.
2. Helgi kutse → 200, olek `open`.
3. Jüri järjekord sisaldas seda juhtumit.
4. Jüri võttis vastu (10 min) → 200, olek `helper_on_way`.
5. Mari proovis vastu võtta → 409, tekst „Kutse võttis juba vastu Jüri Mets“.
6. Jüri märkis kohaloleku → 200.
7. Jüri sulges tulemusega `helped_up` → 200.

`/api/health` vastab `{"ok":true,"supabase":false}`. See lipp vaatab `NEXT_PUBLIC_SUPABASE_URL` ja anon-võtit, mis on `.env.local` failis tühjad. Andmehoidla ise kasutab serveri muutujaid ja kirjutas Supabase'i (versioon kasvas). See ei ole viga.

## Vercel
`vercel` käsku selles arvutis ei ole. Ma ei paigaldanud CLId ega loginud sisse. Haru `supabase-store` on push'itud. Eelvaate link tuleb vaadata Verceli veebiliidesest. `main` harusse ei merge'itud.

## Hommikune kontroll
1. Ava haru `supabase-store` Verceli eelvaate link.
2. Veendu, et Vercelil on Production, Preview ja Development jaoks `SUPABASE_URL` ja `SUPABASE_SERVICE_ROLE_KEY` (mitte `NEXT_PUBLIC_`).
3. Vajuta „Lähtesta demo“.
4. Helgi kutsub abi.
5. Jüri võtab kutse vastu.
6. Kõik kolm telefoni avalehel peavad uuenema.
7. Kui eelvaade töötab, merge'i `supabase-store` harusse `main`.
