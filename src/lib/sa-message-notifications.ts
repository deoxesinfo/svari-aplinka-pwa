import {supabase} from "./supabase-client";

/** A notification is read only by its own recipient, enforced again by RPC/RLS. */
export async function markOwnNotificationRead(org:string,noticeId:string):Promise<void>{
 const {data,error}=await supabase.rpc("sa_mark_own_notification_read",{
  p_org:org,p_notice:noticeId,
 });
 if(error||data!==true)throw new Error(error?.message||"Nepavyko pažymėti pranešimo perskaitytu");
 window.dispatchEvent(new Event("sa-message-updated"));
}

/** A deep link to a message confirms the sender opened that specific reply.
 * No other conversation is changed, and no ownership is inferred from URL alone.
 */
export async function markOpenedMessageReplies(org:string,messageId:string):Promise<number>{
 const {data,error}=await supabase.from("sa_notifications")
  .select("id").eq("organization_id",org).eq("related_message_id",messageId)
  .eq("kind","staff_reply").is("read_at",null).limit(100);
 if(error)throw new Error("Nepavyko patikrinti atsakymų pranešimų: "+error.message);
 let count=0;
 for(const n of data||[]){
  await markOwnNotificationRead(org,n.id as string);
  count++;
 }
 return count;
}
