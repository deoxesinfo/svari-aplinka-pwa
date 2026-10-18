# Švari Aplinka PWA – V1.7–V2.0 darbų statusas, 2026-10-18

## Šiandien įgyvendinta kode
- **V1.7:** Supabase Auth privalomas vartotojo prisijungimas, esamo administratoriaus narystė, Supabase RLS, atskiras prisijungimo ekranas be meniu, tuščia bendros įmonės darbų ir adresų bazė, cloud skaitymas/įrašymas, atnaujinimas kas 60 s bei grįžus į langą.
- **V1.8:** automatiniai Supabase audit trigeriai (adresas, darbas, personalas, skelbimai); „Istorija“ puslapis su datų filtrais ir CSV; rankinis bendrų duomenų JSON eksportas.
- **V1.9:** vidinis pranešimų varpelis, 30 naujausių pranešimų, perskaitymo žymėjimas ir gilesnė nuoroda į darbą. Supabase trigeriai priskyrimams, skubiems darbams, komentarams, patikrinimams.
- **V2.0:** pasirenkamas GPS kiekvienam darbui (OFF pagal nutylėjimą), leidžiami 30/50/100 m, objekto koordinatės, vienkartinis naršyklės GPS matavimas ir tikslumo vertinimas, 10 min patikros galiojimas, darbo užbaigimo blokavimas be patikros bei administratoriaus išimtis.
- 12 demonstracinių darbų **neperkelta**; jokių automatiškai perkeltų darbuotojų ir adresų. Cloudflare R2 **nejungta**.
- Įrašai apie etapus saugomi dviejuose žurnaluose ir GitHub komituose.

## Kas techniškai patikrinta
- GitHub Actions Vite Build, automatiniai testai ir Pages Deploy naujausiems etapams.
- Supabase projekto RLS buvo įjungtas visoms 10 pradinių lentelių ir anon naudotojams SELECT teisių nesuteikta.
- GPS Haversine atstumo, prasto tikslumo, ribos ir galiojimo patikros automatiniai testai.
- DB atliktas faktinis patikrinimas: demonstracinių adresų, darbų ir personalo šioje Supabase bazėje 0.

## Dar NEPATIKRINTA / NEĮGYVENDINTA
1. **Tikras E2E:** tą pačią administratoriaus paskyrą naudojant iPhone ir kompiuterį sukurti vieną laikiną adresą/darbą ir patikrinti sinchronizaciją, redagavimą ir ištrynimą. Iki šiol tirtas tik kodo Build, DB schema ir login registracija.
2. **Darbuotojų ir vadybininkų paskyros:** kvietimai, susiejimas su personalo duomenimis ir priskirtais darbais; jų rašymo teisės ir RLS testavimas.
3. **Cloudflare R2:** privati failų saugykla, WebP nuotraukų įkėlimas, peržiūra, darbuotojų avatarai, saugios pasirašytos URL ir vietos užimtumo skaitiklis. Failų įkėlimas debesijos režime sąmoningai užblokuotas.
4. **Telefonų Push pranešimai:** iOS Home Screen PWA, service worker, VAPID/backend, notifikuojantį srautą reikės atskirai sukonfigūruoti.
5. **GPS realiuose telefonuose:** leidimų dialogai, geolokacijos tikslumas, nepatikimos vietos išimtis, GDPR darbuotojų informavimas ir išimčių rolės testas.
6. **Ilgametės kopijos:** Supabase Free negali garantuoti 5–10 metų archyvo ir atkūrimo iš nelaimės. Dabartinis CSV/JSON – rankinis eksportas, ne automatinių atsarginių kopijų ir atkūrimo mechanizmas.
7. **Auth saugumas:** Supabase Security Advisor pastebi, kad išjungtas nutekėjusių slaptažodžių tikrinimas: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection. Reikia patikrinti, ar įjungimas galimas plane. Viešų registracijų išjungimo Dashboard nustatymą taip pat reikia patikrinti.
8. **GitHub repo** vis dar Public. GitHub Pages naudojamas viešam programėlės kodui skelbti, verslo duomenys tik per Supabase RLS.
9. **Sinchronizavimo ribos:** įrašymo eilė optimistiškai rodo pakeitimą ekrane, bet duomenų konfliktų tarp dviejų redaktorių automatinis sujungimas ir atsparumas neprisijungus neįdiegti. Darbuotojų saugojimas pagal paskyrų roles turi būti patikrintas atskirai.

## Siūlomas rytojaus eiliškumas
1. Patikrinti šios dienos Build ir realų admin login iš abiejų įrenginių, įvesti VIENĄ testinį adresą ir darbą, patvirtinti Cloud sync.
2. Prijungti Cloudflare R2 saugiai, be slaptų raktų GitHub.
3. Atlikti nuotraukų, GPS ir pranešimų iOS/Android bandymus; pagerinti klaidų ir recovery patikimumą.
4. Patikrinti saugumo perspėjimą ir autentifikacijos registracijos kontrolę.
5. Prieš pradėdami naudoti tikrus darbuotojų duomenis, sutvarkyti staff roles, privatumo politiką ir atsarginių kopijų politiką.

**Taisyklė:** šis dokumentas yra įgyvendintų funkcijų ir likusių testų ataskaita, o ne tvirtinimas, kad sistema production-ready.
