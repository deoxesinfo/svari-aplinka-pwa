/** Cross-platform PWA geolocation. Websites cannot enable OS location settings. */
export type LocationFix = {latitude:number;longitude:number;accuracy:number};
export function locationErrorMessage(error:unknown):string{
 const e=error as {code?:number;message?:string}|null;
 if(e?.code===1)return "Vietos prieiga uždrausta. iPhone: Settings → Privacy & Security → Location Services → naršyklė → While Using. Android: Settings → Location ir naršyklės leidimai.";
 if(e?.code===2)return "Telefono vieta nenustatoma. Įjunkite Location Services (GPS), išeikite į lauką ir bandykite vėl.";
 if(e?.code===3)return "Nepavyko laiku nustatyti vietos. Patikrinkite internetą, GPS ir bandykite dar kartą.";
 return "Vietos nustatyti nepavyko. Patikrinkite telefono GPS ir naršyklės leidimus.";
}
/** Always requests fresh device coordinates; no background location tracking. */
export function currentLocation():Promise<LocationFix>{
 if(!navigator.geolocation)return Promise.reject(new Error("Naršyklė nepalaiko GPS. Naudokite Safari arba Chrome su įjungta vietos prieiga."));
 return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(
  p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy}),
  e=>reject(new Error(locationErrorMessage(e))),
  {enableHighAccuracy:true,timeout:15000,maximumAge:0}
 ));
}
/** Permissions API availability varies (notably iOS). Never assume 'granted' means GPS is ON. */
export async function locationPermissionState():Promise<"granted"|"prompt"|"denied"|"unknown">{
 try{
  if(!navigator.permissions?.query)return "unknown";
  const permission=await navigator.permissions.query({name:"geolocation"});
  return permission.state;
 }catch{return "unknown";}
}
