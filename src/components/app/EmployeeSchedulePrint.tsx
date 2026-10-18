import { createPortal } from "react-dom";
import type { Address, Job, Person } from "@/lib/types";
import type { DateRange } from "@/lib/employee-calendar";
import { JOB_TYPE_LABEL, STATUS_LABEL } from "@/lib/types";
import { fmtLong } from "@/lib/dates";
import { jobsWithinRange } from "@/lib/employee-calendar";

const scheduledTime=(job:Job)=>(job as Job & {startTime?:string}).startTime||"";
export function EmployeeSchedulePrint({person,jobs,addresses,range}:{
 person:Person;jobs:Job[];addresses:Address[];range:DateRange
}){
 if(typeof document==="undefined")return null;
 const addressById=new Map(addresses.map(a=>[a.id,a]));
 const rows=jobsWithinRange(jobs,range);
 return createPortal(<section id="sa-print-document" aria-label="Individualus darbuotojo grafikas">
   <header className="sa-print-heading">
     <div className="sa-print-brand">ŠVARI APLINKA · DARBO GRAFIKAS</div>
     <h1>{person.name}</h1>
     <p>{range.from===range.to?fmtLong(range.from):range.from+" – "+range.to}</p>
     <div className="sa-print-summary">
       <span>Viso: <strong>{rows.length}</strong></span>
       <span>Laiptinės: <strong>{rows.filter(j=>j.type==="laiptine").length}</strong></span>
       <span>Teritorijos: <strong>{rows.filter(j=>j.type==="teritorija").length}</strong></span>
     </div>
   </header>
   <table className="sa-print-table">
     <thead><tr><th>Data</th><th>Laikas</th><th>Adresas</th><th>Darbas</th><th>Būsena</th><th>Durų kodas</th></tr></thead>
     <tbody>{rows.map(job=>{
       const addr=addressById.get(job.addressId);
       return <tr key={job.id}>
         <td>{job.date}</td>
         <td>{scheduledTime(job)||"—"}</td>
         <td>{addr?addr.street+", "+addr.city:"Nežinomas adresas"}</td>
         <td>{JOB_TYPE_LABEL[job.type]}</td>
         <td>{STATUS_LABEL[job.status]}</td>
         <td>{addr?.accessCode?.trim()||"—"}</td>
       </tr>;
     })}</tbody>
   </table>
   {rows.length===0&&<p className="sa-print-empty">Šiam laikotarpiui darbų nėra.</p>}
   <footer className="sa-print-footer">
     KONFIDENCIALU · Durų kodai skirti tik įgaliotam darbuotojui.
   </footer>
 </section>,document.body);
}
