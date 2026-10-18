import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BarChart3, Building2, CalendarDays, ClipboardCheck, ClockAlert, GitCompareArrows, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/app/ui-bits";
import { useAppState } from "@/lib/store";
import { todayISO } from "@/lib/dates";
import { activeObject } from "@/lib/analytics";
import { compareBuckets, periodBuckets, periodSummary, todayMinusDays, validPeriod, type Period, type PeriodSummary } from "@/lib/analytics-periods";
import type { Address, Job, Person } from "@/lib/types";

export const Route=createFileRoute("/analitika")({component:AnalyticsPage});
const tick={fontSize:11,fill:"#64746a"};
const colors={primary:"#376d50",secondary:"#d9a14c",compare:"#5366c5",muted:"#9fb0a6",danger:"#c96b57"};
type Metric="work"|"cleaning"|"buildings"|"personnel";
function Tile({label,value,icon:Icon,description}:{label:string,value:number|string,icon:typeof Building2,description?:string}){
 return <div className="card-surface p-4"><div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Icon className="size-4 text-primary"/>{label}</div>
   <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
   {description&&<p className="mt-1 text-xs text-muted-foreground">{description}</p>}</div>;
}
function Dates({span,onChange,label}:{span:Period,onChange:(p:Period)=>void,label:string}){
 return <fieldset className="min-w-0"><legend className="mb-1 text-xs font-semibold">{label}</legend><div className="grid grid-cols-2 gap-2">
   <label className="min-w-0 text-xs text-muted-foreground">Nuo
     <input type="date" aria-label={label+" nuo"} className="mt-1 w-full min-w-0 rounded-md border bg-card p-2 text-sm text-foreground" value={span.start} onChange={e=>onChange({...span,start:e.target.value})}/>
   </label>
   <label className="min-w-0 text-xs text-muted-foreground">Iki
     <input type="date" aria-label={label+" iki"} className="mt-1 w-full min-w-0 rounded-md border bg-card p-2 text-sm text-foreground" value={span.end} onChange={e=>onChange({...span,end:e.target.value})}/>
   </label>
 </div></fieldset>;
}
const title:Record<Metric,string>={work:"Suplanuoti ir užbaigti darbai",cleaning:"Laiptinių ir teritorijų valymai",buildings:"Nauji ir nebeaptarnaujami namai",personnel:"Darbuotojų atėjimai ir išėjimai"};
type ChartData={addresses:Address[],jobs:Job[],people:Person[]};
function PeriodChart({mode,source,today}:{mode:Metric,source:ChartData,today:string}){
 const [span,setSpan]=useState<Period>({start:todayMinusDays(today,29),end:today});
 const [comp,setComp]=useState(false);
 const [other,setOther]=useState<Period>({start:todayMinusDays(today,59),end:todayMinusDays(today,30)});
 const good=validPeriod(span),validOther=validPeriod(other);
 const main=useMemo(()=>good?periodBuckets(source.addresses,source.jobs,source.people,span):[],[good,source.addresses,source.jobs,source.people,span]);
 const alt=useMemo(()=>comp&&validOther?periodBuckets(source.addresses,source.jobs,source.people,other):[],[comp,validOther,source.addresses,source.jobs,source.people,other]);
 const chartData=comp?compareBuckets(main,alt):main;
 const pair=(name:string,key:string,color:string)=>mode==="work"
  ? <Line key={key} type="monotone" dataKey={key} name={name} stroke={color} strokeWidth={2} dot={false} connectNulls/>
  : <Bar key={key} dataKey={key} name={name} fill={color} radius={[3,3,0,0]}/>;
 const series=mode==="work"
  ? [{name:"Suplanuota",key:"planned",color:colors.muted},{name:"Užbaigta",key:"completed",color:colors.primary}]
  : mode==="cleaning"
  ? [{name:"Laiptinės",key:"stairwell",color:colors.primary},{name:"Teritorijos",key:"territory",color:colors.secondary}]
  : mode==="buildings"
  ? [{name:"Nauji",key:"newObjects",color:colors.primary},{name:"Nebeteikiamos paslaugos",key:"lostObjects",color:colors.danger}]
  : [{name:"Pradėjo dirbti",key:"hires",color:colors.primary},{name:"Išėjo",key:"leaves",color:colors.danger}];
 const compareMap:Record<string,string>={planned:"comparePlanned",completed:"compareCompleted",stairwell:"compareStairwell",territory:"compareTerritory",newObjects:"compareNewObjects",lostObjects:"compareLostObjects",hires:"compareHires",leaves:"compareLeaves"};
 const graph=<><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label" tick={tick} minTickGap={8}/><YAxis allowDecimals={false} tick={tick}/><Tooltip/><Legend/>
    {series.map(item=>pair((comp?"I: ":"")+item.name,item.key,item.color))}
    {comp&&series.map(item=>pair("II: "+item.name,compareMap[item.key],colors.compare))}
  </>;
 const first=good?periodSummary(source.addresses,source.jobs,source.people,span):undefined;
 const second=comp&&validOther?periodSummary(source.addresses,source.jobs,source.people,other):undefined;
 const totalKeys=mode==="work"?[["planned","Suplanuota"],["completed","Užbaigta"]]
   :mode==="cleaning"?[["stairwell","Laiptinės"],["territory","Teritorijos"]]
   :mode==="buildings"?[["newObjects","Nauji"],["lostObjects","Atkrito"]]
   :[["hires","Pradėjo"],["leaves","Išėjo"]];
 return <section className="card-surface space-y-4 p-4 sm:p-5">
    <h3 className="text-base font-semibold">{title[mode]}</h3>
    <div className={"grid gap-3 "+(comp?"xl:grid-cols-2":"")}>
      <Dates span={span} onChange={setSpan} label="I laikotarpis"/>
      {comp&&<Dates span={other} onChange={setOther} label="II laikotarpis (palyginimas)"/>}
    </div>
    <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="size-4 accent-primary" checked={comp} onChange={e=>setComp(e.target.checked)}/><GitCompareArrows className="size-4"/>Palyginti du laikotarpius</label>
    {(!good||(comp&&!validOther))?<p className="rounded-lg border p-3 text-sm text-destructive">Patikrinkite datas: pradžia turi būti ne vėliau nei pabaiga.</p>:<>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {mode==="work"?<LineChart data={chartData} margin={{top:8,right:8,left:-22,bottom:0}}>{graph}</LineChart>
          :<BarChart data={chartData} margin={{top:8,right:8,left:-22,bottom:0}}>{graph}</BarChart>}
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {totalKeys.map(([key,label])=>{
          const one=first?.[key as keyof PeriodSummary]??0,two=second?.[key as keyof PeriodSummary]??0;
          const change=Number(two)-Number(one);
          return <div className="rounded-lg bg-muted/50 p-3 text-sm" key={key}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-semibold tabular-nums">I: {one}{second!==undefined?" · II: "+two:""}</p>
            {second&&<p className="text-xs text-muted-foreground">{change>0?"+":""}{change} ({Number(one)!==0?Math.round((change/Number(one))*100)+"%":"palyginimas be bazės"})</p>}
          </div>;
        })}
      </div>
      {comp&&<p className="text-xs text-muted-foreground">Diagramos taškai lyginami pagal eilės numerį, o ne vienodas kalendorines datas. I ir II laikotarpiai gali turėti skirtingą trukmę.</p>}
    </>}
 </section>;
}
function AnalyticsPage(){
 const {addresses,jobs,people}=useAppState();
 const today=todayISO();
 const [period,setPeriod]=useState<Period>({start:todayMinusDays(today,29),end:today});
 const [kind,setKind]=useState<"visos"|"laiptine"|"teritorija"|"patikrinimas">("visos");
 const filtered=useMemo(()=>jobs.filter(j=>kind==="visos"||j.type===kind),[jobs,kind]);
 const valid=validPeriod(period);
 const stats=useMemo(()=>valid?periodSummary(addresses,filtered,people,period):undefined,[valid,addresses,filtered,people,period]);
 const workers=useMemo(()=>people.filter(p=>p.role==="darbuotojas").map(p=>({
  name:p.name,
  completed:filtered.filter(j=>j.worker===p.name&&j.completedAt?.slice(0,10)>=period.start&&j.completedAt?.slice(0,10)<=period.end).length,
  planned:filtered.filter(j=>j.worker===p.name&&j.date>=period.start&&j.date<=period.end).length
 })).sort((a,b)=>b.completed-a.completed),[people,filtered,period]);
 const currentObjects=addresses.filter(activeObject);
 return <div>
  <PageHeader title="Analitika" subtitle="Pasirinktiniai laikotarpiai, darbo statistika ir palyginimai · DEMO"/>
  <section className="card-surface mb-5 space-y-3 p-4">
    <h2 className="font-semibold">Pagrindinės suvestinės laikotarpis</h2>
    <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
      <Dates label="Statistikos datos" span={period} onChange={setPeriod}/>
      <label className="text-xs font-semibold">Paslaugų tipas
        <select value={kind} onChange={e=>setKind(e.target.value as typeof kind)} className="mt-1 w-full rounded-lg border bg-card p-2.5 text-sm">
          <option value="visos">Visi darbai</option><option value="laiptine">Laiptinių valymas</option>
          <option value="teritorija">Teritorijų valymas</option><option value="patikrinimas">Patikrinimai</option>
        </select>
      </label>
    </div>
    <p className="text-xs text-muted-foreground">Žemiau kiekviena diagrama turi savo kalendorių ir palyginimo pasirinkimą.</p>
  </section>
  <h2 className="mb-3 text-lg font-bold">Objektų suvestinė</h2>
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <Tile icon={Building2} label="Šiuo metu aktyvūs namai" value={currentObjects.length} description="Dabartinė būsena, nepriklauso nuo datų"/>
    <Tile icon={Building2} label="Laiptinių objektai" value={currentObjects.filter(a=>a.type!=="teritorija").length} description="Dabartinis objektų skaičius"/>
    <Tile icon={Building2} label="Teritorijų objektai" value={currentObjects.filter(a=>a.type!=="laiptine").length} description="Dabartinis objektų skaičius"/>
    <Tile icon={Users} label="Šiuo metu dirba" value={people.filter(p=>p.status==="aktyvus").length} description="Dabartinė personalo būsena"/>
  </div>
  {!valid?<p className="my-4 rounded-lg border p-3 text-sm text-destructive">Pasirinkite galiojantį laikotarpį.</p>:<>
    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile icon={TrendingUp} label="Nauji objektai" value={stats?.newObjects??0} description="Pagal aptarnavimo arba įrašymo datą"/>
      <Tile icon={TrendingDown} label="Nebeteikiamos paslaugos" value={stats?.lostObjects??0} description="Pagal pabaigos datą"/>
      <Tile icon={ClipboardCheck} label="Aptarnauti unikalūs namai" value={stats?.uniqueBuildings??0} description="Turėjo užbaigtų darbų"/>
      <Tile icon={ClockAlert} label="Išėjo darbuotojai" value={stats?.leaves??0} description="Pagal darbo laikotarpius"/>
    </div>
    <h2 className="mb-3 mt-7 text-lg font-bold">Darbai per pasirinktą laikotarpį</h2>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile icon={BarChart3} label="Suplanuota" value={stats?.planned??0}/>
      <Tile icon={ClipboardCheck} label="Užbaigta" value={stats?.completed??0}/>
      <Tile icon={ClipboardCheck} label="Laiptinės" value={stats?.stairwell??0}/>
      <Tile icon={ClipboardCheck} label="Teritorijos" value={stats?.territory??0}/>
    </div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <Tile icon={ClipboardCheck} label="Atlikti patikrinimai" value={stats?.inspections??0}/>
      <Tile icon={Users} label="Pradėjo dirbti" value={stats?.hires??0}/>
    </div>
  </>}
  <h2 className="mb-3 mt-7 flex items-center gap-2 text-lg font-bold"><CalendarDays className="size-5"/> Diagramos pagal datas</h2>
  <div className="grid gap-4 xl:grid-cols-2">
    <PeriodChart mode="work" today={today} source={{addresses,jobs:filtered,people}}/>
    <PeriodChart mode="cleaning" today={today} source={{addresses,jobs:filtered,people}}/>
    <PeriodChart mode="buildings" today={today} source={{addresses,jobs:filtered,people}}/>
    <PeriodChart mode="personnel" today={today} source={{addresses,jobs:filtered,people}}/>
  </div>
  <h2 className="mb-3 mt-7 text-lg font-bold">Darbuotojai</h2>
  <div className="card-surface p-4">
    {workers.length?workers.map(row=><div key={row.name} className="flex items-center justify-between border-b py-2 text-sm"><span>{row.name}</span><span className="text-muted-foreground tabular-nums">{row.completed} užbaigta · {row.planned} suplanuota</span></div>):<p className="text-sm text-muted-foreground">Įrašų dar nėra.</p>}
  </div>
  <p className="mt-5 rounded-lg border p-3 text-xs text-muted-foreground">
    DEMO skaičiai sudaromi tik iš šio įrenginio duomenų. Laikotarpių palyginimai veikia pagal jau įrašytus datuotus įvykius, tačiau įmonės senųjų objektų būsenų istorija gali būti nepilna.
    Tikslūs istoriniai būsenų pokyčiai ir ilgalaikis saugojimas bus įdiegti vėlesniame Supabase etape.
    Pajamų apskaita šiuo metu neįtraukta.
  </p>
 </div>;
}
