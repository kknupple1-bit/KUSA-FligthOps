const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;
const AWC = "https://aviationweather.gov/api/data";

app.use(express.json({limit:"1mb"}));
app.use(express.static(path.join(__dirname,"public"),{maxAge:"1h",etag:true}));

const first=x=>Array.isArray(x)?(x[0]||null):x;
const hpaToInhg=h=>h==null?null:Number(h)*0.0295299830714;
const pressureAlt=(e,a)=>e==null||a==null?null:Number(e)+(29.92-Number(a))*1000;
function densityAlt(pa,t){if(pa==null||t==null)return null;const isa=15-1.98*(Number(pa)/1000);return Number(pa)+120*(Number(t)-isa);}
function windComponents(h,d,s){if(h==null||d==null||s==null)return null;const a=(Number(d)-Number(h))*Math.PI/180,head=Math.cos(a)*Number(s),cross=Math.sin(a)*Number(s);return{headwind_kt:Math.round(Math.max(head,0)*10)/10,tailwind_kt:Math.round(Math.max(-head,0)*10)/10,crosswind_kt:Math.round(Math.abs(cross)*10)/10};}
async function awc(name,params){const u=new URL(`${AWC}/${name}`);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));const r=await fetch(u,{headers:{"Accept":"application/json","User-Agent":"KUSA-FlightOps/2.1"}});if(r.status===204)return null;if(!r.ok)throw new Error(`AWC ${name}: ${r.status}`);return await r.json();}
function normMetar(m){if(!m)return null;return{icao:m.icaoId,raw:m.rawOb,obs_time:m.reportTime||m.obsTime,temp_c:m.temp,dewpoint_c:m.dewp,wind_dir:m.wdir,wind_kt:m.wspd,wind_gust_kt:m.wgst,visibility_sm:m.visib,altimeter_hpa:m.altim,flight_category:m.fltCat,clouds:m.clouds};}
function normTaf(t){if(!t)return null;return{icao:t.icaoId,raw:t.rawTAF,issue_time:t.issueTime,valid_from:t.validTimeFrom,valid_to:t.validTimeTo,forecast:t.fcsts};}

let runwayDb={};
try{runwayDb=JSON.parse(fs.readFileSync(path.join(__dirname,"data","runways.json"),"utf8"));}catch{}

async function airportBundle(icao){
 const id=String(icao||"").toUpperCase().trim();
 let airport=null,runways=[];
 if(runwayDb[id]){airport=runwayDb[id].airport||null;runways=runwayDb[id].runways||[];}
 let metar=null,taf=null;
 try{metar=normMetar(first(await awc("metar",{ids:id,format:"json"})));}catch{}
 try{taf=normTaf(first(await awc("taf",{ids:id,format:"json"})));}catch{}
 const elev=airport?.elevation_ft??airport?.elev??airport?.elevation??null;
 const alt=hpaToInhg(metar?.altimeter_hpa),pa=pressureAlt(elev,alt),da=densityAlt(pa,metar?.temp_c);
 runways=runways.map(r=>({...r,wind_components:windComponents(r.heading,metar?.wind_dir,metar?.wind_kt)}));
 return{icao:id,airport:airport||{ident:id},runways,metar,taf,pressure_altitude_ft:pa==null?null:Math.round(pa),density_altitude_ft:da==null?null:Math.round(da),altimeter_inhg:alt==null?null:Math.round(alt*100)/100};
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

app.get("/api/health",(req,res)=>res.json({ok:true,platform:"GoDaddy Node.js",node:process.version,runway_airports_loaded:Object.keys(runwayDb).length}));
app.get("/api/diagnostics",async(req,res)=>{let ok=false,msg=null;try{ok=!!(await awc("metar",{ids:"KBPT",format:"json"}));}catch(e){msg=String(e.message||e);}res.json({backend:true,awc_metar:ok,awc_message:msg,runway_source:Object.keys(runwayDb).length>0,runway_airports_loaded:Object.keys(runwayDb).length});});
app.get("/api/mission",async(req,res)=>{try{const dep=req.query.dep||"KBPT",dest=req.query.dest||"KDAL";const [departure,destination]=await Promise.all([airportBundle(dep),airportBundle(dest)]);res.json({departure,destination});}catch(e){res.status(502).json({error:String(e.message||e)});}});
app.post("/api/admin/ensure-nasr",(req,res)=>res.json({managed_centrally:true,runway_airports_loaded:Object.keys(runwayDb).length}));
app.post("/api/admin/refresh-nasr",(req,res)=>res.json({managed_centrally:true,message:"Central NASR refresh module pending.",runway_airports_loaded:Object.keys(runwayDb).length}));
app.post("/api/performance/takeoff",(req,res)=>{try{res.json(evalTakeoff(req.body||{}));}catch(e){res.status(400).json({error:String(e.message||e)});}});
app.post("/api/performance/landing",(req,res)=>{try{res.json(evalLanding(req.body||{}));}catch(e){res.status(400).json({error:String(e.message||e)});}});
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

app.listen(PORT,"0.0.0.0",()=>console.log(`KUSA FlightOps listening on ${PORT}`));
