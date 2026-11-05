import {beforeEach,describe,it,expect} from "vitest";
import {setSAAccess,clearSAAccess,canEdit,canDelete,canView,permissionFor} from "@/lib/sa-access";
beforeEach(()=>clearSAAccess());
describe("ŠA V2.3.33: 4-level module access",()=>{
 it("view allows gallery and inbox viewing, not modifications or deletion",()=>{
   setSAAccess("worker",{photos:"view",messages:"view",jobs:"view"});
   expect(canView("photos")).toBe(true);
   expect(canEdit("photos")).toBe(false);
   expect(canEdit("messages")).toBe(false);
   expect(canDelete("jobs")).toBe(false);
 });
 it("edit grants send/edit but not delete",()=>{
   setSAAccess("manager",{messages:"edit",jobs:"edit"});
   expect(canView("messages")).toBe(true);
   expect(canEdit("messages")).toBe(true);
   expect(canDelete("jobs")).toBe(false);
 });
 it("delete includes view and edit but is only explicit",()=>{
   setSAAccess("manager",{jobs:"delete",addresses:"view"});
   expect(permissionFor("jobs")).toBe("delete");
   expect(canEdit("jobs")).toBe(true);
   expect(canDelete("jobs")).toBe(true);
   expect(canDelete("addresses")).toBe(false);
 });
 it("admins retain delete ability; absent logins gain nothing",()=>{
   expect(canDelete("jobs")).toBe(false);
   setSAAccess("admin");
   expect(canDelete("jobs")).toBe(true);
 });
});
