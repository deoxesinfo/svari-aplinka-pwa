import { afterEach,describe,expect,it } from "vitest";
import { cleanup,render } from "@testing-library/react";
import { EmployeeSchedulePrint } from "@/components/app/EmployeeSchedulePrint";
import type {Address,Job,Person} from "@/lib/types";

const person={id:"employee1",name:"Pavyzdinis darbuotojas",role:"darbuotojas"} as Person;
const address={id:"address1",street:"Pavyzdžio g. 1",city:"Kaunas",accessCode:"TEST-CODE-NOT-REAL"} as Address;
const job={id:"job1",addressId:"address1",type:"laiptine",date:"2026-10-19",status:"laukia",worker:person.name} as Job;
const range={from:"2026-10-19",to:"2026-10-25"};
afterEach(()=>{cleanup();document.querySelectorAll("#sa-print-document").forEach(node=>node.remove())});
describe("Individualaus A4 grafiko privatumas",()=>{
 it("neprideda durų kodų, kai pasirinkimas nepažymėtas",()=>{
  render(<EmployeeSchedulePrint person={person} jobs={[job]} addresses={[address]}
    range={range} includeDoorCodes={false}/>);
  const documentText=document.querySelector("#sa-print-document")?.textContent||"";
  expect(documentText).toContain("Pavyzdinis darbuotojas");
  expect(documentText).toContain("Pavyzdžio g. 1");
  expect(documentText).not.toContain("TEST-CODE-NOT-REAL");
  expect(documentText).toContain("Durų kodai neįtraukti");
 });
 it("durų kodą prideda tik aiškiai pažymėjus",()=>{
  render(<EmployeeSchedulePrint person={person} jobs={[job]} addresses={[address]}
    range={range} includeDoorCodes={true}/>);
  expect(document.querySelector("#sa-print-document")?.textContent).toContain("TEST-CODE-NOT-REAL");
 });
});
