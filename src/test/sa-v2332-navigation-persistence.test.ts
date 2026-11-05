import {describe,expect,it} from "vitest";
import {saCanRestoreRoute,saRouteToRestore} from "@/lib/navigation-persistence";

describe("ŠA V2.3.32: išlikti tame pačiame puslapyje po Refresh",()=>{
 it("atkuria paskyrų valdymo ir kitus leidžiamus kelius, kai PWA praranda hash",()=>{
   expect(saRouteToRestore("#/","/paskyra",true,"")).toBe("/paskyra");
   expect(saRouteToRestore("","/darbai",true,"")).toBe("/darbai");
 });
 it("niekada nekeičia jau teisingo hash maršruto ir neperrašo rankinio atidarymo",()=>{
   expect(saRouteToRestore("#/adresai","/paskyra",true,"")).toBe(null);
   expect(saRouteToRestore("#/","/paskyra",false,"")).toBe(null);
   expect(saRouteToRestore("#/","/paskyra",true,"?sa_auth=invite")).toBe(null);
 });
 it("neatkuria netinkamų kelių",()=>{
   for(const value of ["https://bad","//bad","/unknown","/","/paskyra#token","/paskyra\\x"]){
     expect(saCanRestoreRoute(value)).toBe(false);
   }
 });
});
