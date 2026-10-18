import {describe,expect,it} from "vitest";
import { compareBuckets, periodBuckets, periodSummary, todayMinusDays, validPeriod } from "@/lib/analytics-periods";
import type {Address,Job,Person} from "@/lib/types";
const address=(id:string,started:string,ended?:string):Address=>({
 id,street:"Demo g. "+id,city:"Kaunas",type:"abu",status:ended?"nebeaptarnaujamas":"aktyvus",
 entrances:2,serviceStartedAt:started,serviceEndedAt:ended,notes:"",accessCode:"DEMO",instructions:"",
 createdAt:started+"T11:00:00Z"
});
const job=(id:string,adr:string,type:Job["type"],date:string,done?:string):Job=>({
 id,addressId:adr,type,worker:"Fiktyvus DEMO",date,priority:"vidutine",instructions:"",notes:"",
 createdAt:date+"T07:00:00Z",completedAt:done,status:done?"atlikta":"laukia",
 inspection:null,comments:[],history:[]
});
describe("V1.6 datu ir laikotarpiu analitika",()=>{
 const addresses=[address("a","2026-01-10"),address("b","2026-03-02","2026-09-15")];
 const jobs=[job("1","a","laiptine","2026-09-01","2026-09-07T16:00:00Z"),
   job("2","a","teritorija","2026-10-09","2026-10-11T08:00:00Z"),
   job("3","b","patikrinimas","2026-10-12")];
 const people:Person[]=[{
   id:"p",name:"Fiktyvus DEMO",role:"darbuotojas",status:"aktyvus",notes:"",createdAt:"2026-01-01T00:00:00Z",
   employmentPeriods:[{startedAt:"2026-03-04",endedAt:"2026-09-15"},{startedAt:"2026-10-08"}]
 }];
 it("patikrina intervalo ribas",()=>{
   expect(validPeriod({start:"2026-09-01",end:"2026-10-18"})).toBe(true);
   expect(validPeriod({start:"2026-10-18",end:"2026-09-01"})).toBe(false);
   expect(todayMinusDays("2026-10-18",1)).toBe("2026-10-17");
 });
 it("atlikti darbai skaiciuojami pagal atlikimo data, o suplanuoti pagal plana",()=>{
   const sep=periodSummary(addresses,jobs,people,{start:"2026-09-01",end:"2026-09-30"});
   const oct=periodSummary(addresses,jobs,people,{start:"2026-10-01",end:"2026-10-18"});
   expect(sep.planned).toBe(1);expect(sep.completed).toBe(1);expect(sep.lostObjects).toBe(1);expect(sep.leaves).toBe(1);
   expect(oct.planned).toBe(2);expect(oct.completed).toBe(1);expect(oct.uniqueBuildings).toBe(1);expect(oct.hires).toBe(1);
 });
 it("visos diagramos remiasi pasirinkto laikotarpio ivykiais",()=>{
   const a=periodBuckets(addresses,jobs,people,{start:"2026-10-01",end:"2026-10-18"});
   expect(a.reduce((sum,x)=>sum+x.completed,0)).toBe(1);
   expect(a.reduce((sum,x)=>sum+x.planned,0)).toBe(2);
   expect(a.reduce((sum,x)=>sum+x.hires,0)).toBe(1);
 });
 it("compare neperdaro originaliu duomenu",()=>{
   const a=periodBuckets(addresses,jobs,people,{start:"2026-09-01",end:"2026-09-30"});
   const b=periodBuckets(addresses,jobs,people,{start:"2026-10-01",end:"2026-10-18"});
   const copy=compareBuckets(a,b);
   expect(copy.some(x=>x.compareCompleted===1)).toBe(true);
   expect(a.some(x=>"compareCompleted" in x)).toBe(false);
 });
});
