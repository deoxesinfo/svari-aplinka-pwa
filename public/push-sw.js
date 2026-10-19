/* Švari Aplinka Web Push service worker. Scope: /svari-aplinka-pwa/ */
self.addEventListener("push",(event)=>{
  let data={};
  try{data=event.data?.json()||{}}catch{/* Ignore invalid payload */}
  const title=typeof data.title==="string"?data.title.slice(0,120):"Švari Aplinka";
  const body=typeof data.body==="string"?data.body.slice(0,250):"Gautas naujas pranešimas";
  const route=typeof data.path==="string"&&/^\/#\/(?:pranesimai|darbai\/[0-9a-f-]{36})$/.test(data.path)
    ?data.path:"#/pranesimai";
  const tag=typeof data.id==="string"&&/^[0-9a-f-]{36}$/.test(data.id)?data.id:"sa-push";
  event.waitUntil(self.registration.showNotification(title,{
    body,tag,icon:"./icon.svg",badge:"./icon.svg",
    data:{route},renotify:false
  }));
});
self.addEventListener("notificationclick",(event)=>{
  event.notification.close();
  const route=event.notification.data?.route||"#/pranesimai";
  // Never follow arbitrary URLs supplied by a push payload.
  const suffix=typeof route==="string"&&/^\/#\/(?:pranesimai|darbai\/[0-9a-f-]{36})$/.test(route)
    ?route.slice(1):"#/pranesimai";
  const destination=self.registration.scope+suffix;
  event.waitUntil((async()=>{
    const list=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of list){
      if(client.url.startsWith(self.registration.scope)&&"focus"in client){
        await client.navigate(destination);return client.focus();
      }
    }
    return self.clients.openWindow(destination);
  })());
});
