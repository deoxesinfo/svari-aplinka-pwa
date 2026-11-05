import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {useState,type ReactNode} from "react";
import {AppShell} from "@/components/app/AppShell";
import {clearSAAccess,setSAAccess} from "@/lib/sa-access";

vi.mock("@tanstack/react-router",()=>({
 Link:({to,children,...props}:{to:string;children:ReactNode;onClick?:()=>void;className?:string})=>
   <a href={"#"+to} {...props}>{children}</a>,
 useRouterState:({select}:{select:(s:{location:{pathname:string}})=>string})=>
   select({location:{pathname:"/"}}),
}));
vi.mock("@/lib/store",()=>({
 useAppState:()=>({loaded:true}),
 isCloudMode:()=>true,
 getCloudSaveError:()=>null,
}));
vi.mock("@/lib/supabase-client",()=>({
 supabase:{auth:{
  getSession:async()=>({data:{session:null}}),
  onAuthStateChange:()=>({data:{subscription:{unsubscribe:()=>{}}}}),
 }},
}));
vi.mock("@/components/app/AppLoading",()=>({AppLoading:()=>null}));

beforeEach(()=>clearSAAccess());
afterEach(()=>{cleanup();clearSAAccess()});

describe("ŠA V2.3.35 - permission-aware read-only UI",()=>{
 it("overview:view does not disable filter and navigation while jobs/messages:edit remain valid",()=>{
  setSAAccess("manager",{
    overview:"view",jobs:"edit",messages:"edit",
    addresses:"view",photos:"view",history:"none",
  });
  function Filter(){
    const [filter,setFilter]=useState("all");
    return <section>
      <button type="button" onClick={()=>setFilter("laiptine")}>Filtruoti</button>
      <select aria-label="Peržiūros filtras" value={filter} onChange={e=>setFilter(e.target.value)}>
        <option value="all">Visi</option><option value="laiptine">Laiptinių valymas</option>
      </select>
      <output aria-label="Pasirinktas filtras">{filter}</output>
    </section>;
  }
  render(<AppShell><Filter/></AppShell>);
  const filter=screen.getByRole("button",{name:"Filtruoti"});
  expect(filter).toBeEnabled();
  fireEvent.click(filter);
  expect(screen.getByLabelText("Pasirinktas filtras")).toHaveTextContent("laiptine");
  expect(screen.getByRole("combobox",{name:"Peržiūros filtras"})).toBeEnabled();
  expect(screen.getByRole("link",{name:/Pranešimai/})).toBeInTheDocument();
  expect(screen.queryByRole("link",{name:/Istorija/})).not.toBeInTheDocument();
  expect(screen.queryByRole("group",{name:"Tik peržiūra"})).not.toBeInTheDocument();
 });
});
