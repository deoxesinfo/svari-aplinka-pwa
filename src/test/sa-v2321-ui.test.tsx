import {describe,it,expect,vi} from "vitest";
import {render,screen} from "@testing-library/react";
import {AnalyticsSvg} from "@/components/app/AnalyticsSvg";
import {PersonnelDateField} from "@/components/app/PersonnelDateField";

describe("ŠA V2.3.21 charts and iPhone-safe date forms",()=>{
 it("draws a responsive SVG chart when actual bucket values exist",()=>{
  render(<AnalyticsSvg title="Darbų diagrama" data={[{label:"10-19",planned:5,completed:4},{label:"10-20",planned:2,completed:1}]}
   series={[{key:"planned",name:"Suplanuota",color:"#376d50"},{key:"completed",name:"Užbaigta",color:"#d9a14c"}]}/>);
  expect(screen.getByRole("img",{name:/Darbų diagrama/})).toBeInTheDocument();
  expect(screen.getByTestId("sa-analytics-svg-chart")).toBeInTheDocument();
  expect(screen.getAllByText("Užbaigta").length).toBeGreaterThan(0);
 });
 it("replaces an otherwise blank plotting area with an empty-data explanation",()=>{
  render(<AnalyticsSvg title="Analitika" data={[{label:"10-20",planned:0}]} series={[{key:"planned",name:"Suplanuota",color:"#376d50"}]}/>);
  expect(screen.getByRole("status")).toHaveTextContent(/duomenų nėra/i);
 });
 it("keeps a clearable iPhone date control and a separate date input",()=>{
  const change=vi.fn();
  render(<PersonnelDateField label="Darbo pabaigos data" clearable value="2026-10-20" onChange={change}/>);
  expect(screen.getByLabelText("Darbo pabaigos data")).toHaveAttribute("type","date");
  screen.getByRole("button",{name:"Išvalyti darbo pabaigos datą"}).click();
  expect(change).toHaveBeenCalledWith(undefined);
 });
});
