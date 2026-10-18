import { addDays, todayISO } from "./dates";
import type { Address, Job, JobType, Priority } from "./types";

export const WORKERS = ["Rūta Pavyzdienė", "Tomas Demonstravičius", "Ieva Bandomoji"];

const A: Omit<Address, "id" | "createdAt">[] = [
  { street: "Pavyzdžio g. 12", city: "Kaunas", type: "abu", entrances: 3, instructions: "Plauti laiptines nuo 5 aukšto žemyn. Valyti turėklus, pašto dėžutes. Teritorijoje surinkti šiukšles prie konteinerių.", accessCode: "DEMO-1234", notes: "Raktas nuo ūkinės patalpos – pas pirmininką (fiktyvus)." },
  { street: "Bandomoji g. 7", city: "Vilnius", type: "laiptine", entrances: 2, instructions: "Šluoti ir plauti grindis, valyti lifto duris ir veidrodį.", accessCode: "DEMO-4821", notes: "" },
  { street: "Demonstracijos al. 45", city: "Kaunas", type: "teritorija", entrances: 0, instructions: "Šluoti šaligatvius, išvalyti vaikų žaidimų aikštelę, ištuštinti šiukšliadėžes.", accessCode: "DEMO-0000", notes: "Rudenį – grėbti lapus." },
  { street: "Fiktyvioji g. 3A", city: "Klaipėda", type: "abu", entrances: 4, instructions: "Laiptinės kas savaitę, teritorija du kartus per savaitę.", accessCode: "DEMO-7788", notes: "" },
  { street: "Testinė g. 19", city: "Vilnius", type: "laiptine", entrances: 1, instructions: "Valyti langus laiptinėje kartą per mėnesį, grindis kas savaitę.", accessCode: "DEMO-3311", notes: "Gyventojai prašo nenaudoti stipraus kvapo priemonių." },
  { street: "Modelio g. 8", city: "Šiauliai", type: "teritorija", entrances: 0, instructions: "Prižiūrėti automobilių stovėjimo aikštelę ir žalią zoną.", accessCode: "DEMO-5050", notes: "" },
  { street: "Šablono pr. 101", city: "Kaunas", type: "abu", entrances: 6, instructions: "Didelis daugiabutis: pradėti nuo 1 laiptinės. Teritorijoje valyti rūsio įėjimus.", accessCode: "DEMO-9001", notes: "" },
  { street: "Prototipo g. 22", city: "Panevėžys", type: "laiptine", entrances: 2, instructions: "Plauti grindis, valyti radiatorius ir palanges.", accessCode: "DEMO-2468", notes: "" },
  { street: "Eskizo g. 5", city: "Vilnius", type: "teritorija", entrances: 0, instructions: "Šluoti kiemą, išvalyti dviračių stovą.", accessCode: "DEMO-1357", notes: "" },
  { street: "Maketo g. 14", city: "Kaunas", type: "abu", entrances: 2, instructions: "Laiptinės – drėgnas valymas. Teritorija – šiukšlės ir lapai.", accessCode: "DEMO-8642", notes: "Pirmame aukšte – laikinas remontas (fiktyvu)." },
];

export function buildSeed() {
  const today = todayISO();
  const now = new Date().toISOString();
  const addresses: Address[] = A.map((a, i) => ({ ...a, id: `adr-${i + 1}`, createdAt: now }));
  const plan: [number, JobType, number, Priority, boolean][] = [
    // [address idx, type, day offset, priority, completed]
    [0, "laiptine", -2, "auksta", false],
    [2, "teritorija", -2, "vidutine", false],
    [1, "laiptine", -2, "vidutine", true],
    [3, "teritorija", -1, "auksta", false],
    [4, "laiptine", -1, "zema", true],
    [6, "laiptine", -1, "vidutine", false],
    [0, "teritorija", 0, "vidutine", false],
    [1, "laiptine", 0, "vidutine", false],
    [5, "teritorija", 0, "zema", false],
    [7, "laiptine", 0, "auksta", true],
    [8, "teritorija", 0, "vidutine", false],
    [9, "laiptine", 0, "vidutine", false],
    [6, "patikrinimas", 0, "zema", false],
    [3, "laiptine", 1, "vidutine", false],
  ];
  const jobs: Job[] = plan.map(([ai, type, off, priority, done], i) => {
    const date = addDays(today, off);
    const adr = addresses[ai];
    const history = [{ at: now, text: "Darbas sukurtas (demo duomenys)" }];
    if (done) history.push({ at: now, text: "Būsena pakeista: Atlikta" });
    return {
      id: `job-${i + 1}`,
      addressId: adr.id,
      type,
      worker: WORKERS[i % 3],
      date,
      priority,
      instructions: type === "patikrinimas" ? "Patikrinti laiptinių švarą ir užfiksuoti nuotraukomis." : adr.instructions,
      status: done ? "atlikta" : "laukia",
      inspection: null,
      notes: "",
      completedAt: done ? now : undefined,
      createdAt: now,
      comments: i === 0 ? [{ id: "c1", at: now, text: "Gyventojai pranešė apie išteptas sienas 2 aukšte." }] : [],
      history,
    };
  });
  return { addresses, jobs };
}