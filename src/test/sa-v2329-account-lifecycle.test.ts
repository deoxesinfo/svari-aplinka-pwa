import {describe,expect,it} from "vitest";
import {accountDeletionConfirmed,accountStateLabel} from "@/lib/account-lifecycle";

describe("ŠA V2.3.29 paskyrų saugumo veiksmai",()=>{
 it("sustabdyta paskyra aiškiai skiriasi nuo neaktyvuotos",()=>{
   expect(accountStateLabel(false,true)).toBe("Sustabdyta");
   expect(accountStateLabel(true,false)).toBe("Laukia aktyvavimo");
   expect(accountStateLabel(true,true)).toBe("Aktyvi");
 });
 it("netyčia paspaustas mygtukas neištrina paskyros be pilno el. pašto patvirtinimo",()=>{
   expect(accountDeletionConfirmed("worker@example.com","worker")).toBe(false);
   expect(accountDeletionConfirmed("worker@example.com","")).toBe(false);
   expect(accountDeletionConfirmed("worker@example.com","another@example.com")).toBe(false);
   expect(accountDeletionConfirmed("worker@example.com","  WORKER@EXAMPLE.COM  ")).toBe(true);
 });
 it("negalima patvirtinti tuščios ar netaisyklingos tikslinės paskyros",()=>{
   expect(accountDeletionConfirmed("","")).toBe(false);
   expect(accountDeletionConfirmed("invalid","invalid")).toBe(false);
 });
});
