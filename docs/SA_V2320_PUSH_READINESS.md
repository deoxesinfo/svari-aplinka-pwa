# Švari Aplinka V2.3.20 – tikras Web Push (DRAFT; nieko neįjungta)

**Būsena:** techninis pasiruošimas. Nėra Push siuntimo, automatinių duomenų pakeitimų ar serverinio VAPID rakto.

## Esama patikrinta bazė
- V2.3.18 – taisymas iš naujo atidaro tą patį darbą ir nebekuria naujo ID.
- V2.3.19 – Supabase žinutės: adresatai, suplanuotas laikas, perskaitymo, sutikimo ir nesutikimo žymos.
- Esami pranešimai tikrinami atviroje programėlėje kas 45 sekundes; tai dar nėra telefono Push.
- Kol kas aptikta tik viena aktyvi admin narystė; darbuotojų paskyrų teisių nekeisti.

## Minimalus įgyvendinimas
1. **Leidimas** – darbuotojas savo įrenginyje spaudžia „Įjungti pranešimus“. Patikrinti secure context, Service Worker, PushManager ir Notification. iPhone Web Push reikalauja iš Safari į pradžios ekraną įdiegtos PWA; ChatGPT integruotoje naršyklėje gali neveikti.
2. **Service Worker** – turėti vieną SW GitHub Pages projekto scope /svari-aplinka-pwa/. Gavus push rodyti tekstą, o paspaudus atidaryti autentifikuotą PWA ir susietą darbą ar žinutę. Neatidaryti išorinio URL iš nepatikimo payload.
3. **VAPID** – privatus raktas tik serverio Secrets; nekelti į GitHub, klientines aplinkos konstantas ar pokalbį. Naršyklei pateikti tik viešą raktą.
4. **Prenumeratos** – privati Supabase lentelė organizacijos / auth naudotojo / įrenginio endpoint / p256dh / auth duomenims. RLS pagal tapatybę. Unsubscribe ištrina tik savą prenumeratą; 404/410 atsakymas pašalina nebegaliojančią.
5. **Siuntėjas** – serverinė Edge Function su Web Push/VAPID. Privatus raktas niekada nepasiekia naršyklės.
6. **Planavimas** – serverio laikmačiu vykdyti suplanuotas žinutes net jei administratoriaus PWA uždaryta. Prioriteto/tikrinimo pokyčiai turi kurti unikalią (gavėjas, įvykis) eilės užduotį. Riboti pakartojimus, neleisti dubliuotų Push.
7. **Būsenos** – atskirti queued, sent_to_push_service, failed, read, responded. Push paslaugos patvirtinimas neįrodo žmogaus perskaitymo; perskaitymo ir atsakymo signalai ateina tik iš programėlės.
8. **Teisės** – admin valdo pranešimus, darbuotojas mato ir atsako į savus; vadybininko teises tvarkyti vėliau.

## Prieš LIVE privalu
- Aktyvi bent viena tikra darbuotojo prisijungimo paskyra ir naudotojo suteiktas Web Push leidimas.
- Saugūs VAPID serverio Secrets, patikrintas Edge siuntėjas ir nepriklausomas planavimo mechanizmas.
- Patikrinti Supabase ir pristatymo nemokamus limitus; nekurti automatinės mokamos paslaugos.
- Testuoti vieną pranešimą su gavėjo sutikimu tikrame telefone / kompiuteryje (iOS Home Screen, Android PWA, desktop), gavimą, paspaudimą, perskaitymą ir idempotenciją.
- Be tikro įrenginio patikros ir serverio paslapčių negalima žymėti etapo „Live Push įdiegta“.

**Neliesti:** esamų R2 nuotraukų, darbų istorijos, darbuotojų rolių ir foninės lokacijos.
