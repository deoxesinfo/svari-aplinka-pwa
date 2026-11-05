import {describe,expect,it,vi} from "vitest";
import {fireEvent,render,screen,waitFor} from "@testing-library/react";
const state=vi.hoisted(()=>({outbox:vi.fn()}));
vi.mock("@tanstack/react-router",()=>({createFileRoute:()=>((options:unknown)=>({options}))}));
vi.mock("@/lib/sa-access",()=>({canEdit:()=>true,useSAAccess:()=>({})}));
vi.mock("@/lib/store",()=>({useAppState:()=>({}),getCloudOrganizationId:()=>"org",isCloudMode:()=>true}));
vi.mock("@/lib/staff-messages",()=>({
 listStaffRecipients:async()=>[
 {userId:"admin-1",name:"Administratorius (testas)",role:"admin"},
 {userId:"manager-1",name:"Pagrindinis",role:"manager"},
 ],listStaffParticipants:async()=>[],listSentStaffMessages:()=>state.outbox(),
 sendStaffMessage:async()=>"",listStaffInbox:async()=>[],
}));
vi.mock("@/components/app/StaffInbox",()=>({StaffInbox:()=> <div data-testid="received-inbox">Gauti pranešimai</div>}));
vi.mock("@/components/app/ui-bits",()=>({
 PageHeader:({title}:{title:string})=><h1>{title}</h1>,
 inputCls:"input",textareaCls:"textarea",
}));
import {Route} from "@/routes/pranesimai";
import {beforeEach,afterEach} from "vitest";
import {cleanup} from "@testing-library/react";
beforeEach(()=>{state.outbox.mockReset();state.outbox.mockResolvedValue({messages:[],receipts:[]})});
afterEach(()=>cleanup());
describe("ŠA V2.3.19.1 default route is the inbox",()=>{
 it("shows incoming messages before the send form, and three distinct tabs",()=>{
  render(<Route.options.component/>);
  expect(screen.getByRole("tab",{name:"Gauti"})).toHaveAttribute("aria-selected","true");
  expect(screen.getByRole("tab",{name:"Kurti"})).toBeInTheDocument();
  expect(screen.getByRole("tab",{name:"Išsiųsti"})).toBeInTheDocument();
  expect(screen.getByTestId("received-inbox")).toBeInTheDocument();
  expect(screen.queryByText("Naujas pranešimas")).not.toBeInTheDocument();
 });
 it("shows both active account recipients and manual refresh",async()=>{
  render(<Route.options.component/>);
  fireEvent.click(screen.getByRole("tab",{name:"Kurti"}));
  expect(await screen.findByText("Pagrindinis")).toBeInTheDocument();
  expect(screen.getByText("Administratorius (testas)")).toBeInTheDocument();
  expect(screen.getByText("Gavėjai · 2 aktyvios paskyros")).toBeInTheDocument();
  expect(screen.getByRole("button",{name:/Atnaujinti gavėjus/})).toBeInTheDocument();
 });

 it("shows who exchanged each message, the reply, and refreshes the sender view automatically",async()=>{
  state.outbox.mockResolvedValue({messages:[{
   id:"message-1",organization_id:"org",sender_id:"manager-1",
   title:"Aaa",body:"Akajaj",kind:"info",scheduled_for:"2026-11-05T21:32:38Z",
   created_at:"2026-11-05T21:32:38Z"
  }],receipts:[{
   id:"receipt-1",organization_id:"org",message_id:"message-1",recipient_id:"admin-1",
   read_at:"2026-11-05T21:32:50Z",response:null,responded_at:null,
   reply_text:"Aaaaa",replied_at:"2026-11-05T21:32:50Z"
  }]});
  render(<Route.options.component/>);
  fireEvent.click(screen.getByRole("tab",{name:"Išsiųsti"}));
  expect(await screen.findByText("Aaa")).toBeInTheDocument();
  expect(screen.getByText("Pagrindinis")).toBeInTheDocument();
  expect(screen.getAllByText("Administratorius (testas)")).not.toHaveLength(0);
  expect(screen.getByText(/Gautas atsakymas iš/)).toHaveTextContent("Aaaaa");
  const before=state.outbox.mock.calls.length;
  fireEvent(window,new Event("sa-message-updated"));
  await waitFor(()=>expect(state.outbox.mock.calls.length).toBeGreaterThan(before));
 });

});
