import { useState, useEffect, useRef } from "react";

// ── Constants ──────────────────────────────────────────────────────────────
const CLIENTS_LIST = [
  "Aline","Americana","AP Engenharia","Bioessência","Coperfarma",
  "Doma Cosméticos","Fran Cendron","Ingalimp","Isadora","Juninho Vende",
  "Leda","Manu Arquitetura","Marcela - Lash e Brown","Mari Garcia","Murilo Bianco",
  "Nathalia","Petshop","Suellem","Vikce","Wood",
];

const PALETTE = [
  "#7C3AED","#DC6B2F","#059669","#DB2777","#2563EB",
  "#D97706","#4F46E5","#EA580C","#0D9488","#9333EA",
  "#CA8A04","#1D4ED8","#B91C1C","#16A34A","#92400E",
  "#0891B2","#BE185D","#4338CA","#B45309","#047857",
];

const STATUS_CFG = {
  pendente: { label:"Pendente", color:"#F59E0B", bg:"rgba(245,158,11,.13)", border:"rgba(245,158,11,.25)" },
  agendado: { label:"Agendado", color:"#60A5FA", bg:"rgba(96,165,250,.13)", border:"rgba(96,165,250,.25)" },
  postado:  { label:"Postado",  color:"#34D399", bg:"rgba(52,211,153,.13)", border:"rgba(52,211,153,.25)" },
  atrasado: { label:"Atrasado", color:"#F87171", bg:"rgba(248,113,113,.13)", border:"rgba(248,113,113,.25)" },
};

const TYPE_LIST     = ["Reel","Post","Story","Carrossel","BTS","Feed","Outro"];
const PLATFORM_LIST = ["Instagram","TikTok","YouTube","LinkedIn","Facebook"];

const PLATFORM_CLR = {
  Instagram:"#E1306C", TikTok:"#69C9D0", YouTube:"#FF0000",
  LinkedIn:"#0077B5",  Facebook:"#1877F2",
};

// ── Helpers ────────────────────────────────────────────────────────────────
const clr  = i => PALETTE[i % PALETTE.length];
const ini  = n => n.split(" ").slice(0,2).map(w=>w[0].toUpperCase()).join("");
const slug = s => s.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
const uid  = () => Math.random().toString(36).slice(2)+Date.now().toString(36);

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

function getMonthOptions() {
  const list = [];
  const now  = new Date();
  for (let i = -3; i <= 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth()+i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const label = d.toLocaleDateString("pt-BR",{month:"short",year:"numeric"})
      .replace(".","").replace(/^\w/,c=>c.toUpperCase());
    list.push({ val, label });
  }
  return list;
}

function monthLabel(m) {
  const [y,mo] = m.split("-");
  return new Date(+y, +mo-1, 1)
    .toLocaleDateString("pt-BR",{month:"long",year:"numeric"})
    .replace(/^\w/,c=>c.toUpperCase());
}

function loadData() {
  try { return JSON.parse(localStorage.getItem("aigo-inventory-v1")||"{}"); }
  catch { return {}; }
}

function saveData(d) {
  localStorage.setItem("aigo-inventory-v1", JSON.stringify(d));
}

function loadConfig() {
  try { return JSON.parse(localStorage.getItem("aigo-inventory-cfg")||"{}"); }
  catch { return {}; }
}

function saveConfig(c) {
  localStorage.setItem("aigo-inventory-cfg", JSON.stringify(c));
}

// Aceita tanto o ID puro quanto a URL completa da pasta do Drive
function extractFolderId(input) {
  const trimmed = (input || "").trim();
  const match = trimmed.match(/[-\w]{20,}/);
  return match ? match[0] : trimmed;
}

// Fuzzy match: "Doma Cosméticos" ↔ "doma cosmeticos"
function normName(s) {
  return s.toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu,"")
    .replace(/[^a-z0-9]/g," ").replace(/\s+/g," ").trim();
}

function matchClientToFolder(clientName, folders) {
  const cn = normName(clientName);
  return folders.find(f => normName(f.name) === cn)
    || folders.find(f => normName(f.name).includes(cn) || cn.includes(normName(f.name)));
}

function monthNumFromYearMonth(ym) { return parseInt(ym.split("-")[1]); }

function matchMonthFolder(folders, monthNum) {
  const PT = ["","janeiro","fevereiro","março","abril","maio","junho",
              "julho","agosto","setembro","outubro","novembro","dezembro"];
  const target = PT[monthNum];
  return folders.find(f => {
    const low = normName(f.name);
    if (low.includes(target)) return true;
    const numMatch = f.name.match(/(\d{1,2})/);
    if (numMatch && parseInt(numMatch[1]) === monthNum) return true;
    return false;
  });
}

function getItems(data, cid, month) { return data[cid]?.[month] || []; }

function stats(items) {
  return {
    total:    items.length,
    postado:  items.filter(i=>i.status==="postado").length,
    agendado: items.filter(i=>i.status==="agendado").length,
    pendente: items.filter(i=>i.status==="pendente").length,
    atrasado: items.filter(i=>i.status==="atrasado").length,
  };
}

const STATUS_CYCLE = ["pendente","agendado","postado"];

// ── Micro-components ───────────────────────────────────────────────────────
function Avatar({ name, idx, size=40 }) {
  const c = clr(idx);
  return (
    <div style={{
      width:size, height:size, borderRadius:size*0.28,
      background:`linear-gradient(135deg,${c},${c}88)`,
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:size*0.32, fontWeight:800, color:"#fff",
      fontFamily:"'Montserrat',sans-serif", flexShrink:0,
      boxShadow:`0 4px 14px ${c}55`,
    }}>{ini(name)}</div>
  );
}

function StatusPill({ status, onClick, tiny }) {
  const s = STATUS_CFG[status]||STATUS_CFG.pendente;
  return (
    <span
      onClick={onClick}
      title={onClick?"Clique para mudar status":undefined}
      style={{
        display:"inline-flex",alignItems:"center",gap:5,
        background:s.bg, color:s.color,
        border:`1px solid ${s.border}`,
        padding: tiny?"2px 8px":"4px 11px",
        borderRadius:100, fontSize: tiny?10:11, fontWeight:700,
        fontFamily:"'Montserrat',sans-serif", letterSpacing:".03em",
        cursor: onClick?"pointer":"default",
        userSelect:"none", whiteSpace:"nowrap",
        transition:"opacity .15s",
      }}
      onMouseEnter={e=>onClick&&(e.currentTarget.style.opacity=".75")}
      onMouseLeave={e=>onClick&&(e.currentTarget.style.opacity="1")}
    >
      <span style={{width:5,height:5,borderRadius:"50%",background:s.color,flexShrink:0}}/>
      {s.label}
    </span>
  );
}

function TypeChip({ type }) {
  return (
    <span style={{
      background:"rgba(255,255,255,.06)",color:"rgba(255,255,255,.55)",
      padding:"3px 8px",borderRadius:6,fontSize:10,fontWeight:700,
      fontFamily:"'Montserrat',sans-serif",letterSpacing:".06em",
      textTransform:"uppercase",whiteSpace:"nowrap",
    }}>{type}</span>
  );
}

function PlatChip({ platform }) {
  const c = PLATFORM_CLR[platform]||"#aaa";
  return (
    <span style={{
      background:`${c}1a`,color:c,
      padding:"3px 8px",borderRadius:6,fontSize:10,fontWeight:700,
      fontFamily:"'Montserrat',sans-serif",letterSpacing:".04em",
      whiteSpace:"nowrap",
    }}>{platform}</span>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{
      background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",
      borderRadius:14,padding:"16px 20px",display:"flex",flexDirection:"column",gap:6,
      minWidth:0,flex:1,
    }}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.35)",
          textTransform:"uppercase",letterSpacing:".08em",fontFamily:"'Montserrat',sans-serif"}}>
          {label}
        </span>
        <span style={{fontSize:16}}>{icon}</span>
      </div>
      <span style={{fontSize:28,fontWeight:800,color:color||"#fff",
        fontFamily:"'Montserrat',sans-serif",lineHeight:1}}>
        {value}
      </span>
    </div>
  );
}

// ── Config Modal ───────────────────────────────────────────────────────────
function ConfigModal({ config, onClose, onSave }) {
  const [rootId, setRootId] = useState(config.rootFolderId || "");
  const inputStyle = {
    background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)",
    borderRadius:10, padding:"9px 13px", color:"#fff",
    fontFamily:"'Montserrat',sans-serif", fontSize:12, outline:"none", width:"100%",
  };
  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,.75)",backdropFilter:"blur(6px)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,
    }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{
        background:"#120020",border:"1px solid rgba(255,255,255,.1)",
        borderRadius:20,padding:28,width:"100%",maxWidth:460,
        boxShadow:"0 32px 80px rgba(0,0,0,.8)",fontFamily:"'Montserrat',sans-serif",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
          <span style={{fontSize:22}}>⚙️</span>
          <h3 style={{color:"#fff",fontWeight:800,fontSize:16,margin:0}}>Configurar Google Drive</h3>
          <button onClick={onClose} style={{
            marginLeft:"auto",background:"rgba(255,255,255,.08)",border:"none",
            borderRadius:8,color:"rgba(255,255,255,.6)",cursor:"pointer",
            width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,
          }}>✕</button>
        </div>

        <p style={{color:"rgba(255,255,255,.4)",fontSize:12,lineHeight:1.6,marginBottom:18}}>
          Cole o ID da pasta raiz do Drive (ex: a pasta <strong style={{color:"rgba(255,255,255,.7)"}}>2026</strong>).
          O sistema vai descobrir automaticamente as pastas de cada cliente e mês dentro dela.
        </p>

        <div style={{marginBottom:6}}>
          <label style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.32)",
            textTransform:"uppercase",letterSpacing:".07em",display:"block",marginBottom:6}}>
            ID da pasta raiz (2026)
          </label>
          <input value={rootId} onChange={e=>setRootId(e.target.value)}
            placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
            style={inputStyle}
            onFocus={e=>e.target.style.borderColor="rgba(160,100,255,.6)"}
            onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}/>
        </div>

        <p style={{color:"rgba(255,255,255,.25)",fontSize:10,marginBottom:20,lineHeight:1.5}}>
          Abra a pasta no Drive → copie o trecho após <code style={{color:"rgba(255,255,255,.4)"}}>/folders/</code> na URL.
        </p>

        <button onClick={()=>onSave({ rootFolderId: extractFolderId(rootId) })}
          disabled={!rootId.trim()}
          style={{
            width:"100%",background:"linear-gradient(135deg,#7C3AED,#4338CA)",
            border:"none",borderRadius:12,padding:"11px 0",
            color:"#fff",fontWeight:700,fontSize:13,
            fontFamily:"'Montserrat',sans-serif",cursor:"pointer",
            opacity:rootId.trim()?1:0.5,
            boxShadow:"0 4px 16px rgba(124,58,237,.4)",
          }}>
          Salvar configuração
        </button>
      </div>
    </div>
  );
}

// ── Auto Sync Modal ────────────────────────────────────────────────────────
function AutoSyncModal({ rootFolderId, month, onClose, onDone }) {
  const [log, setLog]       = useState([]);
  const [running, setRunning] = useState(true);
  const logRef = useRef();

  useEffect(() => {
    let cancelled = false;
    const monthNum = monthNumFromYearMonth(month);
    const addLog = (msg, type="info") => {
      if (cancelled) return;
      setLog(p => [...p, { msg, type, t: Date.now() }]);
      setTimeout(() => { if(logRef.current) logRef.current.scrollTop = 99999; }, 50);
    };

    async function run() {
      try {
        addLog("Descobrindo pastas de clientes...");
        const r1 = await fetch("/api/drive-discover", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ rootFolderId }),
        });
        const { clients: driveFolders, error: e1 } = await r1.json();
        if (e1) throw new Error(e1);
        addLog(`${driveFolders.length} pasta(s) encontrada(s) no Drive.`);

        const results = {};
        for (const clientName of CLIENTS_LIST) {
          if (cancelled) return;
          const folder = matchClientToFolder(clientName, driveFolders);
          if (!folder) { addLog(`${clientName} — pasta não encontrada`, "skip"); continue; }

          // Discover month folders
          const r2 = await fetch("/api/drive-discover", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ clientFolderId: folder.id }),
          });
          const { months: monthFolders, error: e2 } = await r2.json();
          if (e2) { addLog(`${clientName} — erro: ${e2}`, "error"); continue; }

          const mf = matchMonthFolder(monthFolders || [], monthNum);
          if (!mf) { addLog(`${clientName} — mês não encontrado`, "skip"); continue; }

          // Get files
          const r3 = await fetch("/api/drive-discover", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ monthFolderId: mf.id }),
          });
          const { files, error: e3 } = await r3.json();
          if (e3) { addLog(`${clientName} — erro: ${e3}`, "error"); continue; }

          results[clientName] = files || [];
          addLog(`${clientName} — ${(files||[]).length} arquivo(s) importado(s)`, "ok");
        }

        if (!cancelled) { setRunning(false); onDone(results, month); }
      } catch(e) {
        if (!cancelled) { addLog("Erro: "+e.message, "error"); setRunning(false); }
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  const logColors = { info:"rgba(255,255,255,.5)", ok:"#34D399", skip:"rgba(255,255,255,.3)", error:"#F87171" };

  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,.8)",backdropFilter:"blur(8px)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,
    }}>
      <div style={{
        background:"#120020",border:"1px solid rgba(255,255,255,.1)",
        borderRadius:20,padding:28,width:"100%",maxWidth:480,
        boxShadow:"0 32px 80px rgba(0,0,0,.8)",fontFamily:"'Montserrat',sans-serif",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
          <span style={{fontSize:22}}>{running?"⏳":"✅"}</span>
          <h3 style={{color:"#fff",fontWeight:800,fontSize:16,margin:0}}>
            {running ? "Sincronizando Drive..." : "Sincronização concluída"}
          </h3>
        </div>

        <div ref={logRef} style={{
          background:"rgba(0,0,0,.4)",borderRadius:12,
          padding:"12px 14px",maxHeight:280,overflowY:"auto",
          fontFamily:"monospace",fontSize:11,lineHeight:1.8,
          border:"1px solid rgba(255,255,255,.07)",marginBottom:18,
        }}>
          {log.map((l,i)=>(
            <div key={i} style={{color:logColors[l.type]||"#fff"}}>
              {l.type==="ok"?"✓ ":l.type==="error"?"✗ ":l.type==="skip"?"— ":"  "}
              {l.msg}
            </div>
          ))}
          {running && <div style={{color:"rgba(255,255,255,.3)",animation:"none"}}>...</div>}
        </div>

        <button onClick={onClose} disabled={running} style={{
          width:"100%",background: running?"rgba(255,255,255,.05)":"linear-gradient(135deg,#059669,#047857)",
          border:"none",borderRadius:12,padding:"11px 0",
          color: running?"rgba(255,255,255,.3)":"#fff",
          fontWeight:700,fontSize:13,fontFamily:"'Montserrat',sans-serif",
          cursor:running?"not-allowed":"pointer",
          boxShadow: running?"none":"0 4px 14px rgba(5,150,105,.35)",
        }}>
          {running ? "Aguarde..." : "Fechar"}
        </button>
      </div>
    </div>
  );
}

// ── Add / Edit Modal ───────────────────────────────────────────────────────
function AddModal({ onClose, onSave, editing }) {
  const [form, setForm] = useState(editing || {
    name:"", type:"Reel", platform:"Instagram",
    status:"pendente", scheduledDate:"", notes:"",
  });
  const f = (k,v) => setForm(p=>({...p,[k]:v}));
  const nameRef = useRef();

  useEffect(()=>{ nameRef.current?.focus(); },[]);

  function handleSubmit(e) {
    e.preventDefault();
    if(!form.name.trim()) return;
    onSave(form);
  }

  const inputStyle = {
    background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)",
    borderRadius:10, padding:"9px 13px", color:"#fff",
    fontFamily:"'Montserrat',sans-serif", fontSize:13,
    outline:"none", width:"100%",
  };

  const selStyle = {
    ...inputStyle,
    appearance:"none", cursor:"pointer",
    backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='rgba(255,255,255,.4)' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center",
    paddingRight:32,
  };

  function labelStyle() {
    return { fontSize:10,fontWeight:600,color:"rgba(255,255,255,.32)",
      textTransform:"uppercase",letterSpacing:".07em",
      fontFamily:"'Montserrat',sans-serif", marginBottom:4, display:"block" };
  }

  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(6px)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,
    }}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{
        background:"#120020",border:"1px solid rgba(255,255,255,.1)",
        borderRadius:20,padding:28,width:"100%",maxWidth:440,
        boxShadow:"0 32px 80px rgba(0,0,0,.8)",
        fontFamily:"'Montserrat',sans-serif",
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
          <h3 style={{color:"#fff",fontWeight:800,fontSize:16,margin:0}}>
            {editing?"Editar conteúdo":"Adicionar conteúdo"}
          </h3>
          <button onClick={onClose} style={{
            background:"rgba(255,255,255,.08)",border:"none",borderRadius:8,
            color:"rgba(255,255,255,.6)",cursor:"pointer",width:28,height:28,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,
          }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{display:"flex",flexDirection:"column",gap:14}}>
          <div>
            <label style={labelStyle()}>Nome / Título *</label>
            <input ref={nameRef} value={form.name} onChange={e=>f("name",e.target.value)}
              placeholder="Ex: Reel_01_Junho.mp4" style={inputStyle}
              onFocus={e=>e.target.style.borderColor="rgba(160,100,255,.6)"}
              onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}/>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={labelStyle()}>Tipo</label>
              <select value={form.type} onChange={e=>f("type",e.target.value)} style={selStyle}
                onFocus={e=>e.target.style.borderColor="rgba(160,100,255,.6)"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}>
                {TYPE_LIST.map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle()}>Plataforma</label>
              <select value={form.platform} onChange={e=>f("platform",e.target.value)} style={selStyle}
                onFocus={e=>e.target.style.borderColor="rgba(160,100,255,.6)"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}>
                {PLATFORM_LIST.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label style={labelStyle()}>Status</label>
              <select value={form.status} onChange={e=>f("status",e.target.value)} style={selStyle}
                onFocus={e=>e.target.style.borderColor="rgba(160,100,255,.6)"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}>
                {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle()}>Data agendada</label>
              <input type="date" value={form.scheduledDate} onChange={e=>f("scheduledDate",e.target.value)}
                style={{...inputStyle, colorScheme:"dark"}}
                onFocus={e=>e.target.style.borderColor="rgba(160,100,255,.6)"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}/>
            </div>
          </div>

          <div>
            <label style={labelStyle()}>Observações</label>
            <textarea value={form.notes} onChange={e=>f("notes",e.target.value)}
              placeholder="Legenda, referências, instruções..."
              rows={3}
              style={{...inputStyle, resize:"vertical", minHeight:72, lineHeight:1.5}}
              onFocus={e=>e.target.style.borderColor="rgba(160,100,255,.6)"}
              onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}/>
          </div>

          <button type="submit" style={{
            background:"linear-gradient(135deg,#7C3AED,#4338CA)",
            border:"none",borderRadius:12,padding:"12px 0",
            color:"#fff",fontWeight:700,fontSize:14,
            fontFamily:"'Montserrat',sans-serif",cursor:"pointer",
            marginTop:4, letterSpacing:".02em",
            boxShadow:"0 4px 16px rgba(124,58,237,.4)",
            transition:"transform .15s",
          }}
          onMouseEnter={e=>e.currentTarget.style.transform="scale(1.02)"}
          onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
            {editing?"Salvar alterações":"Adicionar conteúdo"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Drive Sync Modal ───────────────────────────────────────────────────────
function DriveModal({ clientName, clientId, month, onClose, onSync }) {
  const [folderId, setFolderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSync() {
    if(!folderId.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/drive-sync", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ folderId: folderId.trim(), clientId, month }),
      });
      const json = await res.json();
      if(!res.ok) throw new Error(json.error||"Erro desconhecido");
      setResult(json.files||[]);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function importFiles() {
    if(result) onSync(result);
  }

  return (
    <div style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,.75)",backdropFilter:"blur(6px)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,
    }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{
        background:"#120020",border:"1px solid rgba(255,255,255,.1)",
        borderRadius:20,padding:28,width:"100%",maxWidth:480,
        boxShadow:"0 32px 80px rgba(0,0,0,.8)",fontFamily:"'Montserrat',sans-serif",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          <span style={{fontSize:22}}>☁️</span>
          <h3 style={{color:"#fff",fontWeight:800,fontSize:16,margin:0}}>
            Sincronizar Google Drive
          </h3>
          <button onClick={onClose} style={{
            marginLeft:"auto",background:"rgba(255,255,255,.08)",border:"none",
            borderRadius:8,color:"rgba(255,255,255,.6)",cursor:"pointer",
            width:28,height:28,display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:14,flexShrink:0,
          }}>✕</button>
        </div>
        <p style={{color:"rgba(255,255,255,.4)",fontSize:12,marginBottom:20,lineHeight:1.5}}>
          Cole o ID da pasta do Drive de <strong style={{color:"rgba(255,255,255,.7)"}}>{clientName}</strong> referente
          a <strong style={{color:"rgba(255,255,255,.7)"}}>{monthLabel(month)}</strong>.
          O sistema importa os arquivos automaticamente como itens pendentes.
        </p>

        <div style={{display:"flex",gap:8,marginBottom:16}}>
          <input
            value={folderId} onChange={e=>setFolderId(e.target.value)}
            placeholder="ID da pasta (ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs)"
            style={{
              flex:1,background:"rgba(255,255,255,.05)",
              border:"1px solid rgba(255,255,255,.1)",borderRadius:10,
              padding:"9px 13px",color:"#fff",fontFamily:"'Montserrat',sans-serif",
              fontSize:12,outline:"none",
            }}
            onFocus={e=>e.target.style.borderColor="rgba(160,100,255,.6)"}
            onBlur={e=>e.target.style.borderColor="rgba(255,255,255,.1)"}
          />
          <button onClick={handleSync} disabled={!folderId.trim()||loading} style={{
            background:"linear-gradient(135deg,#7C3AED,#4338CA)",
            border:"none",borderRadius:10,padding:"9px 16px",
            color:"#fff",fontWeight:700,fontSize:12,
            fontFamily:"'Montserrat',sans-serif",cursor:"pointer",
            opacity: !folderId.trim()||loading?0.5:1,
            whiteSpace:"nowrap",
          }}>{loading?"Buscando...":"Buscar"}</button>
        </div>

        {error && (
          <div style={{
            background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.2)",
            borderRadius:10,padding:"10px 14px",color:"#F87171",fontSize:12,marginBottom:12,
          }}>⚠️ {error}</div>
        )}

        {result && (
          <div>
            <p style={{color:"rgba(255,255,255,.5)",fontSize:11,marginBottom:8}}>
              {result.length} arquivo(s) encontrado(s):
            </p>
            <div style={{maxHeight:180,overflowY:"auto",
              border:"1px solid rgba(255,255,255,.07)",borderRadius:10,padding:8,marginBottom:14}}>
              {result.length===0
                ? <p style={{color:"rgba(255,255,255,.3)",fontSize:12,textAlign:"center",padding:"12px 0"}}>Nenhum arquivo encontrado</p>
                : result.map((f,i)=>(
                  <div key={i} style={{
                    display:"flex",alignItems:"center",gap:8,
                    padding:"6px 8px",borderRadius:7,
                    background:i%2===0?"rgba(255,255,255,.03)":"transparent",
                  }}>
                    <span style={{fontSize:14}}>📄</span>
                    <span style={{color:"rgba(255,255,255,.7)",fontSize:12,flex:1,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {f.name}
                    </span>
                    <TypeChip type={f.type||"Outro"}/>
                  </div>
                ))}
            </div>
            {result.length>0 && (
              <button onClick={importFiles} style={{
                width:"100%",background:"linear-gradient(135deg,#059669,#047857)",
                border:"none",borderRadius:12,padding:"11px 0",
                color:"#fff",fontWeight:700,fontSize:13,
                fontFamily:"'Montserrat',sans-serif",cursor:"pointer",
                boxShadow:"0 4px 14px rgba(5,150,105,.35)",
              }}>
                ✓ Importar {result.length} arquivo(s)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function Dashboard({ data, month, onMonthChange, onOpenClient, months, config, onOpenConfig, onAutoSync }) {
  const globalStats = CLIENTS_LIST.reduce((acc,_,idx)=>{
    const cid = slug(CLIENTS_LIST[idx]);
    const s = stats(getItems(data,cid,month));
    acc.total    += s.total;
    acc.postado  += s.postado;
    acc.pendente += s.pendente;
    acc.atrasado += s.atrasado;
    return acc;
  },{total:0,postado:0,pendente:0,atrasado:0});

  const pct = globalStats.total>0
    ? Math.round((globalStats.postado/globalStats.total)*100)
    : 0;

  return (
    <div style={{minHeight:"100vh",background:"#07010f",fontFamily:"'Montserrat',sans-serif",padding:"0 0 60px"}}>
      {/* Header */}
      <div style={{
        borderBottom:"1px solid rgba(255,255,255,.07)",
        padding:"20px 32px",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        position:"sticky",top:0,background:"#07010f",zIndex:50,
        backdropFilter:"blur(10px)",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{
            background:"linear-gradient(135deg,#7C3AED,#4338CA)",
            borderRadius:12,padding:"8px 14px",
            fontWeight:900,fontSize:15,color:"#fff",letterSpacing:"-.02em",
          }}>ai.<span style={{fontWeight:300}}>go</span></div>
          <div>
            <div style={{color:"#fff",fontWeight:800,fontSize:18,lineHeight:1}}>
              Estoque de Conteúdo
            </div>
            <div style={{color:"rgba(255,255,255,.3)",fontSize:11,fontWeight:500,marginTop:2}}>
              Plataforma de gerenciamento
            </div>
          </div>
        </div>

        {/* Right: month selector + actions */}
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
          {months.map(m=>(
            <button key={m.val} onClick={()=>onMonthChange(m.val)} style={{
              background: m.val===month?"rgba(124,58,237,.25)":"rgba(255,255,255,.04)",
              border: m.val===month?"1px solid rgba(124,58,237,.5)":"1px solid rgba(255,255,255,.07)",
              borderRadius:10,padding:"6px 12px",
              color: m.val===month?"#c084fc":"rgba(255,255,255,.45)",
              fontWeight: m.val===month?700:500, fontSize:12,
              fontFamily:"'Montserrat',sans-serif", cursor:"pointer",
              transition:"all .15s",
            }}>{m.label}</button>
          ))}

          {/* Separator */}
          <div style={{width:1,height:24,background:"rgba(255,255,255,.1)",margin:"0 4px"}}/>

          {/* Auto-sync button */}
          {config.rootFolderId && (
            <button onClick={onAutoSync} title="Sincronizar todos os clientes com o Drive" style={{
              background:"rgba(52,211,153,.12)",border:"1px solid rgba(52,211,153,.25)",
              borderRadius:10,padding:"6px 14px",color:"#34D399",
              fontFamily:"'Montserrat',sans-serif",fontSize:12,fontWeight:700,
              cursor:"pointer",display:"flex",alignItems:"center",gap:6,
              transition:"all .15s",whiteSpace:"nowrap",
            }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(52,211,153,.2)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(52,211,153,.12)"}>
              ↺ Auto-Sync
            </button>
          )}

          {/* Settings */}
          <button onClick={onOpenConfig} title="Configurar Google Drive" style={{
            background: config.rootFolderId?"rgba(124,58,237,.15)":"rgba(255,255,255,.05)",
            border: config.rootFolderId?"1px solid rgba(124,58,237,.35)":"1px solid rgba(255,255,255,.1)",
            borderRadius:10,padding:"6px 10px",
            color: config.rootFolderId?"#c084fc":"rgba(255,255,255,.5)",
            fontFamily:"'Montserrat',sans-serif",fontSize:14,
            cursor:"pointer",transition:"all .15s",
          }}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(124,58,237,.25)"}
          onMouseLeave={e=>e.currentTarget.style.background=config.rootFolderId?"rgba(124,58,237,.15)":"rgba(255,255,255,.05)"}>
            ⚙️
          </button>
        </div>
      </div>

      <div style={{padding:"28px 32px 0"}}>
        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:28}}>
          <StatCard label="Total" value={globalStats.total} color="#fff" icon="📦"/>
          <StatCard label="Postados" value={globalStats.postado} color="#34D399" icon="✅"/>
          <StatCard label="Pendentes" value={globalStats.pendente} color="#F59E0B" icon="⏳"/>
          <StatCard label="Atrasados" value={globalStats.atrasado} color="#F87171" icon="🚨"/>
        </div>

        {/* Progress bar */}
        {globalStats.total>0 && (
          <div style={{
            background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",
            borderRadius:14,padding:"14px 20px",marginBottom:28,
            display:"flex",alignItems:"center",gap:16,
          }}>
            <span style={{color:"rgba(255,255,255,.45)",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>
              Progresso geral
            </span>
            <div style={{flex:1,background:"rgba(255,255,255,.08)",borderRadius:100,height:8,overflow:"hidden"}}>
              <div style={{
                width:`${pct}%`,height:"100%",
                background:"linear-gradient(90deg,#7C3AED,#34D399)",
                borderRadius:100,transition:"width .5s ease",
              }}/>
            </div>
            <span style={{
              color:"#c084fc",fontWeight:800,fontSize:14,minWidth:36,textAlign:"right",
            }}>{pct}%</span>
          </div>
        )}

        {/* Section title */}
        <div style={{
          display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,
        }}>
          <h2 style={{color:"#fff",fontWeight:800,fontSize:15,margin:0,letterSpacing:"-.01em"}}>
            Clientes — {monthLabel(month)}
          </h2>
          <span style={{color:"rgba(255,255,255,.25)",fontSize:12}}>
            {CLIENTS_LIST.length} clientes
          </span>
        </div>

        {/* Client grid */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",
          gap:14,
        }}>
          {CLIENTS_LIST.map((name,idx)=>{
            const cid = slug(name);
            const s = stats(getItems(data,cid,month));
            const p = s.total>0?Math.round((s.postado/s.total)*100):0;
            const c = clr(idx);
            return (
              <div key={name} onClick={()=>onOpenClient(idx)}
                style={{
                  background:"rgba(255,255,255,.04)",
                  border:"1px solid rgba(255,255,255,.07)",
                  borderRadius:16, padding:"16px 18px",
                  cursor:"pointer", transition:"all .18s",
                  position:"relative", overflow:"hidden",
                }}
                onMouseEnter={e=>{
                  e.currentTarget.style.background="rgba(255,255,255,.07)";
                  e.currentTarget.style.borderColor=`${c}44`;
                  e.currentTarget.style.transform="translateY(-2px)";
                }}
                onMouseLeave={e=>{
                  e.currentTarget.style.background="rgba(255,255,255,.04)";
                  e.currentTarget.style.borderColor="rgba(255,255,255,.07)";
                  e.currentTarget.style.transform="translateY(0)";
                }}
              >
                {/* Accent glow */}
                <div style={{
                  position:"absolute",top:-30,right:-30,
                  width:80,height:80,borderRadius:"50%",
                  background:`${c}18`,filter:"blur(20px)",pointerEvents:"none",
                }}/>

                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                  <Avatar name={name} idx={idx} size={38}/>
                  <div style={{minWidth:0}}>
                    <div style={{color:"#fff",fontWeight:700,fontSize:13,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {name}
                    </div>
                    <div style={{color:"rgba(255,255,255,.3)",fontSize:10,fontWeight:500,marginTop:1}}>
                      {s.total===0?"Sem conteúdo":`${s.total} peça${s.total!==1?"s":""}`}
                    </div>
                  </div>
                  <span style={{
                    marginLeft:"auto",color:c,fontWeight:800,fontSize:13,
                    fontFamily:"'Montserrat',sans-serif",
                  }}>{p}%</span>
                </div>

                {/* Progress bar */}
                <div style={{background:"rgba(255,255,255,.08)",borderRadius:100,height:4,marginBottom:12,overflow:"hidden"}}>
                  <div style={{
                    width:`${p}%`,height:"100%",
                    background:`linear-gradient(90deg,${c}88,${c})`,
                    borderRadius:100,transition:"width .5s",
                  }}/>
                </div>

                {/* Mini stats */}
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                  {s.postado>0  && <span style={{fontSize:10,fontWeight:600,color:"#34D399"}}>✓ {s.postado} postado{s.postado!==1?"s":""}</span>}
                  {s.agendado>0 && <span style={{fontSize:10,fontWeight:600,color:"#60A5FA"}}>◷ {s.agendado} agendado{s.agendado!==1?"s":""}</span>}
                  {s.pendente>0 && <span style={{fontSize:10,fontWeight:600,color:"#F59E0B"}}>○ {s.pendente} pendente{s.pendente!==1?"s":""}</span>}
                  {s.atrasado>0 && <span style={{fontSize:10,fontWeight:600,color:"#F87171"}}>⚠ {s.atrasado} atrasado{s.atrasado!==1?"s":""}</span>}
                  {s.total===0  && <span style={{fontSize:10,fontWeight:500,color:"rgba(255,255,255,.2)"}}>Nenhum conteúdo</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Client Detail ──────────────────────────────────────────────────────────
function ClientDetail({ clientName, clientIdx, data, month, onMonthChange,
  onBack, onSetData, months }) {
  const cid  = slug(clientName);
  const c    = clr(clientIdx);
  const [filter, setFilter]           = useState("all");
  const [showAdd, setShowAdd]         = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDrive, setShowDrive]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const allItems = getItems(data, cid, month);
  const filtered = filter==="all" ? allItems : allItems.filter(i=>i.status===filter);
  const s = stats(allItems);

  function cycleStatus(itemId) {
    const idx = allItems.findIndex(i=>i.id===itemId);
    if(idx===-1) return;
    const cur  = allItems[idx].status;
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur)+1)%STATUS_CYCLE.length];
    const updated = allItems.map(i=>i.id===itemId?{...i,status:next}:i);
    onSetData(prev=>({...prev,[cid]:{...prev[cid],[month]:updated}}));
  }

  function handleAdd(form) {
    const item = { ...form, id:uid() };
    onSetData(prev=>{
      const items = [...(prev[cid]?.[month]||[]), item];
      return {...prev,[cid]:{...prev[cid],[month]:items}};
    });
    setShowAdd(false);
  }

  function handleEdit(form) {
    onSetData(prev=>{
      const items = (prev[cid]?.[month]||[]).map(i=>i.id===editingItem.id?{...i,...form}:i);
      return {...prev,[cid]:{...prev[cid],[month]:items}};
    });
    setEditingItem(null);
  }

  function handleDelete(itemId) {
    onSetData(prev=>{
      const items = (prev[cid]?.[month]||[]).filter(i=>i.id!==itemId);
      return {...prev,[cid]:{...prev[cid],[month]:items}};
    });
    setConfirmDelete(null);
  }

  function handleDriveSync(files) {
    const newItems = files.map(f=>({
      id:uid(), name:f.name, type:f.type||"Outro",
      platform:f.platform||"Instagram", status:"pendente",
      scheduledDate:"", notes:"", driveFileId:f.id||"",
    }));
    onSetData(prev=>{
      const existing = prev[cid]?.[month]||[];
      const existingNames = new Set(existing.map(i=>i.name));
      const toAdd = newItems.filter(i=>!existingNames.has(i.name));
      return {...prev,[cid]:{...prev[cid],[month]:[...existing,...toAdd]}};
    });
    setShowDrive(false);
  }

  const filterBtns = [
    {k:"all", label:"Todos", count:s.total},
    {k:"pendente", label:"Pendente", count:s.pendente},
    {k:"agendado", label:"Agendado", count:s.agendado},
    {k:"postado",  label:"Postado",  count:s.postado},
    {k:"atrasado", label:"Atrasado", count:s.atrasado},
  ];

  return (
    <div style={{minHeight:"100vh",background:"#07010f",fontFamily:"'Montserrat',sans-serif",paddingBottom:80}}>

      {/* Header */}
      <div style={{
        borderBottom:"1px solid rgba(255,255,255,.07)",
        padding:"18px 32px",
        display:"flex",alignItems:"center",gap:16,
        position:"sticky",top:0,background:"#07010f",zIndex:50,
      }}>
        <button onClick={onBack} style={{
          background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",
          borderRadius:10,padding:"7px 14px",color:"rgba(255,255,255,.7)",
          fontFamily:"'Montserrat',sans-serif",fontSize:12,fontWeight:600,
          cursor:"pointer",display:"flex",alignItems:"center",gap:6,
          transition:"all .15s",
        }}
        onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.1)"}
        onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.06)"}>
          ← Voltar
        </button>

        <Avatar name={clientName} idx={clientIdx} size={36}/>
        <div>
          <div style={{color:"#fff",fontWeight:800,fontSize:17,lineHeight:1}}>{clientName}</div>
          <div style={{color:"rgba(255,255,255,.3)",fontSize:11,marginTop:2}}>
            {monthLabel(month)}
          </div>
        </div>

        {/* Month tabs */}
        <div style={{display:"flex",gap:4,marginLeft:"auto",flexWrap:"wrap",justifyContent:"flex-end"}}>
          {months.map(m=>(
            <button key={m.val} onClick={()=>onMonthChange(m.val)} style={{
              background: m.val===month?`${c}22`:"rgba(255,255,255,.04)",
              border: m.val===month?`1px solid ${c}55`:"1px solid rgba(255,255,255,.07)",
              borderRadius:8, padding:"5px 10px",
              color: m.val===month?c:"rgba(255,255,255,.4)",
              fontWeight: m.val===month?700:500, fontSize:11,
              fontFamily:"'Montserrat',sans-serif", cursor:"pointer",
              transition:"all .15s",whiteSpace:"nowrap",
            }}>{m.label}</button>
          ))}
        </div>
      </div>

      <div style={{padding:"24px 32px 0"}}>
        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
          <StatCard label="Total"    value={s.total}    color="#fff"     icon="📦"/>
          <StatCard label="Postados" value={s.postado}  color="#34D399"  icon="✅"/>
          <StatCard label="Pendentes"value={s.pendente} color="#F59E0B"  icon="⏳"/>
          <StatCard label="Atrasados"value={s.atrasado} color="#F87171"  icon="🚨"/>
        </div>

        {/* Progress */}
        {s.total>0 && (
          <div style={{
            background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",
            borderRadius:12,padding:"12px 18px",marginBottom:20,
            display:"flex",alignItems:"center",gap:14,
          }}>
            <span style={{color:"rgba(255,255,255,.4)",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>Progresso</span>
            <div style={{flex:1,background:"rgba(255,255,255,.08)",borderRadius:100,height:6,overflow:"hidden"}}>
              <div style={{
                width:`${Math.round(s.postado/s.total*100)}%`,height:"100%",
                background:`linear-gradient(90deg,${c}99,${c})`,
                borderRadius:100,transition:"width .5s",
              }}/>
            </div>
            <span style={{color:c,fontWeight:800,fontSize:13,minWidth:32,textAlign:"right"}}>
              {Math.round(s.postado/s.total*100)}%
            </span>
          </div>
        )}

        {/* Filter + actions */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18,flexWrap:"wrap"}}>
          {filterBtns.map(btn=>(
            <button key={btn.k} onClick={()=>setFilter(btn.k)} style={{
              background: filter===btn.k?"rgba(124,58,237,.2)":"rgba(255,255,255,.04)",
              border: filter===btn.k?"1px solid rgba(124,58,237,.45)":"1px solid rgba(255,255,255,.07)",
              borderRadius:10,padding:"6px 12px",
              color: filter===btn.k?"#c084fc":"rgba(255,255,255,.45)",
              fontWeight: filter===btn.k?700:500, fontSize:12,
              fontFamily:"'Montserrat',sans-serif",cursor:"pointer",
              display:"flex",alignItems:"center",gap:6,
            }}>
              {btn.label}
              {btn.count>0 && (
                <span style={{
                  background: filter===btn.k?"rgba(124,58,237,.3)":"rgba(255,255,255,.1)",
                  borderRadius:100,padding:"1px 7px",fontSize:10,fontWeight:800,
                }}>{btn.count}</span>
              )}
            </button>
          ))}

          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            <button onClick={()=>setShowDrive(true)} style={{
              background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",
              borderRadius:10,padding:"6px 14px",color:"rgba(255,255,255,.6)",
              fontFamily:"'Montserrat',sans-serif",fontSize:12,fontWeight:600,
              cursor:"pointer",display:"flex",alignItems:"center",gap:6,
              transition:"all .15s",
            }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.09)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"}>
              ☁️ Sync Drive
            </button>
            <button onClick={()=>setShowAdd(true)} style={{
              background:"linear-gradient(135deg,#7C3AED,#4338CA)",
              border:"none",borderRadius:10,padding:"7px 16px",
              color:"#fff",fontFamily:"'Montserrat',sans-serif",fontSize:12,fontWeight:700,
              cursor:"pointer",display:"flex",alignItems:"center",gap:6,
              boxShadow:"0 4px 14px rgba(124,58,237,.35)",
              transition:"transform .15s",
            }}
            onMouseEnter={e=>e.currentTarget.style.transform="scale(1.04)"}
            onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
              + Adicionar
            </button>
          </div>
        </div>

        {/* Content list */}
        {filtered.length===0 ? (
          <div style={{
            background:"rgba(255,255,255,.03)",border:"1px dashed rgba(255,255,255,.1)",
            borderRadius:16,padding:"48px 20px",textAlign:"center",
          }}>
            <div style={{fontSize:36,marginBottom:10}}>📁</div>
            <div style={{color:"rgba(255,255,255,.35)",fontSize:14,fontWeight:600}}>
              {filter==="all"?"Nenhum conteúdo cadastrado para este mês":"Nenhum item com este filtro"}
            </div>
            <div style={{color:"rgba(255,255,255,.18)",fontSize:12,marginTop:6}}>
              {filter==="all" ? 'Clique em "+ Adicionar" ou sincronize com o Drive' : "Tente outro filtro"}
            </div>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {filtered.map(item=>(
              <ContentRow key={item.id} item={item} clientColor={c}
                onCycleStatus={()=>cycleStatus(item.id)}
                onEdit={()=>setEditingItem(item)}
                onDelete={()=>setConfirmDelete(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <AddModal onClose={()=>setShowAdd(false)} onSave={handleAdd}/>
      )}
      {editingItem && (
        <AddModal onClose={()=>setEditingItem(null)} onSave={handleEdit} editing={editingItem}/>
      )}
      {showDrive && (
        <DriveModal
          clientName={clientName} clientId={cid} month={month}
          onClose={()=>setShowDrive(false)} onSync={handleDriveSync}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div style={{
          position:"fixed",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(4px)",
          display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,
        }} onClick={e=>e.target===e.currentTarget&&setConfirmDelete(null)}>
          <div style={{
            background:"#120020",border:"1px solid rgba(239,68,68,.3)",
            borderRadius:16,padding:24,maxWidth:340,width:"100%",
            fontFamily:"'Montserrat',sans-serif",textAlign:"center",
          }}>
            <div style={{fontSize:28,marginBottom:10}}>🗑️</div>
            <p style={{color:"#fff",fontWeight:700,fontSize:15,marginBottom:6}}>Excluir item?</p>
            <p style={{color:"rgba(255,255,255,.4)",fontSize:12,marginBottom:20}}>
              Esta ação não pode ser desfeita.
            </p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setConfirmDelete(null)} style={{
                flex:1,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",
                borderRadius:10,padding:"9px 0",color:"rgba(255,255,255,.7)",
                fontFamily:"'Montserrat',sans-serif",fontSize:13,fontWeight:600,cursor:"pointer",
              }}>Cancelar</button>
              <button onClick={()=>handleDelete(confirmDelete)} style={{
                flex:1,background:"rgba(239,68,68,.15)",border:"1px solid rgba(239,68,68,.3)",
                borderRadius:10,padding:"9px 0",color:"#F87171",
                fontFamily:"'Montserrat',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",
              }}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Content Row ────────────────────────────────────────────────────────────
function ContentRow({ item, clientColor, onCycleStatus, onEdit, onDelete }) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      style={{
        background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",
        borderRadius:12,padding:"12px 16px",
        display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",
        transition:"all .15s",
      }}
      onMouseEnter={e=>{
        e.currentTarget.style.background="rgba(255,255,255,.06)";
        e.currentTarget.style.borderColor=`${clientColor}33`;
      }}
      onMouseLeave={e=>{
        e.currentTarget.style.background="rgba(255,255,255,.04)";
        e.currentTarget.style.borderColor="rgba(255,255,255,.07)";
      }}
    >
      {/* Chips */}
      <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
        <TypeChip type={item.type}/>
        <PlatChip platform={item.platform}/>
      </div>

      {/* Name */}
      <div style={{flex:1,minWidth:120,overflow:"hidden"}}>
        <div style={{
          color:"rgba(255,255,255,.85)",fontSize:13,fontWeight:600,
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
        }}>{item.name}</div>
        {item.notes && (
          <div style={{
            color:"rgba(255,255,255,.3)",fontSize:11,marginTop:2,
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
          }}>{item.notes}</div>
        )}
      </div>

      {/* Date */}
      {item.scheduledDate && (
        <span style={{
          color:"rgba(255,255,255,.35)",fontSize:11,fontWeight:500,
          whiteSpace:"nowrap",flexShrink:0,
        }}>
          📅 {new Date(item.scheduledDate+"T12:00:00").toLocaleDateString("pt-BR")}
        </span>
      )}

      {/* Status pill (clickable to cycle) */}
      <StatusPill status={item.status} onClick={onCycleStatus}/>

      {/* Action menu */}
      <div style={{position:"relative",flexShrink:0}}>
        <button
          onClick={()=>setShowActions(p=>!p)}
          style={{
            background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.09)",
            borderRadius:8,width:28,height:28,cursor:"pointer",
            color:"rgba(255,255,255,.5)",fontSize:16,display:"flex",
            alignItems:"center",justifyContent:"center",
          }}
        >⋯</button>
        {showActions && (
          <div style={{
            position:"absolute",right:0,top:34,
            background:"#1a0030",border:"1px solid rgba(255,255,255,.12)",
            borderRadius:10,padding:4,minWidth:130,
            boxShadow:"0 8px 28px rgba(0,0,0,.6)",zIndex:100,
          }}
          onMouseLeave={()=>setShowActions(false)}>
            <button onClick={()=>{onEdit();setShowActions(false);}} style={{
              display:"flex",alignItems:"center",gap:8,width:"100%",
              background:"transparent",border:"none",borderRadius:7,
              padding:"8px 10px",color:"rgba(255,255,255,.75)",fontSize:12,fontWeight:600,
              fontFamily:"'Montserrat',sans-serif",cursor:"pointer",textAlign:"left",
              transition:"background .1s",
            }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.07)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              ✏️ Editar
            </button>
            <button onClick={()=>{onDelete();setShowActions(false);}} style={{
              display:"flex",alignItems:"center",gap:8,width:"100%",
              background:"transparent",border:"none",borderRadius:7,
              padding:"8px 10px",color:"#F87171",fontSize:12,fontWeight:600,
              fontFamily:"'Montserrat',sans-serif",cursor:"pointer",textAlign:"left",
              transition:"background .1s",
            }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,.07)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              🗑️ Excluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────
export default function Inventory() {
  const [view,          setView]          = useState("dashboard");
  const [selectedIdx,   setSelectedIdx]   = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [data,          setData]          = useState(loadData);
  const [config,        setConfig]        = useState(loadConfig);
  const [showConfig,    setShowConfig]    = useState(false);
  const [showAutoSync,  setShowAutoSync]  = useState(false);

  useEffect(()=>{ saveData(data); }, [data]);
  useEffect(()=>{ saveConfig(config); }, [config]);

  const months = getMonthOptions();

  function openClient(idx) { setSelectedIdx(idx); setView("client"); }
  function goBack()        { setView("dashboard"); setSelectedIdx(null); }

  function handleAutoSyncDone(results, month) {
    // results: { clientName: [files] }
    setData(prev => {
      const next = { ...prev };
      for (const [clientName, files] of Object.entries(results)) {
        const cid      = slug(clientName);
        const existing = next[cid]?.[month] || [];
        const existingNames = new Set(existing.map(i => i.name));
        const newItems = files
          .filter(f => !existingNames.has(f.name))
          .map(f => ({ id:uid(), name:f.name, type:f.type||"Outro",
            platform:"Instagram", status:"pendente", scheduledDate:"", notes:f.notes||"",
            driveFileId:f.id||"" }));
        if (newItems.length > 0) {
          next[cid] = { ...(next[cid]||{}), [month]: [...existing, ...newItems] };
        }
      }
      return next;
    });
  }

  if (view==="client" && selectedIdx!==null) {
    return (
      <>
        <ClientDetail
          clientName={CLIENTS_LIST[selectedIdx]}
          clientIdx={selectedIdx}
          data={data}
          month={selectedMonth}
          onMonthChange={setSelectedMonth}
          onBack={goBack}
          onSetData={setData}
          months={months}
        />
        {showConfig && (
          <ConfigModal config={config} onClose={()=>setShowConfig(false)}
            onSave={c=>{ setConfig(c); setShowConfig(false); }}/>
        )}
      </>
    );
  }

  return (
    <>
      <Dashboard
        data={data}
        month={selectedMonth}
        onMonthChange={setSelectedMonth}
        onOpenClient={openClient}
        months={months}
        config={config}
        onOpenConfig={()=>setShowConfig(true)}
        onAutoSync={()=>setShowAutoSync(true)}
      />

      {showConfig && (
        <ConfigModal config={config} onClose={()=>setShowConfig(false)}
          onSave={c=>{ setConfig(c); setShowConfig(false); }}/>
      )}

      {showAutoSync && config.rootFolderId && (
        <AutoSyncModal
          rootFolderId={config.rootFolderId}
          month={selectedMonth}
          onClose={()=>setShowAutoSync(false)}
          onDone={(results, month)=>{ handleAutoSyncDone(results, month); }}
        />
      )}
    </>
  );
}
