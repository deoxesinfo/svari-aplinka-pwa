import type {AppState} from "./store";
export const CLOUD_BACKUP_FORMAT="svari-aplinka-supabase-json-v1";
/** Browser download initiated by administrator; NOT an automated, offsite or encrypted backup. */
export function buildCloudBackup(state:AppState){
 return {
  format:CLOUD_BACKUP_FORMAT,
  date:new Date().toISOString(),
  warning:"Konfidencialu: nešifruotas failas su galimais klientų ir durų kodo duomenimis. Saugokite jį privačiai. Nuotraukų failai neįtraukti.",
  data:{
   addresses:state.addresses,
   jobs:state.jobs,
   people:state.people,
   recruitmentLinks:state.recruitmentLinks
  }
 };
}
export function downloadCloudBackup(state:AppState){
 const backup=buildCloudBackup(state);
 const b=new Blob([JSON.stringify(backup,null,2)],{type:"application/json;charset=utf-8"});
 const u=URL.createObjectURL(b);
 const a=document.createElement("a");a.href=u;a.download="svari-aplinka-duomenys-"+backup.date.slice(0,10)+".json";
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);
}
