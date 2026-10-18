import type { Address, Job, Person } from "./types";

const ms = (d:string) => Date.parse(d+"T00:00:00Z");
const iso = (date:Date) => date.toISOString().slice(0,10);
export const plusDays = (day:string,n:number) => iso(new Date(ms(day)+n*86400000));
export const inRange = (date:string|undefined,start:string,end:string) => !!date && date>=start && date<=end;
const created = (a:Address) => a.serviceStartedAt || a.createdAt.slice(0,10);
const ended = (a:Address) => a.serviceEndedAt;
export const activeObject = (a:Address) => !["nebeaptarnaujamas","sustabdytas"].includes(a.status || "aktyvus");

export function summaryAnalytics(addresses:Address[],jobs:Job[],days:number,today:string) {
  const start=plusDays(today,1-days);
  const current=addresses.filter(activeObject);
  const planned=jobs.filter(j=>inRange(j.date,start,today));
  const completed=jobs.filter(j=>inRange(j.completedAt?.slice(0,10),start,today));
  const stairwellDone=completed.filter(j=>j.type==="laiptine");
  const territoryDone=completed.filter(j=>j.type==="teritorija");
  return {
    start,today, active:current.length,
    stairwellBuildings:current.filter(a=>a.type!=="teritorija").length,
    entrances:current.filter(a=>a.type!=="teritorija").reduce((sum,a)=>sum+(a.entrances||0),0),
    territoryBuildings:current.filter(a=>a.type!=="laiptine").length,
    newObjects:addresses.filter(a=>inRange(created(a),start,today)).length,
    leftObjects:addresses.filter(a=>inRange(ended(a),start,today)).length,
    planned:planned.length,completed:completed.length,
    completedStairwell:stairwellDone.length,completedTerritory:territoryDone.length,
    completedInspections:completed.filter(j=>j.type==="patikrinimas").length,
    checkedBuildings:new Set(completed.map(j=>j.addressId)).size,
    overdue:jobs.filter(j=>j.status==="laukia"&&j.date<today).length,
    pending:planned.filter(j=>j.status==="laukia").length,
  };
}
export function workBuckets(jobs:Job[],days:number,today:string) {
  const start=plusDays(today,1-days),period=days===7?1:7, count=Math.ceil(days/period);
  const rows=Array.from({length:count},(_,i)=>{
    const day=plusDays(start,i*period);
    const end=plusDays(start,Math.min(days-1,(i+1)*period-1));
    return { label:days===7?day.slice(5):day.slice(5)+"–"+end.slice(5),planned:0,completed:0,stairwell:0,territory:0 };
  });
  const index=(date:string|undefined) => !inRange(date,start,today)?-1:Math.floor((ms(date!)-ms(start))/86400000/period);
  for(const j of jobs){
    const p=index(j.date);
    if(p>=0&&p<rows.length) rows[p].planned++;
    const c=index(j.completedAt?.slice(0,10));
    if(c>=0&&c<rows.length){
      rows[c].completed++;
      if(j.type==="laiptine")rows[c].stairwell++;
      if(j.type==="teritorija")rows[c].territory++;
    }
  }
  return rows;
}
export function objectChangeMonths(addresses:Address[],today:string) {
  const d=new Date(ms(today)),result:{month:string,added:number,left:number}[]=[];
  for(let i=5;i>=0;i--){
    const dt=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-i,1));
    const month=iso(dt).slice(0,7);
    const label=dt.toLocaleDateString("lt-LT",{month:"short",year:"2-digit",timeZone:"UTC"});
    result.push({month:label,added:addresses.filter(a=>created(a).slice(0,7)===month).length,left:addresses.filter(a=>ended(a)?.slice(0,7)===month).length});
  }
  return result;
}

/** Real start/end events are counted, not profile creation timestamps. */
export function personnelMovementMonths(people:Person[],today:string) {
  const d=new Date(ms(today));
  const rows:{month:string,started:number,left:number}[]=[];
  for(let i=5;i>=0;i--){
    const date=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-i,1));
    const prefix=iso(date).slice(0,7);
    const month=date.toLocaleDateString("lt-LT",{month:"short",year:"2-digit",timeZone:"UTC"});
    const entries=people.flatMap(p=>p.employmentPeriods?.length
      ? p.employmentPeriods
      : (p.role!=="kandidatas" && (p.startedAt||p.endedAt))?[{startedAt:p.startedAt,endedAt:p.endedAt}]:[]);
    rows.push({
      month,
      started:entries.filter(p=>p.startedAt?.slice(0,7)===prefix).length,
      left:entries.filter(p=>p.endedAt?.slice(0,7)===prefix).length
    });
  }
  return rows;
}
