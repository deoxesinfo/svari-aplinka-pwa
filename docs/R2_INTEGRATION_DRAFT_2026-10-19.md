# Švari Aplinka PWA – R2 nuotraukų integracija (DRAFT, nepublikuota)
Data: 2026-10-19. Šaka: `feature/r2-photos-draft-no-deploy`.
**NĖRA PATVIRTINIMO SUPABASE MIGRACIJAI, WORKER DEPLOY AR PWA DEPLOY.**

## Patikrinta skaitymo režimu
- PWA Supabase: `mbinhbascpeupnxrvidk` (NE švarios aplinkos svetainės CMS).
- `sa_photo_metadata` lentelė yra ir RLS įjungta; SELECT/INSERT/UPDATE politikos jau egzistuoja, admin DELETE politikos nėra.
- Esamas `src/lib/photos.ts` įrašo dvejas kompresuotas nuotraukas `IndexedDB` (1600/400px, WebP arba JPEG fallback).
- Debesijos režime upload iki šiol buvo išjungtas, cloud state nuotraukų sąrašas buvo `[]`.
- Cloudflare Worker ir privatus R2 EU bucket susieti per `R2_BUCKET` (patvirtinta naudotojo ekrane). Worker tebėra pradinis Hello World.

## Šioje šakoje
- `cloudflare/photo-worker.mjs`: JWT Auth getUser, narystės patikra, admin-only POST, RLS filtravimas GET, failų dydžio/tipo ir WebP/JPEG parašo patikra, serverio generuojami R2 object key, iki 15 nuotraukų darbui, rollback nepavykus įrašyti metaduomenų.
- `src/lib/r2-photos.ts`: supabase JWT siunčiamas tik į privatų Worker API; jo raktas nėra saugomas PWA.
- `src/lib/cloud-sync.ts`: RLS filtruotų nuotraukų metaduomenų skaitymas.
- `src/lib/photos.ts`, `src/components/app/Photos.tsx`: WebP įkėlimas ir R2 blob peržiūra, bet **CLOUD_R2_PHOTOS_READY=false** (nėra veikiančios UI aktyvacijos).
- `src/lib/store.ts`: blokuojamas lokalus metaduomenų trynimas/žymų keitimas cloud režimu, kad nebūtų klaidingo įspūdžio, jog tai išsaugota serveryje.
- `supabase/migrations/DRAFT_20261019_r2_photo_safety_DO_NOT_APPLY.sql`: siūloma admin DELETE RLS politika ir transakcinis 15 nuotraukų į vieną darbą apribojimas.

## Saugumo ribos prieš aktyvavimą
- Cloudflare binding: `R2_BUCKET` jau yra, bet kodo dar nediegti.
- Cloudflare konfigūracijai reikės `SUPABASE_URL=https://mbinhbascpeupnxrvidk.supabase.co`; `ALLOWED_ORIGIN=https://deoxesinfo.github.io`; `SUPABASE_PUBLISHABLE_KEY` yra tik viešasis publishable key, jokių service_role / R2 API secrets naršyklėje.
- GPS apsaugoti objektai/darbai: Worker **atmeta** įkėlimą; serverinis GPS patvirtinimas dar neįgyvendintas.
- R2 trynimas sąmoningai išjungtas; reikalingas atskiras saugus ištrynimo / pakartotinių bandymų / „orphan“ failų sprendimas.
- 15 darbų nuotraukų riba be migracijos neužtikrina lygiagretumo – **neaktyvuoti** iki DB patvirtinimo.
- Būtina įdiegti audito įrašus, throttling/rate limiting, testuoti sutrikimų ir rollback atvejus.
- Išjungtas funkcinis flag reiškia, kad net paskelbus PR per klaidą PWA cloud nuotraukų įkėlimas liks išjungtas.
- Personalo avatarų debesijos funkcija lieka atskira užduotis, nekeista.

## Prieš Deploy
1. Peržiūrėti PR ir CI rezultatus (Vitest, Node Worker testai, Build).
2. Patvirtinti Supabase migraciją atskirai; prieš taikant patikrinti DB duomenis ir rollback.
3. Patvirtinti Worker kodo diegimą atskirai ir sukonfigūruoti Worker viešuosius kintamuosius; įsitikinti, kad R2 liko privatus.
4. Testuoti su testine nuotrauka (admin/worker, GPS protected, 15 riba, fail size, preview, errors) – užtikrinti duomenų nuoseklumą.
5. Atskiru patvirtinimu įjungti `CLOUD_R2_PHOTOS_READY` ir tik tuomet PWA Deploy.

## Pastaba dėl masto
Tai architektūrinis DRAFT. Automatiniai testai nesudaro tikro iPhone Safari ar produkcinės įrangos testavimo.
