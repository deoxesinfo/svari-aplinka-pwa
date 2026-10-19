# Švari Aplinka – Cloudflare R2 / Worker: 2 etapas, parengta, BE DEPLOY
Atnaujinta: 2026-10-19.

**SVARBU: NEDARYTI NĖ VIENO „Save and deploy“, „Deploy“, „Save & Deploy“, Worker kodo pakeitimo ar įjungimo be naujo naudotojo patvirtinimo.**
Šie duomenys yra pasiruošimo instrukcijos. GitHub `main`, PWA ir Cloudflare Workers kodas **nepakeisti**.

## Esama būsena
- Worker: `svari-aplinka-photos`
- Darbuotojo Worker URL: `https://svari-aplinka-photos.svariaplinka-lt.workers.dev`
- R2: `svari-aplinka-foto` (privati EU, Standard; iš naudotojo ekrano)
- R2 binding: `R2_BUCKET` (iš naudotojo ekrano)
- Supabase PWA projekto ref: `mbinhbascpeupnxrvidk`
- GitHub projekto DRAFT PR: https://github.com/deoxesinfo/svari-aplinka-pwa/pull/4
- Worker kodas: [cloudflare/photo-worker.mjs](../cloudflare/photo-worker.mjs)
- API testai: [cloudflare/photo-worker.test.mjs](../cloudflare/photo-worker.test.mjs)

## Worker aplinkos kintamieji – paruošti būsimam atskirai patvirtintam diegimui
Cloudflare Dashboard → Workers & Pages → `svari-aplinka-photos` → Settings → Variables and Secrets → Add.

| Type | Variable name | Value |
|---|---|---|
| Text | `SUPABASE_URL` | `https://mbinhbascpeupnxrvidk.supabase.co` |
| Secret (arba Text; viešas key) | `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_PtfE1p4mDM2vGLZI6i5X7w_MiOKwsys` |
| Text | `ALLOWED_ORIGIN` | `https://deoxesinfo.github.io` |
| Text | `ENABLE_UPLOADS` | `false` |

- R2 Binding jau yra, iš naujo kurti bucket ar R2 access token **nereikia**.
- `SUPABASE_PUBLISHABLE_KEY` yra viešas Supabase publishable key, o ne service_role ar slaptasis raktas.
- Origin reiškia tik domeną, be `/svari-aplinka-pwa/` kelio ir be galinio `/`.
- **NENAUDOTI** `service_role`, JWT Secret, R2 API access keys, tokenų naršyklėje ar WordPress/CMS Supabase URL.
- Jei Cloudflare siūlo pridėjus Variable „Deploy“, kol nėra atskiro patvirtinimo **sustabdyti**.

## Vėlesnė diegimo seka – tik gavus atskirą APPROVE
1. Išsaugoti prieš diegimą esančios Worker versijos kopiją / žinoti Rollback.
2. Patikrinti esamą `R2_BUCKET` susiejimą Settings → Bindings ir privačią saugyklą.
3. Pridėti 4 aukščiau esančius kintamuosius; `ENABLE_UPLOADS=false`.
4. Workers & Pages → Worker `svari-aplinka-photos` → Edit code. Pakeisti tik dabartinį Hello World kodą pilnu [photo-worker.mjs](../cloudflare/photo-worker.mjs) turiniu.
5. **Tik po atskiro patvirtinimo** spausti `Deploy`. Iš pradžių įkėlimas liks išjungtas, net jei Worker pasiekiamas internete.
6. Patikrinti `GET /health` atsaką `{"status":"ok"}`, tyčinius 401 be JWT, 503 `UPLOADS_DISABLED`, kitus saugumo scenarijus.
7. Įkelti testinę nuotrauką galima tik po naujo patvirtinimo keisti `ENABLE_UPLOADS=true`. Testinė PWA dar nepaleidžiama.
8. PWA Deploy ir `CLOUD_R2_PHOTOS_READY=true` yra DAR KITI atskiri patvirtinimai.

## Tiksliai kas leidžiama šiame etape
- `GET /health`: patikrina Worker paleidimą; be privačių duomenų.
- `GET /v1/photos/{uuid}/thumb|full`: tik su Supabase naudotojo JWT, aktyvia naryste organizacijoje ir RLS matomu metaduomenų įrašu.
- `POST /v1/photos`: tik su `ENABLE_UPLOADS=true`, aktyviu admin JWT, tik su realiu jobId, teisingu addressId, iki 15 nuotraukų darbui, JPEG/WebP tipais ir iki 7 MB pilnos HTTP užklausos dydžiu (3 MB didelė + 512 KB miniatiūra).
- Įkėlimas GPS saugomuose adresuose/darbuose sąmoningai neveiks iki serverinės GPS autorizacijos.
- Tik adreso (be darbo) nuotraukos šiame saugaus piloto variante išjungtos, nes DB 15 vienetų riba šiuo metu apima tik jobId.
- Šalinimas (`DELETE`) ir debesijos žymų keitimas išjungti.
- Darbuotojams POST neveiks – jų įkėlimui reikia atskiros patvirtintos Supabase RLS teisių migracijos.
- Personalo avatarai debesijoje dar neatliekami.

## Likutinės rizikos prieš pilną naudojimą
- Įdiegti pagal organizaciją / naudotoją ribojamą užklausų dažnį („rate limit“) ir apsaugą nuo išlaidų viršijimo; $1 perspėjimas nėra absoliutus mokesčių limitas.
- Atlikti realius Cloudflare + Supabase end-to-end ir iPhone/Chrome nuotraukų bandymus.
- Įvertinti retesnę R2 GET prieigą bei peržiūros optimizavimą; PWA nuotraukų galerija gali sukelti daug read užklausų.
- Jei Supabase užklausos atsakymas dingsta po įrašymo, Worker patikrina ar metaduomenys buvo įrašyti; jei neįmanoma patikimai nustatyti būsenos, grąžina `UPLOAD_OUTCOME_UNKNOWN` ir nepašalina R2 failo, kad nesugadintų galimo jau įrašyto metaduomens. Atskirai reikalingas „orphan“ failų sutikrinimas.
- Įkėlimo JPEG/WebP „magic bytes“ patikra nėra pilnas vaizdo dekodavimas serveryje.
- Dar nepatvirtinta, kad Supabase valdomos pilnos DB atsarginės kopijos įjungtos.

## Saugumo principas
Nieko nediegti į produkciją automatiškai. Iki `ENABLE_UPLOADS=true` ir `CLOUD_R2_PHOTOS_READY=true` abi funkcijos atskirai yra užblokuotos.
