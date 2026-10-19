# Švari Aplinka PWA — pakeitimų žurnalas

> Pradžia: 2026-10-14 (idėja), programavimo pradžia: 2026-10-18.  
> **Atnaujinama po kiekvienos patvirtintos funkcijos ar pataisos.**  
> Pilna chronologija pateikta programėlėje **Meniu → Pakeitimai** ir versijuojama faile [src/lib/changelog.ts](./src/lib/changelog.ts). GitHub komitai yra techninės istorijos šaltinis.

## Chronologija
| Data | Versija | Esmė | GitHub |
|---|---|---|---|
| 2026-10-19 | V2.2.4 | Vienodo pločio/aukščio „Dirba nuo“ ir „Darbo pabaigos data“ laukai, X pabaigos datai išvalyti ir tuščiai reikšmei išsaugoti, 16 px tarpas tarp „Išsaugoti“ / „Atšaukti“ personalo formoje. Standartinis iOS kalendorius paliktas. | [6cc56c49](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/6cc56c49) · [2e935383](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/2e935383) |
| 2026-10-19 | V2.2.3 | Adresų Swipe (archyvas / atkūrimas / redagavimas / minkštasis trynimas); sustabdomas naujų darbų generavimas ir paslepiami būsimi neatlikti darbai, neprarandant istorijos; nebaigtų darbų archyvavimas; nuotraukų valdymas tik Darbuotojo Redaguoti formoje. R2 neliečiama. | [30eb6c41](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/30eb6c41) · [67810586](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/67810586) · [bf991dd7](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/bf991dd7) · [095f2eb3](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/095f2eb3) |
| 2026-10-19 | V2.2.2 | Swipe-left darbų veiksmai, atliktų darbų archyvavimas / grąžinimas, administratoriaus patvirtintas minkštasis ištrynimas, laiko X, administratoriaus A4 su automatiniais durų kodais, personalo kortelių UX | [28882530](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/28882530) · [2d244078](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/2d244078) · [a6e56a68](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/a6e56a68) · [57417756](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/57417756) · [8d7b04ef](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/8d7b04ef) · [89a28316](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/89a28316) |
| 2026-10-18 | V2.2.1 | Darbuotojo dienos/savaitės/mėnesio filtras bendrame kalendoriuje, A4 savaitės/mėnesio spausdinimas (durų kodai tik administratoriui pažymėjus ir patvirtinus), 16 px tarpai tarp priskyrimo formos mygtukų; iPhone datos valdiklis nepakeistas. | [92993a61](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/92993a61) · [5c378205](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/5c378205) · [8afb8740](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/8afb8740) · [6af6724e](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/6af6724e) · [125fc382](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/125fc382) · [8f9db87d](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/8f9db87d) · [69fb4838](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/69fb4838) · [3e351c35](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/3e351c35) |
| 2026-10-18 | V2.1 | Priskyrimai iš adreso, darbuotojas iš Personalo, dvi valymo rūšys ir savaitės dienos, vienkartinis / nuolatinis, transportas, nuolatinis bilietas; Supabase 4 sav. darbų generavimas be dublikatų, susiejimas darbuotojų skiltyje. Be R2 ir papildomų funkcijų. | [e9e914ec](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/e9e914ec) · [320e545d](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/320e545d) · [b19d46ce](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/b19d46ce) · [18d00799](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/18d00799) |
| 2026-10-18 | V2.0.9 | Maps URL testo pataisa ir V2.0.4–V2.0.8 ataskaitų galutinis suvedimas | Šiame etape |
| 2026-10-18 | V2.0.8 | GPS žymeklio rodymas po geokodavimo, vienkartinė automatinė paieška įjungus apsaugą, Google Maps nuorodų testai | [e5c5578c](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/e5c5578c) |
| 2026-10-18 | V2.0.7 | GPS patikra prie fotografavimo, 10 min galiojimas, užraktas; R2 debesijos įkėlimas vis dar išjungtas | [89c2bef3](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/89c2bef3) |
| 2026-10-18 | V2.0.6 | GPS apsauga adreso formoje, vietos patvirtinimas žemėlapyje, paveldėjimas darbams ir Google Maps vietos nuoroda | [a646fd7e](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/a646fd7e) |
| 2026-10-18 | V2.0.5 | Adreso GPS žymeklio parinkiklio modulis, Photon paieška pagal mygtuką, tikslus OSM žemėlapis ir patvirtinimo logika. Komponento integravimas tęsiamas. | [916b5425](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/916b5425) |
| 2026-10-18 | V2.0.4 | Adresų kortelių išdėstymas, Maps vietos ikona, formos padding, slaptažodžio rodymo akis | [f472074e](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/f472074e) |

| 2026-10-18 | V2.0 – etapas / QA | V1.7–V2.0 etapų sąrašas, įgyvendintų funkcijų ribos, tikrintini telefonų bandymai, R2 atidėta kitam kartui | [Ataskaita](./PWA_ETAPU_ATASKAITA_2026-10-18.md) |
| 2026-10-18 | V1.8.2 | Rankinis JSON eksportas iš Supabase duomenų; atkūrimas ir nepriklausomos kopijos dar neįdiegtos | [ca3aca60](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/ca3aca60) |
| 2026-10-18 | V2.0.3 | Vienkartinė GPS patikra darbo kortelėje, leidimo ir tikslumo tikrinimas, išimtis su priežastimi, užbaigimo apsauga; telefonų testai liko | [00bb5d85](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/00bb5d85) |
| 2026-10-18 | V2.0.2 | Objektų GPS koordinatės, darbo GPS jungiklis (OFF), 30/50/100 m, tikslumo skaičiavimas, užbaigimo apsauga, admin išimtis. Įrenginių testai dar laukia. | [0ea0ff5d](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/0ea0ff5d) |
| 2026-10-18 | V2.0.1 | GPS atstumo ir tikslumo algoritmas, pasirinktinio darbo GPS duomenų tipai, automatiniai testai; UI dar ruošiama | [52d954eb](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/52d954eb) |
| 2026-10-18 | V1.9.1 | Pranešimų varpelis, neperžiūrėtų skaičius, Supabase pranešimų istorija ir perskaitymo žyma. Push telefone dar neveikia. | [5b1aaac7](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/5b1aaac7) |
| 2026-10-18 | V1.8.1 | Duomenų pakeitimų istorija, filtrai pagal datas, 100 įrašų puslapiai, CSV eksportas; ilgalaikės kopijos dar neparuoštos | [fa68e41d](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/fa68e41d) |
| 2026-10-18 | V1.7.7 | Bendrų Supabase duomenų atnaujinimas, saugus nuotraukų atidėjimas iki R2, išjungtas DEMO trynimas; Build dublikato taisymas | [e216a75f](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/e216a75f) · [ebec116c](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/ebec116c) |
| 2026-10-18 | V1.7.6 | Privalomas Auth patikrinimas, Supabase įmonės duomenys vietoje DEMO; įrašymo eilė, išsaugojimo klaidų rodymas. R2, GPS ir daugiaįrengininiai testai dar laukia. | [95cf4de1](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/95cf4de1) |
| 2026-10-18 | V1.7.5 | Supabase atskirtų įmonės duomenų skaitymo/rašymo adapteris ir testai; DEMO migracijos nėra, perjungimas dar neaktyvus | [d3804ec4](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/d3804ec4) |
| 2026-10-18 | V1.7.4 | Prisijungimo langas be kairiojo meniu ir DEMO juostos; paskyros grįžimas į apžvalgą. Tik UI, be duomenų migracijos. | [6ec8e700](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/6ec8e700) |
| 2026-10-18 | V1.7 – 3 etapas | Patvirtinta Auth paskyra, susieta su „Švari Aplinka“ ir suteiktos aktyvios administratoriaus teisės; RLS patikra, atviras Auth slaptažodžių saugumo perspėjimas | [488c2fb0](https://github.com/deoxesinfo/svari-aplinka-pwa/commit/488c2fb0) |
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

## V2.1 vykdymo ribos
Darbuotojo priskyrimas veikia pagal esamo Personalo įrašo ID, nepriklausomai nuo to, ar jis turi atskirą prisijungimą. Individualūs pranešimai gaunami tik vėliau susiejus Auth vartotoją. Nuolatinės užduotys generuojamos į kalendorių artimiausioms 4 savaitėms ir papildomos, kai atidaroma / atnaujinama PWA. Jei niekas neprisijungia, serveris be papildomo planavimo automatiškai naujų datų nekuria. Priskyrimų keitimas, automobilio pasirinkimas ir kitos papildomos funkcijos atidėtos – pagal vartotojo prašymą nedarėme sudėtingesnės sistemos. Cloudflare R2 neprijungta.


## V2.2.1 ribos ir sekantys etapai
- A4 spausdinamas tik vieno administratoriaus pasirinkto darbuotojo savaitės ar mėnesio grafikas. Konfidencialūs durų kodai pagal nutylėjimą neįtraukiami.
- V2.1 pasikartojančios užduotys generuojamos artimiausioms 4 savaitėms. Mėnesio peržiūroje ar spausdinime toliau už šio lango dar neparuošti darbai neatsiras, kol nebus sugeneruoti. Jokio naujo foninio generatoriaus V2.2.1 nepridėta.
- Standartiniai iPhone datos/laiko valdikliai nepakeisti.
- Atskiros darbuotojų Auth paskyros ir papildoma kalba perkeltos į „Būsimi darbai“; Cloudflare R2 lieka atskiram etapui.

## V2.2.2 techninės ribos
- Darbų archyvas matomas „Darbai“ skiltyje, o darbus iš jo galima grąžinti. Archyvuoti įrašai lieka istorinei analitikai; aktyviame kalendoriuje nėra rodomi.
- „Ištrinti“ šiame etape reiškia pažymėti `deletedAt` ir neberodyti; įrašas **nešalinamas fiziškai**, kad išsaugotume auditą ir periodinių darbų generatorius nekurtų tos pačios datos iš naujo. Šis veiksmas reikalauja administratoriaus vaidmens. Duomenų apsaugos ištrynimo prašymai yra atskira procedūra.
- Pasikartojančio grafiko pradžios laikas išvalomas mygtuku X; reikšmė tampa `null`. iPhone standartinis laiko pasirinkimo valdiklis nekeičiamas.
- A4 grafikas su durų kodais į DOM įtraukiamas tik po administratoriaus rolės patikros paspaudus „Spausdinti“. Šis lapas konfidencialus; spausdintą kopiją perduoti tik įgaliotam gavėjui.
- Tikri swipe gestai, iPhone spausdinimo valdiklis bei duomenų sinchronizavimas tarp įrenginių dar reikalauja realaus įrenginio E2E bandymo.

## V2.2.3 veikimo ribos
- Atlikti adresų archyvavimo, atkūrimo ir minkšto trynimo veiksmai **nepašalina** susijusių darbų, nuolatinių grafikų, nuotraukų metaduomenų ar jų istorijos. Pastarieji lieka auditui; tai nėra GDPR fizinio ištrynimo procedūra.
- Archyvuojant adresą, `status` tampa `sustabdytas` ir V2.1 darbų generatorius neprideda naujų užduočių. Iki archyvavimo sugeneruoti būsimi neatlikti darbai pažymimi archyvuotais ir atkuriami tik su adresu. Istorinis darbuotojo atlikimas lieka analitikoje.
- Ištrintas adresas nebeatkuriamas per programėlę; susijusių įrašų ryšiai ir nuotraukos išsaugoti. Prieigos teisė prieš naikinimą tikrinama administratoriaus Supabase narystėje.
- Darbuotojų nuotraukas redaguoti galima tik esamame Redaguoti dialoge, nuotraukų R2 vis dar neatverta.
- V2.2.3 patikrinti statiniai Build ir automatiniai testai. Tikras iOS/Android gestų, Supabase kelių įrenginių ir serverio grafiko generavimo E2E bandymas lieka praktinei peržiūrai.

## V2.2.4 pastabos
- Darbo pabaigos data nebėra privaloma net tada, kai profilio būsena „Nebedirba“ – jei tikros datos nėra, istorija ją žymi kaip nežinomą. Ankstesni laikotarpiai išsaugomi; datos neišgalvojamos.
- Mygtuko X paspaudimas pašalina tik formos datą; Supabase įrašas pasikeičia tik paspaudus „Išsaugoti“.
- Reaguojantis datos laukų išdėstymas pritaikytas mobiliajam Safari, naudojami standartiniai `input[type=date]` valdikliai.
- R2, GPS, Auth ir kitos sistemos nekeičiamos. Realiam iPhone vaizdo įvertinimui reikalingas bandymas įrenginyje.
