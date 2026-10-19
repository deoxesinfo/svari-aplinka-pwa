import { supabase } from "./supabase-client";
import type { PhotoMeta, PhotoTag } from "./types";

/** Explicit release gate: false until Worker, policy, GPS and end-to-end QA are approved. */
/** Only an explicitly built one-photo pilot UI may expose R2 controls; default builds stay OFF. */
export const CLOUD_R2_PHOTOS_READY=import.meta.env.VITE_SA_R2_PILOT==="admin-one-photo";
export const R2_WORKER_URL="https://svari-aplinka-photos.svariaplinka-lt.workers.dev";
/** User access token only. Worker validates JWT and performs RLS-bound reads. */
async function headers(org:string){
 const {data,error}=await supabase.auth.getSession();
 const token=data.session?.access_token;
 if(error||!token)throw Error("Prisijunkite iš naujo");
 return {authorization:"Bearer "+token,"x-organization-id":org};
}
async function checked(res:Response){
 if(!res.ok){
  const value=await res.json().catch(()=>({error:"UNKNOWN_ERROR"})) as {error?:string};
  throw Error("Nuotraukos API klaida ("+res.status+"): "+(value.error||"UNKNOWN_ERROR"));
 }
 return res;
}
export async function downloadR2Photo(org:string,id:string,kind:"full"|"thumb"){
 const h=await headers(org);
 const r=await checked(await fetch(R2_WORKER_URL+"/v1/photos/"+encodeURIComponent(id)+"/"+kind,{
  headers:h,cache:"no-store"
 }));
 return r.blob();
}
export async function uploadR2Photo(
 org:string, addressId:string, jobId:string|undefined, tag:PhotoTag,
 full:Blob, thumb:Blob, width:number,height:number
):Promise<PhotoMeta>{
 const f=new FormData();
 f.set("addressId",addressId);
 if(jobId)f.set("jobId",jobId);
 f.set("tag",tag);f.set("width",String(width));f.set("height",String(height));
 const ext=(b:Blob)=>b.type==="image/jpeg"?"jpg":"webp";
 f.set("full",full,"full."+ext(full));f.set("thumb",thumb,"thumb."+ext(thumb));
 const r=await checked(await fetch(R2_WORKER_URL+"/v1/photos",{
   method:"POST",headers:await headers(org),body:f,cache:"no-store"
 }));
 return r.json() as Promise<PhotoMeta>;
}
