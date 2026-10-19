import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NotificationBell } from "@/components/app/NotificationBell";

let pathname = "/darbai";
vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({select}: {select:(x:{location:{pathname:string}})=>string}) =>
    select({location:{pathname}}),
  Link: ({children,onClick}: {children:React.ReactNode;onClick?:()=>void}) =>
    <a href="#" onClick={onClick}>{children}</a>,
}));
vi.mock("@/lib/supabase-client", () => {
  const query: Record<string,unknown> = {};
  query.select = () => query;
  query.eq = () => query;
  query.order = () => query;
  query.limit = async () => ({data:[],error:null});
  return {supabase:{
    auth:{getUser:async()=>({data:{user:{id:"test-user"}},error:null})},
    from:()=>query
  }};
});

describe("ŠA V2.3.14 notification dismissal",()=>{
  beforeEach(()=>{pathname="/darbai"});
  afterEach(()=>cleanup());
  it("closes on outside pointer without swallowing the original target",async()=>{
    const outside=vi.fn();
    render(<><NotificationBell/><button type="button" onClick={outside}>Už lango</button></>);
    fireEvent.click(screen.getByRole("button",{name:/Pranešimai, neperskaitytų:/}));
    expect(screen.getByRole("region",{name:"Nauji pranešimai"})).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByText("Už lango"));
    fireEvent.click(screen.getByText("Už lango"));
    expect(outside).toHaveBeenCalledOnce();
    await waitFor(()=>expect(screen.queryByRole("region",{name:"Nauji pranešimai"})).not.toBeInTheDocument());
  });
  it("closes with Escape but not with clicks inside the panel",async()=>{
    render(<NotificationBell/>);
    fireEvent.click(screen.getByRole("button",{name:/Pranešimai, neperskaitytų:/}));
    fireEvent.pointerDown(screen.getByText("Pranešimų istorija"));
    expect(screen.getByRole("region",{name:"Nauji pranešimai"})).toBeInTheDocument();
    fireEvent.keyDown(document,{key:"Escape"});
    await waitFor(()=>expect(screen.queryByRole("region",{name:"Nauji pranešimai"})).not.toBeInTheDocument());
  });
  it("closes after route navigation",async()=>{
    const {rerender}=render(<NotificationBell/>);
    fireEvent.click(screen.getByRole("button",{name:/Pranešimai, neperskaitytų:/}));
    expect(screen.getByRole("region",{name:"Nauji pranešimai"})).toBeInTheDocument();
    pathname="/adresai";
    rerender(<NotificationBell/>);
    await waitFor(()=>expect(screen.queryByRole("region",{name:"Nauji pranešimai"})).not.toBeInTheDocument());
  });
});
