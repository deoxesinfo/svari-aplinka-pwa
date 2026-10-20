import {supabase} from "./supabase-client";

export type MessageKind="info"|"read"|"response";
export type StaffMessage={
 id:string;organization_id:string;sender_id:string;title:string;body:string;
 kind:MessageKind;scheduled_for:string;created_at:string;
};
export type MessageReceipt={
 id:string;organization_id:string;message_id:string;recipient_id:string;
 read_at:string|null;response:"sutinku"|"nesutinku"|null;responded_at:string|null;
 reply_text?:string|null;replied_at?:string|null;hidden_at?:string|null;purged_at?:string|null;
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
 const id=assert(data as string|null,error,"Nepavyko išsiųsti pranešimo");
 // Best-effort immediate Web Push; messages still deliver to inbox even if Push is disabled.
 void supabase.functions?.invoke?.("sa-push-dispatch",{body:{action:"dispatch",organizationId:org}})?.catch(()=>{});
 return id;
}
export async function listSentStaffMessages(org:string):Promise<{messages:StaffMessage[];receipts:MessageReceipt[]}>{
 const {data,error}=await supabase.from("sa_staff_messages").select("*")
  .eq("organization_id",org).order("created_at",{ascending:false}).limit(100);
 const messages=assert(data,error,"Nepavyko gauti išsiųstų pranešimų") as StaffMessage[];
 if(!messages.length)return {messages,receipts:[]};
 const query=await supabase.from("sa_staff_message_receipts").select("*")
  .eq("organization_id",org).in("message_id",messages.map(m=>m.id)).limit(5000);
 const receipts=assert(query.data,query.error,"Nepavyko gauti gavėjų būsenų") as MessageReceipt[];
 const deleted=await supabase.from("sa_staff_message_purge_audit")
  .select("*").eq("organization_id",org).in("message_id",messages.map(m=>m.id)).limit(5000);
 const audits=assert(deleted.data,deleted.error,"Nepavyko gauti pašalintų gavėjų audito") as {
  id:string;organization_id:string;message_id:string;recipient_id:string;
  read_at:string|null;response:"sutinku"|"nesutinku"|null;responded_at:string|null;
  replied_at:string|null;purged_at:string;
 }[];
 return {messages,receipts:[...receipts,...audits.map(r=>({
  ...r,reply_text:null,hidden_at:null,
 }))]};
}
export async function listStaffInbox(org:string,view:"gauti"|"trash"="gauti"):Promise<InboxMessage[]>{
 const {data:auth,error:authError}=await supabase.auth.getUser();
 if(authError||!auth.user)throw new Error("Reikia prisijungti");
 const result=await supabase.from("sa_staff_message_receipts").select("*")
  .eq("organization_id",org).eq("recipient_id",auth.user.id).limit(1000);
 const receipts=(assert(result.data,result.error,"Nepavyko gauti pranešimų") as MessageReceipt[])
  .filter(r=>view==="trash"?!!r.hidden_at:!r.hidden_at);
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

/** One short acknowledgement reply, separate from formal consent / refusal. */
export async function replyToStaffMessage(org:string,receiptId:string,text:string){
 const reply=text.trim();
 if(!reply||reply.length>300)throw new Error("Atsakymas turi būti 1–300 simbolių");
 const {data,error}=await supabase.rpc("sa_reply_staff_message",{
  p_org:org,p_receipt:receiptId,p_text:reply,
 });
 if(error||data!==true)throw new Error(error?.message||"Nepavyko išsaugoti atsakymo");
}
/** Recipient-only soft hiding. Original message and admin read/reply audit stay intact. */
export async function hideStaffMessage(org:string,receiptId:string,hide=true){
 const {data,error}=await supabase.rpc("sa_hide_staff_message",{
  p_org:org,p_receipt:receiptId,p_hide:hide,
 });
 if(error||data!==true)throw new Error(error?.message||"Nepavyko pakeisti pranešimo būsenos");
}

/** Explicit irreversible deletion only for your OWN message receipt, already in trash. */
export async function purgeOwnStaffMessage(org:string,receiptId:string):Promise<void>{
 const {data,error}=await supabase.rpc("sa_purge_own_staff_message",{
  p_org:org,p_receipt:receiptId,
 });
 if(error||data!==true)throw new Error(error?.message||"Pranešimo galutinai pašalinti nepavyko");
}
