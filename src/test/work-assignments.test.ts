import {describe,it,expect} from "vitest";
import {validateDraft,formatDays,type AssignmentDraft} from "@/lib/work-assignments";
import type {Person,Address} from "@/lib/types";
const person={id:"p",name:"Testas",role:"darbuotojas",status:"aktyvus"} as Person;
const address={id:"a",type:"abu",status:"aktyvus"} as Address;
const draft:AssignmentDraft={
 address_id:"a",person_id:"p",recurrence:"weekly",service_types:["laiptine","teritorija"],
 stair_days:[1,3,5],yard_days:[4],single_date:null,start_date:"2026-10-18",
 start_time:"09:00",travel_mode:"public",company_pass:true,pass_valid_until:null,notes:""
};
describe("V2.1 pasirinkimai",()=>{
 it("priima dvi paslaugas su skirtingomis savaitės dienomis",()=>{
  expect(validateDraft(draft,[person],[address],"2026-10-18")).toBeNull();
  expect(formatDays(draft.stair_days)).toBe("Pr, Tr, Pn");
 });
 it("neleidžia nuolatinės laiptinės be pasirinktų dienų",()=>{
  expect(validateDraft({...draft,stair_days:[]},[person],[address],"2026-10-18")).toContain("laiptinių");
 });
 it("vienkartinis darbas turi datą",()=>{
  expect(validateDraft({...draft,recurrence:"once",single_date:"2026-10-19",stair_days:[],yard_days:[]},[person],[address],"2026-10-18")).toBeNull();
 });
 it("nesuteikia leidimo archyvuotam darbuotojui",()=>{
  expect(validateDraft(draft,[{...person,status:"nebedirba"}],[address],"2026-10-18")).toContain("aktyvų");
 });
 it("bilietą gali suteikti tik viešajam transportui",()=>{
  expect(validateDraft({...draft,travel_mode:"self"},[person],[address],"2026-10-18")).toContain("Nuolatinis bilietas");
 });
});
