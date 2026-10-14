import { useState, useEffect, useRef, useMemo } from "react";

// ── Constants ──────────────────────────────────────────────────────────────
const CLIENTS = [
  "Aline","Americana","AP Engenharia","Bioessência","Coperfarma",
  "Doma Cosméticos","Dra. Gisele","Fran Cendron","Ingalimp",
  "Leda","Manu Arquitetura","Marcela - Lash e Brown","Mari Garcia","Murilo Bianco",
  "Nathalia","Petshop","Suellem","Vikce","Wood",
];

const CATEGORIES = [
  "Mensalidade de cliente","Projeto avulso","Repasse de tráfego pago",
  "Ferramentas e assinaturas","Tráfego pago (anúncios)","Freelancers e equipe",
  "Pró-labore","Impostos","Equipamentos","Marketing próprio","Aluguel e contas",
  "Transporte","Alimentação","Taxas bancárias","Outros",
];

const FORMS = ["PIX","Transferência","Boleto","Cartão de crédito","Cartão de débito","Dinheiro","Outro"];

const STORAGE_KEY = "aigo-financeiro-v1";

// Colors — entradas/saídas as two fixed categorical hues, categories in one hue
const C_IN   = "#34D399";
const C_OUT  = "#F87171";
const C_ACC  = "#A78BFA";
const C_WARN = "#F59E0B";
const FONT   = "'Montserrat',sans-serif";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap');`;
const BASE  = `${FONTS}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:rgba(160,100,255,.2);border-radius:4px}input::placeholder,textarea::placeholder{color:rgba(255,255,255,.18)}select option{background:#120624;color:#fff}input[type=date]::-webkit-calendar-picker-indicator{filter:invert(1);opacity:.4}`;

// ── Helpers ────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const monthOf = date => (date || "").slice(0, 7);
const brl = v => (Number(v) || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
const brlShort = v => {
  const n = Math.abs(Number(v) || 0);
  const s = n >= 1000 ? (n/1000).toFixed(n >= 10000 ? 0 : 1).replace(".", ",") + " mil" : n.toFixed(0);
  return (v < 0 ? "-" : "") + "R$ " + s;
};
const dateBR = d => d ? d.split("-").reverse().join("/") : "—";
const monthLabel = m => {
  if (!m) return "Sem data";
  const [y, mo] = m.split("-");
  return new Date(+y, +mo-1, 1).toLocaleDateString("pt-BR", { month:"long", year:"numeric" })
    .replace(/^\w/, c => c.toUpperCase());
};
const monthShort = m => {
  const [y, mo] = m.split("-");
  return new Date(+y, +mo-1, 1).toLocaleDateString("pt-BR", { month:"short" }).replace(".", "") + "/" + y.slice(2);
};

// Accepts "1.234,56", "1234.56", "R$ 1.234", 1234.56
function parseValor(v) {
  if (typeof v === "number") return Math.abs(v);
  let s = String(v || "").replace(/[^\d,.-]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.abs(n);
}

function normalize(t) {
  return {
    id: t.id || uid(),
    data: /^\d{4}-\d{2}-\d{2}$/.test(t.data || "") ? t.data : "",
    descricao: t.descricao || "",
    tipo: t.tipo === "entrada" ? "entrada" : "saida",
    valor: parseValor(t.valor),
    categoria: CATEGORIES.includes(t.categoria) ? t.categoria : "Outros",
    cliente: CLIENTS.includes(t.cliente) ? t.cliente : "",
    forma: FORMS.includes(t.forma) ? t.forma : "Outro",
    status: t.status === "pendente" ? "pendente" : "pago",
    obs: t.obs || "",
    origem: t.origem || "manual",
    criadoEm: t.criadoEm || new Date().toISOString(),
  };
}

function load() {
  try { return (JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") || []).map(normalize); }
  catch { return []; }
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

const COLS = [
  ["Data", t => dateBR(t.data)],
  ["Tipo", t => t.tipo === "entrada" ? "Entrada" : "Saída"],
  ["Descrição", t => t.descricao],
  ["Categoria", t => t.categoria],
  ["Cliente", t => t.cliente],
  ["Forma de pagamento", t => t.forma],
  ["Status", t => t.status === "pago" ? "Pago" : "Pendente"],
  ["Valor", t => (t.tipo === "saida" ? -t.valor : t.valor).toFixed(2).replace(".", ",")],
  ["Observação", t => t.obs],
];

function toCSV(rows) {
  const esc = v => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [COLS.map(c => c[0]).join(";"), ...rows.map(t => COLS.map(c => esc(c[1](t))).join(";"))];
  return "﻿" + lines.join("\r\n");
}

function toTSV(rows) {
  const clean = v => String(v ?? "").replace(/[\t\r\n]+/g, " ");
  return [COLS.map(c => c[0]).join("\t"), ...rows.map(t => COLS.map(c => clean(c[1](t))).join("\t"))].join("\n");
}

function compressImage(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxW = 900, maxH = 1600;
      let scale = Math.min(1, maxW / img.width);
      let w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      if (h > maxH) { scale = maxH / h; w = Math.round(w * scale); h = maxH; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      res(canvas.toDataURL("image/jpeg", 0.6).split(",")[1]);
    };
    img.onerror = rej;
    img.src = url;
  });
}

// ── Small UI pieces ────────────────────────────────────────────────────────
const inputStyle = {
  background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:10,
  padding:"9px 12px", color:"#fff", fontFamily:FONT, fontSize:13, outline:"none", width:"100%",
};
const labelStyle = {
  fontSize:10, fontWeight:600, color:"rgba(255,255,255,.35)", textTransform:"uppercase",
  letterSpacing:".07em", fontFamily:FONT,
};
const card = {
  background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:14, padding:"18px 20px",
};

function Btn({ children, onClick, bg = "rgba(255,255,255,.06)", fg = "#fff", disabled, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background:bg, border:"1px solid rgba(255,255,255,.08)", borderRadius:10, padding:"9px 16px", color:fg,
      fontFamily:FONT, fontSize:12, fontWeight:700, cursor:disabled ? "default" : "pointer",
      opacity:disabled ? .5 : 1, whiteSpace:"nowrap", ...style,
    }}>{children}</button>
  );
}

function Labeled({ label, children, span }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5, gridColumn: span ? `span ${span}` : undefined, minWidth:0 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Stat({ label, value, color, sub }) {
  return (
    <div style={card}>
      <div style={{ ...labelStyle, marginBottom:8, display:"flex", alignItems:"center", gap:7 }}>
        {color && <span style={{ width:8, height:8, borderRadius:2, background:color }}/>}
        {label}
      </div>
      <div style={{ fontSize:24, fontWeight:800, letterSpacing:"-.02em", color:"#fff" }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:6 }}>{sub}</div>}
    </div>
  );
}

// Grouped bars: entradas vs saídas per month
function MonthChart({ months, onPick, selected }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...months.flatMap(m => [m.entradas, m.saidas]));
  const H = 160;
  if (!months.length) return <Empty text="Sem lançamentos ainda"/>;
  return (
    <div>
      <div style={{ display:"flex", gap:16, marginBottom:14, fontSize:11, color:"rgba(255,255,255,.55)" }}>
        <span style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ width:10, height:10, borderRadius:2, background:C_IN }}/>Entradas</span>
        <span style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ width:10, height:10, borderRadius:2, background:C_OUT }}/>Saídas</span>
      </div>
      <div style={{ position:"relative", paddingTop:8 }}>
        {[0, .5, 1].map(f => (
          <div key={f} style={{ position:"absolute", left:0, right:0, top:8 + H - H*f, borderTop:"1px solid rgba(255,255,255,.05)" }}>
            <span style={{ position:"absolute", left:0, top:-7, fontSize:9, lineHeight:"14px", color:"rgba(255,255,255,.3)" }}>{brlShort(max*f)}</span>
          </div>
        ))}
        <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:H, position:"relative", marginLeft:58 }}>
          {months.map((m, idx) => (
            <div key={m.mes}
              onMouseEnter={() => setHover(m.mes)} onMouseLeave={() => setHover(null)}
              onClick={() => onPick(m.mes)}
              style={{ flex:1, minWidth:0, height:"100%", display:"flex", alignItems:"flex-end", justifyContent:"center", gap:2,
                cursor:"pointer", position:"relative", borderRadius:6,
                background: selected === m.mes ? "rgba(167,139,250,.08)" : hover === m.mes ? "rgba(255,255,255,.03)" : "transparent" }}>
              <div style={{ width:"34%", maxWidth:22, height:`${m.entradas/max*100}%`, minHeight:m.entradas?2:0, background:C_IN, borderRadius:"4px 4px 0 0" }}/>
              <div style={{ width:"34%", maxWidth:22, height:`${m.saidas/max*100}%`, minHeight:m.saidas?2:0, background:C_OUT, borderRadius:"4px 4px 0 0" }}/>
              {hover === m.mes && (
                <div style={{ position:"absolute", top:0, ...(idx < months.length / 2 ? { left:0 } : { right:0 }),
                  background:"#1a0b33", border:"1px solid rgba(255,255,255,.12)", borderRadius:10, padding:"9px 12px",
                  fontSize:11, whiteSpace:"nowrap", zIndex:5, boxShadow:"0 8px 24px rgba(0,0,0,.4)" }}>
                  <div style={{ fontWeight:700, marginBottom:5 }}>{monthLabel(m.mes)}</div>
                  <div style={{ color:"rgba(255,255,255,.7)" }}><span style={{ color:C_IN }}>■</span> Entradas {brl(m.entradas)}</div>
                  <div style={{ color:"rgba(255,255,255,.7)" }}><span style={{ color:C_OUT }}>■</span> Saídas {brl(m.saidas)}</div>
                  <div style={{ marginTop:4, fontWeight:700 }}>Saldo {brl(m.entradas - m.saidas)}</div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:4, marginTop:6, marginLeft:58 }}>
          {months.map(m => (
            <div key={m.mes} style={{ flex:1, minWidth:0, overflow:"hidden", textAlign:"center", fontSize:9, fontWeight:600,
              color: selected === m.mes ? C_ACC : "rgba(255,255,255,.35)" }}>{monthShort(m.mes)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BarList({ items, color, empty }) {
  if (!items.length) return <Empty text={empty}/>;
  const max = Math.max(...items.map(i => i.valor), 1);
  const total = items.reduce((s, i) => s + i.valor, 0);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
      {items.map(i => (
        <div key={i.nome} title={`${i.nome}: ${brl(i.valor)} (${(i.valor/total*100).toFixed(0)}%)`}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:5, gap:10 }}>
            <span style={{ color:"rgba(255,255,255,.7)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{i.nome}</span>
            <span style={{ fontWeight:700, whiteSpace:"nowrap" }}>{brl(i.valor)}</span>
          </div>
          <div style={{ height:6, background:"rgba(255,255,255,.05)", borderRadius:4 }}>
            <div style={{ height:"100%", width:`${i.valor/max*100}%`, background:color, borderRadius:4 }}/>
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ text }) {
  return <div style={{ fontSize:12, color:"rgba(255,255,255,.3)", padding:"24px 0", textAlign:"center" }}>{text}</div>;
}

function SectionTitle({ children, right }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:14, flexWrap:"wrap" }}>
      <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.8)" }}>{children}</div>
      {right}
    </div>
  );
}

// Editable row used both for review (AI) and manual add/edit
function TxEditor({ tx, onChange, onRemove, compact }) {
  const set = (k, v) => onChange({ ...tx, [k]: v });
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10,
      ...(compact ? { ...card, padding:"14px 16px", borderColor: tx.tipo === "entrada" ? C_IN+"33" : C_OUT+"33" } : {}) }}>
      <Labeled label="Tipo">
        <select value={tx.tipo} onChange={e => set("tipo", e.target.value)} style={inputStyle}>
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
      </Labeled>
      <Labeled label="Data">
        <input type="date" value={tx.data} onChange={e => set("data", e.target.value)} style={inputStyle}/>
      </Labeled>
      <Labeled label="Valor (R$)">
        <input inputMode="decimal" value={tx.valorTxt ?? String(tx.valor || "").replace(".", ",")}
          onChange={e => onChange({ ...tx, valorTxt:e.target.value, valor:parseValor(e.target.value) })}
          placeholder="0,00" style={inputStyle}/>
      </Labeled>
      <Labeled label="Descrição" span={2}>
        <input value={tx.descricao} onChange={e => set("descricao", e.target.value)} placeholder="Ex.: Mensalidade outubro" style={inputStyle}/>
      </Labeled>
      <Labeled label="Categoria">
        <select value={tx.categoria} onChange={e => set("categoria", e.target.value)} style={inputStyle}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </Labeled>
      <Labeled label="Cliente">
        <select value={tx.cliente} onChange={e => set("cliente", e.target.value)} style={inputStyle}>
          <option value="">—</option>
          {CLIENTS.map(c => <option key={c}>{c}</option>)}
        </select>
      </Labeled>
      <Labeled label="Forma">
        <select value={tx.forma} onChange={e => set("forma", e.target.value)} style={inputStyle}>
          {FORMS.map(c => <option key={c}>{c}</option>)}
        </select>
      </Labeled>
      <Labeled label="Status">
        <select value={tx.status} onChange={e => set("status", e.target.value)} style={inputStyle}>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
        </select>
      </Labeled>
      <Labeled label="Observação" span={2}>
        <input value={tx.obs} onChange={e => set("obs", e.target.value)} style={inputStyle}/>
      </Labeled>
      {onRemove && (
        <div style={{ display:"flex", alignItems:"flex-end" }}>
          <Btn onClick={onRemove} fg={C_OUT} style={{ width:"100%" }}>Descartar</Btn>
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Financeiro() {
  const [txs, setTxs] = useState(load);
  const [mes, setMes] = useState(() => monthOf(today()));   // "" = todos
  const [tipoF, setTipoF] = useState("");
  const [busca, setBusca] = useState("");
  const [review, setReview] = useState([]);                  // lançamentos lidos pela IA aguardando confirmação
  const [reading, setReading] = useState(false);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(null);              // tx sendo criada/editada
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();
  const backupRef = useRef();

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(txs)); } catch {}
  }, [txs]);

  // ── Derived data ──
  const monthsAvailable = useMemo(() => {
    const s = new Set(txs.map(t => monthOf(t.data)).filter(Boolean));
    s.add(monthOf(today()));
    return [...s].sort().reverse();
  }, [txs]);

  const doMes = useMemo(() => txs.filter(t => !mes || monthOf(t.data) === mes), [txs, mes]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return doMes
      .filter(t => !tipoF || t.tipo === tipoF)
      .filter(t => !q || [t.descricao, t.categoria, t.cliente, t.obs, t.forma].join(" ").toLowerCase().includes(q))
      .sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }, [doMes, tipoF, busca]);

  const kpi = useMemo(() => {
    const sum = arr => arr.reduce((s, t) => s + t.valor, 0);
    const entradas = sum(doMes.filter(t => t.tipo === "entrada" && t.status === "pago"));
    const saidas   = sum(doMes.filter(t => t.tipo === "saida" && t.status === "pago"));
    const aReceber = sum(doMes.filter(t => t.tipo === "entrada" && t.status === "pendente"));
    const aPagar   = sum(doMes.filter(t => t.tipo === "saida" && t.status === "pendente"));
    return { entradas, saidas, saldo: entradas - saidas, aReceber, aPagar };
  }, [doMes]);

  const porMes = useMemo(() => {
    const map = {};
    txs.filter(t => t.data && t.status === "pago").forEach(t => {
      const m = monthOf(t.data);
      map[m] = map[m] || { mes:m, entradas:0, saidas:0 };
      map[m][t.tipo === "entrada" ? "entradas" : "saidas"] += t.valor;
    });
    return Object.values(map).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-12);
  }, [txs]);

  const group = (arr, key) => {
    const map = {};
    arr.forEach(t => { const k = t[key] || "Sem cliente"; map[k] = (map[k] || 0) + t.valor; });
    return Object.entries(map).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
  };
  const saidasPorCat   = useMemo(() => group(doMes.filter(t => t.tipo === "saida"), "categoria"), [doMes]);
  const receitaCliente = useMemo(() => group(doMes.filter(t => t.tipo === "entrada"), "cliente"), [doMes]);

  // ── Actions ──
  async function handleFiles(files) {
    files = [...files].filter(f => f.type.startsWith("image/"));
    if (!files.length) return;
    if (files.length > 10) { setMsg("⚠️ Envie no máximo 10 prints por vez."); return; }
    setReading(true);
    setMsg(`Lendo ${files.length} print${files.length > 1 ? "s" : ""} com IA...`);
    try {
      const images = await Promise.all(files.map(compressImage));
      const resp = await fetch("/api/ler-financeiro", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ images, hoje: today(), clientes: CLIENTS, categorias: CATEGORIES }),
      });
      if (resp.status === 413) throw new Error("Imagens muito grandes. Tente com menos prints por vez.");
      const out = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(out.error || `HTTP ${resp.status}`);
      const found = (out.lancamentos || []).map(t => normalize({ ...t, origem:"print" }));
      if (!found.length) {
        setMsg("⚠️ Não encontrei nenhum lançamento nesses prints. Você pode adicionar manualmente.");
      } else {
        setReview(r => [...r, ...found]);
        setMsg(`✅ ${found.length} lançamento${found.length > 1 ? "s" : ""} encontrado${found.length > 1 ? "s" : ""}. Confira abaixo e clique em "Salvar".`);
      }
    } catch (e) {
      setMsg("⚠️ Erro: " + (e.message || String(e)));
    }
    setReading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function confirmReview() {
    const clean = review.map(({ valorTxt, ...t }) => normalize(t));
    setTxs(prev => [...prev, ...clean]);
    const m = clean.find(t => t.data);
    if (m && mes) setMes(monthOf(m.data));
    setReview([]);
    setMsg(`✅ ${clean.length} lançamento${clean.length > 1 ? "s" : ""} salvo${clean.length > 1 ? "s" : ""}.`);
  }

  function saveEditing() {
    const { valorTxt, ...t } = editing;
    const n = normalize(t);
    setTxs(prev => prev.some(x => x.id === n.id) ? prev.map(x => x.id === n.id ? n : x) : [...prev, n]);
    setEditing(null);
  }

  function remove(id) {
    if (!window.confirm("Excluir este lançamento?")) return;
    setTxs(prev => prev.filter(t => t.id !== id));
  }

  const exportName = ext => `financeiro-aigo-${mes || "completo"}.${ext}`;

  async function copyForSheets() {
    try {
      await navigator.clipboard.writeText(toTSV(filtered));
      setMsg(`📋 ${filtered.length} linhas copiadas! Abra o Google Planilhas, clique na célula A1 e cole (Ctrl+V).`);
    } catch {
      setMsg("⚠️ Não consegui copiar. Use o botão Baixar CSV.");
    }
  }

  function importBackup(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const arr = JSON.parse(r.result);
        if (!Array.isArray(arr)) throw new Error("formato inválido");
        setTxs(prev => {
          const ids = new Set(prev.map(t => t.id));
          return [...prev, ...arr.map(normalize).filter(t => !ids.has(t.id))];
        });
        setMsg("✅ Backup importado.");
      } catch (e) { setMsg("⚠️ Backup inválido: " + e.message); }
    };
    r.readAsText(file);
  }

  const novo = () => setEditing(normalize({ data: today(), tipo:"saida", categoria:"Outros", forma:"PIX", status:"pago", valor:0 }));

  // ── Render ──
  const pill = (active) => ({
    background: active ? "rgba(167,139,250,.18)" : "rgba(255,255,255,.04)",
    border: `1px solid ${active ? "rgba(167,139,250,.45)" : "rgba(255,255,255,.08)"}`,
    color: active ? "#fff" : "rgba(255,255,255,.5)",
    borderRadius:100, padding:"6px 13px", fontSize:12, fontWeight:600, fontFamily:FONT, cursor:"pointer", whiteSpace:"nowrap",
  });

  const navLink = {
    display:"flex", alignItems:"center", gap:6, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.08)",
    borderRadius:10, padding:"6px 12px", color:"rgba(255,255,255,.5)", fontFamily:FONT, fontSize:12, fontWeight:600,
    textDecoration:"none", whiteSpace:"nowrap",
  };

  return (
    <div style={{ minHeight:"100vh", background:"#07010f", fontFamily:FONT, color:"#fff" }}>
      <style>{BASE}</style>

      {/* Topbar */}
      <div style={{ height:52, borderBottom:"1px solid rgba(255,255,255,.05)", display:"flex", alignItems:"center", padding:"0 16px", gap:12 }}>
        <div style={{ fontWeight:800, fontSize:17 }}>ai<span style={{ color:C_ACC }}>.go</span></div>
        <div style={{ fontWeight:700, fontSize:14, color:"rgba(255,255,255,.65)" }}>Financeiro</div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <a href="/" style={navLink}>📊 Relatórios</a>
          <a href="/estoque" style={navLink}>📦 Estoque</a>
        </div>
      </div>

      <div style={{ padding:"24px 16px 60px", maxWidth:1180, margin:"0 auto" }}>
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:16, flexWrap:"wrap", marginBottom:20 }}>
          <div>
            <div style={{ fontWeight:800, fontSize:26, letterSpacing:"-.02em", marginBottom:4 }}>Controle financeiro</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.35)" }}>Envie prints de comprovantes e extratos · a IA lança tudo · depois baixe para o Google Planilhas</div>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <Btn onClick={novo}>＋ Lançamento manual</Btn>
            <Btn onClick={() => fileRef.current?.click()} bg="linear-gradient(135deg,#7C3AED,#DC6B2F)" disabled={reading}>
              {reading ? "Lendo..." : "📸 Enviar prints"}
            </Btn>
          </div>
        </div>

        {/* Upload zone */}
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => handleFiles(e.target.files)}/>
        <div
          onClick={() => !reading && fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          style={{ ...card, borderStyle:"dashed", borderColor: dragOver ? C_ACC : "rgba(255,255,255,.12)",
            background: dragOver ? "rgba(167,139,250,.08)" : card.background, textAlign:"center",
            padding:"22px 16px", cursor:"pointer", marginBottom:12 }}>
          <div style={{ fontSize:22, marginBottom:6 }}>{reading ? "⏳" : "🧾"}</div>
          <div style={{ fontSize:13, fontWeight:700 }}>{reading ? "Analisando prints..." : "Arraste os prints aqui ou clique para escolher"}</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.35)", marginTop:4 }}>PIX, transferências, boletos, extratos, faturas de cartão, notas · até 10 por vez</div>
        </div>
        {msg && (
          <div style={{ fontSize:12, padding:"10px 14px", borderRadius:10, marginBottom:16,
            background: msg.startsWith("⚠️") ? "rgba(248,113,113,.1)" : "rgba(52,211,153,.08)",
            color: msg.startsWith("⚠️") ? "#fca5a5" : "rgba(255,255,255,.75)", wordBreak:"break-word" }}>{msg}</div>
        )}

        {/* Review queue */}
        {review.length > 0 && (
          <div style={{ ...card, borderColor:"rgba(167,139,250,.35)", marginBottom:20 }}>
            <SectionTitle right={
              <div style={{ display:"flex", gap:8 }}>
                <Btn onClick={() => setReview([])} fg="rgba(255,255,255,.6)">Descartar todos</Btn>
                <Btn onClick={confirmReview} bg={C_ACC} fg="#120624">✓ Salvar {review.length}</Btn>
              </div>
            }>
              🔎 Confira o que a IA leu ({review.length})
            </SectionTitle>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {review.map((t, i) => (
                <TxEditor key={t.id} tx={t} compact
                  onChange={nt => setReview(r => r.map((x, j) => j === i ? nt : x))}
                  onRemove={() => setReview(r => r.filter((_, j) => j !== i))}/>
              ))}
            </div>
          </div>
        )}

        {/* Manual editor */}
        {editing && (
          <div style={{ ...card, borderColor:"rgba(167,139,250,.35)", marginBottom:20 }}>
            <SectionTitle right={
              <div style={{ display:"flex", gap:8 }}>
                <Btn onClick={() => setEditing(null)} fg="rgba(255,255,255,.6)">Cancelar</Btn>
                <Btn onClick={saveEditing} bg={C_ACC} fg="#120624" disabled={!editing.valor}>✓ Salvar</Btn>
              </div>
            }>
              {txs.some(t => t.id === editing.id) ? "✏️ Editar lançamento" : "＋ Novo lançamento"}
            </SectionTitle>
            <TxEditor tx={editing} onChange={setEditing}/>
          </div>
        )}

        {/* Month filter */}
        <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:6, marginBottom:16 }}>
          <button onClick={() => setMes("")} style={pill(!mes)}>Tudo</button>
          {monthsAvailable.map(m => <button key={m} onClick={() => setMes(m)} style={pill(mes === m)}>{monthLabel(m)}</button>)}
        </div>

        {/* KPIs */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:12, marginBottom:16 }}>
          <Stat label="Entradas" value={brl(kpi.entradas)} color={C_IN} sub={mes ? monthLabel(mes) : "Todo o período"}/>
          <Stat label="Saídas" value={brl(kpi.saidas)} color={C_OUT} sub={mes ? monthLabel(mes) : "Todo o período"}/>
          <Stat label="Saldo" value={<span style={{ color: kpi.saldo >= 0 ? C_IN : C_OUT }}>{brl(kpi.saldo)}</span>}
            sub={kpi.entradas ? `Margem ${(kpi.saldo / kpi.entradas * 100).toFixed(0)}%` : "Entradas − saídas pagas"}/>
          <Stat label="Pendências" value={brl(kpi.aReceber - kpi.aPagar)} color={C_WARN}
            sub={`A receber ${brl(kpi.aReceber)} · a pagar ${brl(kpi.aPagar)}`}/>
        </div>

        {/* Charts */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,420px),1fr))", gap:12, marginBottom:16 }}>
          <div style={{ ...card, gridColumn:"1 / -1" }}>
            <SectionTitle>Evolução mensal (pagos) · clique num mês para filtrar</SectionTitle>
            <MonthChart months={porMes} selected={mes} onPick={m => setMes(m === mes ? "" : m)}/>
          </div>
          <div style={card}>
            <SectionTitle>Saídas por categoria</SectionTitle>
            <BarList items={saidasPorCat} color={C_OUT} empty="Nenhuma saída no período"/>
          </div>
          <div style={card}>
            <SectionTitle>Receita por cliente</SectionTitle>
            <BarList items={receitaCliente} color={C_IN} empty="Nenhuma entrada no período"/>
          </div>
        </div>

        {/* Table */}
        <div style={card}>
          <SectionTitle right={
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <Btn onClick={copyForSheets} disabled={!filtered.length}>📋 Copiar p/ Planilhas</Btn>
              <Btn onClick={() => downloadFile(exportName("csv"), toCSV(filtered), "text/csv;charset=utf-8")} disabled={!filtered.length}
                bg="rgba(52,211,153,.15)">⬇ Baixar CSV</Btn>
            </div>
          }>
            Lançamentos · {filtered.length}
          </SectionTitle>

          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍  Buscar descrição, cliente, categoria..."
              style={{ ...inputStyle, maxWidth:320, flex:"1 1 200px" }}/>
            {[["", "Todos"], ["entrada", "Entradas"], ["saida", "Saídas"]].map(([v, l]) =>
              <button key={v} onClick={() => setTipoF(v)} style={pill(tipoF === v)}>{l}</button>)}
          </div>

          {!filtered.length ? <Empty text="Nenhum lançamento. Envie prints ou adicione manualmente."/> : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:760 }}>
                <thead>
                  <tr>{["Data","Descrição","Categoria","Cliente","Forma","Status","Valor",""].map((h, i) => (
                    <th key={i} style={{ ...labelStyle, textAlign: h === "Valor" ? "right" : "left", padding:"8px 10px",
                      borderBottom:"1px solid rgba(255,255,255,.08)" }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id} style={{ borderBottom:"1px solid rgba(255,255,255,.04)" }}>
                      <td style={{ padding:"10px", color:"rgba(255,255,255,.55)", whiteSpace:"nowrap" }}>{dateBR(t.data)}</td>
                      <td style={{ padding:"10px", fontWeight:600 }}>
                        {t.descricao || "—"}
                        {t.obs && <div style={{ fontSize:10, fontWeight:400, color:"rgba(255,255,255,.35)", marginTop:2 }}>{t.obs}</div>}
                      </td>
                      <td style={{ padding:"10px", color:"rgba(255,255,255,.6)" }}>{t.categoria}</td>
                      <td style={{ padding:"10px", color:"rgba(255,255,255,.6)" }}>{t.cliente || "—"}</td>
                      <td style={{ padding:"10px", color:"rgba(255,255,255,.6)", whiteSpace:"nowrap" }}>{t.forma}</td>
                      <td style={{ padding:"10px" }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:100, whiteSpace:"nowrap",
                          background: t.status === "pago" ? "rgba(255,255,255,.06)" : "rgba(245,158,11,.14)",
                          color: t.status === "pago" ? "rgba(255,255,255,.6)" : C_WARN }}>
                          {t.status === "pago" ? "✓ Pago" : "⏱ Pendente"}
                        </span>
                      </td>
                      <td style={{ padding:"10px", textAlign:"right", fontWeight:700, whiteSpace:"nowrap",
                        color: t.tipo === "entrada" ? C_IN : C_OUT }}>
                        {t.tipo === "entrada" ? "+ " : "− "}{brl(t.valor)}
                      </td>
                      <td style={{ padding:"10px", whiteSpace:"nowrap", textAlign:"right" }}>
                        <button onClick={() => { setEditing({ ...t }); window.scrollTo({ top:0, behavior:"smooth" }); }} title="Editar"
                          style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, opacity:.55, padding:"0 6px" }}>✏️</button>
                        <button onClick={() => remove(t.id)} title="Excluir"
                          style={{ background:"none", border:"none", cursor:"pointer", fontSize:14, color:C_OUT, opacity:.7, padding:"0 6px" }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Backup */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginTop:16, fontSize:11, color:"rgba(255,255,255,.3)" }}>
          <span>Os dados ficam salvos neste navegador.</span>
          <Btn onClick={() => downloadFile(`backup-financeiro-${today()}.json`, JSON.stringify(txs, null, 2), "application/json")}
            style={{ padding:"6px 12px", fontSize:11 }}>Fazer backup</Btn>
          <Btn onClick={() => backupRef.current?.click()} style={{ padding:"6px 12px", fontSize:11 }}>Restaurar backup</Btn>
          <input ref={backupRef} type="file" accept="application/json" hidden
            onChange={e => { e.target.files[0] && importBackup(e.target.files[0]); e.target.value = ""; }}/>
        </div>
      </div>
    </div>
  );
}
