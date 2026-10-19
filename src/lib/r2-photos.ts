import { supabase } from "./supabase-client";
import type { PhotoMeta, PhotoTag } from "./types";

/** Explicit release gate: false until Worker, policy, GPS and end-to-end QA are approved. */
/** Only an explicitly built one-photo pilot UI may expose R2 controls; default builds stay OFF. */
export const R2_PILOT_JOB_ID=import.meta.env.VITE_SA_R2_PILOT_JOB_ID||"";
export const CLOUD_R2_PHOTOS_READY=
 import.meta.env.VITE_SA_R2_PHOTOS==="enabled" ||
 (import.meta.env.VITE_SA_R2_PILOT==="admin-one-photo"
  && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(R2_PILOT_JOB_ID));
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
export type LocationFix={latitude:number;longitude:number;accuracy:number};
export type GpsCheck={ok:boolean;radius:number;distanceMeters:number;accuracyMeters:number};
/** A read-only, stateless pre-camera GPS check. No session/token/time limit. */
export async function verifyR2Gps(org:string,jobId:string,addressId:string,fix:LocationFix):Promise<GpsCheck>{
 const response=await checked(await fetch(R2_WORKER_URL+"/v1/gps/verify",{
  method:"POST",headers:{...await headers(org),"content-type":"application/json"},
  body:JSON.stringify({jobId,addressId,...fix}),cache:"no-store"
 }));
 return response.json() as Promise<GpsCheck>;
}
export async function uploadR2Photo(
 org:string, addressId:string, jobId:string|undefined, tag:PhotoTag,
 full:Blob, thumb:Blob, width:number,height:number,gps?:LocationFix,overrideReason?:string
):Promise<PhotoMeta>{
 const f=new FormData();
 f.set("addressId",addressId);
 if(jobId)f.set("jobId",jobId);
 f.set("tag",tag);f.set("width",String(width));f.set("height",String(height));
 if(gps){
  f.set("gpsLatitude",String(gps.latitude));
  f.set("gpsLongitude",String(gps.longitude));
  f.set("gpsAccuracy",String(gps.accuracy));
 }
 if(overrideReason)f.set("gpsOverrideReason",overrideReason);
 const ext=(b:Blob)=>b.type==="image/jpeg"?"jpg":"webp";
 f.set("full",full,"full."+ext(full));f.set("thumb",thumb,"thumb."+ext(thumb));
 const r=await checked(await fetch(R2_WORKER_URL+"/v1/photos",{
   method:"POST",headers:await headers(org),body:f,cache:"no-store"
 }));
 return r.json() as Promise<PhotoMeta>;
}

/** Employee-only completion: the Worker checks own job, fresh GPS position and
 * Supabase's narrow RPC. Never mutate the entire job JSON from the browser. */
export async function completeR2AssignedJob(org:string,jobId:string,addressId:string,gps:LocationFix,note:string):Promise<void>{
 await checked(await fetch(R2_WORKER_URL+"/v1/jobs/"+encodeURIComponent(jobId)+"/complete",{
  method:"POST",headers:{...await headers(org),"content-type":"application/json"},
  body:JSON.stringify({addressId,...gps,note}),cache:"no-store"
 }));
}
