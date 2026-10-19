import {beforeEach,describe,expect,it,vi} from "vitest";
const mock=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock("@/lib/supabase-client",()=>({supabase:{rpc:mock.rpc}}));
import {sendStaffMessage} from "@/lib/staff-messages";

describe("ŠA V2.3.19 staff messages client validation",()=>{
 beforeEach(()=>{mock.rpc.mockReset();mock.rpc.mockResolvedValue({data:"sent-id",error:null})});
 const base={title:"Svarbi informacija",body:"Pranešimo tekstas",kind:"response" as const,recipients:["member-1"]};
 it("uses the scoped Supabase RPC for an immediate staff message",async()=>{
  const id=await sendStaffMessage("org-1",base);
  expect(id).toBe("sent-id");
  expect(mock.rpc).toHaveBeenCalledWith("sa_send_staff_message",{
    p_org:"org-1",p_title:base.title,p_body:base.body,
    p_kind:"response",p_recipients:["member-1"],p_schedule:null,
  });
 });
 it("passes an explicitly scheduled timestamp",async()=>{
  await sendStaffMessage("org-1",{...base,sendAt:"2026-10-22T09:00:00.000Z"});
  expect(mock.rpc.mock.calls[0][1].p_schedule).toBe("2026-10-22T09:00:00.000Z");
 });
 it("refuses empty and duplicate recipients before calling database",async()=>{
  await expect(sendStaffMessage("org-1",{...base,recipients:[]})).rejects.toThrow();
  await expect(sendStaffMessage("org-1",{...base,recipients:["member-1","member-1"]})).rejects.toThrow();
  expect(mock.rpc).not.toHaveBeenCalled();
 });
 it("refuses empty content and oversized titles",async()=>{
  await expect(sendStaffMessage("org-1",{...base,body:"  "})).rejects.toThrow();
  await expect(sendStaffMessage("org-1",{...base,title:"A".repeat(121)})).rejects.toThrow();
  expect(mock.rpc).not.toHaveBeenCalled();
 });
 it("does not claim a message was sent when the RPC rejects",async()=>{
  mock.rpc.mockResolvedValue({data:null,error:{message:"ADMIN_ONLY"}});
  await expect(sendStaffMessage("org-1",base)).rejects.toThrow("ADMIN_ONLY");
 });
});
