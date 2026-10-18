import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BarChart3, Building2, ClipboardCheck, ClockAlert, TrendingDown, TrendingUp } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { PageHeader } from "@/components/app/ui-bits";
import { useAppState } from "@/lib/store";
import { summaryAnalytics, workBuckets, objectChangeMonths, personnelMovementMonths } from "@/lib/analytics";
import { todayISO } from "@/lib/dates";

export const Route=createFileRoute("/analitika")({ component: AnalyticsPage });
function Tile({label,value,description,icon:Icon}: {label:string,value:number|string,description?:string,icon:typeof Building2}) {
  return <div className="card-surface p-4">
    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Icon className="size-4 text-primary"/>{label}</div>
    <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
    {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
  </div>;
}
const chartAxis={fontSize:11,fill:"#64746a"};
const seriesColors={stairs:"#376d50",territory:"#dfa14a",planned:"#8ca49a",done:"#276a4c",loss:"#d15c52"};
function AnalyticsPage(){
  const {addresses,jobs,people}=useAppState();
  const [period,setPeriod]=useState<7|30|90>(30);
  const [kind,setKind]=useState<"visos"|"laiptine"|"teritorija"|"patikrinimas">("visos");
  const today=todayISO();
  const selected=useMemo(()=>jobs.filter(j=>kind==="visos"||j.type===kind),[jobs,kind]);
  const data=useMemo(()=>summaryAnalytics(addresses,selected,period,today),[addresses,selected,period,today]);
  const complete=useMemo(()=>workBuckets(selected,period,today),[selected,period,today]);
  const churn=useMemo(()=>objectChangeMonths(addresses,today),[addresses,today]);
  const personnelChurn=useMemo(()=>personnelMovementMonths(people,today),[people,today]);
  const managed=people.filter(p=>p.role==="vadybininkas");
  const workerResults=people.filter(p=>p.role==="darbuotojas").map(p=>({
    name:p.name,
    completed:selected.filter(j=>j.worker===p.name&&j.status==="atlikta"&&j.completedAt?.slice(0,10)>=data.start&&j.completedAt?.slice(0,10)<=today).length,
    planned:selected.filter(j=>j.worker===p.name&&j.date>=data.start&&j.date<=today).length,
  })).sort((a,b)=>b.completed-a.completed);
  const managers=managed.map(p=>({
    name:p.name,
    assigned:selected.filter(j=>j.managerId===p.id&&j.date>=data.start&&j.date<=today).length,
    completed:selected.filter(j=>j.managerId===p.id&&j.status==="atlikta"&&j.completedAt?.slice(0,10)>=data.start&&j.completedAt?.slice(0,10)<=today).length
  }));
  const percent=data.planned?Math.min(100,Math.round(data.completed/data.planned*100)):0;
  return <div>
    <PageHeader title="Analitika" subtitle="Objektų ir valymo darbų rezultatai · tik šiame įrenginyje"/>
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <div><label htmlFor="period" className="mb-1 block text-xs font-semibold">Laikotarpis</label>
        <select id="period" value={period} onChange={e=>setPeriod(Number(e.target.value) as 7|30|90)} className="rounded-lg border bg-card px-3 py-2.5 text-sm">
          <option value={7}>7 dienos</option><option value={30}>30 dienų</option><option value={90}>90 dienų</option>
        </select>
      </div>
      <div><label htmlFor="analytics-kind" className="mb-1 block text-xs font-semibold">Paslaugos tipas</label>
        <select id="analytics-kind" value={kind} onChange={e=>setKind(e.target.value as typeof kind)} className="rounded-lg border bg-card px-3 py-2.5 text-sm">
          <option value="visos">Visi darbai</option><option value="laiptine">Laiptinių valymas</option><option value="teritorija">Teritorijų valymas</option><option value="patikrinimas">Patikrinimai</option>
        </select>
      </div>
      <p className="text-xs text-muted-foreground">Duomenys: {data.start} – {today}</p>
    </div>

    <h2 className="mb-3 text-lg font-bold">Objektai</h2>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile icon={Building2} label="Aktyvūs objektai" value={data.active} description="Vienas adresas skaičiuojamas vieną kartą"/>
      <Tile icon={Building2} label="Laiptinių objektai" value={data.stairwellBuildings} description={data.entrances+" laiptinės iš viso"}/>
      <Tile icon={Building2} label="Teritorijų objektai" value={data.territoryBuildings} description="Objektai su teritorijų priežiūra"/>
      <Tile icon={ClipboardCheck} label="Aptarnauti unikalūs objektai" value={data.checkedBuildings} description="Turėjo užbaigtų darbų per laikotarpį"/>
    </div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <Tile icon={TrendingUp} label="Nauji objektai" value={data.newObjects} description="Pagal aptarnavimo pradžią / sukūrimo datą"/>
      <Tile icon={TrendingDown} label="Nebeteikiamos paslaugos" value={data.leftObjects} description="Pagal nurodytą pabaigos datą"/>
    </div>

    <h2 className="mb-3 mt-7 text-lg font-bold">Darbai</h2>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile icon={BarChart3} label="Suplanuota darbų" value={data.planned} description="Pagal pirminę planavimo datą"/>
      <Tile icon={ClipboardCheck} label="Užbaigta darbų" value={data.completed} description="Pagal faktinę užbaigimo datą"/>
      <Tile icon={ClockAlert} label="Vėluojantys" value={data.overdue} description="Visi nebaigti darbai iki šiandien"/>
      <Tile icon={ClipboardCheck} label="Atlikimo santykis" value={data.planned ? percent+"%" : "—"} description="Užbaigta / suplanuota (orientacinis)"/>
    </div>
    <div className="mt-3 grid gap-3 sm:grid-cols-3">
      <Tile icon={ClipboardCheck} label="Laiptinių valymai" value={data.completedStairwell}/>
      <Tile icon={ClipboardCheck} label="Teritorijų valymai" value={data.completedTerritory}/>
      <Tile icon={ClipboardCheck} label="Patikrinimai" value={data.completedInspections}/>
    </div>

    <div className="mt-6 grid gap-4 xl:grid-cols-2">
      <section className="card-surface p-4">
        <h3 className="mb-3 font-bold">Laiptinių ir teritorijų darbai</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={complete} margin={{top:8,right:8,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="label" tick={chartAxis} minTickGap={10}/>
              <YAxis allowDecimals={false} tick={chartAxis}/>
              <Tooltip/><Legend/>
              <Bar dataKey="stairwell" name="Laiptinės" fill={seriesColors.stairs} radius={[4,4,0,0]}/>
              <Bar dataKey="territory" name="Teritorijos" fill={seriesColors.territory} radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="card-surface p-4">
        <h3 className="mb-3 font-bold">Suplanuota ir užbaigta</h3>
        <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%">
          <LineChart data={complete} margin={{top:8,right:8,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label" tick={chartAxis} minTickGap={10}/><YAxis allowDecimals={false} tick={chartAxis}/><Tooltip/><Legend/>
            <Line type="monotone" dataKey="planned" name="Suplanuota" stroke={seriesColors.planned} strokeWidth={2}/>
            <Line type="monotone" dataKey="completed" name="Užbaigta" stroke={seriesColors.done} strokeWidth={3}/>
          </LineChart>
        </ResponsiveContainer></div>
      </section>
      <section className="card-surface p-4 xl:col-span-2">
        <h3 className="mb-3 font-bold">Naujų ir nebeaptarnaujamų namų pokytis · 6 mėn.</h3>
        <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={churn} margin={{top:8,right:8,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={chartAxis}/><YAxis allowDecimals={false} tick={chartAxis}/><Tooltip/><Legend/>
            <Bar dataKey="added" name="Nauji" fill={seriesColors.done} radius={[4,4,0,0]}/>
            <Bar dataKey="left" name="Atkrito" fill={seriesColors.loss} radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer></div>
      </section>
    </div>

    <h2 className="mb-3 mt-7 text-lg font-bold">Personalas</h2>
    <section className="card-surface mb-4 p-4">
      <h3 className="mb-2 font-bold">Darbuotojų kaita · 6 mėn.</h3>
      <p className="mb-3 text-xs text-muted-foreground">Skaičiuojami darbo pradžios ir pabaigos įvykiai. Sugrįžus tam pačiam darbuotojui, atsiranda naujas laikotarpis, bet neišnyksta ankstesnis. Profilių sukūrimo datos nėra prilyginamos įdarbinimui.</p>
      <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%">
        <BarChart data={personnelChurn} margin={{top:8,right:8,left:-20,bottom:0}}>
          <CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={chartAxis}/><YAxis allowDecimals={false} tick={chartAxis}/><Tooltip/><Legend/>
          <Bar dataKey="started" name="Pradėjo dirbti" fill={seriesColors.done} radius={[4,4,0,0]}/>
          <Bar dataKey="left" name="Išėjo iš darbo" fill={seriesColors.loss} radius={[4,4,0,0]}/>
        </BarChart>
      </ResponsiveContainer></div>
    </section>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card-surface p-4"><h3 className="mb-3 font-semibold">Darbuotojų darbai</h3>
        {workerResults.length?workerResults.map(row=><div key={row.name} className="flex items-center justify-between border-b py-2 text-sm"><span>{row.name}</span><span className="tabular-nums text-muted-foreground">{row.completed} užbaigta · {row.planned} suplanuota</span></div>):<p className="text-sm text-muted-foreground">Darbuotojų nėra.</p>}
      </section>
      <section className="card-surface p-4"><h3 className="mb-3 font-semibold">Vadybininkų priskyrimai</h3>
        {managers.length?managers.map(row=><div key={row.name} className="flex items-center justify-between border-b py-2 text-sm"><span>{row.name}</span><span className="tabular-nums text-muted-foreground">{row.completed} užbaigta · {row.assigned} priskirta</span></div>):<p className="text-sm text-muted-foreground">Vadybininkų dar nėra.</p>}
      </section>
    </div>
    <p className="mt-5 rounded-lg border p-3 text-xs text-muted-foreground">
      DEMO analitika apskaičiuojama iš šio įrenginio naršyklėje saugomų objektų, darbų ir datų.
      Finansai ir pajamos neįtraukti. Naujų objektų pokyčiui tiksliai sekti nurodykite aptarnavimo pradžią ir pabaigą.
      Užbaigtų ir suplanuotų darbų skaičiai gali skirtis, nes darbai galėjo būti suplanuoti kitam laikotarpiui.
      Tikras prieigos teises įgyvendinsime tik po Supabase prijungimo.
    </p>
  </div>;
}
