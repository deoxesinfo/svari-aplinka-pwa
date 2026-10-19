import { afterEach,describe,expect,it,vi } from "vitest";
import { render,screen,cleanup } from "@testing-library/react";
import { JobFormDialog } from "@/components/app/forms";
afterEach(()=>cleanup());
describe("V2.2.5 darbo redagavimo langas",()=>{
 it("langas mobiliame ekrane turi vertikalų, bet ne horizontalų slinkimą",()=>{
   render(<JobFormDialog open onOpenChange={vi.fn()}/>);
   const dialog=screen.getByRole("dialog");
   expect(dialog.className).toContain("sa-job-dialog");
   expect(dialog.className).toContain("overflow-x-hidden");
   expect(dialog.className).toContain("overflow-y-auto");
   expect(dialog.querySelector("form")?.className).toContain("min-w-0");
   expect(dialog.querySelector("form")?.className).toContain("grid-cols-1");
 });
});
