import type { ReactNode } from "react";
type Series={key:string;name:string;color:string};
type Props={data:readonly object[];series:Series[];title:string;line?:boolean};
export function AnalyticsSvg({data,series,title,line=false}:Props){
 const values=data.map(row=>row as Record<string,unknown>);
 const max=Math.max(0,...values.flatMap(row=>series.map(s=>Number(row[s.key]||0))));
 if(!values.length||max===0)return <div className="flex min-h-36 items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground"
  role="status">Pasirinktu laikotarpiu šiai diagramai duomenų nėra.</div>;
 const plotLeft=45,plotWidth=680,plotTop=16,plotHeight=180;
 const scale=(v:number)=>plotTop+plotHeight-(Math.max(0,v)/max)*plotHeight;
 const slot=plotWidth/values.length;
 const maxBars=series.length;
 const barWidth=Math.max(1,Math.min(24,(slot-3)/maxBars));
 const step=Math.max(1,Math.ceil(values.length/6));
 const legend:ReactNode=series.map((s,i)=><span key={s.key+"-"+i} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
  <span className="inline-block size-2.5 rounded-sm" style={{backgroundColor:s.color}}/>{s.name}</span>);
 return <div className="min-w-0" data-testid="sa-analytics-svg-chart">
  <svg viewBox="0 0 760 244" className="block h-auto w-full" role="img" aria-label={title+" – diagrama pagal datas"}>
   {[0,0.25,0.5,0.75,1].map(t=><g key={t}>
     <line x1={plotLeft} x2={plotLeft+plotWidth} y1={scale(max*t)} y2={scale(max*t)} stroke="#d5ded9" strokeDasharray="3 4"/>
     <text x={plotLeft-8} y={scale(max*t)+4} fontSize="12" textAnchor="end" fill="#64746a">{Math.round(max*t*10)/10}</text>
   </g>)}
   {line?series.map((ser,i)=>{
     const points=values.map((row,k)=>({x:plotLeft+slot*(k+0.5),y:scale(Number(row[ser.key]||0)),v:Number(row[ser.key]||0)}));
     return <g key={ser.key+"-"+i}>
       <polyline points={points.map(p=>p.x+","+p.y).join(" ")} stroke={ser.color} fill="none" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
       {points.map((p,k)=><circle key={k} cx={p.x} cy={p.y} r={values.length<=14?3:2} fill={ser.color}>
         <title>{String(values[k]?.['label']||"")+" – "+ser.name+": "+p.v}</title>
       </circle>)}
     </g>
   }):values.map((row,k)=>series.map((ser,i)=>{
     const value=Number(row[ser.key]||0);
     const x=plotLeft+slot*k+(slot-barWidth*maxBars)/2+barWidth*i;
     const y=scale(value);
     return <rect key={k+"-"+ser.key+"-"+i} x={x} y={y} width={barWidth} height={Math.max(value>0?1:0,plotTop+plotHeight-y)}
       rx="2" fill={ser.color}><title>{String(row['label']||"")+" – "+ser.name+": "+value}</title></rect>;
   }))}
   {values.map((row,i)=>i%step===0||i===values.length-1?<text key={i} x={plotLeft+slot*(i+0.5)} y="220"
     fontSize="12" fill="#64746a" textAnchor="middle">{String(row['label']||"").slice(0,10)}</text>:null)}
  </svg>
  <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1">{legend}</div>
 </div>;
}
