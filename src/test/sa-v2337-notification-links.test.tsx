import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import type {ReactNode} from "react";

const FIXED_MESSAGE="b33d1594-08dd-46f4-a78d-d54a052a3f21";
const state=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock("@tanstack/react-router",()=>({
 useRouterState:({select}:{select:(s:{location:{pathname:string}})=>string})=>
  select({location:{pathname:"/pranesimai"}}),
 Link:({children,to,search,onClick,...props}:{children:ReactNode;to:string;search?:{tab?:string;message?:string};onClick?:()=>void})=>
  <a href={"#"+to+(search?"?"+new URLSearchParams(Object.entries(search).filter(([,v])=>Boolean(v)) as [string,string][]).toString():"")}
    onClick={onClick} {...props}>{children}</a>
}));
vi.mock("@/lib/store",()=>({getCloudOrganizationId:()=>"org"}));
vi.mock("@/lib/staff-messages",()=>({listStaffInbox:async()=>[],listStaffParticipants:async()=>[{userId:"manager",name:"Pagrindinis",role:"manager"}]}));
vi.mock("@/lib/supabase-client",()=>{
 const results=[{id:"notice-1",title:"Gautas atsakymas: Labss",
  kind:"staff_reply",body:"Atsakymas prie išsiųstos žinutės",
  related_job_id:null,related_message_id:"b33d1594-08dd-46f4-a78d-d54a052a3f21",related_receipt_id:"7de45cdd-29a6-4ea5-a141-b453aa4a3fa1",actor_user_id:"manager",
  read_at:null,created_at:"2026-11-06T00:11:45Z"}];
 const query:Record<string,unknown>={};
 query.select=()=>query;query.eq=()=>query;query.order=()=>query;
 query.limit=async()=>({data:results,error:null});
 return {supabase:{
  auth:{getUser:async()=>({data:{user:{id:"admin"}},error:null})},
  from:()=>query,
  rpc:state.rpc
 }};
});
import {NotificationBell} from "@/components/app/NotificationBell";

describe("ŠA V2.3.37 bell – exact recipient-owned conversation",()=>{
 beforeEach(()=>{state.rpc.mockResolvedValue({data:true,error:null})});
 afterEach(()=>{cleanup();vi.clearAllMocks()});
 it("explains one reply with no inbox messages and links to the exact conversation",async()=>{
  render(<NotificationBell/>);
  await waitFor(()=>expect(screen.getByRole("button",{name:"Pranešimai, neperskaitytų: 1"})).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button",{name:"Pranešimai, neperskaitytų: 1"}));
  expect(screen.getByText(/Žinutės: 0 · Atsakymai: 1/)).toBeInTheDocument();
  expect(screen.getByText(/Nuo: Pagrindinis/)).toBeInTheDocument();
  const link=screen.getByRole("link",{name:"Atidaryti pokalbį"});
  expect(link).toHaveAttribute("href","#/pranesimai?tab=issiusti&message="+FIXED_MESSAGE+"&receipt=7de45cdd-29a6-4ea5-a141-b453aa4a3fa1");
  fireEvent.click(link);
  await waitFor(()=>expect(state.rpc).toHaveBeenCalledWith("sa_mark_own_notification_read",{p_org:"org",p_notice:"notice-1"}));
 });
});
