# R2 – greitas vienos nuotraukos PWA PREVIEW planas (2026-10-19, DRAFT)

**Tik planas. Nieko nepublikuota ir neaktyvuota.** PR #4 lieka DRAFT, PWA `main` = `91ff60aa67b350a51205fef7e6934356dcc79ef0` nepakeista, `ENABLE_UPLOADS=false`, `PILOT_ENABLED` nenurodytas (= išjungta), Supabase nekeista.

## Rekomenduojamas būdas: izoliuotas GitHub Pages projektas
GitHub Pages **repo pavadinimas** turi būti kitas, tačiau tas pats savininkas `deoxesinfo`. Pvz., NAUJAS atskiras testinis repo `deoxesinfo/svari-aplinka-r2-pilot` → `https://deoxesinfo.github.io/svari-aplinka-r2-pilot/`. Tai **tas pats origin** `https://deoxesinfo.github.io`, todėl esamas Worker `ALLOWED_ORIGIN` tinka ir nereikia keisti Cloudflare.

SVARBU: testinį repo reikia laikyti privačiu arba riboti prieigą; įprastas GitHub Pages projektas su viešais build failais nėra paslapčių saugykla, tačiau pati PWA visada turi reikalauti Supabase auth, o Worker tikrinti JWT/RLS. Viešas statinio JS turinys nėra paslapčių apsauga.

### Kodėl nepublikuoti šio repo dalinio katalogo be atskiro pipeline
Dabartinis `.github/workflows/pages.yml` visą `dist` katalogą skelbia iš `main`, o `vite.config.ts` turi `base: "/svari-aplinka-pwa/"`. Netvarkingai prijungtas pilotas galėtų perrašyti gyvą PWA. NEREIKIA keisti esamos production Pages workflow ir jos main.

## Vienas atskirai tvirtinamas publikavimo veiksmas (PILOT UI ONLY; Worker uploads vis dar OFF)
1. Sukurti atskirą bandomosios svetainės repo tik po naujo patvirtinimo; nelaikyti ten slaptažodžių, JWT ar R2 API raktų. Kodo šaltinis – PR #4 DRAFT (be merge į main).
2. Sukonfigūruoti šio atskiro projekto Vite base `/svari-aplinka-r2-pilot/`. Izoliuoti PWA manifestą (`scope/start_url`) arba jį visai išjungti testiniame leidime, kad „Add to Home Screen“ / service worker nesumaišytų su darbo PWA.
3. Specialiai testinei versijai aplinkoje `VITE_SA_R2_PILOT=admin-one-photo` ir `VITE_SA_R2_PILOT_JOB_ID=<pasirinkto GPS neapsaugoto darbo UUID>` atverti tik vieno failo administratoriaus mygtuką. Įprastame build ši funkcija lieka išjungta.
4. Build + Vitest + Worker unit testus atlikti prieš publikavimą. Testinį repo publikuoti tik po atskiro patvirtinimo.
5. Patikrinti, kad originalus URL `https://deoxesinfo.github.io/svari-aplinka-pwa/` rodo tą pačią production versiją, o testinis URL – atskirą, prisijungimo reikalaujančią versiją.
6. **Iki TEST UI patvirtinimo:** `ENABLE_UPLOADS=false` ir `PILOT_ENABLED=false` (ar nenustatytas), visos POST turi likti HTTP 503. Be atskiro patvirtinimo **neįjungti**.

## Po testinio publikavimo – tik atskirai tvirtinamas ONE PHOTO RUN
- Parinkti vieną aktyvų administratorių ir vieną GPS neapsaugotą darbą, visus `PILOT_*_ID` patikrinti su Supabase naryste. Vienas neasmeninis JPEG/WebP vaizdas.
- Tik po atskiro sutikimo Cloudflare laikinai nustatyti `PILOT_ENABLED=true` ir `ENABLE_UPLOADS=true`; Worker vienkartinė R2 `If-None-Match:*` rezervacija leidžia daugiausia vieną bandymą. Vėliau abu išjungti, patikrinti POST 503.
- Patikrinti 1 metaduomenų eilutę, 2 privačius R2 objektus, JWT GET, anoniminį 401, pakartotinį POST 409. Nebandyti automatiškai kartoti net įvykus klaidai.

## Greitas atkūrimas (rollback)
**Pirminė production PWA nenukentėjo**, todėl jos rollback neturėtų prireikti.
1. Jei testinė svetainė kelia problemų, nutraukti / išjungti tik testinio repo GitHub Pages publikavimą; originalaus repo `main`, production `pages.yml` ir `/svari-aplinka-pwa/` neliesti.
2. Cloudflare kintamieji privalo likti `ENABLE_UPLOADS=false` ir `PILOT_ENABLED=false`; patikrinti, kad nuotraukų POST → 503.
3. Jei kada nors vis dėlto tektų atstatyti gamybinę PWA, tik po atskiro sutikimo publikuoti patikrintą `main` SHA `91ff60aa67b350a51205fef7e6934356dcc79ef0` (naujausia šio plano momento versija). Be leidimo neatlikti rollback.
4. Testinės nuotraukos R2 trynimas nėra įdiegtas, todėl jokio trynimo be atskiro patvirtinimo.

## Būsena
- ✅ Ištirtas esamas pages.yml, Vite base, Supabase auth, Worker origin, galimas atskiro GitHub Pages repo kelias.
- ✅ Darbų planas ir atkūrimas aprašyti.
- ⛔ **Nesukurta** naujo repo, **jokio** Deploy, PR merge, Cloudflare nustatymų ar Supabase pakeitimų.

**Vienas kitas patvirtinimas:** paruošti atskirą `svari-aplinka-r2-pilot` repo ir publikuoti izoliuotą testinį UI su abiem Worker upload jungikliais OFF; originalios PWA neperrašyti.
