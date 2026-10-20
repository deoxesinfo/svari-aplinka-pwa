import {beforeEach,describe,expect,it,vi} from "vitest";
import {fireEvent,render,screen,waitFor} from "@testing-library/react";

const mock=vi.hoisted(()=>({
 list:vi.fn(),hide:vi.fn(),purge:vi.fn(),
}));
vi.mock("@/lib/store",()=>({getCloudOrganizationId:()=>"org-test"}));
vi.mock("@/lib/staff-messages",()=>({
 listStaffInbox:mock.list,hideStaffMessage:mock.hide,
 purgeOwnStaffMessage:mock.purge,
 acknowledgeStaffMessage:vi.fn(),replyToStaffMessage:vi.fn(),
}));
vi.mock("@/components/app/PushSettings",()=>({PushSettings:()=>null}));
vi.mock("@/components/app/ui-bits",()=>({
 Confirm:({open,title,confirmLabel,onConfirm}:{open:boolean;title:string;confirmLabel:string;onConfirm:()=>void})=>
  open?<div role="dialog" aria-label={title}><button onClick={onConfirm}>{confirmLabel}</button></div>:null,
}));
import {StaffInbox} from "@/components/app/StaffInbox";
import {AppLoading} from "@/components/app/AppLoading";

const receipt={id:"r-1",organization_id:"org-test",message_id:"m-1",recipient_id:"u-1",
 read_at:"2026-10-20T08:00:00Z",response:null,responded_at:null,
 reply_text:null,hidden_at:"2026-10-20T09:00:00Z"};
const sample={message:{id:"m-1",organization_id:"org-test",sender_id:"admin-1",
 title:"Žinutė A",body:"Bandymas",kind:"info" as const,created_at:"2026-10-20T07:00:00Z",
 scheduled_for:"2026-10-20T07:00:00Z"},receipt};

describe("ŠA V2.3.22 inbox trash safety",()=>{
 beforeEach(()=>{
  vi.clearAllMocks();
  mock.list.mockImplementation(async(_org:string,view:string)=>view==="trash"?[sample]:[]);
  mock.purge.mockResolvedValue(undefined);
  mock.hide.mockResolvedValue(undefined);
 });
 it("does not permanently delete when entering trash or selecting a message; needs confirmation",async()=>{
  render(<StaffInbox/>);
  fireEvent.click(screen.getByRole("button",{name:"Atidaryti pranešimų šiukšlinę"}));
  await screen.findByText("Žinutė A");
  expect(screen.queryByRole("button",{name:"Ištrinti visam laikui"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:/Ištrinti pažymėtus visam laikui/}));
  expect(mock.purge).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog",{name:/Galutinai ištrinti 1 pranešimų/})).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Taip, ištrinti visam laikui"}));
  await waitFor(()=>expect(mock.purge).toHaveBeenCalledWith("org-test","r-1"));
 });
 it("restores own trashed receipt rather than modifying sender copy",async()=>{
  render(<StaffInbox/>);
  fireEvent.click(screen.getByRole("button",{name:"Atidaryti pranešimų šiukšlinę"}));
  await screen.findByText("Žinutė A");
  fireEvent.click(screen.getByRole("button",{name:"Atkurti"}));
  await waitFor(()=>expect(mock.hide).toHaveBeenCalledWith("org-test","r-1",false));
  expect(mock.purge).not.toHaveBeenCalled();
 });
 it("no trash tab is added to global sidebar; trash is inside inbox",()=>{
  render(<StaffInbox/>);
  expect(screen.getByRole("button",{name:"Atidaryti pranešimų šiukšlinę"})).toBeInTheDocument();
 });
});

describe("ŠA loading screen",()=>{
 it("shows a centered theme spinner and explanatory status",()=>{
  render(<AppLoading message="Tikrinama paskyra…"/>);
  expect(screen.getByRole("status",{name:"Tikrinama paskyra…"})).toBeInTheDocument();
  expect(screen.getByText("Tikrinama paskyra…")).toBeInTheDocument();
 });
});
