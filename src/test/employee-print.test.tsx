import {afterEach,describe,expect,it} from "vitest";
import {cleanup,render} from "@testing-library/react";
import {EmployeeSchedulePrint} from "@/components/app/EmployeeSchedulePrint";
import type {Address,Job,Person} from "@/lib/types";
const person={id:"employee1",name:"Pavyzdinis darbuotojas",role:"darbuotojas"} as Person;
const address={id:"address1",street:"Pavyzdžio g. 1",city:"Kaunas",accessCode:"TEST-CODE-NOT-REAL"} as Address;
const job={id:"job1",addressId:"address1",type:"laiptine",date:"2026-10-19",status:"laukia",worker:person.name} as Job;
const range={from:"2026-10-19",to:"2026-10-25"};
afterEach(()=>{cleanup();document.querySelectorAll("#sa-print-document").forEach(node=>node.remove())});
describe("Administratoriaus A4 grafikas",()=>{
 it("automatiškai pateikia objekto informaciją į A4",()=>{
  render(<EmployeeSchedulePrint person={person} jobs={[job]} addresses={[address]} range={range}/>);
  const printed=document.querySelector("#sa-print-document")?.textContent||"";
  expect(printed).toContain("Pavyzdinis darbuotojas");
  expect(printed).toContain("Pavyzdžio g. 1");
  expect(printed).toContain("TEST-CODE-NOT-REAL");
  expect(printed).toContain("KONFIDENCIALU");
 });
 it("neprideda kito laikotarpio darbų",()=>{
  render(<EmployeeSchedulePrint person={person} jobs={[job,{...job,id:"outside",date:"2026-11-19",addressId:"address2"}]}
    addresses={[address,{...address,id:"address2",street:"Neturėtų būti matoma"}]} range={range}/>);
  expect(document.querySelector("#sa-print-document")?.textContent).not.toContain("Neturėtų būti matoma");
 });
});
