import { useId } from "react";
import { X } from "lucide-react";

/** Consistent iOS-friendly native date inputs. No custom calendar or locale override. */
export function PersonnelDateField({label,value,onChange,disabled=false,clearable=false}:{
  label:string;
  value?:string;
  onChange:(value:string|undefined)=>void;
  disabled?:boolean;
  clearable?:boolean;
}){
  const id=useId();
  return <div className="min-w-0 max-w-full">
    <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
    <div className="flex h-11 min-w-0 w-full max-w-full items-center gap-1 rounded-md border border-input bg-card px-1 focus-within:ring-2 focus-within:ring-ring">
      <input id={id} type="date" value={value||""} disabled={disabled}
        onChange={e=>onChange(e.target.value||undefined)}
        className="sa-personnel-date-input block h-full min-w-0 w-full max-w-full flex-1 border-0 bg-transparent px-2 text-left text-base outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
      {clearable&&<button type="button" aria-label="Išvalyti darbo pabaigos datą"
        title="Išvalyti datą"
        onClick={()=>onChange(undefined)} disabled={!value||disabled}
        className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-35"
      ><X className="size-4"/></button>}
    </div>
  </div>;
}
