const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;
const AWC = "https://aviationweather.gov/api/data";
const NASR_RUNWAYS = "https://services.arcgis.com/xOi1kZaI0eWDREZv/ArcGIS/rest/services/Runways_View/FeatureServer/0/query";

app.use(express.json({limit:"1mb"}));
app.use((req,res,next)=>{
  res.set("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma","no-cache");
  res.set("Expires","0");
  next();
});
app.use(express.static(path.join(__dirname,"public"),{maxAge:0,etag:false}));

const first=x=>Array.isArray(x)?(x[0]||null):x;
const hpaToInhg=h=>h==null?null:Number(h)*0.0295299830714;
const pressureAlt=(e,a)=>e==null||a==null?null:Number(e)+(29.92-Number(a))*1000;
function densityAlt(pa,t){if(pa==null||t==null)return null;const isa=15-1.98*(Number(pa)/1000);return Number(pa)+120*(Number(t)-isa);}
function windComponents(h,d,s){if(h==null||d==null||s==null)return null;const a=(Number(d)-Number(h))*Math.PI/180,head=Math.cos(a)*Number(s),cross=Math.sin(a)*Number(s);return{headwind_kt:Math.round(Math.max(head,0)*10)/10,tailwind_kt:Math.round(Math.max(-head,0)*10)/10,crosswind_kt:Math.round(Math.abs(cross)*10)/10};}
async function awc(name,params){const u=new URL(`${AWC}/${name}`);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));const r=await fetch(u,{headers:{"Accept":"application/json","User-Agent":"KUSA-FlightOps/2.1"}});if(r.status===204)return null;if(!r.ok)throw new Error(`AWC ${name}: ${r.status}`);return await r.json();}

function gcBearing(lat1,lon1,lat2,lon2){
 const d2r=Math.PI/180,r2d=180/Math.PI;
 const p1=Number(lat1)*d2r,p2=Number(lat2)*d2r,dl=(Number(lon2)-Number(lon1))*d2r;
 const y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);
 return (Math.atan2(y,x)*r2d+360)%360;
}
function runwayNominalHeading(id){
 const m=String(id||"").match(/^(\d{1,2})/);if(!m)return null;
 let n=Number(m[1]); if(n===36)n=0; return n*10;
}
function angDiff(a,b){let d=Math.abs(Number(a)-Number(b))%360;return d>180?360-d:d}
function surfaceName(code){
 const c=String(code||"").toUpperCase();
 const map={ASPH:"Asphalt",CONC:"Concrete",TURF:"Turf",GRVL:"Gravel",DIRT:"Dirt",WATER:"Water",SNOW:"Snow",ICE:"Ice",BRICK:"Brick",MACADAM:"Macadam"};
 return c.split('-').map(x=>map[x]||x).join('/');
}
async function nasrRunwayLookup(icao){
 const id=String(icao||"").toUpperCase().trim();
 if(!id)return null;
 const candidates=[id];
 if(id.length===4)candidates.push(id.slice(1));
 const unique=[...new Set(candidates.filter(Boolean))];
 const where=unique.map(x=>`ARPT_ID='${x.replace(/'/g,"''")}'`).join(' OR ');
 const u=new URL(NASR_RUNWAYS);
 u.searchParams.set('where',where);
 u.searchParams.set('outFields','EFF_DATE,ARPT_ID,ARPT_NAME,CITY,STATE_CODE,RWY_ID,RWY_LEN,RWY_WIDTH,SURFACE_TYPE_CODE,COND,TREATMENT_CODE,LAT1_DECIMAL,LONG1_DECIMAL,LAT2_DECIMAL,LONG2_DECIMAL');
 u.searchParams.set('returnGeometry','false');
 u.searchParams.set('f','json');
 const r=await fetch(u,{headers:{'Accept':'application/json','User-Agent':'KUSA-FlightOps/4.7'}});
 if(!r.ok)throw new Error(`NASR runway lookup: ${r.status}`);
 const j=await r.json();
 const feats=Array.isArray(j.features)?j.features:[];
 if(!feats.length)return null;
 const rows=feats.map(f=>f.attributes||{});
 // Prefer exact FAA id, otherwise the stripped ICAO candidate.
 const exact=rows.filter(a=>String(a.ARPT_ID||'').toUpperCase()===id);
 const chosen=exact.length?exact:rows.filter(a=>unique.includes(String(a.ARPT_ID||'').toUpperCase()));
 if(!chosen.length)return null;
 const a0=chosen[0];
 const runways=[];
 for(const a of chosen){
   const parts=String(a.RWY_ID||'').split('/').map(x=>x.trim()).filter(Boolean);
   if(!parts.length)continue;
   let b12=null,b21=null;
   if([a.LAT1_DECIMAL,a.LONG1_DECIMAL,a.LAT2_DECIMAL,a.LONG2_DECIMAL].every(v=>v!=null&&Number.isFinite(Number(v)))){
     b12=gcBearing(a.LAT1_DECIMAL,a.LONG1_DECIMAL,a.LAT2_DECIMAL,a.LONG2_DECIMAL); b21=(b12+180)%360;
   }
   if(parts.length===1){
     runways.push({runway_id:parts[0],length_ft:Number(a.RWY_LEN)||null,width_ft:Number(a.RWY_WIDTH)||null,surface:surfaceName(a.SURFACE_TYPE_CODE),condition:a.COND||null,treatment:a.TREATMENT_CODE||null,heading:b12??runwayNominalHeading(parts[0]),source:'FAA NASR-derived live'});
   }else{
     const n0=runwayNominalHeading(parts[0]),n1=runwayNominalHeading(parts[1]);
     let h0=b12,h1=b21;
     if(b12!=null&&n0!=null&&n1!=null){
       const scoreNormal=angDiff(b12,n0)+angDiff(b21,n1),scoreSwap=angDiff(b21,n0)+angDiff(b12,n1);
       if(scoreSwap<scoreNormal){h0=b21;h1=b12;}
     }
     runways.push({runway_id:parts[0],length_ft:Number(a.RWY_LEN)||null,width_ft:Number(a.RWY_WIDTH)||null,surface:surfaceName(a.SURFACE_TYPE_CODE),condition:a.COND||null,treatment:a.TREATMENT_CODE||null,heading:h0??n0,source:'FAA NASR-derived live'});
     runways.push({runway_id:parts[1],length_ft:Number(a.RWY_LEN)||null,width_ft:Number(a.RWY_WIDTH)||null,surface:surfaceName(a.SURFACE_TYPE_CODE),condition:a.COND||null,treatment:a.TREATMENT_CODE||null,heading:h1??n1,source:'FAA NASR-derived live'});
   }
 }
 return {airport:{ident:id,faa_id:a0.ARPT_ID||null,name:a0.ARPT_NAME||id,city:a0.CITY||null,state:a0.STATE_CODE||null,source:'FAA NASR-derived USDOT/BTS Runways',effective_date:a0.EFF_DATE||null},runways};
}

function normMetar(m){if(!m)return null;return{icao:m.icaoId||m.icao,raw:m.rawOb||m.raw||m.raw_text,obs_time:m.reportTime||m.obsTime||m.obs_time,temp_c:m.temp??m.temp_c,dewpoint_c:m.dewp??m.dewpoint_c,wind_dir:m.wdir??m.wind_dir,wind_kt:m.wspd??m.wind_kt,wind_gust_kt:m.wgst??m.wind_gust_kt,visibility_sm:m.visib??m.visibility_sm,altimeter_hpa:m.altim??m.altimeter_hpa,flight_category:m.fltCat||m.flight_category,wx:m.wxString||m.wx||m.weather||null,clouds:m.clouds||m.sky||[]};}
function normTaf(t){if(!t)return null;return{icao:t.icaoId,raw:t.rawTAF,issue_time:t.issueTime,valid_from:t.validTimeFrom,valid_to:t.validTimeTo,forecast:t.fcsts};}

let runwayDb={};
try{runwayDb=JSON.parse(fs.readFileSync(path.join(__dirname,"data","runways.json"),"utf8"));}catch{}

// Built-in safety fallback for frequently used airports.
// The packaged data/runways.json remains the primary source; these entries prevent
// an older/missed runway JSON deployment from silently dropping KROG/KHII.
const runwayFallbackDb={
 KROG:{
  airport:{ident:"KROG",name:"Rogers Executive - Carter Field",elevation_ft:1359,source:"FlightOps packaged fallback"},
  runways:[
   {runway_id:"02",length_ft:6011,width_ft:100,surface:"Asphalt/Grooved",heading:19},
   {runway_id:"20",length_ft:6011,width_ft:100,surface:"Asphalt/Grooved",heading:199}
  ]
 },
 KHII:{
  airport:{ident:"KHII",name:"Lake Havasu City Airport",elevation_ft:783,source:"FlightOps packaged fallback"},
  runways:[
   {runway_id:"14",length_ft:8000,width_ft:100,surface:"Asphalt",heading:149},
   {runway_id:"32",length_ft:8000,width_ft:100,surface:"Asphalt",heading:329}
  ]
 }
};
for(const [icao,data] of Object.entries(runwayFallbackDb)){
 if(!runwayDb[icao] || !Array.isArray(runwayDb[icao].runways) || !runwayDb[icao].runways.length){
   runwayDb[icao]=data;
 }
}

async function airportBundle(icao){
 const id=String(icao||"").toUpperCase().trim();
 let airport=null,runways=[],runway_source="none";
 if(runwayDb[id]){airport=runwayDb[id].airport||null;runways=runwayDb[id].runways||[];runway_source="packaged";}
 if(!runways.length){
   try{
     const live=await nasrRunwayLookup(id);
     if(live&&live.runways&&live.runways.length){airport=live.airport;runways=live.runways;runway_source="faa_nasr_live";runwayDb[id]=live;}
   }catch(e){runway_source="nasr_lookup_failed";}
 }
 let metar=null,taf=null;
 try{metar=normMetar(first(await awc("metar",{ids:id,format:"json"})));}catch{}
 try{taf=normTaf(first(await awc("taf",{ids:id,format:"json"})));}catch{}
 const elev=airport?.elevation_ft??airport?.elev??airport?.elevation??null;
 const alt=hpaToInhg(metar?.altimeter_hpa),pa=pressureAlt(elev,alt),da=densityAlt(pa,metar?.temp_c);
 runways=runways.map(r=>({...r,wind_components:windComponents(r.heading,metar?.wind_dir,metar?.wind_kt)}));
 return{icao:id,airport:airport||{ident:id},runways,runway_source,metar,taf,pressure_altitude_ft:pa==null?null:Math.round(pa),density_altitude_ft:da==null?null:Math.round(da),altimeter_inhg:alt==null?null:Math.round(alt*100)/100};
}

function evalTakeoff(p){
 const f=[["Structural",40780]];
 if(p.climb_limited_weight_lb!=null)f.push(["Climb",Number(p.climb_limited_weight_lb)]);
 if(p.field_limited_weight_lb!=null)f.push(["Field length",Number(p.field_limited_weight_lb)]);
 f.sort((a,b)=>a[1]-b[1]);
 const [lim,max]=f[0],wm=max-Number(p.actual_takeoff_weight_lb),rm=p.balanced_field_length_ft==null?null:Number(p.runway_length_ft)-Number(p.balanced_field_length_ft);
 const checks={weight:wm>=0,runway:rm==null?true:rm>=0,obstacle:p.obstacle_clearance_verified==null?true:!!p.obstacle_clearance_verified};
 const complete=[p.climb_limited_weight_lb,p.field_limited_weight_lb,p.balanced_field_length_ft,p.v1_kt,p.vr_v2_kt].every(v=>v!=null);
 const ok=Object.values(checks).every(Boolean);
 return{max_allowable_takeoff_weight_lb:Math.round(max),limiting_factor:lim,weight_margin_lb:Math.round(wm),runway_margin_ft:rm==null?null:Math.round(rm),v1_kt:p.v1_kt??null,vr_v2_kt:p.vr_v2_kt??null,checks,status:ok&&complete?"GO":!ok?"NO-GO":"INCOMPLETE"};
}
function evalLanding(p){
 const f=[["Structural landing",35715]];
 if(p.climb_limited_weight_lb!=null)f.push(["Landing climb",Number(p.climb_limited_weight_lb)]);
 f.sort((a,b)=>a[1]-b[1]);
 const [lim,max]=f[0],wm=max-Number(p.actual_landing_weight_lb),d=p.landing_field_length_ft??p.landing_distance_ft??null,rm=d==null?null:Number(p.runway_length_ft)-Number(d);
 const checks={weight:wm>=0,runway:rm==null?true:rm>=0};
 const complete=p.climb_limited_weight_lb!=null&&d!=null&&p.vref_kt!=null;
 const ok=Object.values(checks).every(Boolean);
 return{max_allowable_landing_weight_lb:Math.round(max),limiting_factor:lim,weight_margin_lb:Math.round(wm),runway_margin_ft:rm==null?null:Math.round(rm),vref_kt:p.vref_kt??null,checks,status:ok&&complete?"GO":!ok?"NO-GO":"INCOMPLETE"};
}

app.get("/api/health",(req,res)=>res.json({ok:true,build:"4.7.0",platform:"GoDaddy Node.js",node:process.version,runway_airports_loaded:Object.keys(runwayDb).length}));
app.get("/api/diagnostics",async(req,res)=>{let ok=false,msg=null;try{ok=!!(await awc("metar",{ids:"KBPT",format:"json"}));}catch(e){msg=String(e.message||e);}res.json({backend:true,build:"4.7.0",awc_metar:ok,awc_message:msg,runway_source:"packaged + FAA NASR nationwide live fallback",runway_airports_loaded:Object.keys(runwayDb).length,nasr_live:true});});
app.get("/api/mission",async(req,res)=>{try{
 const dep=req.query.dep||"KBPT",dest=req.query.dest||"KDAL",alt=String(req.query.alt||"").toUpperCase().trim();
 const jobs=[airportBundle(dep),airportBundle(dest)];
 if(alt)jobs.push(airportBundle(alt));
 const results=await Promise.all(jobs);
 const payload={departure:results[0],destination:results[1]};
 if(alt)payload.alternate=results[2];
 res.json(payload);
}catch(e){res.status(502).json({error:String(e.message||e)});}});
app.post("/api/admin/ensure-nasr",(req,res)=>res.json({managed_centrally:true,runway_airports_loaded:Object.keys(runwayDb).length}));
app.post("/api/admin/refresh-nasr",(req,res)=>res.json({managed_centrally:true,message:"Central NASR refresh module pending.",runway_airports_loaded:Object.keys(runwayDb).length}));
app.post("/api/performance/takeoff",(req,res)=>{try{res.json(evalTakeoff(req.body||{}));}catch(e){res.status(400).json({error:String(e.message||e)});}});
app.post("/api/performance/landing",(req,res)=>{try{res.json(evalLanding(req.body||{}));}catch(e){res.status(400).json({error:String(e.message||e)});}});
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

app.listen(PORT,"0.0.0.0",()=>console.log(`KUSA FlightOps listening on ${PORT}`));
