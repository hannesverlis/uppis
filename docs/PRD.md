# PRD — Uppis (MVP)

## Probleem
Kodus kukkunud eakas, kes ei vaja meditsiinilist abi, aga ei saa ise püsti, helistab 112-le. Sinna sõidab tavaliselt politsei. 2025. aastal registreeris Häirekeskus 898 kodust kukkumisjuhtumit, neist 454 juhul reageeris ainult politsei. 39% juhtumitest olid korduvad (samad aadressid) ja 41% omavalitsustest ütleb, et info kukkumistest nendeni ei jõua.

Lahendus ei tohi tekitada olukorda, kus terviseohuga inimene jääb 112 asemel ootama naabrit.

## Osalejad
Lehekülg jaguneb kolmeks osaks: **Kliendid**, **Täitjad** ja **Admin**. Igas osas on mitu rolli. Täpne rollide ja õiguste kirjeldus: [ROLLID.md](ROLLID.md).

- **Kliendid:** abisaaja (eakas), lähedane, eestkostja/esindaja
- **Täitjad:** vabatahtlik/naaber, lähedane täitjana, sotsiaalvalve töötaja, teenuseosutaja koordinaator
- **Admin:** süsteemi admin, KOV sotsiaaltöötaja

## Avaleht
Menüü kolme esmase jaotusega: **Kliendid · Täitjad · Admin**. Igas osas valib kasutaja demos oma kasutaja (rolli) rippmenüüst.

## MVP kasutuslood

### Kliendid
1. **Abisaaja vajutab "Ma kukkusin".** Rakendus küsib 3–5 lihtsat jah/ei küsimust (pea, tugev valu/ei saa liigutada, verejooks, hingamisraskus/rinnavalu, põrandal üle tunni).
   - Ükskõik milline "jah" või vastamata 60 s → suur punane **"Helista 112"** nupp; lähedased ja täitjad saavad teate.
   - Kõik "ei" → abipalve läheb kliendi täitjatele.
2. **Lähedane / esindaja haldab klienti:** aadress, ligipääsu info (võti, uksekood), seotud täitjad, KOV nõusolek. Näeb juhtumite ajalugu.

### Täitjad
3. **Täitja näeb abipalvet** (reaalajas), vajutab **"Lähen appi"** ja valib ETA. Abisaaja ekraanil: "Mari tuleb, umbes 10 min".
4. Kui 10 min jooksul keegi ei võta → abisaajale "Helista 112", täitjatele korduv teade.
5. **Täitja sulgeb juhtumi:** "Aitasin püsti" / "Kutsusin 112" + märkus.
6. **Koordinaator** näeb kõiki oma organisatsiooni juhtumeid ja saab määrata töötaja.

### Admin
7. **KOV sotsiaaltöötaja** näeb oma omavalitsuse juhtumeid ja **korduvkukkujaid** (≥2 juhtumit 30 päeva jooksul), ainult nõusolekuga klientide kohta, ja saab märkida "võetud menetlusse".
8. **Süsteemi admin** haldab kasutajaid, rolle, organisatsioone ja seoseid ning saab demoandmed lähtestada.

## Mis MVP-sse EI kuulu
- Päris sisselogimine ja paroolid (demokasutaja valik rippmenüüst)
- Maksed
- Päris SMS/push teavitused (valikuline lisa)
- Kukkumisandurid, nutikellad
- Liidestus Häirekeskuse või STAR-iga (tulevikusuund pitch'is)

## Edukuse mõõdik demos
Žürii näeb 3 minutiga terviklikku lugu: avaleht → Kliendid: abisaaja kukub → triaaž → Täitjad: naaber võtab abipalve → juhtum suletakse → Admin: KOV vaates ilmub korduvkukkuja märge.
