# Švari Aplinka PWA — Supabase saugumo patikra (tik skaitymas)

Data: 2026-10-18. Supabase konfigūracija ir duomenys nebuvo pakeisti.

## Tikrinta
- Projektas: Švari Aplinka PWA. Būsena ACTIVE_HEALTHY.
- Regionas eu-west-1. Atskiras projektas nuo Švari Aplinka CMS.
- public schemos lentelių 0.
- public.rls_auto_enable() yra SECURITY DEFINER funkcija.
- Skaitymo SQL patvirtino anon_can_execute=true, signed_in_can_execute=true, public_can_execute=true.
- Security Advisor: 2 WARN, anon ir authenticated vaidmenys gali vykdyti funkciją.

## Rekomenduojama seka, tik po atskiro konfigūracijos patvirtinimo
1. Patikrinti, kur naudojama rls_auto_enable() ir ar aktyvus automatinis RLS event trigger.
2. Riboti EXECUTE teises nuo PUBLIC, anon ir authenticated vaidmenų, nepažeidžiant automatizavimo. Veiksmas turi būti kontroliuojama DB migracija.
3. Prieš prijungiant PWA paruošti ir peržiūrėti lentelių schemą, Auth roles ir RLS politikas.
4. Sukurti atsargines kopijas ir suplanuoti DEMO duomenų perkėlimą tik su vartotojo leidimu.
5. Dar kartą patikrinti Security Advisor, RLS testus ir drausti service_role raktą naršyklės kode.

## Oficialios gairės
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

Kol nėra Auth/RLS, tikrų darbuotojų nuotraukų, asmens duomenų ir durų kodų į viešą DEMO nekelti.

## 2026-10-18 – patvirtintos migracijos
- `sa_pwa_auth_and_rls_scaffold_v17`: sukurta 10 SA lentelių, įjungtas RLS ir rolėmis apribotos prieigos politikos; pašalintas viešas `public.rls_auto_enable()` vykdymas. Event trigger nepanaikintas.
- `sa_pwa_tenant_boundaries_and_notification_permissions_v17`: apriboti tarporganizaciniai ryšiai, pranešimų `UPDATE` leidimas tik `read_at` laukui; patikslinta nuotraukų matomumo politika.
- Po pakeitimų Supabase Security Advisor **0 perspėjimų**. Lentelių skaičius 10, visoms įjungtas RLS.
- Dar nėra administratoriaus Auth paskyros, organizacijos narystės ir bendrų įmonės duomenų. Iki galutinio perjungimo PWA demonstracijoje informacija saugoma naršyklėje.
- Prieš tikrus prisijungimus būtina užblokuoti viešą Auth registraciją, pakviesti administratorių ir peržiūrėti el. pašto/URL nustatymus.

Tolimesni žingsniai: [Supabase paruošimo instrukcija](./SUPABASE_PRISIJUNGIMU_PLANAS.md).

## 2026-10-18 – būsenos atnaujinimas po Auth pakvietimo
- Auth patvirtinimas ir administratoriaus narystė patikrinti; pirmoji paskyra aktyvi.
- Pagrindiniai duomenys: 10/10 lentelių su RLS, 0 anon SELECT suteiktų teisių; 1 aktyvus administratorius.
- **Dabartinis** Supabase Security Advisor rodo **1 naują WARN**, nes išjungta nutekėjusių slaptažodžių apsauga (Leaked Password Protection). Ankstesnis „0 perspėjimų“ atitiko ankstesnį patikros momentą prieš pirmos Auth paskyros aktyvavimą.
- Gairės: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Funkcijos įjungimas Auth valdymo skydelyje dar neatliktas.
