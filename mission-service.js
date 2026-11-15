'use strict';

// Aircraft assignment, rather than creator identity, controls mission visibility.
module.exports = function installMissions(app, {db, requireAuth, id, isoNow}) {
  db.exec(`CREATE TABLE IF NOT EXISTS mission_signoffs (
    id TEXT PRIMARY KEY, mission_id TEXT NOT NULL REFERENCES missions(id),
    revision INTEGER NOT NULL, user_id TEXT NOT NULL REFERENCES users(id),
    kind TEXT NOT NULL, outcome TEXT NOT NULL, context_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  ); CREATE INDEX IF NOT EXISTS mission_signoffs_revision_idx ON mission_signoffs(mission_id,revision);
  CREATE INDEX IF NOT EXISTS missions_aircraft_status_idx ON missions(aircraft_id,status,updated_at);`);
  function permissions(user, row) {
    const access=db.prepare(`SELECT m.role,aa.access_role FROM aircraft a
      JOIN memberships m ON m.organization_id=a.organization_id AND m.user_id=?
      LEFT JOIN aircraft_access aa ON aa.aircraft_id=a.id AND aa.user_id=m.user_id
      WHERE a.id=? AND a.organization_id=? AND a.status='active'`).get(user,row.aircraft_id,row.organization_id);
    const manager=!!access&&['administrator','aircraft_manager'].includes(access.role);
    const read=manager||!!access?.access_role;
    const write=read&&(manager||(access.role==='pilot'&&['pilot','aircraft_manager','administrator'].includes(access.access_role)));
    return {read,write,manage:manager,delete:write&&(manager||row.owner_user_id===user)};
  }
  function safe(row,user) {
    const value={...row,payload:JSON.parse(row.payload_json)};delete value.payload_json;
    value.local_mission_id=value.payload.local_mission_id||null;
    value.registration=db.prepare('SELECT registration FROM aircraft WHERE id=?').get(row.aircraft_id).registration;
    value.scope='aircraft';value.permissions=permissions(user,row);
    value.signoffs=db.prepare(`SELECT s.*,u.display_name FROM mission_signoffs s JOIN users u ON u.id=s.user_id WHERE mission_id=? ORDER BY created_at,id`).all(row.id).map(s=>{
      const result={...s,context:JSON.parse(s.context_json),current:s.revision===row.revision};delete result.context_json;return result;
    });
    return value;
  }
  function get(req,res,action='read') {
    const row=db.prepare('SELECT * FROM missions WHERE id=?').get(req.params.id);
    if(!row||!permissions(req.flightopsSession.user_id,row).read){res.status(404).json({ok:false,error:'MISSION_NOT_FOUND'});return null;}
    if(!permissions(req.flightopsSession.user_id,row)[action]){res.status(403).json({ok:false,error:'MISSION_ACCESS_DENIED'});return null;}
    return row;
  }
  function expected(req,res,row) {
    if(!Number.isInteger(req.body?.expected_revision)||req.body.expected_revision!==row.revision){
      res.status(409).json({ok:false,error:'REVISION_CONFLICT',current_revision:row.revision});return false;
    }return true;
  }
  function transaction(fn) {db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
  function revision(row,user,payload) {
    db.prepare('INSERT INTO mission_revisions(id,mission_id,revision,user_id,payload_json,created_at) VALUES(?,?,?,?,?,?)').run(id('rev'),row.id,row.revision,user,JSON.stringify(payload),isoNow());
  }
  function reply(req,res,row,status=200){return res.status(status).json({ok:true,mission:safe(row,req.flightopsSession.user_id)});}
  app.get('/api/missions',requireAuth,(req,res)=>{
    const status=String(req.query.status||'draft');
    if(!['draft','archived','deleted'].includes(status))return res.status(400).json({ok:false,error:'INVALID_STATUS'});
    // Return every authorized plan, including deletion markers for offline clients.
    const missions=db.prepare('SELECT * FROM missions WHERE status=? ORDER BY updated_at DESC').all(status)
      .filter(row=>permissions(req.flightopsSession.user_id,row).read).map(row=>safe(row,req.flightopsSession.user_id));
    res.json({ok:true,missions});
  });
  app.post('/api/missions',requireAuth,(req,res)=>transaction(()=>{
    const aircraft=db.prepare('SELECT * FROM aircraft WHERE id=?').get(String(req.body?.aircraft_id||''));
    const user=req.flightopsSession.user_id;
    if(!aircraft||!permissions(user,{aircraft_id:aircraft.id,organization_id:aircraft.organization_id}).write)
      return res.status(403).json({ok:false,error:'AIRCRAFT_ACCESS_DENIED'});
    const payload=req.body?.payload;
    if(!payload||typeof payload!=='object'||Array.isArray(payload))return res.status(400).json({ok:false,error:'INVALID_PAYLOAD'});
    const local=String(payload.local_mission_id||'').trim();
    if(local.length>200)return res.status(400).json({ok:false,error:'INVALID_CLIENT_ID'});
    const existing=local&&db.prepare("SELECT * FROM missions WHERE owner_user_id=? AND aircraft_id=? AND json_extract(payload_json,'$.local_mission_id')=?").get(user,aircraft.id,local);
    if(existing){if(existing.status==='deleted')return res.status(410).json({ok:false,error:'MISSION_DELETED'});
      return res.json({ok:true,reused:true,mission:safe(existing,user)});}
    const mid=id('mis'),now=isoNow(),b=req.body;
    db.prepare(`INSERT INTO missions(id,organization_id,aircraft_id,owner_user_id,trip_number,status,revision,mission_date,departure,destination,alternate,payload_json,created_at,updated_at)
      VALUES(?,?,?,?,?,'draft',1,?,?,?,?,?,?,?)`).run(mid,aircraft.organization_id,aircraft.id,user,b.trip_number||null,b.mission_date||null,b.departure||null,b.destination||null,b.alternate||null,JSON.stringify(payload),now,now);
    const row=db.prepare('SELECT * FROM missions WHERE id=?').get(mid);revision(row,user,payload);return reply(req,res,row,201);
  }));
  app.get('/api/missions/:id',requireAuth,(req,res)=>{const row=get(req,res);if(row)reply(req,res,row);});
  app.get('/api/missions/:id/revisions',requireAuth,(req,res)=>{
    const row=get(req,res);if(!row)return;
    res.json({ok:true,revisions:db.prepare('SELECT * FROM mission_revisions WHERE mission_id=? ORDER BY revision').all(row.id).map(r=>{
      const result={...r,payload:JSON.parse(r.payload_json)};delete result.payload_json;return result;
    })});
  });
  app.put('/api/missions/:id',requireAuth,(req,res)=>transaction(()=>{
    const row=get(req,res,'write');if(!row)return;
    if(row.status==='deleted')return res.status(410).json({ok:false,error:'MISSION_DELETED'});
    if(row.status!=='draft')return res.status(409).json({ok:false,error:'MISSION_NOT_DRAFT'});
    if(!expected(req,res,row))return;
    const b=req.body,p=b.payload;
    if(!p||typeof p!=='object'||Array.isArray(p))return res.status(400).json({ok:false,error:'INVALID_PAYLOAD'});
    // Client retry identity and aircraft are immutable, even for another editor.
    const prior=JSON.parse(row.payload_json);p.local_mission_id=prior.local_mission_id;
    const comparable=value=>{
      const copy=JSON.parse(JSON.stringify(value));delete copy.local_updated_at;
      // Cache bookkeeping is regenerated on every browser capture. The cached
      // operational data itself remains revision-controlled.
      if(copy.state?.offline_mission_package)delete copy.state.offline_mission_package.saved_at;
      const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
      return JSON.stringify(canonical(copy));
    };
    const sameMetadata=['trip_number','mission_date','departure','destination','alternate'].every(k=>(b[k]??row[k])===row[k]);
    if(sameMetadata&&comparable(p)===comparable(prior))return reply(req,res,row);
    db.prepare(`UPDATE missions SET trip_number=?,mission_date=?,departure=?,destination=?,alternate=?,payload_json=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?`)
      .run(b.trip_number??row.trip_number,b.mission_date??row.mission_date,b.departure??row.departure,b.destination??row.destination,b.alternate??row.alternate,JSON.stringify(p),isoNow(),row.id,row.revision);
    const updated=db.prepare('SELECT * FROM missions WHERE id=?').get(row.id);revision(updated,req.flightopsSession.user_id,p);return reply(req,res,updated);
  }));
  for(const action of ['archive','delete']){
    const method=action==='archive'?'post':'delete',route='/api/missions/:id'+(action==='archive'?'/archive':'');
    app[method](route,requireAuth,(req,res)=>transaction(()=>{
      const row=get(req,res,action==='delete'?'delete':'write');if(!row)return;
      const target=action==='archive'?'archived':'deleted';
      if(row.status===target)return action==='delete'?res.json({ok:true,deleted:true,mission_id:row.id}):reply(req,res,row);
      if(row.status==='deleted')return res.status(410).json({ok:false,error:'MISSION_DELETED'});
      if(!expected(req,res,row))return;
      const now=isoNow();
      db.prepare('UPDATE missions SET status=?,revision=revision+1,updated_at=?,archived_at=? WHERE id=? AND revision=?').run(target,now,action==='archive'?now:row.archived_at,row.id,row.revision);
      const updated=db.prepare('SELECT * FROM missions WHERE id=?').get(row.id);revision(updated,req.flightopsSession.user_id,JSON.parse(row.payload_json));
      return action==='delete'?res.json({ok:true,deleted:true,mission_id:row.id}):reply(req,res,updated);
    }));
  }
  app.post('/api/missions/:id/signoffs',requireAuth,(req,res)=>transaction(()=>{
    const row=get(req,res,'write');if(!row)return;
    if(row.status==='deleted')return res.status(410).json({ok:false,error:'MISSION_DELETED'});
    if(!expected(req,res,row))return;
    const {kind,outcome,context}=req.body;
    if(!['pilot_review','departure_notam','destination_notam','obstacle_review'].includes(kind)||!['reviewed_no_conflict','conflict','reviewed_restriction'].includes(outcome)||!context||typeof context!=='object'||Array.isArray(context)||JSON.stringify(context).length>64000)
      return res.status(400).json({ok:false,error:'INVALID_SIGNOFF'});
    // Signer, timestamp and revision come from authenticated server state.
    db.prepare('INSERT INTO mission_signoffs VALUES(?,?,?,?,?,?,?,?)').run(id('sig'),row.id,row.revision,req.flightopsSession.user_id,kind,outcome,JSON.stringify(context),isoNow());
    return reply(req,res,row,201);
  }));
};
