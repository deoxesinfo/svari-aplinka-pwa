import {supabase} from "./supabase-client";

export type MessageKind="info"|"read"|"response";
export type StaffMessage={
 id:string;organization_id:string;sender_id:string;title:string;body:string;
 kind:MessageKind;scheduled_for:string;created_at:string;
};
export type MessageReceipt={
 id:string;organization_id:string;message_id:string;recipient_id:string;
 read_at:string|null;response:"sutinku"|"nesutinku"|null;responded_at:string|null;
};
export type InboxMessage={message:StaffMessage;receipt:MessageReceipt};
export type StaffRecipient={userId:string;name:string;role:string};

function assert<T>(data:T|null,error:{message:string}|null,description:string):T{
 if(error)throw new Error(description+": "+error.message);
 if(data===null)throw new Error(description);
 return data;
}
export async function listStaffRecipients(org:string):Promise<StaffRecipient[]>{
 const [membership,persons]=await Promise.all([
  supabase.from("sa_memberships").select("user_id,role").eq("organization_id",org).eq("active",true),
  supabase.from("sa_people").select("auth_user_id,data").eq("organization_id",org).not("auth_user_id","is",null)
 ]);
 const users=assert(membership.data,membership.error,"Nepavyko nuskaityti narių");
 const people=assert(persons.data,persons.error,"Nepavyko nuskaityti darbuotojų");
 const names=new Map(people.map(p=>[p.auth_user_id,String((p.data as {name?:unknown})?.name||"Darbuotojas")]));
 return users.filter(m=>["worker","admin"].includes(m.role)).map(m=>({
  userId:m.user_id,role:m.role,
  name:names.get(m.user_id)||(m.role==="admin"?"Administratorius (testas)":"Darbuotojas"),
 }));
}
export async function sendStaffMessage(org:string,params:{
 title:string;body:string;kind:MessageKind;recipients:string[];sendAt?:string;
}):Promise<string>{
 const title=params.title.trim(),body=params.body.trim();
 if(!title||title.length>120||!body||body.length>2000)throw new Error("Įveskite pavadinimą ir pranešimo tekstą");
 if(!params.recipients.length||params.recipients.length>50||new Set(params.recipients).size!==params.recipients.length)
  throw new Error("Pasirinkite 1–50 gavėjų");
 const {data,error}=await supabase.rpc("sa_send_staff_message",{
  p_org:org,p_title:title,p_body:body,p_kind:params.kind,
  p_recipients:params.recipients,p_schedule:params.sendAt||null,
 });
 return assert(data as string|null,error,"Nepavyko išsiųsti pranešimo");
}
export async function listSentStaffMessages(org:string):Promise<{messages:StaffMessage[];receipts:MessageReceipt[]}>{
 const {data,error}=await supabase.from("sa_staff_messages").select("*")
  .eq("organization_id",org).order("created_at",{ascending:false}).limit(100);
 const messages=assert(data,error,"Nepavyko gauti išsiųstų pranešimų") as StaffMessage[];
 if(!messages.length)return {messages,receipts:[]};
 const query=await supabase.from("sa_staff_message_receipts").select("*")
  .eq("organization_id",org).in("message_id",messages.map(m=>m.id)).limit(5000);
 const receipts=assert(query.data,query.error,"Nepavyko gauti gavėjų būsenų") as MessageReceipt[];
 return {messages,receipts};
}
export async function listStaffInbox(org:string):Promise<InboxMessage[]>{
 const {data:auth,error:authError}=await supabase.auth.getUser();
 if(authError||!auth.user)throw new Error("Reikia prisijungti");
 const result=await supabase.from("sa_staff_message_receipts").select("*")
  .eq("organization_id",org).eq("recipient_id",auth.user.id).limit(1000);
 const receipts=assert(result.data,result.error,"Nepavyko gauti pranešimų") as MessageReceipt[];
 if(!receipts.length)return [];
 const query=await supabase.from("sa_staff_messages").select("*")
  .eq("organization_id",org).in("id",receipts.map(r=>r.message_id));
 const messages=assert(query.data,query.error,"Nepavyko gauti pranešimų tekstų") as StaffMessage[];
 const map=new Map(messages.map(m=>[m.id,m]));
 return receipts.flatMap(r=>{
  const m=map.get(r.message_id);
  return m?[{message:m,receipt:r}]:[];
 }).sort((a,b)=>b.message.scheduled_for.localeCompare(a.message.scheduled_for));
}
export async function acknowledgeStaffMessage(org:string,receipt:string,reply?: "sutinku"|"nesutinku"){
 const {data,error}=await supabase.rpc("sa_ack_staff_message",{
  p_org:org,p_receipt:receipt,p_response:reply||null,
 });
 if(error||data!==true)throw new Error("Nepavyko patvirtinti. Patikrinkite ryšį arba pranešimo būseną.");
}
