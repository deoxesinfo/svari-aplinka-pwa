import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen,waitFor,within} from "@testing-library/react";
const mock=vi.hoisted(()=>({list:vi.fn(),hide:vi.fn(),purge:vi.fn()}));
vi.mock("@/lib/store",()=>({getCloudOrganizationId:()=>"org-test"}));
vi.mock("@/lib/sa-access",()=>({canEdit:()=>true,useSAAccess:()=>({})}));
vi.mock("@/lib/staff-messages",()=>({
 listStaffInbox:mock.list,hideStaffMessage:mock.hide,purgeOwnStaffMessage:mock.purge,
 acknowledgeStaffMessage:vi.fn(),replyToStaffMessage:vi.fn(),
}));
vi.mock("@/components/app/PushSettings",()=>({PushSettings:()=>null}));
vi.mock("@/components/app/ui-bits",()=>({
 Confirm:({open,title,confirmLabel,onConfirm,onOpenChange}:{open:boolean;title:string;confirmLabel:string;onConfirm:()=>void;onOpenChange:(v:boolean)=>void})=>
  open?<div role="dialog" aria-label={title}>
   <button onClick={()=>onOpenChange(false)}>Atšaukti</button>
   <button onClick={onConfirm}>{confirmLabel}</button>
  </div>:null,
}));
import {StaffInbox} from "@/components/app/StaffInbox";
const received=[1,2,3].map(n=>({
 receipt:{id:"r-"+n,organization_id:"org-test",message_id:"m-"+n,recipient_id:"u-1",
  read_at:"2026-10-20T08:00:00Z",response:null,responded_at:null,reply_text:null,hidden_at:null},
 message:{id:"m-"+n,organization_id:"org-test",sender_id:"admin",
  title:"Žinutė "+n,body:"Pranešimas",kind:"info" as const,
  created_at:"2026-10-20T07:00:00Z",scheduled_for:"2026-10-20T07:00:00Z"},
}));
beforeEach(()=>{
 vi.clearAllMocks();
 mock.list.mockImplementation(async (_org:string,view:string)=>view==="trash"?[]:received);
 mock.hide.mockResolvedValue(undefined);mock.purge.mockResolvedValue(undefined);
});
afterEach(()=>cleanup());
describe("ŠA V2.3.23 multi-select inbox",()=>{
 it("selecting only two incoming messages moves only those after deliberate confirmation",async()=>{
  render(<StaffInbox/>);
  await screen.findByText("Žinutė 1");
  fireEvent.click(screen.getByRole("checkbox",{name:"Pažymėti Žinutė 1"}));
  fireEvent.click(screen.getByRole("checkbox",{name:"Pažymėti Žinutė 3"}));
  expect(screen.getByRole("button",{name:"Į šiukšlinę (2)"})).toBeEnabled();
  expect(mock.hide).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Į šiukšlinę (2)"}));
  expect(mock.hide).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog",{name:"Ar tikrai norite perkelti 2 pasirinktus pranešimus į šiukšlinę?"})).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole("dialog",{name:"Ar tikrai norite perkelti 2 pasirinktus pranešimus į šiukšlinę?"})).getByRole("button",{name:"Į šiukšlinę"}));
  await waitFor(()=>expect(mock.hide).toHaveBeenCalledTimes(2));
  expect(mock.hide).toHaveBeenCalledWith("org-test","r-1");
  expect(mock.hide).toHaveBeenCalledWith("org-test","r-3");
  expect(mock.hide).not.toHaveBeenCalledWith("org-test","r-2");
  expect(mock.purge).not.toHaveBeenCalled();
 });
 it("canceling the confirmation cannot move any selected message",async()=>{
  render(<StaffInbox/>);
  await screen.findByText("Žinutė 1");
  fireEvent.click(screen.getByRole("checkbox",{name:"Pažymėti Žinutė 2"}));
  fireEvent.click(screen.getByRole("button",{name:"Į šiukšlinę (1)"}));
  expect(mock.hide).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog",{name:/Ar tikrai norite perkelti 1 pasirinktus pranešimus/})).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Atšaukti"}));
  expect(mock.hide).not.toHaveBeenCalled();
 });
 it("does not expose manual refresh and still responds to in-app updates",async()=>{
  render(<StaffInbox/>);
  await screen.findByText("Žinutė 1");
  expect(screen.queryByRole("button",{name:"Atnaujinti"})).not.toBeInTheDocument();
  const before=mock.list.mock.calls.length;
  fireEvent(window,new Event("sa-message-updated"));
  await waitFor(()=>expect(mock.list.mock.calls.length).toBeGreaterThan(before));
 });
 it("offers select-all and requires selection before enabling bulk action",async()=>{
  render(<StaffInbox/>);
  await screen.findByText("Žinutė 1");
  expect(screen.getByRole("button",{name:"Į šiukšlinę (0)"})).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox",{name:"Pažymėti visus gautus pranešimus"}));
  expect(screen.getByRole("button",{name:"Į šiukšlinę (3)"})).toBeEnabled();
 });
 it("trash contains only restore per item; final delete is in the top bulk bar",async()=>{
  mock.list.mockImplementation(async(_org:string,view:string)=>view==="trash"?received.map(e=>({...e,receipt:{...e.receipt,hidden_at:"2026-10-20T09:00:00Z"}})):[]);
  render(<StaffInbox/>);
  fireEvent.click(screen.getByRole("button",{name:"Atidaryti pranešimų šiukšlinę"}));
  await screen.findByText("Žinutė 1");
  expect(screen.getAllByRole("button",{name:"Atkurti"})).toHaveLength(3);
  expect(screen.getByRole("button",{name:/Ištrinti pažymėtus visam laikui/})).toBeInTheDocument();
  expect(screen.queryByRole("button",{name:"Ištrinti visam laikui"})).not.toBeInTheDocument();
 });
});
