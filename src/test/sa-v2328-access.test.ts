import {beforeEach,describe,expect,it} from "vitest";
import {canEdit,canView,clearSAAccess,moduleForPath,permissionFor,setSAAccess,allowedModules} from "@/lib/sa-access";
beforeEach(()=>clearSAAccess());
describe("ŠA V2.3.28: individualių paskyrų teisių saugikliai",()=>{
 it("nesuteikia jokių meniu teisių, kol paskyra neparuošta",()=>{
   expect(canView("settings")).toBe(false);
   expect(canEdit("jobs")).toBe(false);
 });
 it("administratorius mato visus modulius",()=>{
   setSAAccess("admin");
   expect(canEdit("people")).toBe(true);
   expect(canView("history")).toBe(true);
 });
 it("vadybininkas mato tik leistas funkcijas, įskaitant vidinius puslapius",()=>{
   setSAAccess("manager",{jobs:"edit",addresses:"view",history:"none",changes:"none"});
   expect(canView("jobs")).toBe(true);
   expect(canEdit("jobs")).toBe(true);
   expect(canView("addresses")).toBe(true);
   expect(canEdit("addresses")).toBe(false);
   expect(canView("history")).toBe(false);
   expect(permissionFor("changes")).toBe("none");
   expect(moduleForPath("/adresai/9f59")).toBe("addresses");
   expect(allowedModules({jobs:"edit"},"manager")).toEqual(["jobs","account"]);
 });
 it("savo paskyrą galima valdyti nepriklausomai nuo kitų funkcijų",()=>{
   setSAAccess("worker");
   expect(canEdit("account")).toBe(true);
   expect(canView("settings")).toBe(false);
 });
});
