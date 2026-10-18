import type { Job, Person } from "./types";
import { addDays, parseISO, startOfWeek } from "./dates";

export type CalendarMode="diena"|"savaite"|"menuo";
export type DateRange={from:string;to:string};
const iso=(date:Date)=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");

/** Scheduled dates, not carried-over copies, form the printable schedule. */
export function calendarRange(day:string,mode:CalendarMode):DateRange{
  if(mode==="diena")return {from:day,to:day};
  if(mode==="savaite"){const from=startOfWeek(day);return {from,to:addDays(from,6)};}
  const selected=parseISO(day);
  const from=iso(new Date(selected.getFullYear(),selected.getMonth(),1));
  const to=iso(new Date(selected.getFullYear(),selected.getMonth()+1,0));
  return {from,to};
}

/** IDs are authoritative. Name fallback exists only for legacy jobs without a person ID. */
export function employeeJobs(jobs:Job[],person:Person|undefined,allPeople:Person[]=[]):Job[]{
  if(!person)return jobs.filter(j=>!j.archivedAt&&!j.deletedAt);
  const sameNameCount=allPeople.filter(p=>p.role==="darbuotojas"&&p.name===person.name).length;
  return jobs.filter(job=>{
    if(job.archivedAt||job.deletedAt)return false;
    const assigned=(job as Job & {assignedPersonId?:string}).assignedPersonId;
    if(assigned)return assigned===person.id;
    // Legacy assignments use names; don't guess when workers have identical names.
    return sameNameCount<=1&&job.worker===person.name;
  });
}
export function jobsWithinRange(jobs:Job[],range:DateRange):Job[]{
  return jobs.filter(j=>!j.archivedAt&&!j.deletedAt&&j.date>=range.from&&j.date<=range.to)
    .sort((a,b)=>a.date.localeCompare(b.date)
      ||String((a as Job & {startTime?:string}).startTime||"").localeCompare(String((b as Job & {startTime?:string}).startTime||""))
      ||a.addressId.localeCompare(b.addressId));
}
export function shiftCalendarMonth(day:string,amount:number):string{
 const d=parseISO(day);
 const first=new Date(d.getFullYear(),d.getMonth()+amount,1);
 const last=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();
 return iso(new Date(first.getFullYear(),first.getMonth(),Math.min(d.getDate(),last)));
}
