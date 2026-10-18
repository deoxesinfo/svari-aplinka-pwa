// Pakeitimų žurnalas. Kiekvieną patvirtintą kūrimo etapą būtina įrašyti čia.
// Kodas GitHub – vienintelis patikimas pakeitimų istorijos šaltinis.
// Naują įrašą dėkite sąrašo pradžioje ir atnaujinkite planuojamų darbų būsenas.
export type ChangeEntry = {
  date: string; version: string; title: string; details: string[];
  commits?: string[]; category: "funkcija" | "taisymas" | "infrastruktūra" | "planas";
};
export type PlannedEntry = { title: string; summary: string; status: "Laukia" | "Vėlesnis etapas"; stage: string };

export const CHANGELOG: ChangeEntry[] = [
  {date:"2026-10-18",version:"V1.8.2",category:"funkcija",
   title:"Rankinis Supabase duomenų kopijos eksportas",
   details:[
    "Nustatymuose administratorius gali atsisiųsti JSON su bendrais adresais, darbais, darbuotojais ir skelbimais.",
    "Eksportas vykdomas tik paspaudus mygtuką. Nešifruoto failo negalima palikti viešai, nes gali būti durų kodų ar asmens duomenų.",
    "Nuotraukų nėra ir atkūrimas iš JSON neįdiegtas. 5–10 metų saugojimui būtinas nepriklausomas backup planas.",
   ],commits:[]},

  {date:"2026-10-18",version:"V2.0.3",category:"funkcija",
   title:"Vienkartinė GPS patikra ir dokumentuota administratoriaus išimtis",
   details:[
    "Darbo kortelėje galima vienu paspaudimu patikrinti telefono vietą, vertinant pasirinktą 30/50/100 m atstumą bei GPS tikslumą.",
    "GPS reikalaujami darbai nebus užbaigti be naujo patvirtinimo arba administratoriaus įrašytos išimties su priežastimi.",
    "Patikra neįrašo darbuotojo telefono koordinačių ir neveikia fone.",
    "Nuotraukų integracija su R2, darbuotojų paskyros, GPS veikimo realiuose telefonuose ir privatumo informavimas dar nepatikrinti.",
   ],commits:[]},

  {date:"2026-10-18",version:"V2.0.2",category:"funkcija",
   title:"GPS pasirinkimas kiekvienam darbui ir patikros apsauga",
   details:[
    "Kuriant ar redaguojant objektą galima įvesti patikros vietos koordinates; kuriant darbą GPS jungiklis pagal nutylėjimą išjungtas.",
    "Įjungtam GPS darbui parenkamas 30, 50 arba 100 m leistinas spindulys. Tikrinimas naudoja telefono leidžiamą vienkartinę vietą ir vertina tikslumą.",
    "GPS reikalaujamą darbą užbaigti galima tik po naujos patikros arba aiškios administratoriaus išimties.",
    "Realaus iOS/Android bandymo, geolokacijos klastojimo atsparumo ir darbuotojų rolės patikrinimo dar nėra.",
   ],commits:[]},

  {date:"2026-10-18",version:"V2.0.1",category:"infrastruktūra",
   title:"GPS atstumo matematikos ir duomenų struktūros pagrindas",
   details:[
    "Pridėti neįjungtos GPS darbo patikros duomenų tipai: 30/50/100 m, atstumas, tikslumas, laikas, vietos koordinatės, galimas administratoriaus paaiškinimas.",
    "Sukurti ir testuojami Haversine atstumo skaičiavimai, GPS tikslumo vertinimas, 10 minučių patikros galiojimas.",
    "Saugomas tik matavimo rezultatas, o ne darbuotojo telefono koordinatės. Nuolatinio vietos sekimo nėra.",
    "Darbo formos ir praktinis GPS įrenginių testas vykdomi kitu V2.0 etapu.",
   ],commits:[]},

  {date:"2026-10-18",version:"V1.9.1",category:"funkcija",
   title:"Paskyros pranešimų varpelis ir įvykių istorija",
   details:[
     "Supabase pranešimai rodomi prisijungusio naudotojo varpelyje; matomas neperskaitytų pranešimų skaičius, istorija ir nuoroda į darbą.",
     "Perskaitymo žyma saugiai įrašoma į konkretaus gavėjo pranešimą; duomenys atnaujinami periodiškai ir grįžus į naršyklę.",
     "Supabase bazėje paruošti trigeriai naujiems priskyrimams, skubiems darbams, komentarams ir patikrinimams.",
     "Telefono Push pranešimai, darbuotojų paskyrų paskirstymas ir tikri iOS/Android testai dar neatlikti.",
   ],commits:[]},

  {date:"2026-10-18",version:"V1.8.1",category:"funkcija",
   title:"Datuotas Supabase pakeitimų žurnalas ir CSV eksportas",
   details:[
     "Adreso, darbo, personalo bei skelbimo pakeitimus automatiškai fiksuoja Supabase duomenų bazės trigeriai.",
     "Administratoriui pridėta nauja „Istorija“ skiltis su datų nuo/iki pasirinkimu ir saugiu puslapiavimu po 100 įrašų.",
     "Galima eksportuoti matomą istorijos puslapį į CSV; jautrūs duomenų laukai į auditą neįrašomi.",
     "Daugiametės istorijos kaupimo mechanizmas paruoštas, tačiau 5–10 metų išsaugojimui dar reikės atsarginių kopijų ir atkūrimo testų.",
   ],commits:[]},

  {
    date:"2026-10-18",version:"V1.7.7",category:"taisymas",
    title:"Debesijos atnaujinimas ir saugus nuotraukų atidėjimas",
    details:[
      "Įmonės duomenys atnaujinami iš Supabase kas 60 sekundžių ir grįžus prie naršyklės, jei nėra išsaugojimo klaidos.",
      "Nustatymuose pridėtas atnaujinimas rankiniu būdu, o DEMO duomenų ištrynimo mygtukas debesijos režime paslėptas.",
      "Darbuotojų ir darbų nuotraukų įkėlimas užblokuotas iki privačios Cloudflare R2 integracijos.",
      "Adresų forma nebeprideda išgalvoto DEMO patekimo kodo.",
      "Visos funkcijos priklauso nuo realios Auth paskyros; reikia praktinio kelių įrenginių bandymo.",
      "Pašalintas dubliuotas refreshCloudWorkspace eksportas, dėl kurio ankstesnis Build nepraėjo.",
    ],commits:[],
  },
  {
    date:"2026-10-18",version:"V1.7.6",category:"funkcija",
    title:"Privalomas prisijungimas ir saugi tuščia įmonės bazė",
    details:[
      "Valdymo puslapiai prieinami tik patvirtintam Supabase administratoriui: prieš rodant duomenis tikrinamas Auth ir narystė.",
      "Prisijungus adresų, darbų, personalo ir skelbimų duomenų šaltinis yra Supabase, ne vietinis DEMO; 12 DEMO darbų neperkeliami.",
      "Duomenų pakeitimai eilėje siunčiami į Supabase, o nesėkmingą įrašymą aiškiai signalizuoja klaida. Pilnas kelių įrenginių veikimo ir konfliktų testas dar laukia.",
      "Nuotraukų failų įkėlimas bus aktyvuotas tik po Cloudflare R2 integracijos; pranešimai ir GPS diegiami atskirais etapais.",
    ],commits:[],
  },
  {
    date:"2026-10-18",version:"V1.7.5",category:"infrastruktūra",
    title:"Supabase duomenų sinchronizavimo sluoksnio paruošimas",
    details:[
      "Sukurtas tik administratoriui skirtas saugaus debesijos duomenų skaitymo ir išsaugojimo modulis.",
      "Duomenys filtruojami pagal įmonės ID ir Supabase RLS, saugojimo tvarka gerbia adresų bei darbų ryšius.",
      "12 DEMO darbų ir demonstraciniai adresai neperkeliami: tuščia Supabase bazė laikoma šaltiniu.",
      "Pridėti automatiniai UUID, mutacijų eiliškumo ir DEMO neperkėlimo testai.",
      "Automatinis programėlės perjungimas į naują saugyklą, darbuotojų prisijungimai ir R2 dar tikrinami atskirai.",
    ],
    commits:[],
  },
  {
    date:"2026-10-18",version:"V1.7.4",category:"taisymas",
    title:"Atskiras prisijungimo ir paskyros langas",
    details:[
      "Prisijungimo maršrutas /paskyra atskirtas nuo bendro AppShell: nerodomas kairysis meniu, mobilusis meniu ar DEMO juosta.",
      "Prisijungus paskyros kortelėje galima grįžti į apžvalgą atskiru mygtuku.",
      "Kol kas tik išdėstymo pataisa. Kiti PWA puslapiai tebėra vietinis DEMO; privalomas prisijungimas ir duomenų sinchronizavimas dar neįjungti.",
      "DEMO duomenys naršyklėje ir Supabase paskyrų teisės nekeičiami.",
    ],
    commits:[],
  },

  {
    date:"2026-10-18",version:"V1.7 – 3 etapas",category:"infrastruktūra",
    title:"Patvirtinta pirmojo administratoriaus paskyra ir suteiktos teisės",
    details:[
      "Supabase Auth el. paštas patvirtintas ir prisijungimas atliktas. Patikrinta, kad paskyra atitinka privačiame įmonės paruošimo įraše numatytą administratorių.",
      "Šiai patvirtintai paskyrai sukurtas aktyvus Švari Aplinka narystės įrašas su role=admin; onboarding būsena tapo active. Antro administratoriaus ir kitų paskyrų nėra.",
      "Patikrinta, kad visoms 10 programėlės lentelių įjungta RLS ir anon neturi skaitymo teisių.",
      "Supabase Security Advisor likęs vienas Auth perspėjimas: išjungta nutekėjusių slaptažodžių tikrinimo funkcija. Įjungimą reikės patikrinti Dashboard; šiame etape Auth nustatymai nekeisti.",
      "Privalomas prisijungimas prie PWA, DEMO duomenų perkėlimas ir Cloudflare R2 dar neįjungti, todėl kelių įrenginių sinchronizacija dar neveikia.",
    ],
    commits:[],
  },

  {
    date:"2026-10-18",version:"V1.7 – 2 etapas",category:"infrastruktūra",
    title:"Pirmosios administratoriaus paskyros paruošimas",
    details:[
      "Supabase privačioje schemoje sukurtas pirmos administratoriaus paskyros paruošimo įrašas ir atskiras „Švari Aplinka“ įmonės įrašas. Viešai nėra pateikiamas būsimo administratoriaus el. paštas.",
      "Administratoriaus teisės dar nepriskirtos: Supabase Auth naudotojas turi būti sukurtas saugiu pakvietimu, o jo el. paštas patvirtintas.",
      "Paskyros ekrane pridėtas slaptažodžio nustatymas priėmus kvietimą ir pataisytas slaptažodžio atkūrimo ekranas.",
      "Privatus administratoriaus paruošimo įrašas neprieinamas viešiems ar paprastiems prisijungusiems naudotojams. Supabase Security Advisor – 0 perspėjimų.",
      "Privalomas prisijungimas ir debesijos sinchronizacija neįjungti, esami DEMO duomenys nepakeisti. Cloudflare R2 lieka vėlesniam etapui.",
    ],
    commits:["89e01778"],
  },
  {
    date:"2026-10-18",version:"V1.7 – 1 etapas",category:"infrastruktūra",
    title:"Supabase saugumo pagrindas ir prisijungimo sąsaja",
    details:[
      "Sukurtos 10 izoliuotų įmonės duomenų lentelių ir RLS politikos: paskyroms, adresams, darbams, darbuotojams, priskyrimams, nuotraukų metaduomenims, skelbimams, istorijai ir pranešimams.",
      "Apribotos viešos public.rls_auto_enable() vykdymo teisės nepanaikinant automatinio RLS įvykio trigerio; po pakeitimo Supabase Security Advisor pranešimų nėra.",
      "Papildomai uždraustos kitai įmonei priklausančių darbuotojų, užduočių ir nuotraukų sąsajos. Pranešimo gavėjas gali keisti tik perskaitymo datą, o ne turinį.",
      "Paruoštas el. pašto ir slaptažodžio prisijungimas, atsijungimas bei slaptažodžio atkūrimas; paskyrai būtina patvirtinta narystė įmonėje.",
      "Prisijungimas dar neįjungtas kaip privalomas DEMO, nes administratoriaus paskyros ir bendro duomenų saugojimo migracijos dar nėra. Vietiniai duomenys išsaugoti.",
      "Paruošta tik skaitymo Supabase įmonės duomenų peržiūra ir ilgesnių sąrašų puslapiavimas, kad visi duomenys nebūtų nukertami ties 1000 įrašų.",
      "Cloudflare R2 nuotraukų saugykla ir tikri push pranešimai dar neprijungti.",
    ],
    commits:["b4757ad5","ac77a5c0"],
  },
  {
    date:"2026-10-18", version:"V1.6", category:"funkcija",
    title:"Darbuotojų profilio nuotraukos ir kalendorinė analitika",
    details:[
      "Darbuotojų profilių nuotraukas galima įkelti, pakeisti ar pašalinti. Jos rodomos apskritame avatare ir saugomos tik vietinėje DEMO IndexedDB.",
      "Perjungus nuotrauką galerijoje priartinimo būsena atstatoma.",
      "Kiekviena analitikos diagrama turi atskirus datų nuo/iki filtrus ir dviejų laikotarpių palyginimą, perskaičiuojamą pagal datuotus įvykius.",
      "Pridėti automatizuoti datos intervalo ir palyginimo skaičiavimo testai.",
      "Supabase projektas aktyvus ir sveikas, viešų duomenų lentelių dar nėra. Read-only auditas aptiko 2 perspėjimus dėl public.rls_auto_enable() vykdymo teisių.",
      "Supabase Auth, RLS prieigos politika, ilgalaikis duomenų saugojimas, GPS ir tikri push dar neįdiegti: jiems reikės atskiro konfigūracijos patvirtinimo.",
    ],
    commits:["18869926","098bf2a2","84522661","888c934d"],
  },

  {
    date:"2026-10-18", version:"V1.5", category:"funkcija",
    title:"Darbuotojų pareigos, darbo laikotarpių istorija ir skelbimų nuorodos",
    details:[
      "Išsaugotos esamos personalo grupės ir pridėtas atskiras pareigų pasirinkimas: „Valytojas (-a)“, „Kiemsargis (-ė)“, „Vadybininkas (-ė)“, „Kitos pareigos“.",
      "Pridedant naują darbuotoją darbo pradžia siūloma automatiškai pagal šiandienos datą, bet ją galima pakeisti; profilio sukūrimo data saugoma atskirai.",
      "Vietoje profilį naikinančio trynimo veikia „Archyvas“; išėjusiam fiksuojama pabaigos data, sugrįžus – naujas darbo laikotarpis tame pačiame profilyje.",
      "Rodoma darbo laikotarpių istorija ir personalo kaitai skirti skaitikliai; analitikoje pridėta mėnesinė darbuotojų atėjimo/išėjimo diagrama. Seniems profiliams datos neišgalvojamos.",
      "Pridėtas „Skelbimai“ skirtukas su redaguojamomis HTTPS nuorodomis, kurias galima atidaryti vienu paspaudimu. Automatinio paskelbimo nėra.",
      "Nuolatinė taisyklė: kiekvienas atliktas pakeitimas aprašomas lietuviškai programėlės žurnale ir GitHub dokumente, planai išskiriami.",
    ],
    commits:["1717d08d","5ea976cb","54ab654f","14e7d8a6","48c58e0c"],
  },

  {
    date:"2026-10-18", version:"V1.4", category:"funkcija",
    title:"Prioritetiniai objektai",
    details:[
      "Adresų kūrime ir redagavime pridėta „Prioritetinis objektas“ varnelė.",
      "Adresų sąraše svarbūs namai rodomi pirmiausia, galimas filtras „Tik prioritetiniai objektai“.",
      "Adreso profilyje ir užduočių kortelėse rodomas svarbaus objekto žymeklis.",
      "Pastovus namo prioritetas nesusijęs su individualaus darbo „Skubu“ statusu; ankstesni įrašai išlieka.",
    ],
    commits:["5b9f2411"],
  },
  {
    date:"2026-10-18", version:"V1.3", category:"funkcija",
    title:"Darbuotojai, vadybininkai ir objektų analitika",
    details:[
      "Pridėtas darbuotojų, vadybininkų ir kandidatų DEMO registras su būsenomis ir redagavimu.",
      "Patikrinimo ir darbo formose galima nurodyti atsakingą vadybininką.",
      "Objektams pridėtos aktyvumo, paslaugų pradžios ir pabaigos datos.",
      "Analitikoje skaičiuojami aptarnaujami namai, laiptinės, teritorijos, nauji ir atkrito objektai, atlikti darbai.",
      "Pridėtos stulpelinės, linijinės diagramos ir darbuotojų bei vadybininkų suvestinės.",
      "Dėl naujų meniu punktų išsaugoti įprasti penki mobiliosios navigacijos mygtukai.",
    ],
    commits:["d2dc0ad2","2558f11e","9c74b147","d0509731","8fbd1461","d629c086"],
  },
  {
    date:"2026-10-18", version:"V1.2", category:"funkcija",
    title:"Google Maps ir 15 nuotraukų",
    details:[
      "Prie adresų ir darbo kortelių pridėta navigacija į Google Maps nuo naudotojo dabartinės vietos (su leidimu).",
      "Nuotraukų riba vienam darbui padidinta nuo 12 iki 15.",
      "Nuotraukos ir toliau apdorojamos naršyklėje bei saugomos vietoje; debesijos saugykla nejungiama.",
    ],
    commits:["1c816758"],
  },
  {
    date:"2026-10-18", version:"V1.1.2", category:"funkcija",
    title:"Nuotraukų galerija ir savaitinis dažnumas",
    details:[
      "Nuotraukų peržiūroje pridėtos „Ankstesnė“ / „Kita“ rodyklės ir pozicijos skaitiklis.",
      "Adreso formoje atskirai pasirenkamas laiptinių ir teritorijų valymo dažnumas 1–7 kartai per savaitę.",
      "Dažnumas rodomas adreso informacijoje, tačiau automatinis pasikartojančių darbų kūrimas dar neįdiegtas.",
    ],
    commits:["d6ee4ea0","1f07fceb"],
  },
  {
    date:"2026-10-18", version:"V1.1.1", category:"taisymas",
    title:"Universalus darbo lango atidarymas ir testai",
    details:[
      "Vietoje perėjimo į bendrą „Darbai“ sąrašą darbo kortelė atidaro pilno ekrano langą telefone.",
      "Įdiegta iškylančio lango versija kompiuteriui; navigacija nepriklauso nuo PWA įdiegimo.",
      "Pridėtas automatinis UI testas ir GitHub Actions testo vykdymas prieš publikavimą.",
    ],
    commits:["2617ef31","1799c659","1e9c0e05","ad50dce9","c1e9182e"],
  },
  {
    date:"2026-10-18", version:"V1.1", category:"funkcija",
    title:"Detali darbo kortelė ir fotografavimas",
    details:[
      "Pilnas darbo puslapis su instrukcijomis, patekimo kodo DEMO laukeliu, fotografavimu ir pastabomis.",
      "Atskirtas „Išsaugoti“ ir „Užbaigti darbą“ veiksmas; užbaigimui reikalingas patvirtinimas.",
      "Nuotraukų žymos: „Prieš“, „Po“, „Problema“, konvertavimas į WebP ir saugojimas naršyklėje.",
      "Pradinis 12 nuotraukų limitas (vėliau padidintas iki 15).",
    ],
    commits:["d57d6eb0"],
  },
  {
    date:"2026-10-18", version:"V1.0", category:"funkcija",
    title:"Pradinis administratoriaus DEMO",
    details:[
      "Įdiegtos adresų ir darbų kūrimo, keitimo, trynimo formos; pilni adreso ir darbo puslapiai.",
      "Įdiegtas kalendorius su dienos, savaitės ir mėnesio režimais, neatliktų darbų perkėlimas į šiandieną.",
      "Nuotraukų galerija, kokybės patikrinimai, darbo istorija, administracinis valdymo skydelis.",
      "Visa DEMO informacija saugoma įrenginio naršyklėje; prisijungimai dar neįgyvendinti.",
    ],
    commits:["1eecabc1","1397681f"],
  },
  {
    date:"2026-10-18", version:"V0.2", category:"infrastruktūra",
    title:"GitHub Pages ir nepriklausoma PWA",
    details:[
      "Projektas pritaikytas Vite/React statinei PWA ir atskirai GitHub Pages DEMO nuorodai.",
      "Automatinis GitHub Actions Build ir Deploy; ankstesni GitHub Pages įjungimo nesklandumai išspręsti.",
      "Viešoji „Švari Aplinka“ svetainė nuo DEMO atskirta.",
    ],
    commits:["4159beca","fe355588"],
  },
  {
    date:"2026-10-18", version:"V0.1", category:"infrastruktūra",
    title:"Atskira GitHub repozitorija ir prototipo perkėlimas",
    details:[
      "Sukurta „deoxesinfo/svari-aplinka-pwa“ repozitorija.",
      "Perkeltas ankstyvas Lovable prototipo kodas; tolimesniam darbui nebenaudojami Lovable kreditai.",
      "Pirminis kodas papildytas, kad veiktų nepriklausomai nuo Lovable.",
    ],
    commits:["d034f4d9","f0843fa7","c9bdd3d1","021eb4ff","3a297f0a","c02d3cd2","a0774cc1","0e3fe724"],
  },
  {
    date:"2026-10-14", version:"Koncepcija", category:"planas",
    title:"Pradinė vidinio darbų valdymo idėja",
    details:[
      "Aptarta adresų bazė, laiptinių ir teritorijų valymo grafikas, nepadarytų darbų perkėlimas, pastabos ir nuotraukų istorija.",
      "Numatyta PWA vadybininkams ir administracijai; atskiros darbuotojų paskyros – vėlesnis etapas.",
      "Tai koncepcijos istorija, ne 2026-10-14 GitHub publikacija.",
    ],
  },
];
export const ROADMAP: PlannedEntry[] = [
  {title:"Supabase konfigūracija ir integracija",summary:"Projektas jau sukurtas, bet be lentelių. Prieš integraciją sutvarkyti viešai vykdomos public.rls_auto_enable() saugumą, tada įvesti RLS, Auth, sinchronizaciją ir atsargines kopijas. Tik po atskiro patvirtinimo.",status:"Laukia",stage:"Reikia patvirtinimo"},
  {title:"Administratorius / vadybininkas / darbuotojas",summary:"Pagal rolę rodyti tik leistus adresus, patikrinimus ir analizę. Realios teisės tik su duomenų baze.",status:"Laukia",stage:"Po Supabase"},
  {title:"PWA pranešimai",summary:"Naujos, skubios ir vėluojančios užduotys; naudotojui leidus, įrenginio push pranešimai.",status:"Laukia",stage:"Po prisijungimų"},
  {title:"Privati foto saugykla",summary:"Cloudflare R2 arba kita uždara objektų saugykla; susieti nuotraukas su adresu ir darbu, taikyti leidimus ir saugojimo taisykles.",status:"Laukia",stage:"Po Supabase"},
  {title:"Pasirenkama GPS darbo vietos patikra",summary:"Kuriant darbą atskirai įjungti arba išjungti GPS vietos patikrinimą ir leistiną nuokrypį, palikti tikslumo toleranciją bei administratoriaus išimtis.",status:"Vėlesnis etapas",stage:"Po Supabase"},
  {title:"Ilgalaikis duomenų saugojimas",summary:"Datuotų objektų, darbų ir darbuotojų įvykių istorija, atsarginės kopijos ir privatumo apsauga 5–10 metų analitikai.",status:"Vėlesnis etapas",stage:"Po Supabase"},
  {title:"Inventoriaus apskaita",summary:"Priemonių likučiai, papildymai, išdavimas, perspėjimai ir sunaudojimo statistika.",status:"Vėlesnis etapas",stage:"Planuojama"},
  {title:"Automobiliai, kuras ir draudimai",summary:"Kuro išlaidos, litrai, rida, TA/draudimo datos bei priminimai.",status:"Vėlesnis etapas",stage:"Planuojama"},
  {title:"Analitikos gilinimas",summary:"Mėnesinės ataskaitos, objekto priežiūros kokybė ir dokumentų eksportas. Pajamų apskaita – ne dabartinis prioritetas.",status:"Vėlesnis etapas",stage:"Planuojama"},
];
