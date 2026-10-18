import { describe, expect, it } from "vitest";
import { deriveEmploymentPeriods, type PersonInput } from "@/lib/store";
import { personnelMovementMonths } from "@/lib/analytics";
import type { Person } from "@/lib/types";
const sample:PersonInput={
  name:"Fiktyvus DEMO",role:"darbuotojas",position:"valytojas",
  status:"aktyvus",notes:"",startedAt:"2026-01-05",
};
describe("Darbo laikotarpių istorija",()=>{
  it("naujai priėmus sukuria pirmą laikotarpį",()=>{
    expect(deriveEmploymentPeriods(null,sample)).toEqual([{startedAt:"2026-01-05"}]);
  });
  it("archyvas užbaigia laikotarpį, grįžimas sukuria naują, neprarandant ankstesnio",()=>{
    const previous:Person={id:"test",createdAt:"2025-01-01T00:00:00Z",
      ...sample,employmentPeriods:[{startedAt:"2026-01-05"}]};
    const retired:PersonInput={...sample,status:"nebedirba",endedAt:"2026-04-10"};
    const closed=deriveEmploymentPeriods(previous,retired);
    expect(closed).toEqual([{startedAt:"2026-01-05",endedAt:"2026-04-10"}]);
    const rehire:Person={...previous,status:"nebedirba",endedAt:"2026-04-10",employmentPeriods:closed};
    expect(deriveEmploymentPeriods(rehire,{...sample,startedAt:"2026-10-18",endedAt:undefined}))
      .toEqual([{startedAt:"2026-01-05",endedAt:"2026-04-10"},{startedAt:"2026-10-18"}]);
  });
  it("senam profiliui nekuria išgalvotos įdarbinimo datos",()=>{
    const old:Person={id:"old",name:"DEMO",role:"darbuotojas",status:"aktyvus",notes:"",createdAt:"2026-10-18T00:00:00Z"};
    expect(deriveEmploymentPeriods(old,{...sample,startedAt:undefined})).toEqual([]);
  });
  it("mėnesinėje kaitoje skaičiuoja realias pradžias ir išėjimus, ne profilius",()=>{
    const p:Person={id:"p",createdAt:"2025-05-01T00:00:00Z",...sample,
      employmentPeriods:[{startedAt:"2026-07-02",endedAt:"2026-08-12"},{startedAt:"2026-10-05"}]};
    const rows=personnelMovementMonths([p],"2026-10-18");
    expect(rows.reduce((s,x)=>s+x.started,0)).toBe(2);
    expect(rows.reduce((s,x)=>s+x.left,0)).toBe(1);
  });
});
