import { useState, useRef, useEffect } from "react";

const CLIENTS = [
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
  const PURPLE = "#4A1BD4";
  const ORANGE = "#E07020";
  const CREAM  = "#f5f0e5";
  const TEXT   = "#160430";

  const now = new Date().toLocaleDateString("pt-BR");
  const engMax = Math.max(+d.likes||0, +d.comentarios||0, +d.salvamentos||0, +d.compartilhamentos||0, 1);
  const bar = v => `<div style="height:5px;background:#e5dff5;border-radius:4px;overflow:hidden;margin-top:5px"><div style="height:100%;width:${Math.min(100,(+v||0)/engMax*100)}%;background:${ORANGE};border-radius:4px"></div></div>`;
  const saldo = (+d.seguidoresNovos||0) - (+d.unfollow||0);

  // Parse mesAno em qualquer formato: "Maio 2026", "Jun-Jul 2024", "06/2026", "2026-06"
  const MESES = {
    "janeiro":1,"fevereiro":2,"março":3,"marco":3,"abril":4,"maio":5,
    "junho":6,"julho":7,"agosto":8,"setembro":9,"outubro":10,"novembro":11,"dezembro":12,
    "jan":1,"fev":2,"mar":3,"abr":4,"mai":5,"jun":6,
    "jul":7,"ago":8,"set":9,"out":10,"nov":11,"dez":12,
  };
  const MES_NOME = ["","Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  let mesNum = 0, ano = 0;
  const tokens = (d.mesAno||"").toLowerCase().split(/[\s\-\/\.]+/);
  for (const t of tokens) {
    if (!mesNum && MESES[t]) { mesNum = MESES[t]; continue; }
    const n = parseInt(t);
    if (!ano && n >= 1900 && n <= 2100) { ano = n; continue; }
    if (!mesNum && n >= 1 && n <= 12 && t.length <= 2) mesNum = n;
  }

  // Pull Post/Carrossel "postado" from Inventory localStorage
  let calDays = {};
  let postList = [];
  if (mesNum && ano) {
    try {
      const inv = JSON.parse(localStorage.getItem("aigo-inventory-v1")||"{}");
      const slugFn = s => s.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
      const monthKey = `${ano}-${String(mesNum).padStart(2,"0")}`;
      const items = (inv[slugFn(clientName)]?.[monthKey]||[]).filter(
        it => (it.type==="Post"||it.type==="Carrossel") && it.status==="postado" && it.scheduledDate
      );
      items.forEach(it => {
        const day = parseInt((it.scheduledDate||"").split("-")[2]);
        if (!day) return;
        if (!calDays[day]) calDays[day] = [];
        calDays[day].push(it.name||it.type);
        postList.push({day, name: it.name||"(sem título)", type: it.type});
      });
      postList.sort((a,b) => a.day - b.day);
    } catch(e){}
  }

  // Build calendar grid HTML
  let calHtml = "";
  if (mesNum && ano) {
    const firstDay = new Date(ano, mesNum-1, 1).getDay();
    const daysInMonth = new Date(ano, mesNum, 0).getDate();
    const DIAS = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];
    const cells = [];
    for (let i=0; i<firstDay; i++) cells.push(null);
    for (let dd=1; dd<=daysInMonth; dd++) cells.push(dd);
    while (cells.length%7!==0) cells.push(null);
    const rows = [];
    for (let i=0; i<cells.length; i+=7) rows.push(cells.slice(i,i+7));

    calHtml = `
    <div class="stitle">📅 Calendário de Posts</div>
    <div style="display:flex;gap:20px;align-items:flex-start">
      <div style="flex:1;border:2px solid ${PURPLE};border-radius:12px;overflow:hidden">
        <div style="background:${PURPLE};padding:11px 16px;text-align:center">
          <span style="font-size:17px;font-weight:900;color:#fff;letter-spacing:.06em;text-transform:uppercase">${MES_NOME[mesNum]} ${ano}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;background:#fff">
          <thead><tr>${DIAS.map(dd=>`<th style="background:${ORANGE};color:#fff;font-size:8px;font-weight:700;letter-spacing:.07em;padding:7px 2px;text-align:center">${dd}</th>`).join("")}</tr></thead>
          <tbody>${rows.map(row=>`<tr>${row.map(day=>{
            const has = day && calDays[day];
            return `<td style="border:1px solid #e8dff5;padding:5px 2px;text-align:center;height:34px;vertical-align:middle;background:${has?ORANGE:"#fff"}">
              ${day?`<span style="font-size:11px;font-weight:${has?800:500};color:${has?"#fff":TEXT}">${day}</span>`:""}
            </td>`;
          }).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>
      <div style="width:195px;flex-shrink:0;padding-top:4px">
        ${postList.length>0 ? postList.map(p=>`
          <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:9px">
            <div style="background:${ORANGE};color:#fff;font-size:8px;font-weight:700;padding:3px 8px;border-radius:100px;white-space:nowrap;flex-shrink:0">${String(p.day).padStart(2,"0")}/${String(mesNum).padStart(2,"0")}</div>
            <div style="font-size:10px;color:${TEXT};line-height:1.4;font-weight:500">${p.name}</div>
          </div>`).join("")
        : `<div style="font-size:11px;color:rgba(22,4,48,.38);font-style:italic;line-height:1.6">Nenhum Post ou Carrossel com status Postado encontrado no estoque deste mês.</div>`}
      </div>
    </div>`;
  }

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Montserrat',sans-serif;background-color:${CREAM};background-image:linear-gradient(rgba(74,27,212,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(74,27,212,.07) 1px,transparent 1px);background-size:22px 22px;color:${TEXT};width:794px}
.page{width:794px;padding:0;position:relative}
.header{background:${CREAM};padding:38px 52px 26px;border-bottom:3px solid ${PURPLE}}
.logo-line{font-size:10px;font-weight:700;letter-spacing:.1em;color:rgba(22,4,48,.38);margin-bottom:22px;text-transform:uppercase}
.logo-line span{color:${ORANGE}}
.hrow{display:flex;align-items:center;gap:18px}
.avatar{width:56px;height:56px;border-radius:14px;background:linear-gradient(135deg,${PURPLE},${ORANGE});display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:800;color:#fff;box-shadow:0 6px 20px ${PURPLE}44}
.cname{font-size:27px;font-weight:900;color:${PURPLE};letter-spacing:-.02em;text-transform:uppercase}
.csub{font-size:10px;font-weight:600;color:rgba(22,4,48,.4);margin-top:4px;letter-spacing:.06em;text-transform:uppercase}
.badge{margin-left:auto;background:${ORANGE};border-radius:100px;padding:8px 20px;font-size:11px;font-weight:800;color:#fff;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}
.body{padding:26px 52px 48px}
.stitle{font-size:9px;font-weight:700;color:rgba(22,4,48,.35);letter-spacing:.1em;text-transform:uppercase;margin:22px 0 12px;display:flex;align-items:center;gap:10px}
.stitle::after{content:'';flex:1;height:1px;background:rgba(22,4,48,.1)}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.card{background:#fff;border:1px solid rgba(74,27,212,.12);border-radius:12px;padding:14px 16px;box-shadow:0 1px 4px rgba(74,27,212,.06)}
.card-hero{background:linear-gradient(135deg,${PURPLE}18,${ORANGE}0a);border:2px solid ${PURPLE}35;border-radius:12px;padding:16px 18px}
.cl{font-size:8.5px;font-weight:700;color:rgba(22,4,48,.38);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
.cv{font-size:24px;font-weight:800;color:${TEXT};line-height:1}
.cv-hero{font-size:28px;font-weight:900;color:${PURPLE};line-height:1}
.cv-sm{font-size:20px;font-weight:700;color:${TEXT};line-height:1}
.cv-green{color:#059669}.cv-red{color:#DC2626}
.erow{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.elabel{font-size:11px;font-weight:500;color:rgba(22,4,48,.5)}
.eval{font-size:13px;font-weight:700;color:${TEXT}}
.tp-box{background:linear-gradient(135deg,${ORANGE}18,${CREAM});border:1px solid ${ORANGE}45;border-radius:12px;padding:17px 20px}
.tp-tag{display:inline-block;background:${ORANGE};color:#fff;font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:3px 10px;border-radius:100px;margin-bottom:9px}
.tp-title{font-size:13px;font-weight:700;color:${TEXT};line-height:1.45;margin-bottom:12px}
.tp-stats{display:flex;gap:18px}
.tps{display:flex;flex-direction:column;gap:3px}
.tpv{font-size:17px;font-weight:800;color:${ORANGE}}
.tpl{font-size:8px;font-weight:600;color:rgba(22,4,48,.38);text-transform:uppercase;letter-spacing:.07em}
.obs{background:#fff;border:1px solid rgba(74,27,212,.12);border-radius:12px;padding:16px 18px;font-size:12px;color:rgba(22,4,48,.6);line-height:1.65}
.footer{padding:14px 52px;background:${PURPLE};display:flex;justify-content:space-between;align-items:center;margin-top:28px}
.flogo{font-size:14px;font-weight:800;color:rgba(255,255,255,.55)}
.flogo span{color:${ORANGE}}
.fdate{font-size:9px;font-weight:500;color:rgba(255,255,255,.32);letter-spacing:.06em}
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
      ${d.stories?`<div class="card" style="margin-top:10px"><div class="cl">📲 Stories · ${fmt(d.storiesViews)} visualizações</div><div class="cv-sm" style="margin-top:5px">${d.stories} publicações</div></div>`:""}
    </div>
  </div>
  ${d.observacoes?`<div class="stitle">📝 Observações</div><div class="obs">${d.observacoes}</div>`:""}
  ${calHtml}
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
  const [data, setData] = useState(() => {
    try { return JSON.parse(localStorage.getItem("aigo-data") || "{}"); } catch { return {}; }
  });
  const [form, setForm] = useState({...EMPTY});
  const [search, setSearch] = useState("");
  const [pdfHtml, setPdfHtml] = useState("");
  const [reading, setReading] = useState(false);
  const [readMsg, setReadMsg] = useState("");
  const fileRef = useRef();

  useEffect(() => {
    localStorage.setItem("aigo-data", JSON.stringify(data));
  }, [data]);

  const cName = CLIENTS[clientIdx];
  const cColor = clr(clientIdx);
  const cData = data[clientIdx] || {};
  const months = Object.keys(cData).sort().reverse();
  const setF = (k, v) => setForm(f => ({...f, [k]: v}));

  async function handleImages(files) {
    if(!files.length) return;
    if(files.length > 10) {
      setReadMsg("⚠️ Envie no máximo 10 prints por vez.");
      return;
    }
    setReading(true);
    setReadMsg("Analisando prints com IA...");
    try {
      const compress = file => new Promise((res,rej)=>{
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          const maxW = 750, maxH = 1300;
          let scale = Math.min(1, maxW / img.width);
          let w = Math.round(img.width * scale);
          let h = Math.round(img.height * scale);
          if(h > maxH) { scale = maxH / h; w = Math.round(w * scale); h = maxH; }
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
          res(dataUrl.split(",")[1]);
        };
        img.onerror = rej;
        img.src = url;
      });
      const imgs = await Promise.all([...files].map(async f=>({
        type:"image",
        source:{ type:"base64", media_type:"image/jpeg", data: await compress(f) }
      })));
      const resp = await fetch("/api/ler-prints",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          messages:[{
            role:"user",
            content:[
              ...imgs,
              {type:"text",text:`Analise estes prints de insights do Instagram e retorne APENAS um JSON válido sem markdown com estes campos (string vazia se não encontrar):
{"mesAno":"","seguidores":"","seguidoresNovos":"","unfollow":"","visualizacoes":"","alcance":"","visitas":"","links":"","reels":"","likes":"","comentarios":"","salvamentos":"","compartilhamentos":"","topPost":"","topPostViews":"","topPostLikes":"","stories":"","storiesViews":""}`}
            ]
          }]
        })
      });
      if(!resp.ok) {
        if(resp.status === 413) throw new Error("Imagens muito grandes para enviar. Tente com menos prints.");
        throw new Error("Erro ao enviar prints (HTTP " + resp.status + "). Tente novamente.");
      }
      const wrapper = await resp.json();
      if (!wrapper.ok) {
        setReadMsg("⚠️ Anthropic respondeu com erro " + wrapper.status + ": " + wrapper.raw);
        setReading(false);
        return;
      }
      const json = JSON.parse(wrapper.raw);
      const raw = (json.content||[]).map(b=>b.text||"").join("");
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      const clean = (match ? match[1] : raw).trim();
      const parsed = JSON.parse(clean);
      setForm(f=>({...f,...parsed}));
      setReadMsg("✅ Dados preenchidos automaticamente! Confira e ajuste se necessário.");
    } catch(e) {
      setReadMsg("⚠️ Erro: " + String(e));
    }
    setReading(false);
  }

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
    setTimeout(() => w.print(), 1800);
  }

  const filtered = CLIENTS.map((n,i) => ({n,i})).filter(({n}) => n.toLowerCase().includes(search.toLowerCase()));

  const topbar = (title, back, backLabel) => (
    <div style={{height:52,borderBottom:"1px solid rgba(255,255,255,.05)",display:"flex",alignItems:"center",padding:"0 28px",gap:14,flexShrink:0}}>
      <div style={{fontWeight:800,fontSize:17,fontFamily:"'Montserrat',sans-serif"}}>
        ai<span style={{color:cColor}}>.go</span>
      </div>
      {back && <button onClick={back} style={{background:"none",border:"none",color:"rgba(255,255,255,.4)",fontFamily:"'Montserrat',sans-serif",fontSize:13,cursor:"pointer"}}>← {backLabel}</button>}
      {title && <div style={{fontWeight:700,fontSize:14,color:"rgba(255,255,255,.65)",fontFamily:"'Montserrat',sans-serif"}}>{title}</div>}
      <a href="/estoque" style={{
        marginLeft:"auto",display:"flex",alignItems:"center",gap:6,
        background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",
        borderRadius:10,padding:"6px 14px",color:"rgba(255,255,255,.45)",
        fontFamily:"'Montserrat',sans-serif",fontSize:12,fontWeight:600,
        textDecoration:"none",cursor:"pointer",transition:"all .15s",whiteSpace:"nowrap",
      }}
      onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.08)";e.currentTarget.style.color="rgba(255,255,255,.7)";}}
      onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.04)";e.currentTarget.style.color="rgba(255,255,255,.45)";}}>
        📦 Estoque
      </a>
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
          <div style={{marginLeft:"auto"}}>{btn("+ Novo Relatório", ()=>{setForm({...EMPTY});setReadMsg("");setScreen("input");}, cColor)}</div>
        </div>
        {months.length === 0 ? (
          <div style={{background:"rgba(255,255,255,.02)",border:"1px dashed rgba(255,255,255,.08)",borderRadius:18,padding:"60px 40px",textAlign:"center"}}>
            <div style={{fontSize:36,marginBottom:14}}>📊</div>
            <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>Nenhum relatório ainda</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,.3)",marginBottom:22}}>Clique em "Novo Relatório" para começar</div>
            {btn("+ Novo Relatório", ()=>{setForm({...EMPTY});setReadMsg("");setScreen("input");}, cColor)}
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
                    {btn("Editar", ()=>{setForm({...EMPTY,...d});setReadMsg("");setScreen("input");}, "rgba(255,255,255,.06)", "rgba(255,255,255,.7)", {flex:1,fontSize:12})}
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

        <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>handleImages(e.target.files)}/>

        <div
          onClick={()=>!reading && fileRef.current.click()}
          style={{
            border:`2px dashed ${reading?"#7C3AED":"rgba(255,255,255,.15)"}`,
            borderRadius:14, padding:"28px 24px", textAlign:"center",
            background: reading?`${cColor}08`:"rgba(255,255,255,.02)",
            cursor: reading?"default":"pointer", marginBottom:20, transition:"all .2s",
          }}
          onMouseEnter={e=>{ if(!reading){ e.currentTarget.style.borderColor=cColor; e.currentTarget.style.background=`${cColor}08`; }}}
          onMouseLeave={e=>{ if(!reading){ e.currentTarget.style.borderColor="rgba(255,255,255,.15)"; e.currentTarget.style.background="rgba(255,255,255,.02)"; }}}
        >
          {reading ? (
            <div>
              <div style={{fontSize:28,marginBottom:8}}>⏳</div>
              <div style={{fontWeight:700,fontSize:14,color:cColor}}>Analisando prints com IA...</div>
            </div>
          ) : (
            <div>
              <div style={{fontSize:32,marginBottom:8}}>📲</div>
              <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>Clique para enviar os prints dos insights</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.35)"}}>A IA lê automaticamente e preenche os campos</div>
            </div>
          )}
        </div>

        {readMsg && (
          <div style={{background: readMsg.startsWith("✅") ? "rgba(5,150,105,.15)" : "rgba(220,107,47,.15)",
            border:`1px solid ${readMsg.startsWith("✅") ? "rgba(5,150,105,.4)" : "rgba(220,107,47,.4)"}`,
            borderRadius:10, padding:"12px 16px", marginBottom:20,
            fontSize:13, fontWeight:600, color: readMsg.startsWith("✅") ? "#34d399" : "#fb923c"}}>
            {readMsg}
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
          <Field label="Mês / Ano" value={form.mesAno} onChange={v=>setF("mesAno",v)} placeholder="Maio 2026" span3/>
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
          <Field label="Título / Descrição" value={form.topPost} onChange={v=>setF("topPost",v)} placeholder="Nome do post com melhor performance..." span3/>
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
            {btn("Salvar", ()=>{
              if(!form.mesAno){ setReadMsg("⚠️ Preencha o campo Mês / Ano antes de salvar."); return; }
              handleSave(); setScreen("client");
            }, "rgba(255,255,255,.08)", "rgba(255,255,255,.8)")}
            {btn("📄 Salvar e Gerar PDF", ()=>{
              if(!form.mesAno){ setReadMsg("⚠️ Preencha o campo Mês / Ano antes de salvar."); return; }
              handleSave(); handleGenPDF();
            }, cColor)}
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
          Clique em <strong style={{color:cColor}}>Imprimir / Salvar PDF</strong> → escolha <strong style={{color:"#fff"}}>"Salvar como PDF"</strong>
        </div>
        <div style={{width:"100%",maxWidth:794,borderRadius:10,overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.7)"}}>
          <iframe srcDoc={pdfHtml} style={{width:"100%",height:1150,border:"none",display:"block"}} title="Preview"
            onLoad={e=>{ try{ e.target.style.height = e.target.contentWindow.document.body.scrollHeight + "px"; }catch(_){} }}/>
        </div>
      </div>
    </div>
  );
}
