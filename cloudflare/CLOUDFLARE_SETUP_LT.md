# Švari Aplinka – Cloudflare Worker prijungimo instrukcija (STEP 2)
**BŪSENA: PARUOŠTA PERŽIŪRAI. NEVYKDYTI DEPLOY IKI ATSKIRO PATVIRTINIMO.**
Data: 2026-10-19. GitHub PR #4 (DRAFT): https://github.com/deoxesinfo/svari-aplinka-pwa/pull/4

## Darbo vieta
Cloudflare Dashboard → Compute → Workers & Pages → `svari-aplinka-photos`.
Paskirties Worker: `https://svari-aplinka-photos.svariaplinka-lt.workers.dev`.
Šiuo metu Worker naudojamas pradinis „Hello World“, kuris NĖRA nuotraukų API.

## 1. Esamas R2 binding (jau pridėtas)
Worker → Settings → Bindings:
- **Type:** R2 Bucket
- **Variable name:** `R2_BUCKET`
- **R2 bucket:** `svari-aplinka-foto`
- **Location:** EU (pagal Cloudflare nustatymų ekrano nuotrauką)
- **Public Access:** turi likti DISABLED.
NEKURTI R2 API tokenų / Access Keys: tos pačios paskyros Worker naudoja binding.

## 2. Worker Runtime variables
Settings → Variables and Secrets (kai bus atskirai patvirtinta Worker konfigūracija):
| Name | Type | Value |
|---|---|---|
| `SUPABASE_URL` | Text | `https://mbinhbascpeupnxrvidk.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Secret or Text | `sb_publishable_PtfE1p4mDM2vGLZI6i5X7w_MiOKwsys` (viešasis PWA publishable key; **NE** `service_role` / Supabase secret key). |
| `ALLOWED_ORIGIN` | Text | `https://deoxesinfo.github.io` (be pasvirojo brūkšnio gale; ne su `/svari-aplinka-pwa/`) |
| `ENABLE_UPLOADS` | Text | `false` **BŪTINAI** (pilotas nepaleistas) |

Jeigu Cloudflare prašo „Save and Deploy“ / „Deploy“, **nespausk** iki atskiro leidimo. Dabartiniame etape tik pasiruošiama. Vien kintamųjų išsaugojimas gali sukelti Worker versijos publikavimą.

## 3. Kodas (vėlesnis atskiras patvirtinimas)
Code → Edit Code → pakeisti „Hello World“ į:
`cloudflare/photo-worker.mjs`
https://github.com/deoxesinfo/svari-aplinka-pwa/blob/feature/r2-photos-draft-no-deploy/cloudflare/photo-worker.mjs

Kodas naudoja **ES module** formatą `export default { async fetch(request, env) { ... } }`.
Jei būtų naudojamas `wrangler` vietoje UI, atskirai reikėtų suderinti darbo aplinką. Šiame etape `wrangler deploy` ir Cloudflare publikavimo NEVYKDYTI.

## 4. Bandymų seka TIK po atskiro leidimo
1. Deploy Worker kodo su `ENABLE_UPLOADS=false`.
2. `GET /health`: tikėtinas JSON `{"status":"ok"}`, jei visi 4 kintamieji ir R2 binding tvarkingi.
3. Be prisijungimo `GET /v1/photos/{uuid}/thumb` turėtų grąžinti HTTP 401.
4. Kol `ENABLE_UPLOADS=false`, `POST /v1/photos` turėtų grąžinti HTTP 503 (`UPLOADS_DISABLED`).
5. Atskirai patvirtinus, tik bandomajai admin paskyrai įjungti `ENABLE_UPLOADS=true` ir naudoti tik GPS neapsaugotą testinį darbą.
6. Patikrinti WebP įkėlimą, duomenų bazės metaduomenis, R2 objektus, 15-os nuotraukos ribą, privatį GET bei non-admin / kitos organizacijos atmetimą.
7. PWA funkcijos `CLOUD_R2_PHOTOS_READY` nekeisti iki atskiro PWA patvirtinimo.

## 5. Nepaleidžiamos funkcijos ir saugumo apribojimai
- Darbuotojų `POST` – šiame etape neįjungta, serveris ir RLS leidžia tik admin.
- GPS saugomų adresų / darbų `POST` – griežtai atmetamas; telefonu gaunamo GPS patvirtinimo Worker nelaiko serveriniu įrodymu.
- Adreso nuotraukos be darbo ID – bandomajame API atmetamos, kol bus sukurtas atskiras limitavimo mechanizmas.
- Nuotraukų `DELETE` ir tags atnaujinimas – išjungti; DB DELETE RLS nebuvo keičiama.
- Nuotraukos niekada neturi viešų `r2.dev` / custom-domain nuorodų.
- Worker `ENABLE_UPLOADS` – pradžioje `false`, ir tik po testų + leidimo `true`.
- Dar reikalingi live Cloudflare testai, leidimų / rate-limit konfigūracijos patikra, failed-request / partial-write peržiūra ir realių iOS/Android vaizdų išbandymas.

## 6. Supabase DB būsena (DB STEP 1)
DB projektas: `mbinhbascpeupnxrvidk` (ne CMS).
Migracija `20261019074937` įdiegė 15 nuotraukų vienam darbui apsaugą. **Jokios DELETE politikos nesukurta.**
