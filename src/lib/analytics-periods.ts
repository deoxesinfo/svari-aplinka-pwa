import type { Address, Job, Person } from "./types";
export type Period = {start:string;end:string};
export type PeriodSummary = {
  planned:number;completed:number;stairwell:number;territory:number;inspections:number;
  newObjects:number;lostObjects:number;uniqueBuildings:number;hires:number;leaves:number;
};
export type Bucket={label:string;planned:number;completed:number;stairwell:number;territory:number;inspections:number;newObjects:number;lostObjects:number;hires:number;leaves:number};
const at=(iso:string)=>Date.parse(iso+"T00:00:00Z");
const iso=(timestamp:number)=>new Date(timestamp).toISOString().slice(0,10);
export const todayMinusDays=(today:string,days:number)=>iso(at(today)-86400000*days);
export function validPeriod(period:Period){return /^\d{4}-\d{2}-\d{2}$/.test(period.start)&&/^\d{4}-\d{2}-\d{2}$/.test(period.end)&&period.start<=period.end && !Number.isNaN(at(period.start))&&!Number.isNaN(at(period.end));}
const inside=(date:string|undefined,p:Period)=>!!date&&date>=p.start&&date<=p.end;
const startOfAddress=(a:Address)=>a.serviceStartedAt||a.createdAt?.slice(0,10);
const employment=(people:Person[])=>people.flatMap(person=>person.employmentPeriods?.length
  ? person.employmentPeriods
  : (person.role!=="kandidatas" && (person.startedAt||person.endedAt))
  ?[{startedAt:person.startedAt,endedAt:person.endedAt}]:[]);
export function periodSummary(addresses:Address[],jobs:Job[],people:Person[],p:Period):PeriodSummary{
 const planned=jobs.filter(j=>inside(j.date,p));
 const completed=jobs.filter(j=>inside(j.completedAt?.slice(0,10),p));
 const peoplePeriods=employment(people);
 return {
  planned:planned.length,completed:completed.length,
  stairwell:completed.filter(j=>j.type==="laiptine").length,
  territory:completed.filter(j=>j.type==="teritorija").length,
  inspections:completed.filter(j=>j.type==="patikrinimas").length,
  newObjects:addresses.filter(a=>inside(startOfAddress(a),p)).length,
  lostObjects:addresses.filter(a=>inside(a.serviceEndedAt,p)).length,
  uniqueBuildings:new Set(completed.map(j=>j.addressId)).size,
  hires:peoplePeriods.filter(e=>inside(e.startedAt,p)).length,
  leaves:peoplePeriods.filter(e=>inside(e.endedAt,p)).length
 };
}
function chooseSize(p:Period){
 const days=Math.max(1,Math.round((at(p.end)-at(p.start))/86400000)+1);
 return days<=31?"day":days<=180?"week":days<=1100?"month":days<=3650?"quarter":"year";
}
function addMonths(d:number,n:number){
 const dt=new Date(d);
 const original=dt.getUTCDate();
 dt.setUTCDate(1);
 dt.setUTCMonth(dt.getUTCMonth()+n);
 dt.setUTCDate(Math.min(original,new Date(Date.UTC(dt.getUTCFullYear(),dt.getUTCMonth()+1,0)).getUTCDate()));
 return dt.getTime();
}
export function periodBuckets(addresses:Address[],jobs:Job[],people:Person[],p:Period):Bucket[]{
 if(!validPeriod(p))return [];
 const unit=chooseSize(p);
 const end=at(p.end),buckets:Bucket[]=[];
 let cursor=at(p.start);
 // A maximum of 121 periods, independent of how much historical data exists.
 while(cursor<=end&&buckets.length<121){
  let next=unit==="day"?cursor+86400000:unit==="week"?cursor+7*86400000:addMonths(cursor,unit==="month"?1:unit==="quarter"?3:12);
  if(next<=cursor)break;
  const from=iso(cursor),to=iso(Math.min(end,next-86400000));
  const stats=periodSummary(addresses,jobs,people,{start:from,end:to});
  buckets.push({label:unit==="day"?from.slice(5):from.slice(0,7),...stats,uniqueBuildings:undefined} as Bucket);
  cursor=next;
 }
 return buckets;
}
export function compareBuckets(base:Bucket[],comparison:Bucket[]){
 return Array.from({length:Math.max(base.length,comparison.length)},(_,i)=>({
  ...base[i],label:String(i+1),
  compareCompleted:comparison[i]?.completed??0,
  comparePlanned:comparison[i]?.planned??0,
  compareStairwell:comparison[i]?.stairwell??0,
  compareTerritory:comparison[i]?.territory??0,
  compareNewObjects:comparison[i]?.newObjects??0,
  compareLostObjects:comparison[i]?.lostObjects??0,
  compareHires:comparison[i]?.hires??0,
  compareLeaves:comparison[i]?.leaves??0
 }));
}
