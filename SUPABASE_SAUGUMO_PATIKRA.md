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
