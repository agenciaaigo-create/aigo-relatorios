import { useState, useRef } from "react";

const CLIENTS = [
  "Aline","Americana","AP Engenharia","Bioessência","Coperfarma",
  "Doma Cosméticos","Fran Cendron","Ingalimp","Isadora","Juninho Vende",
  "Leda","Manu Arquitetura","Marcela Gambine","Mari Garcia","Murilo Bianco",
  "Nathalia","Petshop","Suellem","Vikce","Wood",
];

const PALETTE = [
  "#7C3AED","#DC6B2F","#059669","#DB2777","#2563EB",
  "#D97706","#4F46E5","#EA580C","#0D9488","#9333EA",
  "#CA8A04","#1D4ED8","#B91C1C","#16A34A","#92400E",
  "#0891B2","#BE185D","#4338CA","#B45309","#047857",
];

const EMPTY = {
  mesAno:"", seguidores:"", seguidoresNovos:"", unfollow:"",
  visualizacoes:"", alcance:"", visitas:"", links:"",
  reels:"", likes:"", comentarios:"", salvamentos:"", compartilhamentos:"",
  topPost:"", topPostViews:"", topPostLikes:"",
  stories:"", storiesViews:"", observacoes:""
};

const clr = i => PALETTE[i % PALETTE.length];
const ini = n => n.split(" ").slice(0,2).map(w => w[0].toUpperCase()).join("");
const fmt = v => {
  const n = parseFloat(String(v||0).replace(/\./g,"").replace(",","."));
  if(isNaN(n) || !v) return "—";
  if(n >= 1000000) return (n/1000000).toFixed(1).replace(".",",") + " M";
  if(n >= 1000) return (n/1000).toFixed(1).replace(".",",") + " K";
  return n.toLocaleString("pt-BR");
};

function Avatar({ name, idx, size=40 }) {
  const c = clr(idx);
  return (
    <div style={{
      width:size, height:size, borderRadius:size*0.28,
      background:`linear-gradient(135deg,${c},${c}88)`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.3, fontWeight:700, color:"#fff",
      fontFamily:"'Montserrat',sans-serif", flexShrink:0,
      boxShadow:`0 4px 12px ${c}44`
    }}>{ini(name)}</div>
  );
}

function Field({ label, value, onChange, placeholder, span3 }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5, gridColumn: span3 ? "span 3" : "span 1" }}>
      <label style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,.32)", textTransform:"uppercase", letterSpacing:".07em", fontFamily:"'Montserrat',sans-serif" }}>{label}</label>
      <input
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder||"—"}
        style={{ background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:10,
          padding:"9px 13px", color:"#fff", fontFamily:"'Montserrat',sans-serif", fontSize:13, outline:"none", width:"100%" }}
        onFocus={e => e.target.style.borderColor = "rgba(160,100,255,.6)"}
        onBlur={e => e.target.style.borderColor = "rgba(255,255,255,.1)"}
      />
    </div>
  );
}

function buildPDF(clientName, clientIdx, d) {
  const c = clr(clientIdx);
  const now = new Date().toLocaleDateString("pt-BR");
  const engMax = Math.max(+d.likes||0, +d.comentarios||0, +d.salvamentos||0, +d.compartilhamentos||0, 1);
  const bar = v => `<div style="height:5px;background:#ede8ff;border-radius:4px;overflow:hidden;margin-top:5px"><div style="height:100%;width:${Math.min(100,(+v||0)/engMax*100)}%;background:${c};border-radius:4px"></div></div>`;
  const saldo = (+d.seguidoresNovos||0) - (+d.unfollow||0);

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Montserrat',sans-serif;background:#fff;color:#1a1a2e;width:794px}
.page{width:794px;padding:0;position:relative;background:#fff}
.header{background:linear-gradient(135deg,#08001a 0%,#130030 60%,${c}55 100%);padding:44px 52px 32px;position:relative;overflow:hidden}
.header::before{content:'';position:absolute;top:-80px;right:-80px;width:300px;height:300px;border-radius:50%;background:${c}25;filter:blur(80px)}
.logo-line{font-size:11px;font-weight:700;letter-spacing:.08em;color:rgba(255,255,255,.4);margin-bottom:28px;text-transform:uppercase}
.logo-line span{color:${c}}
.hrow{display:flex;align-items:center;gap:18px}
.avatar{width:58px;height:58px;border-radius:16px;background:linear-gradient(135deg,${c},${c}77);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;box-shadow:0 8px 28px ${c}55}
.cname{font-size:28px;font-weight:800;color:#fff;letter-spacing:-.02em}
.csub{font-size:11px;font-weight:500;color:rgba(255,255,255,.38);margin-top:5px;letter-spacing:.05em;text-transform:uppercase}
.badge{margin-left:auto;background:${c}33;border:1px solid ${c}66;border-radius:100px;padding:7px 18px;font-size:11px;font-weight:700;color:${c};letter-spacing:.04em;white-space:nowrap}
.strip{height:3px;background:linear-gradient(90deg,${c},${c}00);margin:0 52px}
.body{padding:36px 52px 80px}
.stitle{font-size:9px;font-weight:700;color:rgba(0,0,0,.32);letter-spacing:.1em;text-transform:uppercase;margin:24px 0 14px;display:flex;align-items:center;gap:10px}
.stitle::after{content:'';flex:1;height:1px;background:rgba(0,0,0,.07)}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:11px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:11px}
.card{background:#f9f6ff;border:1px solid #eae3ff;border-radius:13px;padding:16px 18px}
.card-hero{background:linear-gradient(135deg,${c}1a,${c}07);border:1px solid ${c}44;border-radius:13px;padding:18px 20px}
.cl{font-size:9px;font-weight:600;color:rgba(0,0,0,.36);letter-spacing:.08em;text-transform:uppercase;margin-bottom:7px}
.cv{font-size:26px;font-weight:800;color:#0a0015;line-height:1}
.cv-hero{font-size:30px;font-weight:800;color:${c};line-height:1}
.cv-sm{font-size:20px;font-weight:700;color:#0a0015;line-height:1}
.cv-green{color:#059669}
.cv-red{color:#DC2626}
.erow{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px}
.elabel{font-size:11px;font-weight:500;color:rgba(0,0,0,.48)}
.eval{font-size:14px;font-weight:700;color:#0a0015}
.tp-box{background:linear-gradient(135deg,${c}14,#f9f6ff);border:1px solid ${c}33;border-radius:13px;padding:20px 22px}
.tp-tag{display:inline-block;background:${c};color:#fff;font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 10px;border-radius:100px;margin-bottom:10px}
.tp-title{font-size:14px;font-weight:700;color:#0a0015;line-height:1.45;margin-bottom:14px}
.tp-stats{display:flex;gap:20px}
.tps{display:flex;flex-direction:column;gap:3px}
.tpv{font-size:18px;font-weight:800;color:${c}}
.tpl{font-size:8px;font-weight:600;color:rgba(0,0,0,.38);text-transform:uppercase;letter-spacing:.07em}
.obs{background:#f9f6ff;border:1px solid #eae3ff;border-radius:13px;padding:18px 20px;font-size:12px;color:rgba(0,0,0,.58);line-height:1.65}
.footer{position:fixed;bottom:0;left:0;width:794px;padding:16px 52px;background:linear-gradient(0,#08001a,transparent);display:flex;justify-content:space-between;align-items:center}
.flogo{font-size:14px;font-weight:800;color:rgba(255,255,255,.5)}
.flogo span{color:${c}}
.fdate{font-size:9px;font-weight:500;color:rgba(255,255,255,.28);letter-spacing:.06em}
</style></head><body>
<div class="page">
<div class="header">
  <div class="logo-line">ai<span>.go</span> &nbsp;·&nbsp; relatório social media</div>
  <div class="hrow">
    <div class="avatar">${ini(clientName)}</div>
    <div><div class="cname">${clientName}</div><div class="csub">Relatório mensal de performance</div></div>
    <div class="badge">${d.mesAno||"—"}</div>
  </div>
</div>
<div class="strip"></div>
<div class="body">
  <div class="stitle">👥 Crescimento de Audiência</div>
  <div class="g4">
    <div class="card-hero"><div class="cl">Seguidores Totais</div><div class="cv-hero">${fmt(d.seguidores)}</div></div>
    <div class="card"><div class="cl">Novos Seguidores</div><div class="cv-sm">${fmt(d.seguidoresNovos)}</div></div>
    <div class="card"><div class="cl">Deixaram de Seguir</div><div class="cv-sm">${fmt(d.unfollow)}</div></div>
    <div class="card"><div class="cl">Saldo Líquido</div><div class="cv-sm ${saldo>=0?'cv-green':'cv-red'}">${saldo>=0?'+':''}${fmt(saldo)}</div></div>
  </div>
  <div class="stitle">📡 Alcance e Visibilidade</div>
  <div class="g3">
    <div class="card"><div class="cl">Visualizações</div><div class="cv">${fmt(d.visualizacoes)}</div></div>
    <div class="card"><div class="cl">Contas Alcançadas</div><div class="cv">${fmt(d.alcance)}</div></div>
    <div class="card"><div class="cl">Visitas ao Perfil</div><div class="cv">${fmt(d.visitas)}</div></div>
  </div>
  <div class="stitle">❤ Engajamento · ${d.reels||"—"} Reels publicados</div>
  <div class="g2">
    <div class="card">
      ${[["♡ Likes",d.likes],["💬 Comentários",d.comentarios],["🔖 Salvamentos",d.salvamentos],["↗ Compartilhamentos",d.compartilhamentos]].map(([l,v])=>`<div class="erow"><span class="elabel">${l}</span><span class="eval">${fmt(v)}</span></div>${bar(v)}`).join("")}
    </div>
    <div>
      <div class="tp-box">
        <span class="tp-tag">⭐ Top Post</span>
        <div class="tp-title">${d.topPost||"—"}</div>
        <div class="tp-stats">
          <div class="tps"><span class="tpv">${fmt(d.topPostViews)}</span><span class="tpl">visualizações</span></div>
          <div class="tps"><span class="tpv">${fmt(d.topPostLikes)}</span><span class="tpl">likes</span></div>
          <div class="tps"><span class="tpv">${fmt(d.links)}</span><span class="tpl">toques link</span></div>
        </div>
      </div>
      ${d.stories ? `<div class="card" style="margin-top:11px"><div class="cl">📲 Stories · ${fmt(d.storiesViews)} visualizações</div><div class="cv-sm" style="margin-top:5px">${d.stories} publicações</div></div>` : ""}
    </div>
  </div>
  ${d.observacoes ? `<div class="stitle">📝 Observações</div><div class="obs">${d.observacoes}</div>` : ""}
</div>
<div class="footer">
  <div class="flogo">ai<span>.go</span></div>
  <div class="fdate">Gerado em ${now} · ai.go agência digital</div>
</div>
</div>
</body></html>`;
}

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap');`;
const BASE = `${FONTS}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(160,100,255,.2);border-radius:4px}input::placeholder,textarea::placeholder{color:rgba(255,255,255,.18)}`;

export default function App() {
  const [screen, setScreen] = useState("home");
  const [clientIdx, setClientIdx] = useState(0);
  const [data, setData] = useState({});
  const [form, setForm] = useState({...EMPTY});
  const [search, setSearch] = useState("");
  const [pdfHtml, setPdfHtml] = useState("");

  const cName = CLIENTS[clientIdx];
  const cColor = clr(clientIdx);
  const cData = data[clientIdx] || {};
  const months = Object.keys(cData).sort().reverse();
  const setF = (k, v) => setForm(f => ({...f, [k]: v}));

  function handleSave() {
    if(!form.mesAno) return;
    setData(d => ({...d, [clientIdx]: {...(d[clientIdx]||{}), [form.mesAno]: {...form}}}));
  }

  function handleGenPDF(d) {
    const html = buildPDF(cName, clientIdx, d || form);
    setPdfHtml(html);
    setScreen("preview");
  }

  function handleDownload() {
    const blob = new Blob([pdfHtml], {type:"text/html"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${cName.replace(/\s+/g,"-")}-${form.mesAno||"sem-data"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openPrint() {
    const w = window.open("","_blank");
    w.document.write(pdfHtml);
    w.document.close();
    setTimeout(() => w.print(), 600);
  }

  const filtered = CLIENTS.map((n,i) => ({n,i})).filter(({n}) => n.toLowerCase().includes(search.toLowerCase()));

  const topbar = (title, back, backLabel) => (
    <div style={{height:52,borderBottom:"1px solid rgba(255,255,255,.05)",display:"flex",alignItems:"center",padding:"0 28px",gap:14,flexShrink:0}}>
      <div style={{fontWeight:800,fontSize:17,fontFamily:"'Montserrat',sans-serif"}}>
        ai<span style={{color:cColor}}>.go</span>
      </div>
      {back && <button onClick={back} style={{background:"none",border:"none",color:"rgba(255,255,255,.4)",fontFamily:"'Montserrat',sans-serif",fontSize:13,cursor:"pointer"}}>← {backLabel}</button>}
      {title && <div style={{fontWeight:700,fontSize:14,color:"rgba(255,255,255,.65)",fontFamily:"'Montserrat',sans-serif"}}>{title}</div>}
    </div>
  );

  const btn = (label, onClick, bg, fg="#fff", extra={}) => (
    <button onClick={onClick} style={{background:bg,border:"none",borderRadius:10,padding:"10px 20px",color:fg,
      fontFamily:"'Montserrat',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:".01em",...extra}}>
      {label}
    </button>
  );

  if(screen === "home") return (
    <div style={{minHeight:"100vh",background:"#07010f",fontFamily:"'Montserrat',sans-serif",color:"#fff",display:"flex",flexDirection:"column"}}>
      <style>{BASE}</style>
      {topbar()}
      <div style={{padding:"28px 32px",maxWidth:1100,margin:"0 auto",width:"100%"}}>
        <div style={{marginBottom:24}}>
          <div style={{fontWeight:800,fontSize:26,letterSpacing:"-.02em",marginBottom:4}}>Selecione o cliente</div>
          <div style={{fontSize:12,fontWeight:500,color:"rgba(255,255,255,.3)"}}>Escolha para inserir dados e gerar o relatório em PDF</div>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Buscar cliente..."
          style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.09)",borderRadius:10,
            padding:"10px 14px",color:"#fff",fontFamily:"'Montserrat',sans-serif",fontSize:14,outline:"none",
            maxWidth:300,display:"block",marginBottom:24,width:"100%"}}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:12}}>
          {filtered.map(({n,i}) => {
            const cd = data[i]||{};
            const ms = Object.keys(cd).sort().reverse();
            const c = clr(i);
            return (
              <div key={i} onClick={()=>{setClientIdx(i);setScreen("client");}}
                style={{background:"rgba(255,255,255,.03)",border:`1px solid ${c}22`,borderRadius:14,
                  padding:"16px 18px",cursor:"pointer",transition:"all .2s"}}
                onMouseEnter={e=>{e.currentTarget.style.background=`${c}10`;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor=`${c}55`;}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.03)";e.currentTarget.style.transform="";e.currentTarget.style.borderColor=`${c}22`;}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <Avatar name={n} idx={i} size={36}/>
                  <div>
                    <div style={{fontWeight:700,fontSize:13}}>{n}</div>
                    {ms[0] && <div style={{fontSize:10,color:"rgba(255,255,255,.3)",marginTop:2}}>{ms[0]}</div>}
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:10,fontWeight:600,color:c}}>{ms.length} relatório{ms.length!==1?"s":""}</span>
                  <span style={{opacity:.35,fontSize:16}}>→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if(screen === "client") return (
    <div style={{minHeight:"100vh",background:"#07010f",fontFamily:"'Montserrat',sans-serif",color:"#fff",display:"flex",flexDirection:"column"}}>
      <style>{BASE}</style>
      {topbar(cName, ()=>setScreen("home"), "Clientes")}
      <div style={{padding:"28px 32px",maxWidth:1100,margin:"0 auto",width:"100%"}}>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:32}}>
          <Avatar name={cName} idx={clientIdx} size={50}/>
          <div>
            <div style={{fontWeight:800,fontSize:24,letterSpacing:"-.02em"}}>{cName}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.3)",marginTop:3}}>{months.length} relatório{months.length!==1?"s":""} cadastrado{months.length!==1?"s":""}</div>
          </div>
          <div style={{marginLeft:"auto"}}>{btn("+ Novo Relatório", ()=>{setForm({...EMPTY});setScreen("input");}, cColor)}</div>
        </div>
        {months.length === 0 ? (
          <div style={{background:"rgba(255,255,255,.02)",border:"1px dashed rgba(255,255,255,.08)",borderRadius:18,padding:"60px 40px",textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:14}}>📊</div>
            <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>Nenhum relatório ainda</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.3)",marginBottom:22}}>Clique em "Novo Relatório" para começar</div>
            {btn("+ Novo Relatório", ()=>{setForm({...EMPTY});setScreen("input");}, cColor)}
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
            {months.map(m => {
              const d = cData[m];
              return (
                <div key={m} style={{background:"rgba(255,255,255,.03)",border:`1px solid ${cColor}22`,borderRadius:14,padding:"18px 20px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <div style={{background:`${cColor}22`,color:cColor,fontWeight:700,fontSize:11,padding:"4px 12px",borderRadius:100}}>{m}</div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                    {[["Seguidores",d.seguidores],["Novos",d.seguidoresNovos],["Alcance",d.alcance],["Likes",d.likes]].map(([l,v])=>(
                      <div key={l}>
                        <div style={{fontSize:9,fontWeight:600,color:"rgba(255,255,255,.3)",textTransform:"uppercase",letterSpacing:".07em"}}>{l}</div>
                        <div style={{fontSize:18,fontWeight:700,marginTop:3}}>{fmt(v)}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    {btn("Editar", ()=>{setForm({...EMPTY,...d});setScreen("input");}, "rgba(255,255,255,.06)", "rgba(255,255,255,.7)", {flex:1,fontSize:12})}
                    {btn("📄 Gerar PDF", ()=>{setForm({...EMPTY,...d});handleGenPDF(d);}, cColor, "#fff", {flex:1,fontSize:12})}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  if(screen === "input") return (
    <div style={{minHeight:"100vh",background:"#07010f",fontFamily:"'Montserrat',sans-serif",color:"#fff",display:"flex",flexDirection:"column"}}>
      <style>{BASE}</style>
      {topbar("Novo Relatório · " + cName, ()=>setScreen("client"), cName)}
      <div style={{padding:"28px 32px",maxWidth:900,margin:"0 auto",width:"100%"}}>
        <div style={{background:`${cColor}12`,border:`1px solid ${cColor}33`,borderRadius:14,padding:"16px 20px",marginBottom:28,display:"flex",gap:14,alignItems:"flex-start"}}>
          <div style={{fontSize:24,flexShrink:0}}>📲</div>
          <div>
            <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>Quer preencher automaticamente?</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.5)",lineHeight:1.6}}>
              Envie os prints dos insights do Instagram <strong style={{color:"#fff"}}>aqui no chat do Claude</strong> e peça: <em style={{color:cColor}}>"Leia esses prints e me passe as métricas"</em>. Eu extraio tudo e você cola nos campos abaixo.
            </div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
          <Field label="Mês / Ano" value={form.mesAno} onChange={v=>setF("mesAno",v)} placeholder="Março 2026" span3/>
          <div style={{gridColumn:"span 3",paddingTop:8,borderTop:"1px solid rgba(255,255,255,.06)",fontSize:10,fontWeight:700,color:"rgba(255,255,255,.28)",textTransform:"uppercase",letterSpacing:".1em"}}>👥 Seguidores</div>
          <Field label="Total de Seguidores" value={form.seguidores} onChange={v=>setF("seguidores",v)} placeholder="48.986"/>
          <Field label="Novos Seguidores" value={form.seguidoresNovos} onChange={v=>setF("seguidoresNovos",v)} placeholder="1.844"/>
          <Field label="Deixaram de Seguir" value={form.unfollow} onChange={v=>setF("unfollow",v)} placeholder="458"/>
          <div style={{gridColumn:"span 3",paddingTop:8,borderTop:"1px solid rgba(255,255,255,.06)",fontSize:10,fontWeight:700,color:"rgba(255,255,255,.28)",textTransform:"uppercase",letterSpacing:".1em"}}>📡 Alcance</div>
          <Field label="Visualizações" value={form.visualizacoes} onChange={v=>setF("visualizacoes",v)} placeholder="319.410"/>
          <Field label="Contas Alcançadas" value={form.alcance} onChange={v=>setF("alcance",v)} placeholder="93.687"/>
          <Field label="Visitas ao Perfil" value={form.visitas} onChange={v=>setF("visitas",v)} placeholder="8.218"/>
          <div style={{gridColumn:"span 3",paddingTop:8,borderTop:"1px solid rgba(255,255,255,.06)",fontSize:10,fontWeight:700,color:"rgba(255,255,255,.28)",textTransform:"uppercase",letterSpacing:".1em"}}>❤ Engajamento</div>
          <Field label="Reels Publicados" value={form.reels} onChange={v=>setF("reels",v)} placeholder="5"/>
          <Field label="Likes" value={form.likes} onChange={v=>setF("likes",v)} placeholder="6.896"/>
          <Field label="Comentários" value={form.comentarios} onChange={v=>setF("comentarios",v)} placeholder="178"/>
          <Field label="Salvamentos" value={form.salvamentos} onChange={v=>setF("salvamentos",v)} placeholder="2.797"/>
          <Field label="Compartilhamentos" value={form.compartilhamentos} onChange={v=>setF("compartilhamentos",v)} placeholder="2.835"/>
          <Field label="Toques em Links" value={form.links} onChange={v=>setF("links",v)} placeholder="56"/>
          <div style={{gridColumn:"span 3",paddingTop:8,borderTop:"1px solid rgba(255,255,255,.06)",fontSize:10,fontWeight:700,color:"rgba(255,255,255,.28)",textTransform:"uppercase",letterSpacing:".1em"}}>⭐ Top Post</div>
          <Field label="Título / Descrição" value={form.topPost} onChange={v=>setF("topPost",v)} placeholder="Escolher o MDF certo faz toda diferença..." span3/>
          <Field label="Visualizações do Top Post" value={form.topPostViews} onChange={v=>setF("topPostViews",v)} placeholder="76.914"/>
          <Field label="Likes do Top Post" value={form.topPostLikes} onChange={v=>setF("topPostLikes",v)} placeholder="2.600"/>
          <div/>
          <div style={{gridColumn:"span 3",paddingTop:8,borderTop:"1px solid rgba(255,255,255,.06)",fontSize:10,fontWeight:700,color:"rgba(255,255,255,.28)",textTransform:"uppercase",letterSpacing:".1em"}}>📲 Stories (opcional)</div>
          <Field label="Publicações de Stories" value={form.stories} onChange={v=>setF("stories",v)} placeholder="14"/>
          <Field label="Visualizações Stories" value={form.storiesViews} onChange={v=>setF("storiesViews",v)} placeholder="2.248"/>
          <div/>
          <div style={{gridColumn:"span 3",paddingTop:8,borderTop:"1px solid rgba(255,255,255,.06)"}}>
            <label style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.28)",textTransform:"uppercase",letterSpacing:".1em",display:"block",marginBottom:10}}>📝 Observações (opcional)</label>
            <textarea value={form.observacoes} onChange={e=>setF("observacoes",e.target.value)}
              placeholder="Destaques do mês, contexto, próximos passos..."
              style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,
                padding:"10px 13px",color:"#fff",fontFamily:"'Montserrat',sans-serif",fontSize:13,outline:"none",
                width:"100%",minHeight:80,resize:"vertical",lineHeight:1.65}}/>
          </div>
          <div style={{gridColumn:"span 3",display:"flex",gap:10,justifyContent:"flex-end",paddingTop:8}}>
            {btn("Cancelar", ()=>setScreen("client"), "rgba(255,255,255,.05)", "rgba(255,255,255,.55)")}
            {btn("Salvar", ()=>{handleSave();setScreen("client");}, "rgba(255,255,255,.08)", "rgba(255,255,255,.8)")}
            {btn("📄 Salvar e Gerar PDF", ()=>{handleSave();handleGenPDF();}, cColor)}
          </div>
        </div>
      </div>
    </div>
  );

  if(screen === "preview") return (
    <div style={{minHeight:"100vh",background:"#0d0010",fontFamily:"'Montserrat',sans-serif",color:"#fff",display:"flex",flexDirection:"column"}}>
      <style>{BASE}</style>
      <div style={{height:52,borderBottom:"1px solid rgba(255,255,255,.05)",display:"flex",alignItems:"center",padding:"0 28px",gap:14,flexShrink:0}}>
        <div style={{fontWeight:800,fontSize:17,fontFamily:"'Montserrat',sans-serif"}}>ai<span style={{color:cColor}}>.go</span></div>
        <button onClick={()=>setScreen("input")} style={{background:"none",border:"none",color:"rgba(255,255,255,.4)",fontFamily:"'Montserrat',sans-serif",fontSize:13,cursor:"pointer"}}>← Editar</button>
        <div style={{fontWeight:700,fontSize:14,color:"rgba(255,255,255,.65)",fontFamily:"'Montserrat',sans-serif"}}>Preview — {cName} · {form.mesAno}</div>
        <div style={{marginLeft:"auto",display:"flex",gap:10}}>
          {btn("⬇ Baixar HTML", handleDownload, "rgba(255,255,255,.07)", "rgba(255,255,255,.8)")}
          {btn("🖨 Imprimir / Salvar PDF", openPrint, cColor)}
        </div>
      </div>
      <div style={{flex:1,background:"#111",display:"flex",flexDirection:"column",alignItems:"center",padding:"24px 20px"}}>
        <div style={{fontSize:12,color:"rgba(255,255,255,.35)",marginBottom:18,textAlign:"center"}}>
          Clique em <strong style={{color:cColor}}>Imprimir / Salvar PDF</strong> → escolha <strong style={{color:"#fff"}}>"Salvar como PDF"</strong> no navegador
        </div>
        <div style={{width:"100%",maxWidth:794,borderRadius:10,overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.7)"}}>
          <iframe srcDoc={pdfHtml} style={{width:"100%",height:1150,border:"none",display:"block"}} title="Preview"/>
        </div>
      </div>
    </div>
  );
}
