import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";

const state=vi.hoisted(()=>({list:vi.fn(),reply:vi.fn()}));
vi.mock("@/lib/store",()=>({getCloudOrganizationId:()=>"org"}));
vi.mock("@/lib/sa-access",()=>({canEdit:()=>false,useSAAccess:()=>({})}));
vi.mock("@/lib/staff-messages",()=>({
 listStaffInbox:state.list,
 listStaffParticipants:async()=>[{userId:"sender-1",name:"Pagrindinis",role:"manager"}],
 replyToStaffMessage:state.reply,
 acknowledgeStaffMessage:vi.fn(),
 hideStaffMessage:vi.fn(),purgeOwnStaffMessage:vi.fn(),
}));
vi.mock("@/components/app/PushSettings",()=>({PushSettings:()=>null}));
import {StaffInbox} from "@/components/app/StaffInbox";

describe("ŠA V2.3.36 read-only recipient reply",()=>{
 beforeEach(()=>{
  vi.clearAllMocks();
  state.reply.mockResolvedValue(undefined);
  state.list.mockImplementation(async()=>[{
   message:{
    id:"m1",organization_id:"org",sender_id:"sender-1",title:"Žinutė",
    body:"Ar galėsite?",kind:"info",created_at:"2026-11-05T21:32:38Z",
    scheduled_for:"2026-11-05T21:32:38Z"
   },
   receipt:{
    id:"r1",organization_id:"org",message_id:"m1",recipient_id:"viewer-1",
    read_at:null,response:null,responded_at:null,
    reply_text:state.reply.mock.calls.length?"Atlikta":null,
    replied_at:state.reply.mock.calls.length?"2026-11-05T21:33:00Z":null,
    hidden_at:null
   }
  }]);
 });
 afterEach(()=>cleanup());
 it("shows real sender and allows only own message reply, without delete controls",async()=>{
  render(<StaffInbox/>);
  expect(await screen.findByText("Pagrindinis")).toBeInTheDocument();
  expect(screen.getByText("Ar galėsite?")).toBeInTheDocument();
  expect(screen.queryByRole("button",{name:/šiukšlinę/i})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Atsakyti"}));
  fireEvent.change(screen.getByLabelText(/Atsakymas/),{target:{value:"Atlikta"}});
  fireEvent.click(screen.getByRole("button",{name:"Siųsti atsakymą"}));
  await waitFor(()=>expect(state.reply).toHaveBeenCalledWith("org","r1","Atlikta"));
  await waitFor(()=>expect(screen.getByText(/Mano atsakymas:/).parentElement).toHaveTextContent("Atlikta"));
 });
});
