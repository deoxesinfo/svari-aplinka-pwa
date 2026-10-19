# Švari Aplinka V2.3.10 – fotografavimo kokybės bandymas (2026-10-19)

Mokamas Google Places API **nejungiamas**. Adresai rankiniu būdu tikrinami žemėlapyje ir patvirtinamas objekto GPS žymeklis.

## 1800–2000 px, WebP ir JPEG palyginimas

Bandymas atliktas su **sintetiniu 2600×1800 px tekstūruoto paviršiaus vaizdu**, kuriame yra smulkių brūkšnių, siūlių, plytelių briaunų. Šios reikšmės nėra realių klientų iPhone nuotraukų matavimai ir negali įrodyti vienodų rezultatų visuose objektuose.

| Ilgoji kraštinė | JPEG 84 % | WebP 84 % |
| --- | ---: | ---: |
| 1600 px | 308 KiB | 227 KiB |
| 1800 px | 376 KiB | 276 KiB |
| 2000 px | 451 KiB | 327 KiB |

Sintetinio testo rezultatai: 2000 px WebP yra 327 KiB, palyginti su 1600 px JPEG 308 KiB (apie +6 % vietos) ir išsaugo daugiau pradinių taškų. Subjektyvi kokybė priklauso nuo objekto detalių ir telefono vaizdo apdorojimo.

## V2.3.10 algoritmas

- Visada paruošiama saugi 1600 px bazinė nuotrauka (iPhone pirmiausia JPEG; kitur WebP/JPEG).
- Jei pradinė nuotrauka didesnė nei 1600 px, bandoma 2000 px WebP su JPEG atsarginiu variantu. Jei neįtelpa į dydžio biudžetą – 1800 px, galiausiai 1600 px.
- Ilgesnė raiška pasirenkama tik jei failas yra ne daugiau kaip 35 % didesnis už bazinį ir ne daugiau kaip 1,6 MiB.
- Maksimalus R2 limitas 3 MiB pilnai nuotraukai, miniatiūrai – 512 KiB; miniatiūra 400 px.
- Originalus neapdorotas failas į R2 niekada nesiunčiamas, jei suspausti nepavyksta.
- iOS/Android formato palaikymą tikrina naršyklės grąžinamas Blob MIME; jei WebP nepalaikomas, lieka JPEG.

### Tikro telefono bandymas

Po saugaus publikavimo reikia vienos tikros nuotraukos su tekstūromis patikros iPhone/Android: vaizdas, kokybė priartinus, dydis, R2 išsaugojimas. Vien iš sintetinio testo negalima tvirtinti, kad tikroji kokybė visais atvejais geresnė.

Serverinis GPS kiekvieną kartą tikrina naujas telefono koordinates; nėra sesijos laikmačio. Naršyklės GPS ir kameros įvestis gali būti klastojama, tad tai padeda kontrolei, bet nėra neabejotinas buvimo ar nufotografavimo laiko įrodymas.
