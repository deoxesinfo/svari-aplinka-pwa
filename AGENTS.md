# Švari Aplinka PWA – kūrimo taisyklės

## PRIVALOMA: Pakeitimų žurnalas po KIEKVIENO patvirtinto pakeitimo

1. Prieš pradedant patikrinti naujausią GitHub \`main\`, esamą \`src/lib/changelog.ts\` ir \`PAKEITIMU_ZURNALAS.md\`.
2. **Vienu kūrimo etapu** atlikti pakeitimus ir **kartu**, prieš galutinį Deploy, įrašyti juos lietuviškai į abu žurnalus. Naujausią įrašą pateikti viršuje.
3. Nurodyti datą, unikalią versiją, pakeitimo pavadinimą, konkrečias funkcijas, jų ribojimus ir, kai įmanoma, GitHub SHA. Po projekto publikavimo atnaujinti nuorodą, jei komito ID dar nebuvo žinomas.
4. **Neskubėti paskelbti etapų užbaigtais.** Supabase Auth ir pagrindinis įmonės duomenų skaitymas/rašymas jau įvesti; paskyrų rolės (išskyrus pirmą admin), realus kelių telefonų bandymas, iOS/Android GPS, Push ir Cloudflare R2 dar reikalauja patikros ar integracijos.
5. Neįrašinėti asmens duomenų, tikrų durų kodų ar prisijungimo informacijos nei į kodą, nei į žurnalą.
6. Neprarasti darbo įrašų, nuotraukų, darbuotojų istorijos; migruojant schemą išlaikyti ankstesnius laukus. Naujų darbo pradžios datų senuose profiliuose **neišgalvoti**.
7. Vykdyti GitHub Actions Build ir testus, patikrinti Deploy rezultatą. Viešos „Švari Aplinka“ svetainės repozitorijos \`deoxesinfo/svari-aplinka\` nekeisti.
8. V1.7–V2.0 darbų planas patvirtintas 2026-10-18; V2.1 supaprastinti darbuotojų priskyrimai patvirtinti atskirai. DEMO duomenų į Supabase neperkelti. R2 integracija ir mokamos paslaugos atidėtos iki naujo patvirtinimo. Bet kokius papildomus prisijungimus ir migracijas derinti atskirai.

Tikslas: po metų aiškiai atkurti, kas, kada ir kodėl buvo pakeista.
