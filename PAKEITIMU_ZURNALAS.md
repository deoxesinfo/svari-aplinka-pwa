# Švari Aplinka PWA — pakeitimų žurnalas

> Pradžia: 2026-10-14 (idėja), programavimo pradžia: 2026-10-18.  
> **Atnaujinama po kiekvienos patvirtintos funkcijos ar pataisos.**  
> Pilna chronologija pateikta programėlėje **Meniu → Pakeitimai** ir versijuojama faile [src/lib/changelog.ts](./src/lib/changelog.ts). GitHub komitai yra techninės istorijos šaltinis.

## Chronologija
| Data | Versija | Esmė | GitHub |
|---|---|---|---|
| 2026-10-18 | V1.7.5 | Supabase atskirtų įmonės duomenų skaitymo/rašymo adapteris ir testai; DEMO migracijos nėra, perjungimas dar neaktyvus | Šiame etape |
| 2026-10-18 | V1.7.4 | Prisijungimo langas be kairiojo meniu ir DEMO juostos; paskyros grįžimas į apžvalgą. Tik UI, be duomenų migracijos. | Įrašas šiame komite |
| 2026-10-18 | V1.7 – 3 etapas | Patvirtinta Auth paskyra, susieta su „Švari Aplinka“ ir suteiktos aktyvios administratoriaus teisės; RLS patikra, atviras Auth slaptažodžių saugumo perspėjimas | Užfiksuota Supabase; GitHub įrašas šiame komite |
| 2026-10-18 | V1.7 – 2 etapas | Paruošta pirma administratoriaus paskyra privačioje Supabase lentelėje (be aktyvių teisių), pakvietimo slaptažodžio nustatymas ir atkūrimo pataisa. Laukiama Supabase Auth kvietimo. | [89e01778](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/89e01778) |
| 2026-10-18 | V1.7 – 1 etapas | Supabase 10 lentelių, RLS, 2 perspėjimų pataisa, papildomas tenant saugumas ir debesijos peržiūra; paruoštas neprivalomas login | [b4757ad5](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/b4757ad5) · [ac77a5c0](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/ac77a5c0) |
| 2026-10-18 | V1.6 | Darbuotojų DEMO foto avatarai, galerijos mastelio atstatymas, diagramų kalendoriai ir Compare, Supabase read-only auditas | [18869926](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/18869926) · [098bf2a2](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/098bf2a2) · [84522661](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/84522661) · [888c934d](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/888c934d) |
| 2026-10-18 | V1.5 | Pareigų pasirinkimas; personalo archyvas, sugrįžimo istorija, kaitos diagrama ir skelbimų nuorodos | [1717d08d](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/1717d08d) · [5ea976cb](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/5ea976cb) · [14e7d8a6](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/14e7d8a6) · [48c58e0c](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/48c58e0c) |
| 2026-10-18 | V1.4 | Prioritetinių namų žymėjimas adresų ir darbų kortelėse, filtravimas | [5b9f2411](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/5b9f2411) |
| 2026-10-18 | V1.3 | Personalo registras, vadybininkų paskyrimai, objektų statusai, analitika | [d2dc0ad2](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/d2dc0ad2) · [d0509731](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/d0509731) |
| 2026-10-18 | V1.2 | Google Maps maršrutas, 15 nuotraukų darbui | [1c816758](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/1c816758) |
| 2026-10-18 | V1.1.2 | Foto galerijos rodyklės, valymo kartai per savaitę | [d6ee4ea0](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/d6ee4ea0) · [1f07fceb](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/1f07fceb) |
| 2026-10-18 | V1.1.1 | Atidaromas universalus darbo langas iOS/Android/naršyklėje, testai | [1799c659](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/1799c659) |
| 2026-10-18 | V1.1 | Darbo detalės, pastabos, foto, užbaigimas ir „Prieš / Po / Problema“ | [d57d6eb0](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/d57d6eb0) |
| 2026-10-18 | V1.0 | Adresai, darbai, kalendorius, nuotraukos, istorija, patikrinimai | [1eecabc1](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/1eecabc1) · [1397681f](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/1397681f) |
| 2026-10-18 | V0.2 | Savarankiška PWA ir GitHub Pages publikavimas | [4159beca](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/4159beca) |
| 2026-10-18 | V0.1 | Atskira repozitorija, Lovable kodo perkėlimas į GitHub | [d034f4d9](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/d034f4d9) |
| 2026-10-14 | Idėja | Vidinė PWA darbų sekimui, adresams, nuotraukoms, pastaboms | Pokalbio planas (ne GitHub komitas) |

## Tolimesni darbai (neįgyvendinta)
- Atskiras Supabase projektas, prisijungimai ir teisių atskyrimas (admin, vadybininkas, darbuotojas).
- Saugūs pranešimai telefone ir užduočių paskyrimas prisijungusiems naudotojams.
- Privati nuotraukų saugykla debesyje su prieigos kontrole.
- Inventoriaus, automobilių, kuro ir draudimų apskaita.
- Analitikos plėtra bei ataskaitų eksportas; pajamos nėra dabartinis prioritetas.

## Pakeitimų žurnalo taisyklė
1. Kiekvieną naują patvirtintą funkciją ar pataisą įrašyti **data → versija → kas pakeista → GitHub įrašas**.
2. Programėlėje rodyti įrašus nuo naujausio iki seniausio; ankstesnių įrašų neištrinti.
3. Nesakyti, kad planuojama funkcija jau veikia. Planuojamus darbus laikyti atskirai.
4. Niekada neįrašyti tikrų darbuotojų asmens duomenų ar durų kodų į žurnalą.
5. Kol nėra Supabase, pats žurnalas yra bendras visiems, o darbų ir nuotraukų įrašai lieka konkrečiame įrenginyje.

## Nuolatinis įrašymo procesas
Visi nauji patvirtinti pakeitimai privalomai įrašomi lietuviškai į `src/lib/changelog.ts` (programėlė) ir šį failą (GitHub) pagal [AGENTS.md](./AGENTS.md) taisyklę. Istoriniai darbuotojų įrašai netrinami, o archyvuojami.

## V1.6 Supabase auditas
Naujas Švari Aplinka PWA projektas patikrintas tik skaitymui. Projektas ACTIVE_HEALTHY, public lentelių nėra. Security Advisor nustatė, kad public.rls_auto_enable() (SECURITY DEFINER) turi vykdymo teises anon ir authenticated. Duomenų bazės taisymai, autentifikacija, sinchronizavimas ir push neatlikti. [Saugumo patikra](./SUPABASE_SAUGUMO_PATIKRA.md).
