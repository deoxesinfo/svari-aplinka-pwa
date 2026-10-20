// Pakeitimų žurnalas. Kiekvieną patvirtintą kūrimo etapą būtina įrašyti čia.
// Kodas GitHub – vienintelis patikimas pakeitimų istorijos šaltinis.
// Naują įrašą dėkite sąrašo pradžioje ir atnaujinkite planuojamų darbų būsenas.
export type ChangeEntry = {
  date: string; version: string; title: string; details: string[];
  commits?: string[]; category: "funkcija" | "taisymas" | "infrastruktūra" | "planas";
};
export type PlannedEntry = { title: string; summary: string; status: "Laukia" | "Vėlesnis etapas"; stage: string };

export const CHANGELOG: ChangeEntry[] = [
  {date:"2026-10-20",version:"V2.3.22",category:"funkcija",
   title:"Vienoda apžvalgos antraštė, atskirti datų laukai, pranešimų šiukšlinė ir žalios temos užkrovimas",
   details:[
    "Apžvalgos pavadinimas ir „Pranešimai“ išdėstyti vienoje horizontalioje eilutėje; naujo darbo mygtukas paliktas žemiau.",
    "Analitikos datų „Nuo“ / „Iki“ laukai iPhone turi atskirą 12–16 px tarpą ir ribotą išdėstymo plotį, kad susiliesti negalėtų.",
    "Gautuose pranešimuose šiukšlinė atidaroma maža ikona (neužima naujos šoninio meniu vietos). Braukimas į kairę leidžia pranešimą perkelti į šiukšlinę.",
    "Šiukšlinėje galima atkurti vieną pranešimą, pažymėti kelis arba po aiškaus papildomo patvirtinimo galutinai ištrinti tik savo gavėjo kopiją. Automatinio trynimo nėra.",
    "Galutinis trynimas fiziškai pašalina konkretaus gavėjo Supabase žinutės įrašą bei jo atsakymo tekstą; kitų gavėjų kopijos nekeičiamos. Siuntėjo originalas ir minimalus administratoriaus būsenų auditas lieka.",
    "Paskyros tikrinimas, įmonės duomenų įkėlimas ir bendras programėlės kraunama ekranas naudoja vienodą centruotą žalią sukimosi indikatorių. Užtrukus ilgiau nei 20 s pasirodo „Bandyti dar kartą“.",
    "Nuotraukos, R2, darbuotojų rolės, esami darbai ir darbo istorija nekeičiami."
   ],commits:[]},

  {date:"2026-10-20",version:"V2.3.21",category:"funkcija",
   title:"Darbuotojų kontaktai, pranešimų atsakymai, darbų kortelės, analitika ir išsamus auditas",
   details:[
    "Darbuotojo profilyje pridėtas neprivalomas telefono numeris su skambinimo nuoroda; redaguojant, archyvuojant ir grąžinant darbuotoją numeris išsaugomas.",
    "iPhone darbo pradžios ir pabaigos datos vertikaliai centruojamos, darbo pabaigos X išvalymo funkcija išsaugota.",
    "Darbuotojas gali vieną kartą atsakyti trumpu tekstu (iki 300 simbolių) į asmeninę žinutę. Administratorius mato atsakymą ir laiką.",
    "Gautų pranešimų braukimas į kairę atveria pašalinimo veiksmą. Tik po patvirtinimo žinutė paslepiama gavėjui; galima atkurti, o administratoriaus istorija lieka.",
    "Skubaus vėluojančio darbo oranžinė juosta tęsiasi iki kortelės apačios, apimdama navigacijos mygtuką; rėmelis lieka vientisas.",
    "Analitikos diagramų atvaizdavimas pakeistas į iPhone stabilų, pagal tikras datas generuojamą SVG; neturint duomenų rodomas aiškus paaiškinimas. Datų laukai atskirti tarpais.",
    "Supabase darbų įvykių žurnalas nuo šiol fiksuoja saugių laukų ankstesnes ir naujas reikšmes. Administratoriui galima išskleisti įvykį, matyti dabartinį susijusį darbą ir atidaryti jį. Seniems įrašams neišgalvojami duomenys.",
    "Nuotraukų, darbų, pranešimų istorija ir esamos rolės nekeistos; jokio automatinio trynimo."
   ],commits:[]},
  {date:"2026-10-19",version:"V2.3.12",category:"taisymas",
   title:"2000 px nuotraukų R2 API suderinamumas",
   details:[
    "Ištaisyta 400 INVALID_DIMENSIONS: V2.3.11 galėjo sukurti 1800–2000 px vaizdą, o Cloudflare Worker klaidingai atmesdavo viską virš 1600 px.",
    "Serverio leidžiama kraštinė padidinta iki 2000 px, paliekant 3 MiB pilnos nuotraukos ir 512 KiB miniatiūros ribas, 15 nuotraukų darbui bei JWT/RLS/GPS apsaugą.",
    "Automatiniai testai tikrina 2000 px horizontalius ir vertikalius vaizdus ir atmeta 2001 px be DB/R2 įrašymo.",
    "Programėlėje tiksliai nurodyta adaptyvi 1600–2000 px raiška.",
    "Ankstesnės trys nuotraukos Supabase metaduomenų bazėje išlikusios ir priskirtos vienam darbui; fizinis R2 failų egzistavimas atskirai nepatvirtintas.",
    "Saugyklos statistika ir senų nuotraukų trynimas nėra aktyvuoti – prieš tai reikia atskiro galutinio patvirtinimo."
   ],commits:[]},
  {date:"2026-10-19",version:"V2.3.11",category:"funkcija",
   title:"Išmanesnis nuotraukų raiškos ir R2 vietos optimizavimas",
   details:[
    "Testuota 1600, 1800 ir 2000 px WebP/JPEG kokybė su sintetiniu tekstūruoto paviršiaus vaizdu. Tikrų telefonų nuotraukų rezultatai gali skirtis.",
    "Programėlė bando 2000 px WebP (JPEG atsarginis variantas), kai tai neviršija 35% didesnio failo dydžio už 1600 px bazinį ar 1,6 MiB. Kitu atveju – 1800 arba 1600 px.",
    "Įkėlimas laikosi R2 3 MiB ir miniatiūros 512 KiB limitų, iPhone JPEG atsarginis kodavimas išsaugotas.",
    "Cloudflare Worker saugo įkėlusio naudotojo ID; darbuotojo užbaigimo auditui naudojamos tik jo paties įkeltos GPS nuotraukos.",
    "Jokių mokamų Google Places API neintegruota. Adresų tikrinimas lieka rankinis su žemėlapiu.",
    "Po publikavimo reikalingas realus vienos iPhone/Android nuotraukos kokybės patikrinimas."
   ],commits:[]},
  {date:"2026-10-19",version:"V2.3.10",category:"funkcija",
    title:"Šiandien / Atlikti / Visi darbai ir GPS fotografavimas be sesijos limito",
    details:[
      "Darbų skiltyje trys skirtukai: šiandienos neatlikti (įskaitant ankstesnių dienų nebaigtus), atlikti su datų filtrais, visi darbai; archyvas išsaugotas.",
      "Užbaigti darbai automatiškai atsiranda „Atlikti“ skiltyje. Administratorius išlaiko visų darbų istoriją.",
      "iOS/Android vietos leidimai tikrinami automatiškai; jei GPS išjungtas, pateikiami konkretūs nustatymų nurodymai.",
      "GPS sesijų ir laikmačio nėra: kiekvienam GPS apsaugotam fotografavimui ir darbo užbaigimui prašoma naujų telefono koordinačių; serveris tikrina 30/50/100 m spindulį.",
      "Darbuotojams ruošiama priskirtų darbų ir nuotraukų prieiga su Supabase RLS; tik administratoriui GPS išimtys su priežastimi.",
      "R2 registruoja GPS patikros rezultatą ir serverio įkėlimo laiką, nekaupia žalių telefono koordinačių; tikslių dublikatų kontrolė SHA-256.",
      "Naršyklės GPS ar kamera nėra 100% nuo techninio klastojimo apsaugotas įrodymas. Darbuotojų paskyros dar neįvestos, todėl darbuotojo telefono bandymas būtinas jas priskyrus."
    ],commits:[]},
  {date:"2026-10-19",version:"V2.2.10",category:"taisymas",
    title:"R2 fotografavimo serverio klaidos taisymas",
    details:[
      "Cloudflare žurnaluose nustatyta 500 INTERNAL_ERROR priežastis: Supabase subužklausa su redirect:error sukelia TypeError dar prieš išsaugant nuotrauką.",
      "Worker Supabase užklausoms naudoja redirect:manual, kaip patvirtinta gyvu ES Cloudflare Worker testu; tikrus 3xx peradresavimus atmeta ir neperduoda JWT kitam domenui.",
      "Pašalinta laikina vieša egress diagnostikos užklausa. Darbų, naudotojų ir nuotraukų duomenys nekeičiami.",
      "Pirmasis tikras iPhone nuotraukos išsaugojimas turi būti patvirtintas atskirai po diegimo."
    ],commits:[]},
  {date:"2026-10-19",version:"V2.2.9",category:"taisymas",
    title:"iPhone fotografavimo ir R2 įkėlimo klaidų taisymas",
    details:[
      "Mobiliajame telefone R2 nuotraukų įkėlimo klaidos nebeslepiamos po bendru pranešimu: matomas serverio HTTP kodas arba konkreti nuotraukos apdorojimo klaida.",
      "iOS/WebKit pirmiausia koduoja kamerų nuotraukas JPEG, kuris priimamas privačiame R2 API; alternatyviai palaikomas WebP. Bandomas ir atsarginis natyvaus atvaizdo dekoderis.",
      "Nepavykus debesijos įkėlimui vienu pasirinkimu daugiau failų automatiškai nebesiunčiama; išsaugoti originalios nuotraukos be apdorojimo draudžiama.",
      "Cloudflare Worker diagnostikai serveris registruoja tik saugius klaidos etapus, HTTP kodus ir klaidų tipus – be vartotojų duomenų, JWT ir nuotraukų.",
      "Faktinis pirmos nuotraukos išsaugojimas dar turi būti patvirtintas po publikavimo; Supabase ir esamų nuotraukų įrašai šiuo taisymu nekeičiami."
    ],commits:[]},
  {date:"2026-10-19",version:"V2.2.8",category:"infrastruktūra",
    title:"Privati R2 darbų nuotraukų saugykla ir fotografavimas PWA",
    details:[
      "Saugus Worker API su Supabase JWT ir RLS, privačiu ES R2 binding, failų dydžio/parašo patikra, serveriniais failų keliais ir klaidų atkūrimu.",
      "Administratoriaus debesijos režime: fotografavimas ir įkėlimas darbo kortelėje, galerija su privačiu R2 peržiūros API, nuotraukų žymos, 15 nuotraukų / darbui, iki 5 failų vienu pasirinkimu.",
      "GPS apsaugoti darbai, adreso nuotraukos be darbo ir darbuotojo paskyros dar nepalaikomi – iki atskiros serverinės GPS/autorizacijos plėtros. Nuotraukų trynimas R2 išjungtas.",
      "Supabase DB STEP 1 jau įdiegtas – daugiausia 15 nuotraukų vienam darbui; DELETE politika nepakeista.",
      "PWA įkėlimo / peržiūros kodas DRAFT šakoje paruoštas; pagal nutylėjimą CLOUD_R2_PHOTOS_READY=false. Tik specialus VITE_SA_R2_PILOT=admin-one-photo build su konkrečiu VITE_SA_R2_PILOT_JOB_ID atveria vieno darbo UI; PWA Deploy nebuvo.",
      "GPS saugomų objektų, darbuotojų įkėlimo ir nuotraukų trynimo aktyvavimas atidėtas iki serverinių prieigos taisyklių ir realių įrenginių testų.",
      "GitHub CI vykdo PWA Build, Vitest ir Worker API testus. Instrukcija: cloudflare/CLOUDFLARE_SETUP_LT.md.",
      "Vienos administratoriaus nuotraukos PILOT DRAFT: atskirai ribojami organizacijos/admin/darbo UUID, dvigubas ENABLE_UPLOADS ir PILOT_ENABLED užraktas, atomarinė R2 If-None-Match rezervacija neleidžia įkelti dviejų nuotraukų net lygiagrečiai.",
      "Po pilotinės rezervacijos klaidos automatiniai bandymai draudžiami; R2/DB/PWA nuotraukų duomenys nekeisti. Cloudflare Worker saugiai atnaujintas per GitHub Actions; ENABLE_UPLOADS=false ir PILOT_ENABLED=false, R2 EU jurisdikcija patvirtinta.",
      "2026-10-19: po nesėkmingo 500 nuotraukos bandymo įdiegtas etapinis Worker klaidų klasifikavimas (FORM_PARSE, FILE_VALIDATION, DB_SCOPE_CHECK, R2_RESERVATION, R2_BLOBS, DB_METADATA), be asmens duomenų žurnaluose. R2 API laikinas objektas sėkmingai įrašytas, perskaitytas ir ištrintas. Tikras nuotraukos bandymas dar nepatvirtintas.",
      "Atskiram GitHub Pages R2 pilotui DRAFT pridėtas minimalistinis administratoriaus prisijungimo ir vieno failo ekranas (pilot.html, src/pilot.tsx), izoliuoto base path surinkimas ir repo diegimo workflow šablonas; testas nepublikuotas, nes dar nesukurta atskira repo."
    ],commits:[]},

  {date:"2026-10-19",version:"V2.2.7",category:"taisymas",
    title:"Kompaktiškos desktop darbų kortelės be tuščios vietos navigacijai",
    details:[
      "Tik kompiuteriuose (lg ir plačiau): „Važiuoti“ ir darbo atidarymo rodyklė sudėti dešinėje vienoje horizontalioje linijoje, to paties balto darbo konteinerio viduje.",
      "Pašalintas ankstesnis 64 px papildomas apatinis tarpas; dabar aukštį lemia tik adresas, žymos, darbuotojas ir kiti esami duomenys. Dešinioji kortelės dalis palikta mygtukui, kad informacija neužliptų ant navigacijos.",
      "Bendras JobRow komponentas vienodai veikia Apžvalgoje, Darbuose, Kalendoriuje bei darbų istorijoje; palikti Swipe, darbo atidarymo, trijų taškų ir Google Maps veiksmai.",
      "Mobiliosios versijos klasės ir „Važiuoti“ vieta po kortele nekeistos. Tikros naršyklės vizualinį vaizdą patikrinti po publikavimo.",
    ],commits:[]},

  {date:"2026-10-19",version:"V2.2.6",category:"taisymas",
    title:"Google Maps navigacijos mygtukas darbų kortelės viduje kompiuteryje",
    details:[
      "Kompiuterio (nuo lg pločio) darbų kortelėse mygtukas „Važiuoti“ perkeltas į tos pačios kortelės dešinį apatinį kampą. Anksčiau jis buvo atskira eilutė po kortele.",
      "Mažesniame ekrane navigacijos mygtuko vieta nekeičiama; paliekamas atskirai po kortele.",
      "Palikta esama Google Maps navigacijos nuoroda; mygtukas nepakeičia darbo atidarymo ir trijų taškų valdymo.",
      "Pataisa rodoma tik po sėkmingo GitHub Pages publikavimo; realių įrenginių vizualinė patikra dar neatlikta. Pakeitimas taikomas visoms skiltims, kuriose naudojamas bendras JobRow komponentas.",
    ],commits:[]},

  {date:"2026-10-19",version:"V2.2.5",category:"taisymas",
    title:"iPhone darbuotojo pabaigos datos ir darbo redagavimo slinkimo pataisa",
    details:[
      "Darbuotojo Redaguoti formoje pabaigos data atidaroma ir tada, kai būsena Aktyvus; data gali būti įrašyta, pakeista arba išvalyta X. Statusas nepasikeičia automatiškai.",
      "Suvienodintas vietinių iPhone datos laukų išdėstymas ir teksto lygiavimas; standartinis Safari datos kalendorius paliktas.",
      "Darbo Redaguoti / Naujo darbo iššokantis langas apribotas mobiliojo ekrano pločiu. Horizontalus slinkimas užblokuotas, paliktas vertikalus, formos laukai negali išplėsti lango.",
      "Pataisytas išsaugojimo ir atšaukimo mygtukų tarpas darbo redagavimo lange. Supabase, GPS, R2 ir kitos funkcijos nekeičiamos.",
      "Automatiniai išdėstymo testai nepakeičia vizualaus iPhone Safari bandymo.",
    ],commits:["a284463d","eb29a824"]},

  {date:"2026-10-19",version:"V2.2.4",category:"taisymas",
   title:"Vienodi darbuotojo datų laukai ir patogūs išsaugojimo mygtukai",
   details:[
    "Personalo profilio Redaguoti formoje „Dirba nuo“ ir „Darbo pabaigos data“ dabar turi vienodo aukščio ir pločio iPhone Safari pritaikytus vietinius datos laukus.",
    "Darbo pabaigos data turi atskirą X išvalymo mygtuką, kurį paspaudus data pašalinama, o tuščia reikšmė išsaugoma. Jei darbo pabaiga nežinoma, jos neišgalvojame; darbo laikotarpių istorijoje rodoma „Pabaigos data nenurodyta“.",
    "„Išsaugoti“ ir „Atšaukti“ personalo redagavimo lange atskirti 16 px tarpu, padidintas mygtukų patogumas telefonu.",
    "Standartinis iOS datos pasirinkimo langas nepakeistas, Supabase schema ir nuotraukų saugykla nekeičiama. Vizualinis iPhone Safari patikrinimas dar reikalingas.",
   ],commits:["6cc56c49","2e935383"]},

  {date:"2026-10-19",version:"V2.2.3",category:"taisymas",
   title:"Adresų Swipe ir saugus archyvas, nebaigtų darbų archyvavimas, personalo nuotraukos redagavime",
   details:[
    "Adresų kortelės perbraukiamos į kairę arba atveriamos trijų taškų mygtuku: Archyvuoti / Atkurti, Redaguoti ir Ištrinti. Adresų sąraše atskirai rodomi Aktyvūs ir Archyvas.",
    "Archyvuojant adresą jo būsena tampa Sustabdytas, todėl nuolatinis darbų generatorius nustoja kurti naujas užduotis. Būsimi dar neatlikti darbai paslepiami iš aktyvių sąrašų, bet jų istorija lieka; atkūrus adresą jie grąžinami.",
    "Adresų ištrynimas yra minkštasis: žymima deletedAt, įrašas dingsta iš sąrašo ir nebeatkuriamas per UI, tačiau visi susieti darbai, grafikai ir nuotraukų įrašai išsaugomi. Prieš trynimą būtinos administratoriaus teisės ir aiškus patvirtinimas.",
    "Darbuose dabar galima archyvuoti tiek atliktą, tiek neatliktą užduotį ir vėliau ją atkurti, jei adresas vis dar aktyvus. Ištrynimo patvirtinimas lieka atskirame lange, tik administratoriui.",
    "Darbuotojo nuotraukos pridėjimo / keitimo / šalinimo valdymas paliktas tik profilio Redaguoti formoje; pasikartojanti Profilio nuotrauka išskleidžiama skiltis iš darbuotojo kortelės pašalinta.",
    "Cloudflare R2 neprijungta: nuotraukų įkėlimas Supabase debesijos režime vis dar išjungtas. Tikrą Swipe mobiliuose įrenginiuose ir įvairių paskyrų teises reikia patikrinti atskirai.",
   ],commits:["30eb6c41","67810586","bf991dd7","095f2eb3"]},

  {date:"2026-10-19",version:"V2.2.2",category:"taisymas",title:"Darbų kortelių veiksmai, laiko išvalymas, A4 spausdinimas ir personalo UX",details:[
    "Darbų kortelėse Swipe veiksmai: archyvuoti atliktus darbus, redaguoti ir tik administratoriui patvirtinus pažymėti darbą ištrintu.",
    "Archyvavimas ir trynimas yra minkštieji: Supabase įrašai ir istorija išlieka; pasikartojantis generatorius neatkuria pašalintų datų.",
    "Darbo pradžios laukas turi X išvalymą, o tuščias laikas išsaugomas ir nenaudojamas grafike.",
    "A4 durų kodai automatiškai įtraukiami po administratoriaus teisių patvirtinimo; checkbox pašalintas.",
    "Personalo kortelių išdėstymas kompaktiškesnis, Redaguoti ir Į archyvą mygtukai vienodo rėmelio.",
    "Standartinis telefono datos ir laiko pasirinkimo kalendorius nepakeistas; fiziniai iPhone testai dar laukiami.",
  ],commits:["28882530","2d244078","a6e56a68","57417756","8d7b04ef","89a28316"]},

  {
    date:"2026-10-18",version:"V2.2.1",category:"funkcija",
    title:"Individualus darbuotojo kalendorius, A4 grafikas ir formos tarpai",
    details:[
      "Esamoje Kalendorius skiltyje galima pasirinkti darbuotoją iš Personalo sąrašo ir peržiūrėti jo dienos, savaitės ar mėnesio užduotis; kitiems darbuotojams priklausantys darbai filtruojami pagal profilio ID.",
      "Savaitės ir mėnesio režimu pridėtas individualaus A4 grafiko spausdinimas. Lape – darbuotojas, data, laikas, adresas, valymo tipas ir būsena; meniu bei administravimo mygtukai nespausdinami.",
      "Durų kodai spausdinami tik jei administratorius atskirai pažymi konfidencialų pasirinkimą ir patvirtina saugų perdavimą. Pagal nutylėjimą jie neįtraukiami.",
      "Pop-up Priskirti darbą mygtukai Išsaugoti ir Atšaukti atskirti 16 px, pagerintas apatinis tarpas mobiliuose ekranuose.",
      "Standartiniai iPhone datos ir laiko pasirinkimo valdikliai palikti nekeičiami. Papildomos kalbos ir darbuotojų asmeninės paskyros – vėlesni darbai.",
      "Spausdinamos tik jau sugeneruotos užduotys (V2.1 jas generuoja 4 savaitėms); spausdinimas iPhone ir skirtinguose įrenginiuose dar turi būti praktiškai patikrintas.",
    ],
    commits:["92993a61","5c378205","8afb8740","6af6724e","125fc382","8f9db87d","69fb4838","3e351c35"],
  },

  {
    date:"2026-10-18",version:"V2.1",category:"funkcija",
    title:"Paprasti vienkartiniai ir pasikartojantys darbų priskyrimai",
    details:[
      "Prie adreso kortelės įdėtas „Sukurti darbą“ mygtukas. Forma leidžia pasirinkti vieną arba abu valymo tipus, darbuotoją iš esamo personalo sąrašo, vienkartinį ar nuolatinį darbą.",
      "Nuolatiniam darbui laiptinių ir teritorijos dienos parenkamos nepriklausomai (galima kelias per savaitę). Darbo pradžios laikas neprivalomas.",
      "Transportas: savarankiškai, viešasis transportas ir įmonės automobilis. Viešajam transportui pažymimas įmonės nuolatinis bilietas, jo galiojimas neprivalomas. Automobilių registras kol kas nekuriamas.",
      "Priskyrimai saugomi Supabase su RLS ir susieti su objekto bei personalo įrašais. Juos galima matyti prie adreso ir darbuotojo profilyje.",
      "Serverio funkcija sugeneruoja būsimas kalendoriaus užduotis artimiausioms 4 savaitėms; atidarius programėlę langas papildomas, o unikalus tvarkaraščio/datos/tipo indeksas neleidžia dublikatų.",
      "Supabase generatorius išbandytas ROLLBACK transakcijoje su fiktyviais testiniais įrašais: 8 būsimi darbai dviejų savaičių intervale; testiniai įrašai neišsaugoti.",
      "Kol nesukurtos darbuotojų Auth paskyros, individualūs pranešimai jiems nesiunčiami. R2, transporto priemonių registras ir papildomos 10 funkcijų neįtraukti.",
      "Automatinis foninis grafiko generavimas nesukonfigūruotas: būsimos užduotys papildomos prisijungus arba atnaujinus PWA. Praktinio kelių įrenginių bandymo dar nėra.",
    ],
    commits:["e9e914ec","320e545d","b19d46ce","18d00799"],
  },

  {date:"2026-10-18",version:"V2.0.9",category:"taisymas",
   title:"Maps nuorodų testų ir pakeitimų žurnalo patikslinimas",
   details:[
     "Pataisytas Google Maps adreso nuorodos testas, kad URL paieškos parametrų plus tarpai būtų interpretuojami teisingai.",
     "Abu pakeitimų žurnalai papildyti konkrečiais V2.0.4–V2.0.8 komitais ir detalia saugumo bei GPS integracijos ribų ataskaita.",
     "Įrenginių GPS bandymai, realus adresų geokoderio patikimumas ir serverinė foto autorizacija dar laukia; Cloudflare R2 nejungta.",
   ],commits:[]},

  {date:"2026-10-18",version:"V2.0.8",category:"taisymas",
   title:"GPS žymeklio paieškos ir Google Maps nuorodų stabilizavimas",
   details:[
     "Įjungus GPS apsaugą žemėlapio adreso paieška paleidžiama vieną kartą pagal įvestą gatvę ir miestą.",
     "Pasirinkus paieškos rezultatą, žymeklis sukuriamas arba perkeliamas į naują vietą; administratoriui leidžiama patikslinti jį paspaudimu arba tempimu.",
     "Google Maps vietos ir navigacijos nuorodoms pridėti testai: patvirtintos koordinatės ir nepatvirtinto adreso paieškos režimas.",
     "Automatinio geokodavimo paslauga yra bandomoji, neteikia veikimo garantijos. R2 nuotraukų įkėlimas vis dar atidėtas.",
   ],commits:["e5c5578c"]},

  {date:"2026-10-18",version:"V2.0.7",category:"funkcija",
   title:"GPS apsauga fotografavimo ir įkėlimo mygtukams",
   details:[
    "Adresams su GPS apsauga nuotraukų mygtukai užrakinti, kol vienkartinė vietos patikra nepatvirtins atstumo ir GPS tikslumo.",
    "Patikra galioja 10 minučių; darbų patikra susieta su darbu, o bendram objekto fotografavimui naudojama trumpalaikė naršyklės patikra.",
    "Kol Cloudflare R2 neprijungta, debesijos nuotraukų mygtukai lieka išjungti net esant sėkmingam GPS rezultatui.",
    "Serverio autorizacija ir realūs iOS/Android testai būtini prieš produkcinį nuotraukų įkėlimą.",
   ],commits:["89c2bef3"]},

  {date:"2026-10-18",version:"V2.0.6",category:"funkcija",
   title:"GPS apsauga susieta su patvirtintu objekto adresu",
   details:[
     "GPS platumos ir ilgumos laukus adreso formoje pakeitė pažymimas GPS apsaugos jungiklis ir žemėlapio vietos patvirtinimas.",
     "Žymeklį galima parinkti pagal adresą, pataisyti žemėlapyje ir patvirtinti. Pakeitus gatvę ar miestą patvirtinimas nebegalioja.",
     "Kai adresui įjungta GPS apsauga, naujas darbas ją automatiškai paveldi; nuotraukų ir užbaigimo tikrinimas ruošiamas atskirame etape.",
     "Adreso kortelės Google Maps vietos nuoroda naudoja tik patvirtintas koordinates. R2 kol kas išjungta.",
   ],commits:["a646fd7e"]},

  {date:"2026-10-18",version:"V2.0.5",category:"funkcija",
   title:"Automatinė adreso vietos paieška ir patvirtinamas žymeklis – pagrindas",
   details:[
     "Paruoštas adreso GPS apsaugos jungiklis ir žemėlapio komponentas su pasirenkamu, perstumiamu namo žymekliu.",
     "Adreso paieška vykdoma tik paspaudus mygtuką; bandomajai paieškai naudojama Photon paslauga. Masinių ir automatinio rašymo užklausų nėra.",
     "GPS žymeklis galioja tik tiksliam patvirtintam gatvės ir miesto įrašui – pakeitus adresą, patvirtinimas prarandamas.",
     "Google Maps nuorodoms planuojama naudoti patvirtintą žymeklį, o ne vien teksto paiešką. Komponentas dar jungiamas prie adreso formos.",
     "Cloudflare R2 ir saugių serverio nuotraukų nėra; bandomasis geokoderis nėra garantuotas komercinis SLA.",
   ],commits:["916b5425"]},

  {
    date:"2026-10-18",version:"V2.0.4",category:"taisymas",
    title:"Adresų kortelės, mobili forma ir slaptažodžio peržiūra",
    details:[
      "Adresų sąrašo kortelės perrikiuotos: veiksmai atskiroje eilutėje, prioritetinė žyma nebesikerta su Važiuoti mygtuku.",
      "Pridėta atskira Google Maps žymeklio ikona; patvirtintai vietai naudoja koordinates, kitur – aiškiai pažymėtą adreso paiešką.",
      "Mobiliojo adreso ir darbo redagavimo lango mygtukų tarpai padidinti, atsižvelgta į Safari apatinę juostą.",
      "Prisijungimo, slaptažodžio nustatymo ir keitimo laukuose pridėta prieinama slaptažodžio parodymo/paslėpimo akis.",
      "GPS vietos parinkimo ir fotografavimo taisyklės ruošiamos sekančiuose etapuose. R2 neprijungta.",
    ],commits:["f472074e"],
  },

  {date:"2026-10-18",version:"V2.0 – etapų peržiūra",category:"planas",
   title:"Įgyvendintų funkcijų ir likusių bandymų auditas",
   details:[
    "Sukurtas atskiras techninės būklės dokumentas PWA_ETAPU_ATASKAITA_2026-10-18.md, atskiriantis veikiančias funkcijas nuo realiai nepatikrintų.",
    "V1.7–V2.0 kodas turi privalomą Auth, bendrą duomenų šaltinį, auditą, pranešimus ir GPS patikros pagrindą.",
    "Dar neišbandytas dviejų skirtingų telefonų sinchronizavimas, darbuotojų rolės, GPS tikslumas ir tikri Push pranešimai.",
    "Cloudflare R2 ir nuotraukų sinchronizacija atidėta rytojui, demonstraciniai duomenys į Supabase neperkelti.",
   ],commits:["9c1192dd"]},

  {date:"2026-10-18",version:"V1.8.2",category:"funkcija",
   title:"Rankinis Supabase duomenų kopijos eksportas",
   details:[
    "Nustatymuose administratorius gali atsisiųsti JSON su bendrais adresais, darbais, darbuotojais ir skelbimais.",
    "Eksportas vykdomas tik paspaudus mygtuką. Nešifruoto failo negalima palikti viešai, nes gali būti durų kodų ar asmens duomenų.",
    "Nuotraukų nėra ir atkūrimas iš JSON neįdiegtas. 5–10 metų saugojimui būtinas nepriklausomas backup planas.",
   ],commits:["ca3aca60"]},

  {date:"2026-10-18",version:"V2.0.3",category:"funkcija",
   title:"Vienkartinė GPS patikra ir dokumentuota administratoriaus išimtis",
   details:[
    "Darbo kortelėje galima vienu paspaudimu patikrinti telefono vietą, vertinant pasirinktą 30/50/100 m atstumą bei GPS tikslumą.",
    "GPS reikalaujami darbai nebus užbaigti be naujo patvirtinimo arba administratoriaus įrašytos išimties su priežastimi.",
    "Patikra neįrašo darbuotojo telefono koordinačių ir neveikia fone.",
    "Nuotraukų integracija su R2, darbuotojų paskyros, GPS veikimo realiuose telefonuose ir privatumo informavimas dar nepatikrinti.",
   ],commits:["00bb5d85"]},

  {date:"2026-10-18",version:"V2.0.2",category:"funkcija",
   title:"GPS pasirinkimas kiekvienam darbui ir patikros apsauga",
   details:[
    "Kuriant ar redaguojant objektą galima įvesti patikros vietos koordinates; kuriant darbą GPS jungiklis pagal nutylėjimą išjungtas.",
    "Įjungtam GPS darbui parenkamas 30, 50 arba 100 m leistinas spindulys. Tikrinimas naudoja telefono leidžiamą vienkartinę vietą ir vertina tikslumą.",
    "GPS reikalaujamą darbą užbaigti galima tik po naujos patikros arba aiškios administratoriaus išimties.",
    "Realaus iOS/Android bandymo, geolokacijos klastojimo atsparumo ir darbuotojų rolės patikrinimo dar nėra.",
   ],commits:["0ea0ff5d"]},

  {date:"2026-10-18",version:"V2.0.1",category:"infrastruktūra",
   title:"GPS atstumo matematikos ir duomenų struktūros pagrindas",
   details:[
    "Pridėti neįjungtos GPS darbo patikros duomenų tipai: 30/50/100 m, atstumas, tikslumas, laikas, vietos koordinatės, galimas administratoriaus paaiškinimas.",
    "Sukurti ir testuojami Haversine atstumo skaičiavimai, GPS tikslumo vertinimas, 10 minučių patikros galiojimas.",
    "Saugomas tik matavimo rezultatas, o ne darbuotojo telefono koordinatės. Nuolatinio vietos sekimo nėra.",
    "Darbo formos ir praktinis GPS įrenginių testas vykdomi kitu V2.0 etapu.",
   ],commits:["52d954eb"]},

  {date:"2026-10-18",version:"V1.9.1",category:"funkcija",
   title:"Paskyros pranešimų varpelis ir įvykių istorija",
   details:[
     "Supabase pranešimai rodomi prisijungusio naudotojo varpelyje; matomas neperskaitytų pranešimų skaičius, istorija ir nuoroda į darbą.",
     "Perskaitymo žyma saugiai įrašoma į konkretaus gavėjo pranešimą; duomenys atnaujinami periodiškai ir grįžus į naršyklę.",
     "Supabase bazėje paruošti trigeriai naujiems priskyrimams, skubiems darbams, komentarams ir patikrinimams.",
     "Telefono Push pranešimai, darbuotojų paskyrų paskirstymas ir tikri iOS/Android testai dar neatlikti.",
   ],commits:["5b1aaac7"]},

  {date:"2026-10-18",version:"V1.8.1",category:"funkcija",
   title:"Datuotas Supabase pakeitimų žurnalas ir CSV eksportas",
   details:[
     "Adreso, darbo, personalo bei skelbimo pakeitimus automatiškai fiksuoja Supabase duomenų bazės trigeriai.",
     "Administratoriui pridėta nauja „Istorija“ skiltis su datų nuo/iki pasirinkimu ir saugiu puslapiavimu po 100 įrašų.",
     "Galima eksportuoti matomą istorijos puslapį į CSV; jautrūs duomenų laukai į auditą neįrašomi.",
     "Daugiametės istorijos kaupimo mechanizmas paruoštas, tačiau 5–10 metų išsaugojimui dar reikės atsarginių kopijų ir atkūrimo testų.",
   ],commits:["fa68e41d"]},

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
    ],commits:["e216a75f","ebec116c"],
  },
  {
    date:"2026-10-18",version:"V1.7.6",category:"funkcija",
    title:"Privalomas prisijungimas ir saugi tuščia įmonės bazė",
    details:[
      "Valdymo puslapiai prieinami tik patvirtintam Supabase administratoriui: prieš rodant duomenis tikrinamas Auth ir narystė.",
      "Prisijungus adresų, darbų, personalo ir skelbimų duomenų šaltinis yra Supabase, ne vietinis DEMO; 12 DEMO darbų neperkeliami.",
      "Duomenų pakeitimai eilėje siunčiami į Supabase, o nesėkmingą įrašymą aiškiai signalizuoja klaida. Pilnas kelių įrenginių veikimo ir konfliktų testas dar laukia.",
      "Nuotraukų failų įkėlimas bus aktyvuotas tik po Cloudflare R2 integracijos; pranešimai ir GPS diegiami atskirais etapais.",
    ],commits:["95cf4de1"],
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
    commits:["d3804ec4"],
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
    commits:["6ec8e700"],
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
    commits:["488c2fb0"],
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
  {title:"Darbuotojo asmeninė paskyra",summary:"Pakvietimas ir saugus darbuotojo Auth paskyros susiejimas su Personalo profiliu; matomi tik jam paskirti darbai, be prieigos prie kitų darbuotojų ar durų kodų be leidimo.",status:"Vėlesnis etapas",stage:"Po V2.2.1"},
  {title:"Papildoma kalba",summary:"Antroji programėlės kalba – pridėti tik užbaigus pagrindines funkcijas. Standartinį iPhone datos pasirinkimo kalendorių palikti.",status:"Vėlesnis etapas",stage:"Vėliau"},
  {title:"Privati nuotraukų saugykla – Cloudflare R2",summary:"Saugus nuotraukų įkėlimas, peržiūra, GPS tikrinimas serveryje ir saugojimo politika. R2 dar neprijungta.",status:"Laukia",stage:"Atskiras patvirtintas etapas"},
  {title:"Darbuotojų ir vadybininkų rolės",summary:"Patikrinti skirtingų paskyrų RLS, įmonės duomenų ribas ir priskirtų objektų matomumą; dabar aktyvi tik administratoriaus paskyra.",status:"Laukia",stage:"Po darbuotojų pakvietimų"},
  {title:"Telefonų Push pranešimai",summary:"Vidinis varpelis jau veikia, bet iOS ir Android Push siuntimas bei leidimai dar neįjungti.",status:"Vėlesnis etapas",stage:"Po paskyrų integracijos"},
  {title:"GPS bandymai realiuose telefonuose",summary:"Tikslumo, vienkartinio vietos leidimo, administratoriaus išimties ir serverinio nuotraukų užrakto patikra. GPS pagrindas jau įdiegtas.",status:"Vėlesnis etapas",stage:"Po R2"},
  {title:"Ilgalaikių duomenų atsarginės kopijos",summary:"Veikia įvykių istorija ir rankinis CSV/JSON eksportas, bet patikimo automatinio 5–10 metų archyvo ir atkūrimo dar nėra.",status:"Vėlesnis etapas",stage:"Duomenų saugumas"},
  {title:"Inventoriaus apskaita",summary:"Priemonių likučiai, išdavimas, perspėjimai ir sunaudojimo statistika.",status:"Vėlesnis etapas",stage:"Planuojama"},
  {title:"Automobiliai, kuras ir draudimai",summary:"Atskiras automobilių registras, rida, TA/draudimas ir priskyrimų detalizavimas. V2.1 kol kas saugo tik transporto būdą.",status:"Vėlesnis etapas",stage:"Planuojama"},
  {title:"Analitikos gilinimas",summary:"Kokybės rodikliai ir papildomi laikotarpiai bei eksporto galimybės. Esami analitikos duomenys veikia.",status:"Vėlesnis etapas",stage:"Planuojama"},
];
