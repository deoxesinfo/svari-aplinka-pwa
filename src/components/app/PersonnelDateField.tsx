import { useId } from "react";
import { X } from "lucide-react";

/** Both personnel dates use the same full-width native input surface on iPhone Safari. */
export function PersonnelDateField({label,value,onChange,disabled=false,clearable=false}:{
  label:string;
  value?:string;
  onChange:(value:string|undefined)=>void;
  disabled?:boolean;
  clearable?:boolean;
}){
  const id=useId();
  return <div className="min-w-0">
    <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
    <div className="flex h-11 w-full min-w-0 max-w-full items-center overflow-hidden rounded-md border border-input bg-card focus-within:ring-2 focus-within:ring-ring">
      <input id={id} type="date" value={value||""} disabled={disabled}
        onChange={e=>onChange(e.target.value||undefined)}
        className="block h-full min-w-0 w-full max-w-full flex-1 appearance-none border-0 bg-transparent px-3 text-base outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
        style={{minWidth:0,maxWidth:"100%"}}/>
      {clearable&&<button type="button" aria-label="Išvalyti darbo pabaigos datą"
        title="Išvalyti datą"
        onClick={()=>onChange(undefined)} disabled={!value}
        className="mr-1 grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-35"
      ><X className="size-4"/></button>}
    </div>
  </div>;
}
