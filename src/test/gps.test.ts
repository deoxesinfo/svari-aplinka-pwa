import {describe,expect,it} from "vitest";
import {distanceMeters,gpsResult,validGpsForCompletion} from "@/lib/gps";
describe("V2.0 pasirenkama darbo vietos GPS patikra",()=>{
 const target={latitude:54.90,longitude:23.90};
 it("pagal tašką be poslinkio grąžina apie 0 m",()=>expect(distanceMeters(54.9,23.9,54.9,23.9)).toBeLessThan(0.001));
 it("arti ir tiksliai leidžia, bet netiksliai – ne",()=>{
   const good=gpsResult({latitude:54.9,longitude:23.9,accuracy:10,targetLatitude:54.9,targetLongitude:23.9,radius:50});
   expect(good.passed).toBe(true);expect(validGpsForCompletion(good,target)).toBe(true);
   expect(gpsResult({latitude:54.9,longitude:23.9,accuracy:250,targetLatitude:54.9,targetLongitude:23.9,radius:50}).passed).toBe(false);
 });
 it("už ribos nepatvirtina, net jei GPS tikslus",()=>{
   expect(gpsResult({latitude:54.91,longitude:23.90,accuracy:8,targetLatitude:54.9,targetLongitude:23.9,radius:50}).passed).toBe(false);
 });
 it("senas arba kitos vietos patikrinimas netinka",()=>{
  const now=Date.now();
  const old=gpsResult({latitude:54.9,longitude:23.9,accuracy:5,targetLatitude:54.9,targetLongitude:23.9,radius:30},new Date(now-700000).toISOString());
  expect(validGpsForCompletion(old,target,now)).toBe(false);
  expect(validGpsForCompletion({...old,checkedAt:new Date(now).toISOString()},{latitude:54.9,longitude:23.91},now)).toBe(false);
 });
});
