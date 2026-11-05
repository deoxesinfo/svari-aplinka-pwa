/* Švari Aplinka Web Push service worker. Scope: /svari-aplinka-pwa/ */
const UUID="[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const INBOX_PATH=new RegExp("^\\/#\\/pranesimai\\?tab=gauti&message="+UUID+"$","i");\nconst SENT_PATH=new RegExp("^\\/#\\/pranesimai\\?tab=issiusti&message="+UUID+"(?:&receipt="+UUID+")?$","i");
const JOB_PATH=new RegExp("^\\/#\\/darbai\\/"+UUID+"$","i");
function safePath(value){
 if(typeof value!=="string")return "/#/pranesimai";
 if(value==="/#/pranesimai"||INBOX_PATH.test(value)||SENT_PATH.test(value)||JOB_PATH.test(value))return value;
 return "/#/pranesimai";
}
self.addEventListener("push",(event)=>{
 let data={};
 try{data=event.data?.json()||{}}catch{/* Ignore malformed payload */}
 const title=typeof data.title==="string"?data.title.slice(0,120):"Švari Aplinka";
 const body=typeof data.body==="string"?data.body.slice(0,250):"Gautas naujas pranešimas";
 const route=safePath(data.path);
 const tag=typeof data.id==="string"&&new RegExp("^"+UUID+"$","i").test(data.id)?data.id:"sa-push";
 event.waitUntil(self.registration.showNotification(title,{
  body,tag,icon:"./icon.svg",badge:"./icon.svg",
  data:{route},renotify:false
 }));
});
self.addEventListener("notificationclick",(event)=>{
 event.notification.close();
 // Never follow a URL, arbitrary route or query supplied by a Push payload.
 const suffix=safePath(event.notification.data?.route).slice(1);
 const destination=self.registration.scope+suffix;
 event.waitUntil((async()=>{
  const list=await self.clients.matchAll({type:"window",includeUncontrolled:true});
  for(const client of list){
   if(client.url.startsWith(self.registration.scope)&&"focus"in client){
    await client.navigate(destination);
    return client.focus();
   }
  }
  return self.clients.openWindow(destination);
 })());
});
