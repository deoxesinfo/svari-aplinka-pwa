export type GpsRadius=30|50|100;
export type LocationResult={
  passed:boolean;distanceMeters:number;accuracyMeters:number;checkedAt:string;
  targetLatitude:number;targetLongitude:number;reason?:string
};
const radians=(x:number)=>x*Math.PI/180;
/** Ground distance without sending device coordinates to a server. */
export function distanceMeters(lat1:number,lon1:number,lat2:number,lon2:number):number{
  const earth=6371000,dLat=radians(lat2-lat1),dLon=radians(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(radians(lat1))*Math.cos(radians(lat2))*Math.sin(dLon/2)**2;
  return 2*earth*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
export function gpsResult(input:{
 latitude:number;longitude:number;accuracy:number;targetLatitude:number;targetLongitude:number;radius:GpsRadius
},checkedAt=new Date().toISOString()):LocationResult{
  const dist=Math.round(distanceMeters(input.latitude,input.longitude,input.targetLatitude,input.targetLongitude));
  const accuracy=Math.round(input.accuracy);
  const accurate=Number.isFinite(accuracy)&&accuracy>0&&accuracy<=Math.min(50,input.radius);
  const passed=accurate&&dist<=input.radius;
  const reason=!accurate?"GPS netikslus – pakartokite matavimą":dist>input.radius?"Esate už patikros atstumo ribos":undefined;
  return {passed,distanceMeters:dist,accuracyMeters:accuracy,
    checkedAt,targetLatitude:input.targetLatitude,targetLongitude:input.targetLongitude,reason};
}
export function validGpsForCompletion(result:LocationResult|undefined,target:{latitude?:number;longitude?:number},
  now=Date.now()):boolean{
  return Boolean(result?.passed&&target.latitude===result.targetLatitude&&target.longitude===result.targetLongitude
   &&Number.isFinite(Date.parse(result.checkedAt))
   &&now-Date.parse(result.checkedAt)>=0&&now-Date.parse(result.checkedAt)<=10*60*1000);
}
