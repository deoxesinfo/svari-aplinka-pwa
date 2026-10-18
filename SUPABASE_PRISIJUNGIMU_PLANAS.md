# Švari Aplinka PWA — V1.7 prisijungimų įjungimo eiga

## Kas jau padaryta
1. Tikslinis Supabase projektas: **Švari Aplinka PWA**, atskiras nuo CMS. Cloudflare R2 kol kas neprijungta.
2. Supabase Security Advisor: **0 perspėjimų** po dviejų kontroliuojamų DB migracijų.
3. 10 duomenų lentelių, RLS ir skirtingų įmonių duomenų ribos.
4. GitHub PWA turi „Paskyra“ skiltį, Supabase Auth prisijungimą ir narystės tikrinimą.
5. Paruoštas tik skaitymo debesijos peržiūros sluoksnis su puslapiavimu.

## Kodėl dar nėra privalomo Login
PWA šiuo metu saugo DEMO duomenis telefone/browser localStorage bei IndexedDB.
Jei dabar įjungsime privalomą prisijungimą, o neperjungsime saugaus bendro saugojimo,
tas pats naudotojas kitame telefone vis tiek nematys ankstesnių duomenų.
Todėl VITE_SA_AUTH_ENFORCED pagal nutylėjimą yra false. Jį įjungti tik po migracijos,
testų ir pirmojo administratoriaus paskyros suaktyvinimo.

## Ką turi patvirtinti / atlikti administratorius
1. Pasirinkti **administratoriaus el. paštą** (slaptažodžio niekam neatskleisti).
2. Supabase Dashboard > Authentication: išjungti viešą naujų vartotojų registraciją.
3. Sukurti arba pakviesti vieną administratoriaus paskyrą Supabase Auth.
4. Nustatyti leidžiamus autentifikacijos peradresavimus (GitHub Pages demo adresas ir būsimasis privatus domenas).
5. Pagal tikrą auth.users ID įrašyti narystę į sa_memberships su role=admin;
   organizacijos ir narystės įrašus kurti tik po administratoriaus paskyros identifikavimo.
6. Atskirai patvirtinti senųjų DEMO duomenų perkėlimo veiksmą po atsarginės kopijos.
7. Sutikrinti, kad keliuose įrenginiuose rodoma ta pati įmonės informacija, o darbuotojai
   nemato nepriskirtų adresų. Įjungti privalomą Login tik po šio testo.

## Saugumo taisyklės
- GitHub PWA kodui naudojamas **viešas sb_publishable** raktas, kuris skirtas naršyklei.
- **Niekada** nenaudoti service_role ar R2 slaptųjų raktų PWA kode, GitHub repozitorijoje arba žurnale.
- Nesuteikti anon teisių į duomenų lenteles. Neįrašinėti tikrų darbuotojų duomenų į viešą DEMO.
- Public/Private GitHub būsena nėra pakaitalas Auth ir RLS.
- R2 nuotraukoms – atskiras etapas po vartotojo Cloudflare prijungimo.

## Dar laukiama
- **Pirmoji administratoriaus paskyra patvirtinta ir susieta su įmone** (žr. 2026-10-18 vėlesnį įrašą žemiau).
- Debesijos duomenų skaitymo/rašymo integracijos ir senųjų DEMO duomenų migracijos.
- Privalomo Login įjungimo ir realaus kelių įrenginių bandymo.
- Cloudflare R2, ilgalaikių atsarginių kopijų ir push pranešimų.

## 2026-10-18 – pirmos administratoriaus paskyros paruošimas
- Privatioje Supabase DB schemoje sukurtas `private.sa_initial_admin_onboarding` (be anon/autentifikuotų naudotojų teisių). Supabase lentelėje įrašytas vartotojo pasirinktas pirmojo administratoriaus el. paštas; viešame GitHub kode jis neskelbiamas.
- Sukurtas vienos „Švari Aplinka“ įmonės įrašas. Dar nesukurtas `auth.users` naudotojas ir nėra aktyvios `sa_memberships` narystės.
- Supabase jungtis neturi Auth User invite/creation veiksmo. Supabase Dashboard paskyros savininkas turi pasirinkti Authentication → Users → Add User → Send invitation, nurodydamas savo el. paštą.
- Prieš kvietimą patikrinti Authentication → URL Configuration, kad Site URL ir leidžiami Redirect URL būtų skirti dabartiniam `https://deoxesinfo.github.io/svari-aplinka-pwa/` adresui. Prieš tikrus duomenis išjungti viešas registracijas.
- Po kvietimo priėmimo, el. pašto patvirtinimo ir Auth naudotojo ID patikros, SQL migracija gali susieti tą ID su organizacija ir priskirti `role=admin`. Neturi būti savarankiško admin teisių suteikimo vien pagal įvestą el. paštą.
- Pakvietus naudotoją, PWA `#/paskyra` leidžia prisijungus nusistatyti asmeninį slaptažodį, nesidalijant juo su asistentu.
- Kol nenustatyta ir neišbandyta veiksminga cloud sinchronizacija, `VITE_SA_AUTH_ENFORCED` paliekamas išjungtas.

## 2026-10-18 – pakvietimas priimtas, pirmasis administratorius aktyvus
- Patikrinta Auth paskyra: kvietimas išsiųstas, el. paštas patvirtintas ir prisijungimas atliktas.
- `public.sa_memberships`: viena aktyvi narystė su `role=admin`, susieta su tikslia patvirtinta Auth paskyra.
- `private.sa_initial_admin_onboarding`: būsena `active`, sutampa įmonės ID ir Auth vartotojo ID.
- Kitų administratorių, vadybininkų ar darbuotojų narystės kol kas nėra.
- Visos 10 `sa_*` public lentelių: RLS įjungtas, `anon` neturi SELECT teisių. Biznio įrašų (adresų/darbų) nėra.
- **Svarbu:** prisijungimas kaip privalomas PWA dar neaktyvuotas; DEMO localStorage/IndexedDB nėra sinchronizuojami. Tai ne production parengtumo patvirtinimas.
- Supabase Auth Security Advisor šiuo metu rodo perspėjimą dėl **Leaked Password Protection Disabled**. Tikrinti Dashboard > Authentication > Settings / Security and Protection ir įjungti, jei leidžia planas.
- Jokie slaptažodžiai ir el. pašto adresai neįrašyti į viešus GitHub failus.
