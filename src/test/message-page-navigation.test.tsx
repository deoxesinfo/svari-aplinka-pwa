import {describe,expect,it,vi} from "vitest";
import {render,screen} from "@testing-library/react";
vi.mock("@tanstack/react-router",()=>({createFileRoute:()=>((options:unknown)=>({options}))}));
vi.mock("@/lib/cloud-sync",()=>({getCloudRole:()=>"admin"}));
vi.mock("@/lib/store",()=>({useAppState:()=>({}),getCloudOrganizationId:()=>"org",isCloudMode:()=>true}));
vi.mock("@/lib/staff-messages",()=>({
 listStaffRecipients:async()=>[],listSentStaffMessages:async()=>({messages:[],receipts:[]}),
 sendStaffMessage:async()=>"",listStaffInbox:async()=>[],
}));
vi.mock("@/components/app/StaffInbox",()=>({StaffInbox:()=> <div data-testid="received-inbox">Gauti pranešimai</div>}));
vi.mock("@/components/app/ui-bits",()=>({
 PageHeader:({title}:{title:string})=><h1>{title}</h1>,
 inputCls:"input",textareaCls:"textarea",
}));
import {Route} from "@/routes/pranesimai";
describe("ŠA V2.3.19.1 default route is the inbox",()=>{
 it("shows incoming messages before the send form, and three distinct tabs",()=>{
  render(<Route.options.component/>);
  expect(screen.getByRole("tab",{name:"Gauti"})).toHaveAttribute("aria-selected","true");
  expect(screen.getByRole("tab",{name:"Kurti"})).toBeInTheDocument();
  expect(screen.getByRole("tab",{name:"Išsiųsti"})).toBeInTheDocument();
  expect(screen.getByTestId("received-inbox")).toBeInTheDocument();
  expect(screen.queryByText("Naujas pranešimas")).not.toBeInTheDocument();
 });
});
