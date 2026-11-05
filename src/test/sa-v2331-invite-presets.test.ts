import {describe,expect,it} from "vitest";
import {countInviteModules,defaultInvitePermissions} from "@/lib/invite-presets";
describe("ŠA V2.3.31: kvietimų pradinės funkcijų teisės",()=>{
 it("vadybininko šablonas skirtas tik peržiūrai",()=>{
   const m=defaultInvitePermissions("manager");
   expect(countInviteModules(m)).toBe(6);
   expect(m.overview).toBe("view");expect(m.jobs).toBe("view");
   expect(m.people).toBe("none");expect(m.settings).toBe("none");
   expect(Object.values(m).includes("edit")).toBe(false);
 });
 it("darbuotojui nesuteikia visos įmonės adresų ir personalo",()=>{
   const m=defaultInvitePermissions("worker");
   expect(m.overview).toBe("view");expect(m.jobs).toBe("view");
   expect(m.addresses).toBe("none");expect(m.people).toBe("none");
   expect(countInviteModules(m)).toBe(3);
 });
});
