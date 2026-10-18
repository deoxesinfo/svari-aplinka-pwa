import { describe, expect, it } from "vitest";
import { mapsDirectionsUrl } from "@/lib/maps";
import { summaryAnalytics, workBuckets, objectChangeMonths } from "@/lib/analytics";
import type { Address, Job } from "@/lib/types";

const address = (id:string, status:"aktyvus"|"nebeaptarnaujamas",started:string,ended?:string):Address => ({
  id,street:"Pavyzdžio g. "+id,city:"Kaunas",type:"abu",entrances:2,createdAt:started+"T12:00:00Z",
  status,serviceStartedAt:started,serviceEndedAt:ended,
  instructions:"",accessCode:"DEMO",notes:""
});
const job=(id:string,addressId:string,type:Job["type"],date:string,completedAt?:string):Job=>({
  id,addressId,type,worker:"Testo darbuotojas",date,priority:"vidutine",instructions:"",
  status:completedAt?"atlikta":"laukia",inspection:null,notes:"",createdAt:date+"T09:00:00Z",
  comments:[],history:[],completedAt
});

describe("Google Maps navigacija",()=>{
  it("atidaro Google Maps directions su lietuvišku adresu ir dabartinės vietos pradžia",()=>{
    const url=new URL(mapsDirectionsUrl("Vytauto g. 10","Kaunas"));
    expect(url.origin).toBe("https://www.google.com");
    expect(url.pathname).toBe("/maps/dir/");
    expect(url.searchParams.get("destination")).toBe("Vytauto g. 10, Kaunas, Lietuva");
    expect(url.searchParams.get("travelmode")).toBe("driving");
    expect(url.searchParams.has("origin")).toBe(false);
  });
});

describe("Darbu ir objektu analitika",()=>{
  const addresses=[address("1","aktyvus","2026-10-10"),address("2","nebeaptarnaujamas","2026-09-05","2026-10-15")];
  const jobs=[job("j1","1","laiptine","2026-10-10","2026-10-11T13:00:00Z"),
    job("j2","1","teritorija","2026-10-13","2026-10-14T13:00:00Z"),
    job("j3","2","laiptine","2026-10-15")];
  it("atskiria unikalius namus, suplanuotus ir atliktus darbus bei objektų pokyčius",()=>{
    const a=summaryAnalytics(addresses,jobs,30,"2026-10-18");
    expect(a.active).toBe(1);
    expect(a.newObjects).toBe(1);
    expect(a.leftObjects).toBe(1);
    expect(a.entrances).toBe(2);
    expect(a.planned).toBe(3);
    expect(a.completed).toBe(2);
    expect(a.checkedBuildings).toBe(1);
    expect(a.overdue).toBe(1);
    expect(a.completedStairwell).toBe(1);
    expect(a.completedTerritory).toBe(1);
  });
  it("diagramoje užbaigimo ir planavimo datos laikomos atskirai",()=>{
    const rows=workBuckets(jobs,30,"2026-10-18");
    expect(rows.reduce((s,r)=>s+r.planned,0)).toBe(3);
    expect(rows.reduce((s,r)=>s+r.completed,0)).toBe(2);
  });
  it("mėnesio nauji ir atkrite skaičiuojami nepridubliuojant",()=>{
    const rows=objectChangeMonths(addresses,"2026-10-18");
    expect(rows.at(-1)?.added).toBe(1);
    expect(rows.at(-1)?.left).toBe(1);
  });
});
