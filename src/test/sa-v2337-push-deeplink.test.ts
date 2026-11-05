import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {describe,expect,it,vi} from "vitest";

const id="b33d1594-08dd-46f4-a78d-d54a052a3f21";
function buildWorker(){
 const listeners:Record<string,(event:any)=>void>={};
 const showNotification=vi.fn().mockResolvedValue(undefined);
 const openWindow=vi.fn().mockResolvedValue(undefined);
 const worker={
  registration:{scope:"https://example.com/svari-aplinka-pwa/",showNotification},
  clients:{matchAll:async()=>[],openWindow},
  addEventListener:(name:string,fn:(event:any)=>void)=>{listeners[name]=fn},
 };
 runInNewContext(readFileSync("public/push-sw.js","utf8"),{self:worker});
 return {listeners,showNotification,openWindow};
}
describe("ŠA V2.3.37 Push path allowlist",()=>{
 it("retains only exact received/sent message deep links",()=>{
  const {listeners,showNotification}=buildWorker();
  const send=(path:string)=>{
   listeners.push({data:{json:()=>({title:"Pranešimas",path})},waitUntil:()=>{}});
   return showNotification.mock.lastCall?.[1].data.route;
  };
  expect(send("/#/pranesimai?tab=issiusti&message="+id))
   .toBe("/#/pranesimai?tab=issiusti&message="+id);
  expect(send("/#/pranesimai?tab=gauti&message="+id))
   .toBe("/#/pranesimai?tab=gauti&message="+id);
  expect(send("https://attacker.example/?cookie=secret")).toBe("/#/pranesimai");
  expect(send("/#/pranesimai?tab=issiusti&message="+id+"&admin=true")).toBe("/#/pranesimai");
 });
 it("on click opens only the allowed same-origin path",async()=>{
  const {listeners,openWindow}=buildWorker();
  let job:Promise<unknown>|undefined;
  listeners.notificationclick({
   notification:{data:{route:"https://attacker.example/"},close:vi.fn()},
   waitUntil:(p:Promise<unknown>)=>{job=p},
  });
  await job;
  expect(openWindow).toHaveBeenCalledWith("https://example.com/svari-aplinka-pwa/#/pranesimai");
 });
});
