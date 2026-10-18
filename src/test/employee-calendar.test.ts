import {describe,it,expect} from "vitest";
import {calendarRange,employeeJobs,jobsWithinRange,shiftCalendarMonth} from "@/lib/employee-calendar";
import type {Job,Person} from "@/lib/types";
const workers=[{id:"p-a",name:"Asta",role:"darbuotojas"},{id:"p-b",name:"Asta",role:"darbuotojas"}] as Person[];
const jobs=[
 {id:"a",date:"2026-10-19",worker:"Asta",assignedPersonId:"p-a",addressId:"addr-1"},
 {id:"b",date:"2026-10-20",worker:"Asta",assignedPersonId:"p-b",addressId:"addr-2"},
 {id:"c",date:"2026-10-21",worker:"Asta",addressId:"addr-3"},
 {id:"d",date:"2026-11-02",worker:"Asta",assignedPersonId:"p-a",addressId:"addr-4"}
] as Job[];
describe("Darbuotojo grafiko atvaizdavimas",()=>{
 it("atskiria vienodų vardų paskyras pagal person ID",()=>{
  expect(employeeJobs(jobs,workers[0],workers).map(j=>j.id)).toEqual(["a","d"]);
  expect(employeeJobs(jobs,workers[1],workers).map(j=>j.id)).toEqual(["b"]);
 });
 it("seną vien vardu priskirtą darbą rodo tik kai vardas unikalus",()=>{
  expect(employeeJobs(jobs,workers[0],[workers[0]]).map(j=>j.id)).toEqual(["a","c","d"]);
 });
 it("archyvuoti ar ištrinti darbai nepatenka į aktyvų grafiką",()=>{
  const archive={...jobs[0],archivedAt:"2026-10-20T10:00:00Z"};
  const deleted={...jobs[1],deletedAt:"2026-10-20T10:00:00Z"};
  const visible=jobs[2];
  expect(jobsWithinRange([archive,deleted,visible],{from:"2026-10-19",to:"2026-10-31"}).map(j=>j.id)).toEqual(["c"]);
 });
 it("vieno darbuotojo savaitė prasideda pirmadienį",()=>{
  expect(calendarRange("2026-10-18","savaite")).toEqual({from:"2026-10-12",to:"2026-10-18"});
 });
 it("mėnesio spausdinimas neįtraukia kitų mėnesių dienų",()=>{
  expect(calendarRange("2026-10-18","menuo")).toEqual({from:"2026-10-01",to:"2026-10-31"});
  expect(jobsWithinRange(jobs,calendarRange("2026-10-18","menuo")).map(j=>j.id)).toEqual(["a","b","c"]);
 });
 it("mėnesio perjungimas neiššoka iš trumpesnio mėnesio",()=>{
  expect(shiftCalendarMonth("2026-01-31",1)).toBe("2026-02-28");
 });
 it("dienai atrenka tik datuotus darbus",()=>{
  expect(jobsWithinRange(jobs,calendarRange("2026-10-20","diena")).map(j=>j.id)).toEqual(["b"]);
 });
});
