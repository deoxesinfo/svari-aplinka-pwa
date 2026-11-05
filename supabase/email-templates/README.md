# ŠA V2.3.31 – Supabase Auth laiškų šablonai
Šiame kataloge paruošti HTML laiškų šablonai, bet **jie nėra automatiškai suaktyvinti Supabase**.

- Kvietimas: **Authentication → Email Templates → Invite user**
  - Subject: `Švari Aplinka – kvietimas prisijungti prie darbų valdymo sistemos`
  - Body: `invite.html`
- Atkūrimas: **Authentication → Email Templates → Reset password**
  - Subject: `Švari Aplinka – slaptažodžio atkūrimas`
  - Body: `recovery.html`
- Palikite `{{ .ConfirmationURL }}` nepakeistą – Supabase sugeneruoja konkretaus naudotojo vienkartinę nuorodą.
- Pasirinkite verified **custom SMTP** siuntėją, jei norite pakeisti `Supabase Auth` siuntėjo vardą ir adresą. Siūlomas vardas: `Švari Aplinka – paskyrų valdymas`, o el. paštas tik **po domeno patvirtinimo**: `paskyros@svariaplinka.lt`.
- Patikrinkite Authentication → URL Configuration ir leistiną tikslų adresą:
  `https://deoxesinfo.github.io/svari-aplinka-pwa/?sa_auth=invite`.
  Atkūrimui: `https://deoxesinfo.github.io/svari-aplinka-pwa/?sa_auth=recovery`.
- **Neįjunkite** `app.svariaplinka.lt` kol jo domenas oficialiai neveikia; nepakeiskite DNS ar dabartinių darbinės svetainės MX įrašų dėl šio darbų rinkinio.

Laiško išvaizdai nereikalingi išoriniai paveikslėliai; vietoje jų yra saugus tekstinis „ŠA“ ženklas.
