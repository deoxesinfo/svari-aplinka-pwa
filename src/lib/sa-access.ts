import { useSyncExternalStore } from "react";

export const SA_MODULES = [
  { key:"overview",name:"Apžvalga",path:"/" },
  { key:"calendar",name:"Kalendorius",path:"/kalendorius" },
  { key:"jobs",name:"Darbai",path:"/darbai" },
  { key:"addresses",name:"Adresai",path:"/adresai" },
  { key:"people",name:"Darbuotojai",path:"/darbuotojai" },
  { key:"messages",name:"Pranešimai",path:"/pranesimai" },
  { key:"analytics",name:"Analitika",path:"/analitika" },
  { key:"photos",name:"Nuotraukos",path:"/nuotraukos" },
  { key:"storage",name:"Saugykla",path:"/saugykla" },
  { key:"inspections",name:"Patikrinimai",path:"/patikrinimai" },
  { key:"changes",name:"Pakeitimai",path:"/pakeitimai" },
  { key:"history",name:"Istorija",path:"/istorija" },
  { key:"account",name:"Paskyra",path:"/paskyra" },
  { key:"settings",name:"Nustatymai",path:"/nustatymai" },
] as const;
export type SAModule = typeof SA_MODULES[number]["key"];
export type SAAccess = "none"|"view"|"edit";
export type SARole = "admin"|"manager"|"worker";
export type SAPermissionMap = Partial<Record<SAModule,SAAccess>>;

type ACL = { role:SARole|null; permissions:SAPermissionMap; revision:number };
let state:ACL={role:null,permissions:{},revision:0};
const listeners=new Set<()=>void>();
function subscribe(cb:()=>void){listeners.add(cb);return ()=>listeners.delete(cb)}
function snapshot(){return state}
export function useSAAccess(){return useSyncExternalStore(subscribe,snapshot,snapshot)}
export function setSAAccess(role:SARole,permissions:SAPermissionMap={}){
 state={role,permissions,revision:state.revision+1};
 listeners.forEach(cb=>cb());
}
export function clearSAAccess(){
 state={role:null,permissions:{},revision:state.revision+1};
 listeners.forEach(cb=>cb());
}
export function permissionFor(module:SAModule):SAAccess{
 if(module==="account"&&state.role)return "edit"; // signed-in user always controls own account
 if(state.role==="admin")return "edit";
 return state.permissions[module]||"none"; // fail-closed for unconfigured users
}
export function canView(module:SAModule):boolean{return permissionFor(module)!=="none"}
export function canEdit(module:SAModule):boolean{return permissionFor(module)==="edit"}
export function moduleForPath(path:string):SAModule|null{
 if(path==="/")return "overview";
 const item=SA_MODULES.find(m=>m.path!=="/"&&(path===m.path||path.startsWith(m.path+"/")));
 return item?.key||null;
}
export function allowedModules(map:SAPermissionMap,role:SARole):SAModule[]{
 return SA_MODULES.map(m=>m.key).filter(m=>m==="account"||role==="admin"||((map[m]??"none")!=="none"));
}
export const MODULE_FOR_TABLE:Record<string,SAModule>={
 sa_addresses:"addresses",sa_jobs:"jobs",sa_people:"people",
 sa_recruitment_links:"people",
};
