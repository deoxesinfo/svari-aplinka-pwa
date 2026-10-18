import {beforeEach,afterEach,describe,expect,it} from "vitest";
import {act,renderHook} from "@testing-library/react";
import {addAddress,addJob,addPhotoMeta,archiveAddress,archiveJob,restoreAddress,restoreJob,deleteAddress,deleteJob,resetDemo,useAppState} from "@/lib/store";
import {addDays,todayISO} from "@/lib/dates";
const addressInput={
 street:"Vienetinių testų g. 100",city:"Kaunas",status:"aktyvus" as const,type:"abu" as const,
 entrances:2,isPriority:false,stairwellVisitsPerWeek:2,territoryVisitsPerWeek:1,
 instructions:"",accessCode:"",notes:""
};
const workInput=(addressId:string)=>({
 addressId,type:"laiptine" as const,worker:"Pavyzdinis darbuotojas",date:addDays(todayISO(),1),
 priority:"vidutine" as const,instructions:"",status:"laukia" as const,notes:""
});
describe("V2.2.3 saugus archyvavimas",()=>{
 beforeEach(async()=>{await resetDemo()});
 afterEach(async()=>{await resetDemo()});
 it("leidžia archyvuoti dar neatliktą darbą ir jį atkurti",()=>{
   const {result}=renderHook(()=>useAppState());
   let a!:ReturnType<typeof addAddress>,job!:ReturnType<typeof addJob>;
   act(()=>{a=addAddress(addressInput);job=addJob(workInput(a.id));});
   act(()=>expect(archiveJob(job.id)).toBe(true));
   expect(result.current.jobs.find(j=>j.id===job.id)?.archivedAt).toBeTruthy();
   act(()=>expect(restoreJob(job.id)).toBe(true));
   expect(result.current.jobs.find(j=>j.id===job.id)?.archivedAt).toBeUndefined();
 });
 it("archivuoja būsimus darbus, o atkūrus adresą juos grąžina",()=>{
   const {result}=renderHook(()=>useAppState());
   let a!:ReturnType<typeof addAddress>,job!:ReturnType<typeof addJob>;
   act(()=>{a=addAddress(addressInput);job=addJob(workInput(a.id));});
   act(()=>expect(archiveAddress(a.id)).toBe(true));
   expect(result.current.addresses.find(x=>x.id===a.id)?.status).toBe("sustabdytas");
   expect(result.current.jobs.find(j=>j.id===job.id)?.archivedAt).toBeTruthy();
   act(()=>expect(restoreAddress(a.id)).toBe(true));
   expect(result.current.addresses.find(x=>x.id===a.id)?.status).toBe("aktyvus");
   expect(result.current.jobs.find(j=>j.id===job.id)?.archivedAt).toBeUndefined();
 });
 it("minkštas adresų trynimas neištrina susietų darbų ar nuotraukų",()=>{
   const {result}=renderHook(()=>useAppState());
   let a!:ReturnType<typeof addAddress>,job!:ReturnType<typeof addJob>;
   act(()=>{
     a=addAddress(addressInput);
     job=addJob(workInput(a.id));
     addPhotoMeta({id:crypto.randomUUID(),addressId:a.id,jobId:job.id,
       createdAt:new Date().toISOString(),width:60,height:60,size:100,type:"image/webp"});
   });
   act(()=>expect(deleteAddress(a.id)).toBe(true));
   expect(result.current.addresses.find(x=>x.id===a.id)?.deletedAt).toBeTruthy();
   expect(result.current.jobs.find(j=>j.id===job.id)).toBeDefined();
   expect(result.current.photos.some(p=>p.addressId===a.id)).toBe(true);
   expect(restoreAddress(a.id)).toBe(false);
 });
 it("minkštai pašalintas darbas lieka auditui, bet nebeatkuriamas",()=>{
   const {result}=renderHook(()=>useAppState());
   let a!:ReturnType<typeof addAddress>,job!:ReturnType<typeof addJob>;
   act(()=>{a=addAddress(addressInput);job=addJob(workInput(a.id));});
   act(()=>expect(deleteJob(job.id)).toBe(true));
   expect(result.current.jobs.find(x=>x.id===job.id)?.deletedAt).toBeTruthy();
   expect(restoreJob(job.id)).toBe(false);
 });
});
