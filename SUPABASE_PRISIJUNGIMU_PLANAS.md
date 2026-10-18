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
- Vienos administratoriaus paskyros patvirtinimo.
- Debesijos duomenų skaitymo/rašymo integracijos ir senųjų DEMO duomenų migracijos.
- Privalomo Login įjungimo ir realaus kelių įrenginių bandymo.
- Cloudflare R2, ilgalaikių atsarginių kopijų ir push pranešimų.
