# ŠA V2.3.20.1 – Web Push: įdiegimas ir tikrinimas

## Įdiegta
- Supabase Cron kas minutę tikrina eilę. Jei nėra laukiančių žinučių, HTTP užklausų nesukuria.
- Serverinė Edge Function sa-push-dispatch reikalauja JWT.
- Serveris pirmą kartą autorizuotam nariui atidarius pranešimus generuoja VAPID porą ir užšifruoja ją Supabase Vault. Privatus raktas nepatenka į naršyklę, GitHub ar pokalbį.
- Apsaugotas Cron naudoja šifruotą serverinį JWT, niekada neskelbiamą klientui.
- R2, darbuotojų rolės, darbai ir istoriniai įrašai nepakeisti.

## Kaip atlikti telefono testą
1. Atidaryti https://deoxesinfo.github.io/svari-aplinka-pwa/ tiesiogiai Safari, ne ChatGPT vidiniame lange.
2. iPhone: Safari Share → Add to Home Screen, atverti įdiegtą PWA.
3. Prisijungti prie įmonės paskyros. Pranešimai → Gauti → Įjungti Push šiame įrenginyje. Jei funkcija nerodoma, spausti Patikrinti Push aktyvavimą.
4. Leisti pranešimus telefono nustatymuose.
5. Iš admin paskyros nusiųsti naują asmeninį bandomąjį pranešimą su tipu Reikia atsakymo. Užverti PWA ir patikrinti, ar telefono OS rodo pranešimą.
6. Gavėjas atveria žinutę, pasirenka Perskaičiau / Sutinku / Nesutinku; administratorius mato būseną.
7. Suplanuoti žinutę 2–3 min. į ateitį ir pakartoti. Cron tikrina kas minutę, todėl siuntimas nėra sekundžių tikslumo.

## Svarbu
- Kol nėra įrenginio prenumeratos, telefono Push nėra įmanomas (pradiniame patikrinime: 0 įrenginių).
- iPhone reikia iOS 16.4+ į pradžios ekraną įdiegtos PWA.
- Garso signalą valdo iOS/Android Focus, Silent mode ir pranešimų nustatymai.
- sent_to_service reiškia tik perdavimą telefono Push paslaugai, o ne žmogaus perskaitymą.
- Jokių papildomų mokamų paslaugų neįjungta; Supabase paslaugos ir cron turi esamas plano kvotas.
