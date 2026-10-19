import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PersonnelDateField } from "@/components/app/PersonnelDateField";
import { deriveEmploymentPeriods, type PersonInput } from "@/lib/store";
import type { Person } from "@/lib/types";

function EndDateHarness(){
 const [date,setDate]=useState<string|undefined>("2026-10-19");
 return <PersonnelDateField label="Darbo pabaigos data" value={date} onChange={setDate} clearable/>;
}
describe("V2.2.4 personalo datos",()=>{
 it("X pašalina pasirinktą darbo pabaigos datą",()=>{
   render(<EndDateHarness/>);
   const field=screen.getByLabelText("Darbo pabaigos data") as HTMLInputElement;
   expect(field.value).toBe("2026-10-19");
   fireEvent.click(screen.getByRole("button",{name:"Išvalyti darbo pabaigos datą"}));
   expect(field.value).toBe("");
   expect(screen.getByRole("button",{name:"Išvalyti darbo pabaigos datą"})).toBeDisabled();
 });
 it("pradžios ir pabaigos laukai naudoja vienodą išdėstymą ir išlaiko iOS native date",()=>{
   const onChange=vi.fn();
   const {container}=render(<>
     <PersonnelDateField label="Dirba nuo (data)" value="2026-10-18" onChange={onChange}/>
     <PersonnelDateField label="Darbo pabaigos data" onChange={onChange} clearable/>
   </>);
   const inputs=Array.from(container.querySelectorAll('input[type="date"]'));
   expect(inputs).toHaveLength(2);
   for(const input of inputs){
     expect(input.parentElement?.className).toContain("h-11 w-full min-w-0 max-w-full");
   }
 });
 it("nežinomą pabaigos datą galima saugoti, neišgalvojant skaičių",()=>{
   const original:Person={id:"demo",name:"Pavyzdys",role:"darbuotojas",status:"aktyvus",
     notes:"",startedAt:"2026-10-01",createdAt:"2026-10-01T00:00:00Z",
     employmentPeriods:[{startedAt:"2026-10-01"}]};
   const update:PersonInput={name:original.name,role:original.role,status:"nebedirba",
     notes:"",startedAt:original.startedAt,endedAt:undefined};
   expect(deriveEmploymentPeriods(original,update)).toEqual([{startedAt:"2026-10-01",endedAt:undefined}]);
 });
});
