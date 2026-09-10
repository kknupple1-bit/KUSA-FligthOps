const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;

// FAA NOTAM Management Service (NMS) OAuth2 client-credentials integration.
// Credentials MUST be supplied as server-side environment variables; never expose
// them through public/ or commit them to GitHub.
const NMS_CLIENT_ID =
  (process.env.NMS_CLIENT_ID || process.env.FAA_NMS_CLIENT_ID || "").trim().replace(/^([\'\"])(.*)\1$/,"$2");
const NMS_CLIENT_SECRET =
  (process.env.NMS_CLIENT_SECRET || process.env.FAA_NMS_CLIENT_SECRET || "").trim().replace(/^([\'\"])(.*)\1$/,"$2");
const NMS_AUTH_URL =
  process.env.NMS_AUTH_URL ||
  "https://api-nms.aim.faa.gov/v1/auth/token";
const NMS_BASE_URL =
  (process.env.NMS_BASE_URL || "https://api-nms.aim.faa.gov/nmsapi/v1").replace(/\/$/,"");
const NMS_RESPONSE_FORMAT = String(process.env.NMS_RESPONSE_FORMAT || "GEOJSON").toUpperCase()==="AIXM"?"AIXM":"GEOJSON";
const NMS_ENVIRONMENT = NMS_BASE_URL.includes("api-nms.aim.faa.gov")?"PRODUCTION":NMS_BASE_URL.includes("api-staging")?"STAGING":(process.env.NMS_ENVIRONMENT||"CUSTOM");
const NMS_MIN_PULL_MS = Math.max(0,Number(process.env.NMS_MIN_PULL_MS || (NMS_ENVIRONMENT==="PRODUCTION"?180000:0)));
const nmsAirportCache=new Map();

let nmsTokenCache={accessToken:"",expiresAt:0,issuedAt:0};
function nmsConfigured(){return !!(NMS_CLIENT_ID&&NMS_CLIENT_SECRET&&NMS_AUTH_URL&&NMS_BASE_URL)}
function nmsTokenValid(){return !!nmsTokenCache.accessToken && Date.now() < (nmsTokenCache.expiresAt-60000)}
function nmsDiagBase(){
  return {
    build:"5.23.6",
    provider:"FAA NMS",
    environment:NMS_ENVIRONMENT,
    auth_url:NMS_AUTH_URL,
    base_url:NMS_BASE_URL,
    response_format:NMS_RESPONSE_FORMAT,
    client_id_present:!!NMS_CLIENT_ID,
    client_secret_present:!!NMS_CLIENT_SECRET,
    client_id_length:NMS_CLIENT_ID.length,
    client_secret_length:NMS_CLIENT_SECRET.length
  };
}
function logNmsError(stage,e,extra={}){
  const msg=String(e?.message||e||"Unknown NMS error");
  console.error(`[NMS ${stage}] ${msg}`, JSON.stringify({...nmsDiagBase(),...extra}));
}
async function getNmsAccessToken(force=false){
  if(!nmsConfigured())throw new Error("NMS OAuth2 client credentials are not configured");
  if(!force&&nmsTokenValid())return nmsTokenCache.accessToken;
  const basic=Buffer.from(`${NMS_CLIENT_ID}:${NMS_CLIENT_SECRET}`,"utf8").toString("base64");
  const r=await fetch(NMS_AUTH_URL,{
    method:"POST",
    headers:{
      "Authorization":`Basic ${basic}`,
      "Content-Type":"application/x-www-form-urlencoded",
      "Accept":"application/json",
      "User-Agent":"KUSA-FlightOps/5.23.6"
    },
    body:"grant_type=client_credentials",
    cache:"no-store"
  });
  const txt=await r.text();
  let data=null; try{data=JSON.parse(txt)}catch{}
  if(!r.ok||!data?.access_token){
    const detail=data?.Error||data?.error_description||data?.message||data?.error||`HTTP ${r.status}`;
    const err=new Error(`NMS OAuth2 token request failed: ${detail}`);
    logNmsError("TOKEN",err,{http_status:r.status,response_excerpt:String(txt||"").slice(0,300)});
    throw err;
  }
  const expiresIn=Math.max(60,Number(data.expires_in)||1799);
  nmsTokenCache={accessToken:String(data.access_token),issuedAt:Date.now(),expiresAt:Date.now()+expiresIn*1000};
  return nmsTokenCache.accessToken;
}
function normalizeNmsGeoJson(data){
  const arr=Array.isArray(data?.data?.geojson)?data.data.geojson:
    Array.isArray(data?.geojson)?data.geojson:
    Array.isArray(data?.features)?data.features:[];
  return arr.map((feature)=>{
    const p=feature?.properties||{};
    const core=p.coreNOTAMData||p.coreNotamData||p;
    const n=core.notam||core.NOTAM||p.notam||p;
    const translations=Array.isArray(core.notamTranslation)?core.notamTranslation:
      Array.isArray(core.notamTranslations)?core.notamTranslations:[];
    const local=translations.find(t=>String(t?.type||"").toUpperCase()==="LOCAL_FORMAT")||translations[0]||{};
    const raw=local.simpleText||local.formattedText||n.simpleText||n.text||p.text||"";
    return{
      raw:String(raw||n.text||""),
      text:n.text||null,
      nmsId:n.id||p.id||null,
      notamNumber:n.number||n.notamNumber||null,
      series:n.series||null,
      classification:n.classification||null,
      accountId:n.accountId||null,
      location:n.location||null,
      icaoLocation:n.icaoLocation||null,
      effectiveStartDate:n.effectiveStart||n.effectiveStartDate||null,
      effectiveEndDate:n.effectiveEnd||n.effectiveEndDate||null,
      issued:n.issued||null,
      lastUpdated:n.lastUpdated||null,
      schedule:n.schedule||null,
      featureType:core?.notamEvent?.scenario||p.featureType||null
    };
  }).filter(x=>x.raw||x.text);
}

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
 const structuralMtow=40780;
 const f=[["Structural MTOW",structuralMtow]];
 if(p.climb_limited_weight_lb!=null)f.push(["AFMS climb",Number(p.climb_limited_weight_lb)]);
 if(p.field_limited_weight_lb!=null){
   const label=p.field_limit_basis==="SOURCE_CEILING"?"Field source coverage":"Field length";
   f.push([label,Number(p.field_limited_weight_lb)]);
 }
 f.sort((a,b)=>a[1]-b[1]);
 const [lim,max]=f[0],wm=max-Number(p.actual_takeoff_weight_lb),rm=p.balanced_field_length_ft==null?null:Number(p.runway_length_ft)-Number(p.balanced_field_length_ft);
 const checks={weight:wm>=0,runway:rm==null?true:rm>=0,obstacle:p.obstacle_clearance_verified==null?true:!!p.obstacle_clearance_verified};
 const complete=[p.climb_limited_weight_lb,p.field_limited_weight_lb,p.balanced_field_length_ft,p.v1_kt,p.vr_v2_kt].every(v=>v!=null);
 const ok=Object.values(checks).every(Boolean);
 return{
   structural_mtow_lb:structuralMtow,
   source_evaluated_max_takeoff_weight_lb:Math.round(max),
   max_allowable_takeoff_weight_lb:Math.round(max), // backward-compatible field; UI labels this source-evaluated max
   limiting_factor:lim,weight_margin_lb:Math.round(wm),runway_margin_ft:rm==null?null:Math.round(rm),
   v1_kt:p.v1_kt??null,vr_v2_kt:p.vr_v2_kt??null,checks,status:ok&&complete?"GO":!ok?"NO-GO":"INCOMPLETE"
 };
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

app.get("/api/health",(req,res)=>res.json({ok:true,build:"5.23.6",platform:"GoDaddy Node.js",node:process.version,runway_airports_loaded:Object.keys(runwayDb).length,nms_environment:NMS_ENVIRONMENT}));
app.get("/api/diagnostics",async(req,res)=>{
  let awcOk=false,awcMessage=null,nmsAuth=false,nmsMessage=null;
  try{awcOk=!!(await awc("metar",{ids:"KBPT",format:"json"}));}catch(e){awcMessage=String(e.message||e);}
  if(nmsConfigured()){try{await getNmsAccessToken();nmsAuth=true;}catch(e){nmsMessage=String(e.message||e);}}
  res.json({backend:true,build:"5.23.6",awc_metar:awcOk,awc_message:awcMessage,runway_source:"packaged + FAA NASR nationwide live fallback",runway_airports_loaded:Object.keys(runwayDb).length,nasr_live:true,nms:{configured:nmsConfigured(),authenticated:nmsAuth,environment:NMS_ENVIRONMENT,response_format:NMS_RESPONSE_FORMAT,message:nmsMessage}});
});

app.get("/api/notams/config",async(req,res)=>{
  res.set("Cache-Control","no-store");
  if(!nmsConfigured())return res.json({
    ok:true,configured:false,authenticated:false,provider:"FAA NMS",environment:NMS_ENVIRONMENT,
    auth:"OAuth2 client_credentials",response_format:NMS_RESPONSE_FORMAT,
    required_env:["NMS_CLIENT_ID","NMS_CLIENT_SECRET"],
    optional_env:["NMS_AUTH_URL","NMS_BASE_URL","NMS_RESPONSE_FORMAT","NMS_ENVIRONMENT"]
  });
  try{
    await getNmsAccessToken();
    res.json({ok:true,configured:true,authenticated:true,provider:"FAA NMS",environment:NMS_ENVIRONMENT,auth:"OAuth2 client_credentials",response_format:NMS_RESPONSE_FORMAT,token_cached:nmsTokenValid()});
  }catch(e){
    logNmsError("CONFIG",e);
    res.status(200).json({
      ok:false,configured:true,authenticated:false,
      provider:"FAA NMS",environment:NMS_ENVIRONMENT,auth:"OAuth2 client_credentials",
      message:String(e.message||e),
      diagnostics:nmsDiagBase()
    });
  }
});

app.get("/api/notams/ping",async(req,res)=>{
  if(!nmsConfigured())return res.status(503).json({ok:false,configured:false,message:"FAA NMS OAuth2 credentials are not configured."});
  try{
    let token=await getNmsAccessToken();
    const u=`${NMS_BASE_URL}/ping`;
    let r=await fetch(u,{headers:{"Authorization":`Bearer ${token}`},cache:"no-store"});
    if(r.status===401){token=await getNmsAccessToken(true);r=await fetch(u,{headers:{"Authorization":`Bearer ${token}`},cache:"no-store"});}
    const text=await r.text();
    let body=null;try{body=JSON.parse(text)}catch{}
    if(!r.ok){
      const msg=body?.message||body?.error||`FAA NMS ping HTTP ${r.status}`;
      logNmsError("PING_HTTP",msg,{http_status:r.status});
      return res.status(200).json({
        ok:false,configured:true,authenticated:r.status!==401,status:r.status,
        message:msg,diagnostics:nmsDiagBase()
      });
    }
    res.json({ok:true,configured:true,authenticated:true,environment:NMS_ENVIRONMENT,status:r.status,response:body||text,diagnostics:nmsDiagBase()});
  }catch(e){
    logNmsError("PING",e);
    res.status(200).json({ok:false,configured:true,authenticated:false,message:String(e.message||e),diagnostics:nmsDiagBase()});
  }
});

app.get("/api/notams",async(req,res)=>{
  const icao=String(req.query.icao||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4);
  if(!icao)return res.status(400).json({ok:false,source:"NONE",message:"ICAO required"});
  if(!nmsConfigured())return res.status(503).json({
    ok:false,source:"FAA NMS",configured:false,authenticated:false,
    message:"FAA NMS OAuth2 credentials are not configured on this server.",
    required_env:["NMS_CLIENT_ID","NMS_CLIENT_SECRET"]
  });

  try{
    const cached=nmsAirportCache.get(icao);
    if(cached && NMS_MIN_PULL_MS>0 && (Date.now()-cached.ts)<NMS_MIN_PULL_MS){
      return res.json({...cached.payload,cached:true,cache_age_sec:Math.floor((Date.now()-cached.ts)/1000),next_faa_refresh_sec:Math.ceil((NMS_MIN_PULL_MS-(Date.now()-cached.ts))/1000)});
    }
    let token=await getNmsAccessToken();
    const url=new URL(`${NMS_BASE_URL}/notams`);
    url.searchParams.set("location",icao);
    const request=async(t)=>fetch(url,{headers:{
      "Accept":"application/json",
      "Authorization":`Bearer ${t}`,
      "nmsResponseFormat":NMS_RESPONSE_FORMAT,
      "User-Agent":"KUSA-FlightOps/5.23.6"
    },cache:"no-store"});
    let r=await request(token);
    // Retry once with a forced token refresh if the cached access token expired/revoked.
    if(r.status===401){token=await getNmsAccessToken(true);r=await request(token);}
    const txt=await r.text();
    let data=null;try{data=JSON.parse(txt)}catch{}
    if(!r.ok){
      const detail=data?.message||data?.error||`HTTP ${r.status}`;
      return res.status(r.status===401?401:502).json({ok:false,source:"FAA NMS",configured:true,authenticated:r.status!==401,message:`FAA NMS request failed: ${detail}`});
    }
    if(!data)return res.status(502).json({ok:false,source:"FAA NMS",configured:true,authenticated:true,message:"FAA NMS returned non-JSON data."});

    const items=NMS_RESPONSE_FORMAT==="GEOJSON"?normalizeNmsGeoJson(data):[];
    if(NMS_RESPONSE_FORMAT!=="GEOJSON"){
      return res.status(501).json({ok:false,source:"FAA NMS",configured:true,authenticated:true,message:"FlightOps v5.20 display parser is configured for GEOJSON. Set NMS_RESPONSE_FORMAT=GEOJSON."});
    }
    res.set("Cache-Control","no-store");
    const payload={ok:true,configured:true,authenticated:true,source:`FAA NMS ${NMS_ENVIRONMENT}`,environment:NMS_ENVIRONMENT,response_format:NMS_RESPONSE_FORMAT,icao,count:items.length,checked_at:new Date().toISOString(),items,cached:false};
    if(NMS_MIN_PULL_MS>0)nmsAirportCache.set(icao,{ts:Date.now(),payload});
    res.json(payload);
  }catch(e){
    res.status(502).json({ok:false,source:"FAA NMS",configured:true,authenticated:false,message:`FAA NMS request failed: ${String(e.message||e)}`});
  }
});

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
