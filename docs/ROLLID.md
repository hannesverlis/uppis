# Osalejad ja rollid

Lehekülg jaguneb kolmeks osaks. Avalehe menüüs on need kolm esmast jaotust:

```
┌────────────────────────────────────────────┐
│  UPPIS                                     │
│                                            │
│  [ Kliendid ]   [ Täitjad ]   [ Admin ]    │
└────────────────────────────────────────────┘
```

| Osa | Kes | Mida seal tehakse |
|---|---|---|
| **Kliendid** (`/kliendid`) | need, kes abi vajavad, ja nende poolt tegutsejad | abi kutsumine, kliendi profiili ja kontaktide haldus |
| **Täitjad** (`/taitjad`) | need, kes appi lähevad | abipalvete vastuvõtmine, kohaleminek, juhtumi sulgemine |
| **Admin** (`/admin`) | süsteemi ja omavalitsuse poolne haldus | kasutajate, rollide ja seoste haldus, juhtumite ülevaade |

## 1. Kliendid — rollid

| Roll (kood) | Kirjeldus | Õigused |
|---|---|---|
| **Abisaaja** (`client_elder`) | kodus elav eakas, kes võib kukkuda | "Ma kukkusin" nupp, triaaž, näeb kes on tulemas; ei halda midagi |
| **Lähedane** (`client_relative`) | pereliige, kes korraldab abisaaja eest | muudab abisaaja profiili (aadress, ligipääs, võtme asukoht), lisab/eemaldab täitjaid, näeb juhtumite ajalugu, saab teavitusi |
| **Eestkostja / esindaja** (`client_guardian`) | ametlik esindaja (nt eestkostja, hoolekandeasutuse kontakt) | nagu lähedane + annab/võtab tagasi KOV-ile info jagamise nõusoleku |

Üks klient = üks abisaaja; tema külge võib siduda mitu lähedast/esindajat.

## 2. Täitjad — rollid

| Roll (kood) | Kirjeldus | Õigused |
|---|---|---|
| **Vabatahtlik / naaber** (`helper_volunteer`) | naaber, sõber, kogukonna liige | näeb ainult temaga seotud klientide abipalveid, "Lähen appi", sulgeb juhtumi |
| **Lähedane täitjana** (`helper_relative`) | pereliige, kes ise ka appi läheb | sama mis vabatahtlik; sama inimene võib olla ka kliendi poolel lähedane |
| **Sotsiaalvalve töötaja** (`helper_pro`) | teenuseosutaja (nt sotsiaalvalve, koduteenus) töötaja | näeb oma organisatsiooni klientide abipalveid, märgib tulemuse, lisab tähelepaneku KOV-ile |
| **Teenuseosutaja koordinaator** (`helper_coordinator`) | sotsiaalvalve dispetšer / meeskonnajuht | näeb kõiki oma organisatsiooni juhtumeid, määrab töötaja juhtumile, haldab oma organisatsiooni töötajaid |

Täitja pakub abi ainult **mitte-meditsiinilistes** olukordades. Terviseohu korral kutsutakse 112.

## 3. Admin — rollid

| Roll (kood) | Kirjeldus | Õigused |
|---|---|---|
| **Süsteemi admin** (`admin_system`) | platvormi haldaja (meie meeskond) | kõik: kasutajad, rollid, organisatsioonid, omavalitsused, demoandmete lähtestamine |
| **KOV sotsiaaltöötaja** (`admin_kov`) | omavalitsuse sotsiaaltöötaja | näeb oma KOV-i klientide juhtumeid (ainult nõusolekuga), korduvkukkujate nimekiri, märgib "võetud menetlusse" |

## Seosed

```
KOV ─┬─< Klient (abisaaja) ─┬─< kliendi kontaktid (lähedane, esindaja)
     │                      └─< kliendi täitjad (vabatahtlik, lähedane, organisatsioon)
     └─< admin_kov kasutajad
Organisatsioon (teenuseosutaja) ─< helper_pro, helper_coordinator
Juhtum (incident) → klient, võtnud täitja, tulemus
```

Üks **inimene (kasutaja)** võib omada mitut rolli: nt Mari on oma ema jaoks `client_relative` ja samal ajal `helper_relative`.

## MVP lihtsustus (häkaton)
- Päris sisselogimist ei ole. Iga osa avalehel on **"Vali demokasutaja"** rippmenüü, mis paneb valitud kasutaja id küpsisesse (`uppis_user`).
- Õiguste kontroll toimub serveris funktsiooniga `can(user, action, resource)` failis `lib/permissions.ts`.
- `/admin` on lisaks kaitstud PIN-iga (`ADMIN_DEMO_PIN`).
