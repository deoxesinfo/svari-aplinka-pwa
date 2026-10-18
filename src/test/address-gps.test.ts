import {describe,it,expect} from "vitest";
import {hasConfirmedPin,addressReference,needsGpsForPhotos} from "@/lib/address-gps";
describe("Adreso GPS tvirtinimas",()=>{
 const loc={street:"Tunelio g. 22",city:"Kaunas",latitude:54.9,longitude:23.9,gpsProtectionEnabled:true,gpsReference:addressReference("Tunelio g. 22","Kaunas"),gpsLocationConfirmed:true};
 it("tvirtinta piną naudoja tik tam pačiam adresui",()=>{
  expect(hasConfirmedPin(loc)).toBe(true);expect(hasConfirmedPin({...loc,street:"Tunelio g. 24"})).toBe(false);
 });
 it("neleidžia nepatvirtinto žymeklio",()=>expect(hasConfirmedPin({...loc,gpsLocationConfirmed:false})).toBe(false));
 it("GPS nuotraukoms paveldi adresas",()=>{
  expect(needsGpsForPhotos(loc)).toBe(true);
  expect(needsGpsForPhotos({...loc,gpsProtectionEnabled:false},false)).toBe(false);
 });
});
