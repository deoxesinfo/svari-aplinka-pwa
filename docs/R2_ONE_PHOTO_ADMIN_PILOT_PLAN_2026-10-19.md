# Švari Aplinka R2 – vienos nuotraukos administratoriaus pilotas (PLANAS / NEVYKDYTI)
Data: 2026-10-19. Repo: deoxesinfo/svari-aplinka-pwa. PR #4 yra DRAFT.
**Tik patikra ir planas. JOKIŲ ENABLE_UPLOADS pakeitimų, Supabase DDL/DML, PWA ar Worker Deploy.**

## Faktai patikrinti READ-ONLY
- Supabase projektas: `mbinhbascpeupnxrvidk` („Švari Aplinka PWA“), ne viešos svetainės CMS.
- `sa_photo_metadata`: 0 įrašų; `sa_jobs`: 9; tinkamų (nearchyvuotų, nepašalintų, be `gpsRequired` ir be adreso `gpsProtectionEnabled`): 9 (2026-10-19 patikros momentas).
- Yra 1 aktyvus administratoriaus narystės įrašas.
- DB `sa_photo_insert_guard_trg` aktyvus: 15 nuotraukų vienam darbui, o nuotraukų `DELETE` RLS politikų nėra.
- Live Worker „health“ ir neautorizuotų užklausų CI: 6/6 PASS, įskaitant `POST`→503 `UPLOADS_DISABLED`, `GET` be prisijungimo→401 ir `DELETE`→403.
- GitHub CI: PWA 66/66, Worker 21/21, build PASS (ankstesnis final-check etapas).
- `src/lib/r2-photos.ts`: `CLOUD_R2_PHOTOS_READY=false`, gyva PWA nuotraukų neįkelia.

## Saugumo ribojimai / blokatoriai
1. Pakeitus dabartinį `ENABLE_UPLOADS` į `true`, **visi autorizuoti organizacijos administratoriai galėtų kelti daugiau nei vieną nuotrauką**, iki 15 į vieną darbą. „Vienos nuotraukos pilotas“ nėra užtikrinamas dabartiniu Worker kodu.
2. Prieš atskirai tvirtinamą pilotą reikia suplanuoti trumpalaikį **serverinį ribojimą** vienai pasirinkto darbo užduočiai ir administratoriaus paskyrai. Vien kliento (PWA) ribojimas nėra saugumo garantija. Kad būtų užtikrinta absoliuti vieno įkėlimo riba esant lygiagrečioms užklausoms, reikia papildomo atomarinio serverinio saugiklio – vien tik „SELECT count < 1“ neužtenka.
3. Nuotraukų `DELETE` išjungtas – po tikro piloto failą tektų **palikti privačioje saugykloje** iki atskiro suderinto saugaus trynimo arba naudoti atskirą testinę saugyklą. Negalima žadėti automatinio išvalymo.
4. PWA yra `main` be R2 integracijos; tam pačiam naudotojo srautui reikia atskirai patvirtinto riboto preview/testo kliento arba vėlesnio PWA publikavimo. Jokio JWT kopijavimo į pokalbį, GitHub ar viešus įrankius.
5. GPS saugomų objektų nuotraukų kėlimas NELEIDŽIAMAS, kol nėra patikrinto serverinio GPS sprendimo; darbuotojai ir adreso nuotraukos be `jobId` taip pat neįjungiami.
6. Patikrinti Cloudflare rate limiting ir audito įrašus prieš bendrą paslaugos atvėrimą; dabartiniai 6/6 testai nėra pilnas pentestas.

## Siūloma bandomojo paleidimo seka – vykdyti TIK po atskiro APPPROVE
1. Paruošti izoliuotą administratoriaus pilotą atskiroje testinėje sąsajoje arba laikiname peržiūros leidime. Pasirinkti vieną iš 9 saugių (GPS neapsaugotų) darbų; nekeisti kitų darbų.
2. Worker DRAFT papildyti: konkretaus `pilot_user_id` ir `pilot_job_id` patikra, vieno įkėlimo serverinis/atomarinis limitas, per trumpą laiką išjungiamas perjungiklis. Atskirai patikrinti, kad ne admin ir kiti darbai yra 403/409. Naujai versijai reikės atskiro Worker Deploy approval.
3. Vėl įsitikinti, kad `R2_BUCKET` privatus, `ENABLE_UPLOADS=false`, `CLOUD_R2_PHOTOS_READY=false` ir nėra aktyvių neišaiškintų RLS/GPS problemų.
4. Po **atskiro tikslaus patvirtinimo** laikinai įjungti vieno failo pilotą ir per įprastą Supabase prisijungimą įkelti **vieną sintetinę nuotrauką be žmonių, durų kodų, adresų ar kito privataus turinio**; JPEG/WebP turi būti tvarkinga tikra nuotrauka, parengta 1600 px full ir 400 px thumb variantais.
5. Patikrinti: HTTP 201, 1 `sa_photo_metadata` eilutė, 2 privatūs R2 objektai (full/thumb), autorizuotas GET grąžina tikrą vaizdą, svetimas/no-token 401/403, privatūs cache headers ir CORS.
6. Tuoj pat išjungti pilotą, patvirtinti, kad `POST /v1/photos` vėl 503 `UPLOADS_DISABLED`; R2 viešas priėjimas tebėra Disabled. Jei įkėlimas dalinai nepavyko, nebandyti automatiškai trinti kitų failų; taikyti suderintą atkūrimo planą.
7. Fiksuoti įrodymus, kiekius, laiką, klaidų kodus ir sprendimą dėl bandomojo failo palikimo. Neskelbti PWA be atskiro patvirtinimo.

## Šio etapo darbų būsena
- ✅ Atlikta: tik read-only patikra ir pilotinio vykdymo plano parengimas.
- ⛔ Nevykdyta: Worker/PWA Deploy, `ENABLE_UPLOADS`, nuotraukų įkėlimas, Supabase operacijos, R2 failų trynimas.
- Kitas patvirtinimas reikalingas **tik pilotiniams saugikliams paruošti atskiroje GitHub DRAFT šakoje**; jų aktyvavimui – kitas atskiras patvirtinimas.
