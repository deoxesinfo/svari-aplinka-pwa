import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { JobRow } from "@/components/app/JobRow";
import type { Job } from "@/lib/types";

vi.mock("@/components/app/JobDetailDialog", () => ({
  JobDetailDialog: ({ open }: { open: boolean }) => open ? <div role="dialog" aria-label="Darbo informacija">Darbo langas atidarytas</div> : null,
}));

vi.mock("@/lib/store", () => ({
  isCloudMode: () => false,
  useAppState: () => ({
    addresses: [{ id: "ad1", street: "Pavyzdžio g. 12", city: "Kaunas" }],
    photos: [],
  }),
}));

const job: Job = {
  id: "job1",
  addressId: "ad1",
  type: "laiptine",
  worker: "Darbuotojas DEMO",
  date: "2026-10-18",
  priority: "vidutine",
  instructions: "Išplauti laiptinę",
  status: "laukia",
  inspection: null,
  notes: "",
  createdAt: "2026-10-18T10:00:00Z",
  comments: [],
  history: [],
};

describe("Universalus darbo kortelės atidarymas", () => {
  beforeEach(() => cleanup());

  it("desktop navigacija rodoma darbo kortelės viduje, mobilus išdėstymas išlieka", () => {
    render(<JobRow job={job} />);
    const links=screen.getAllByRole("link", { name: /Važiuoti į Pavyzdžio g. 12/ });
    expect(links).toHaveLength(2);
    const desktop=links.find(link=>link.parentElement?.className.includes("lg:block"));
    const mobile=links.find(link=>link.parentElement?.className.includes("lg:hidden"));
    expect(desktop).toBeTruthy();
    expect(mobile).toBeTruthy();
    const innerCard=desktop!.parentElement!.parentElement!;
    expect(innerCard.querySelector('button[aria-label^="Atidaryti darbą"]')).toBeTruthy();
    expect(innerCard.contains(mobile!)).toBe(false);
    expect(desktop!.parentElement).toHaveClass("absolute", "right-12", "top-1/2", "-translate-y-1/2", "lg:block");
    expect(desktop!.parentElement).not.toHaveClass("bottom-4");
    const openJob=screen.getByRole("button", { name: /Atidaryti darbą.*Pavyzdžio g. 12/ });
    expect(openJob).toHaveClass("lg:pr-56", "relative");
    expect(openJob).not.toHaveClass("lg:pb-16");
    const chevron=openJob.querySelector("svg.lg\\:absolute");
    expect(chevron).toBeTruthy();
    expect(chevron).toHaveClass("lg:top-1/2", "lg:right-3");
    expect(mobile!.parentElement).toHaveClass("lg:hidden", "justify-end");
    expect(mobile!.parentElement).toHaveClass("-mt-1", "mb-2");
  });

  it("perbraukus kortelę į kairę atveria veiksmus, bet neatidaro darbo", () => {
    render(<JobRow job={job} />);
    const button=screen.getByRole("button",{name:/Atidaryti darbą.*Pavyzdžio g. 12/});
    const surface=button.parentElement?.parentElement;
    expect(surface).toBeTruthy();
    fireEvent.touchStart(surface!,{changedTouches:[{clientX:260,clientY:200}]});
    fireEvent.touchEnd(surface!,{changedTouches:[{clientX:75,clientY:206}]});
    expect(screen.getByRole("button",{name:"Redaguoti darbą"})).toBeInTheDocument();
    expect(screen.queryByRole("dialog",{name:"Darbo informacija"})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"Uždaryti darbo veiksmus"}));
    expect(screen.getByRole("button",{name:"Rodyti darbo veiksmus"})).toBeInTheDocument();
  });

  it("atsidaro paspaudus kortelę net be naršyklės maršrutizatoriaus", () => {
    render(<JobRow job={job} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Atidaryti darbą.*Pavyzdžio g. 12/ }));
    expect(screen.getByRole("dialog", { name: "Darbo informacija" })).toBeInTheDocument();
    expect(screen.getByText("Darbo langas atidarytas")).toBeInTheDocument();
  });
});
