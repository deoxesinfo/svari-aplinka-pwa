# Vienos nuotraukos R2 pilotas – saugiklių DRAFT (2026-10-19)

**BŪSENA:** kodas GitHub DRAFT šakoje. NEDEPLOYINTAS. Dabartinis Cloudflare Worker vis dar su `ENABLE_UPLOADS=false` ir nėra gavęs šios naujos apsaugos. Supabase, PWA ir Cloudflare be naujo patvirtinimo NEKEISTI.

## Kokie saugikliai paruošti
- `ENABLE_UPLOADS` lieka absoliutus užraktas: jei ne `true`, `POST /v1/photos` atsako 503 `UPLOADS_DISABLED`.
- Papildomas `PILOT_ENABLED`: turi būti atskirai `true`, kitaip 503 `PILOT_NOT_CONFIGURED`.
- Tiksliai viena organizacija (PILOT_ORG_ID), vienas `auth.uid()` (PILOT_USER_ID), vienas `sa_jobs.id` (PILOT_JOB_ID); bet kuri kita kombinacija 403 `PILOT_SCOPE_DENIED`.
- Nepavykus prisijungti, RLS / narystei ar jei naudotojas ne admin, failas neįkeliamas.
- GPS saugomo ar archyvuoto darbo įkėlimas blokuojamas; darbas turi priklausyti nurodytam adresui.
- Tikras JPEG/WebP (dydis, antraštė, MIME), tik `jobId`, vienam darbui 15 nuotraukų DB trigeris.
- **Vienintelis viso piloto R2 objektas-rezervacija:** `__sa_pilot_guard__/one-photo-v1` privačiame `svari-aplinka-foto` bucket. `put` siunčiamas su `If-None-Match: *` kaip atomine sąlyga, todėl tik vienas lygiagretus bandymas gali sukurti rezervaciją; kiti gauna 409 `PILOT_ALREADY_USED`.
- Rezervacija išlieka net jei įkėlimo arba DB įrašymo veiksmai žlunga. **Bandymo automatiškai nekartoti.** Rezervacijos objekto netrinti be atskiro patvirtinimo; kitaip pilotas galėtų būti paleistas antrą kartą. Failo trynimo API ir DB DELETE politika išjungti.

Cloudflare R2 oficiali nuoroda: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/ (R2PutOptions.onlyIf, sąlyginių užklausų palaikymas ir null nesėkmės atveju).

## Kintamieji tik BŪSIMAM atskirai patvirtintam pilotui
| Kintamasis | DRAFT reikšmė | Būsena dabar |
|---|---|---|
| ENABLE_UPLOADS | `false` iki pačio piloto | **NEKEISTI** |
| PILOT_ENABLED | `false` | **DABAR NEPRIDĖTI / NEAKTYVUOTI** |
| PILOT_ORG_ID | pasirinktos organizacijos UUID | Parinkti tik po patvirtinimo |
| PILOT_USER_ID | vieno admin Supabase `auth.users.id` | Parinkti tik po patvirtinimo |
| PILOT_JOB_ID | vieno aktyvaus be GPS apsaugos `sa_jobs.id` | Parinkti tik po patvirtinimo |
| SUPABASE_URL, PUBLISHABLE_KEY, ALLOWED_ORIGIN, R2_BUCKET | esami ir tikslūs | **NEKEISTI** |

Neįrašyti slaptažodžių, prisijungimo access tokenų ir `service_role` į GitHub arba pokalbį. Piloto ID patikrinti autorizuotoje administratoriaus Supabase aplinkoje, nepriskirti naudotojų savavališkai.

## Vykdymo seka (tik po naujų atskirų patvirtinimų)
1. Dar kartą patikrinti GitHub CI (PWA, Worker unit + concurrent-POST), pasirinkti vieną sintetinę neasmeninę nuotrauką, admin, GPS neapsaugotą darbą.
2. Patvirtinti **naujo Worker kodo Deploy**. Paskelbti tik jį su `ENABLE_UPLOADS=false` bei `PILOT_ENABLED=false`; neįjungti įkėlimų.
3. Atlikti aktyvios versijos neautorizuotų užklausų ir disabled-state testus (401, 403, 503); įsitikinti R2 vieša prieiga Disabled.
4. Po **atskiro vienos nuotraukos TEST approval**, suplanuotu bandymo metu užpildyti identifikatorius; įjungti abu saugiklius `PILOT_ENABLED=true`, `ENABLE_UPLOADS=true`.
5. Vienas admin `POST /v1/photos` su tikru naršyklės JWT, neatskleidžiant jo jokiuose loguose. Net ir dvejoms lygiagrečioms užklausoms leidžiamas tik vienas R2 rezervacijos sukūrimas.
6. Tikrinti HTTP 201, vieną DB metadata eilutę ir 2 vaizdo objektus (full, thumb), GET peržiūrą su JWT, be JWT → 401, pakartotas POST → 409.
7. Nedelsiant grąžinti `ENABLE_UPLOADS=false`, `PILOT_ENABLED=false` (atskirai patvirtintais Cloudflare konfigūracijos veiksmais). Pakartoti POST → 503.
8. Bandomasis failas saugomas privačiai iki atskirai patvirtinto saugaus trynimo / duomenų išvalymo. **Jokio automatinio ištrynimo**.

## Dar neatlikta
- Nepatikrinta tikrame Cloudflare R2 `onlyIf` ir 2 lygiagrečių įkėlimų elgsena (DRAFT testas naudoja R2 mock).
- Neišbandytas admin `JWT → Worker → R2 → Supabase → GET` grandinės veiksmas.
- PWA įkėlimo sąsaja ir `CLOUD_R2_PHOTOS_READY` liko nepublikuoti/išjungti.
- Pilnos sistemos darbuotojų nuotraukų, adresų be darbo ir GPS apsaugotų objektų palaikymui reikalinga kita peržiūra.

## Anuliavimas
Kol kas **nėra ko anuliuoti veikiančioje infrastruktūroje**: šiame etape keisti tik GitHub DRAFT failai. Pilotui nesuveikus vėliau, išjungti abu Worker kintamuosius, bet rezervacijos netrinti be specialaus sprendimo.
