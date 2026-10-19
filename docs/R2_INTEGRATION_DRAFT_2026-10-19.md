# Švari Aplinka PWA – R2 nuotraukų integracija (DRAFT, nepublikuota)
Data: 2026-10-19. Šaka: `feature/r2-photos-draft-no-deploy`.
**DB 1 ETAPAS ĮVYKDYTAS 2026-10-19:** Supabase migracija `20261019074937` (`sa_pwa_r2_photo_per_job_limit_15_stage1_20261019`) sėkmingai pritaikyta TIK 15 nuotraukų vienam darbui ribai. **DELETE RLS politika nepakeista.** Cloudflare Worker ir PWA Deploy **NEPATVIRTINTI, NEVYKDYTI**.

## Cloudflare bandomojo Deploy ir išorinės API patikros rezultatai (2026-10-19)

- Worker Deployment: naudotojas patvirtino aktyvią Cloudflare versiją 531974a7 ir pateikė GET /health → {"status":"ok"} ekrano nuotrauką.
- Runtime konfigūracija: pagal naudotojo Cloudflare ekranus patikrinti R2_BUCKET, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, ALLOWED_ORIGIN, ENABLE_UPLOADS=false. Išorinis testas patvirtino įkėlimo blokavimą.
- GitHub Actions live API patikra 39226250809: **6/6 PASS**:
  - GET /health → 200, JSON status=ok;
  - GET /v1/photos/{test-uuid}/thumb be Bearer → 401 AUTH_REQUIRED;
  - tuščias, neautorizuotas POST /v1/photos → 503 UPLOADS_DISABLED, jokių failų;
  - DELETE /v1/photos/{test-uuid} → 403 DELETE_DISABLED;
  - OPTIONS su PWA origin https://deoxesinfo.github.io → 204, leidžiamas CORS;
  - OPTIONS su svetimu origin → 403 ORIGIN_DENIED.
- Įrodymai: https://github.com/deoxesinfo/svari-aplinka-pwa/actions/runs/39226250809
- Testams nenaudoti prisijungimo duomenys, tikros nuotraukos ar klientų įrašai.
- Šie testai dar neįrodo prisijungusių naudotojų RLS leidimų, realaus R2/DB nuotraukų įkėlimo, serverinio GPS sprendimo, galutinės iOS/Android peržiūros ar atsparumo apkrovai. Reikalingas atskirai autorizuotas integracijos pilotas.
- Šiame FINAL CHECK etape naujo Worker/PWA Deploy nebuvo, Supabase nekeista. Worker nuotraukų įkėlimas IŠJUNGTAS, PR #4 lieka DRAFT.

## Patikrinta skaitymo režimu
- PWA Supabase: `mbinhbascpeupnxrvidk` (NE švarios aplinkos svetainės CMS).
- `sa_photo_metadata` lentelė yra ir RLS įjungta; SELECT/INSERT/UPDATE politikos jau egzistuoja, admin DELETE politikos nėra.
- Esamas `src/lib/photos.ts` įrašo dvejas kompresuotas nuotraukas `IndexedDB` (1600/400px, WebP arba JPEG fallback).
- Debesijos režime upload iki šiol buvo išjungtas, cloud state nuotraukų sąrašas buvo `[]`.
- Cloudflare Worker ir privatus R2 EU bucket susieti per `R2_BUCKET` (patvirtinta naudotojo ekrane). Worker jau aktyvus su bandomuoju API, tačiau nuotraukų įkėlimas išjungtas (ENABLE_UPLOADS=false).

## Šioje šakoje
- `cloudflare/photo-worker.mjs`: JWT Auth getUser, narystės patikra, admin-only POST, RLS filtravimas GET, failų dydžio/tipo ir WebP/JPEG parašo patikra, serverio generuojami R2 object key, iki 15 nuotraukų darbui, rollback nepavykus įrašyti metaduomenų.
- `src/lib/r2-photos.ts`: supabase JWT siunčiamas tik į privatų Worker API; jo raktas nėra saugomas PWA.
- `src/lib/cloud-sync.ts`: RLS filtruotų nuotraukų metaduomenų skaitymas.
- `src/lib/photos.ts`, `src/components/app/Photos.tsx`: WebP įkėlimas ir R2 blob peržiūra, bet **CLOUD_R2_PHOTOS_READY=false** (nėra veikiančios UI aktyvacijos).
- `src/lib/store.ts`: blokuojamas lokalus metaduomenų trynimas/žymų keitimas cloud režimu, kad nebūtų klaidingo įspūdžio, jog tai išsaugota serveryje.
- `supabase/migrations/DRAFT_20261019_r2_photo_safety_DO_NOT_APPLY.sql`: istorinis, **jau pritaikytos** DB migracijos SQL šaltinis su transakciniu 15 nuotraukų apribojimu. Ankstesnė siūlyta admin DELETE politika pašalinta ir neįdiegta.
- `supabase/rollbacks/ROLLBACK_20261019_r2_photo_limit.sql`: grąžinimo SQL tik naujam trigeriui ir funkcijai; nevykdyta.

## Saugumo ribos prieš aktyvavimą
- Cloudflare binding: `R2_BUCKET` jau yra, bet kodo dar nediegti.
- Cloudflare konfigūracijai reikės `SUPABASE_URL=https://mbinhbascpeupnxrvidk.supabase.co`; `ALLOWED_ORIGIN=https://deoxesinfo.github.io`; `SUPABASE_PUBLISHABLE_KEY` yra tik viešasis publishable key, jokių service_role / R2 API secrets naršyklėje.
- GPS apsaugoti objektai/darbai: Worker **atmeta** įkėlimą; serverinis GPS patvirtinimas dar neįgyvendintas.
- R2 trynimas sąmoningai išjungtas; reikalingas atskiras saugus ištrynimo / pakartotinių bandymų / „orphan“ failų sprendimas.
- 15 nuotraukų riba įdiegta kaip trigeris, užrakinantis darbelio įrašą. Patikrinta transakciniame teste: 15 leidžiama, 16-a atmetama; po testo lentelėje 0 įrašų. Konkurencijos su realiomis sesijomis ir API testai dar reikalingi.
- Būtina įdiegti audito įrašus, throttling/rate limiting, testuoti sutrikimų ir rollback atvejus.
- Išjungtas funkcinis flag reiškia, kad net paskelbus PR per klaidą PWA cloud nuotraukų įkėlimas liks išjungtas.
- Personalo avatarų debesijos funkcija lieka atskira užduotis, nekeista.

## Prieš Deploy
1. Peržiūrėti PR ir CI rezultatus (Vitest, Node Worker testai, Build).
2. **Atlikta**: Supabase DB 1 etapas. Prieš diegimą nuotraukų lentelėje buvo 0 eilučių; išsaugotas tikslinis schemos ir būsenos snapshot bei rollback SQL. **Pilno projekto valdomos atsarginės kopijos egzistavimas nepatvirtintas.**
3. Patvirtinti Worker kodo diegimą atskirai ir sukonfigūruoti Worker viešuosius kintamuosius; įsitikinti, kad R2 liko privatus.
4. Testuoti su testine nuotrauka (admin/worker, GPS protected, 15 riba, fail size, preview, errors) – užtikrinti duomenų nuoseklumą.
5. Atskiru patvirtinimu įjungti `CLOUD_R2_PHOTOS_READY` ir tik tuomet PWA Deploy.

## Pastaba dėl masto
Tai architektūrinis DRAFT. Automatiniai testai nesudaro tikro iPhone Safari ar produkcinės įrangos testavimo.
