import { useState, useEffect, useRef, useMemo } from "react";

// ── Estrutura igual à planilha "Financeiro Empresa" ────────────────────────
const CLIENTS = [
  "Aline","Americana","AP Engenharia","Bioessência","Coperfarma",
  "Doma Cosméticos","Dra. Gisele","Fran Cendron","Ingalimp",
  "Leda","Manu Arquitetura","Marcela - Lash e Brown","Mari Garcia","Murilo Bianco",
  "Nathalia","Petshop","Suellem","Vikce","Wood",
];

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

// Chips: [valor, fundo, texto]
const CHIPS = {
  forma: [
    ["Pix", "#D7EFD9", "#1E7B34"],
    ["Sicoob", "#0E6B3B", "#FFFFFF"],
    ["Nubank", "#E4D7FA", "#6A2DC2"],
    ["Mercado Pago", "#1F5FBF", "#FFFFFF"],
    ["Cartão", "#E8EAED", "#3C4043"],
    ["Dinheiro", "#FFF1C2", "#8A6500"],
    ["Outro", "#E8EAED", "#3C4043"],
  ],
  status: [
    ["pago", "#D7EFD9", "#1E7B34", "Pago"],
    ["nao_pago", "#FBD9DB", "#C62828", "Não pago"],
  ],
  categoria: [
    ["Extra", "#FFE9A8", "#8A6500"],
    ["Investimento", "#EADCC2", "#7A5320"],
    ["Maringá", "#1F5FBF", "#FFFFFF"],
    ["Mercado", "#CFE2F3", "#1F4E79"],
    ["Alimentação", "#FCE1C8", "#A04A00"],
    ["Transporte", "#DDE3EA", "#37474F"],
    ["Outro", "#E8EAED", "#3C4043"],
  ],
  servico: [
    ["Social Media", "#1F5FBF", "#FFFFFF"],
    ["Fotografia", "#5B2BA6", "#FFFFFF"],
    ["Outro", "#E8EAED", "#3C4043"],
  ],
  tipo: [
    ["Marketing", "#F6A15B", "#4A2200"],
    ["Casamento", "#F9CFD8", "#C2185B"],
    ["Sinal", "#C62828", "#FFFFFF"],
    ["Todas as fotos", "#4E342E", "#FFFFFF"],
    ["Foto Extra", "#ECECEC", "#333333"],
    ["Gestante", "#2E7D7D", "#FFFFFF"],
    ["Ensaio", "#F3E2B3", "#7A5B00"],
    ["Aniversário", "#FDE0EF", "#AD1457"],
    ["Outro", "#E8EAED", "#3C4043"],
  ],
};
const OPTS = Object.fromEntries(Object.entries(CHIPS).map(([k, v]) => [k, v.map(o => o[0])]));

const COL = {
  dia:       { label:"Dia", w:46, kind:"dia" },
  descricao: { label:"Descrição", w:150, kind:"text" },
  valor:     { label:"Valor", w:112, kind:"money" },
  p80:       { label:"80% empresa", w:96, kind:"calc", calc:r => r.valor * .8 },
  p20:       { label:"20% empresa", w:96, kind:"calc", calc:r => r.valor * .2 },
  forma:     { label:"Forma de pag.", w:118, kind:"chip" },
  status:    { label:"Status", w:96, kind:"chip" },
  categoria: { label:"Categoria", w:126, kind:"chip" },
  servico:   { label:"Serviço", w:112, kind:"chip" },
  tipo:      { label:"Fotografia", w:118, kind:"chip" },
  info:      { label:"Info", w:96, kind:"text" },
};

const SECTIONS = {
  fixo:     { title:"Gastos Fixos",       cols:["dia","descricao","valor","forma","status","info"] },
  variavel: { title:"Gastos Variáveis",   cols:["dia","descricao","valor","forma","status","info"] },
  extra:    { title:"Parcelas e Extras",  cols:["dia","descricao","valor","categoria","status","forma","info"] },
  receita:  { title:"Receitas",           cols:["dia","descricao","valor","p80","p20","servico","tipo","forma","info"] },
};
const GASTOS = ["fixo","variavel","extra"];

const STORAGE_KEY = "aigo-financeiro-v2";

// Paleta (mesma da planilha)
const P = {
  roxo: "#3B1C7E", roxo2: "#4C27A0", lilas: "#C9BCF0", lilasClaro: "#EEE9FB",
  bg: "#F6F4FB", papel: "#FFFFFF", linha: "#E4E0EE", tinta: "#1F1633", suave: "#6E6685",
  verde: "#1E7B34", vermelho: "#C62828", laranja: "#E07020",
};
const FONT = "'Montserrat',sans-serif";
const CSS = `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:${P.bg}}
::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-thumb{background:#cfc6e8;border-radius:6px}
.fin-cols{display:grid;grid-template-columns:1fr;gap:20px;align-items:start}
@media (min-width:1640px){.fin-cols{grid-template-columns:minmax(0,1fr) minmax(0,1.5fr)}}
.fin-top{display:flex;align-items:center;gap:8px 12px;flex-wrap:wrap;padding:10px 16px;max-width:1800px;margin:0 auto}
@media (max-width:600px){.fin-nome{display:none}}
.fin-cell:focus{outline:2px solid ${P.roxo2};outline-offset:-2px;background:#fff !important}
.fin-row:hover td{background:#FAF8FF}
.fin-row:hover .fin-del{opacity:1}
.fin-del{opacity:.25}
@media (hover:none){.fin-del{opacity:.6}}
.fin-tabs::-webkit-scrollbar{height:0}`;

// ── Helpers ────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const pad = n => String(n).padStart(2, "0");
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const brl = v => (Number(v) || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
const num = v => (Number(v) || 0).toFixed(2).replace(".", ",");
const mesKey = (ano, m) => `${ano}-${pad(m + 1)}`;

function parseValor(v) {
  if (typeof v === "number") return Math.abs(v);
  let s = String(v || "").replace(/[^\d,.-]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.abs(n);
}

function normalize(r) {
  const secao = SECTIONS[r.secao] ? r.secao : "variavel";
  const pick = (k, def = "") => OPTS[k].includes(r[k]) ? r[k] : def;
  return {
    id: r.id || uid(),
    secao,
    mes: /^\d{4}-\d{2}$/.test(r.mes || "") ? r.mes : hojeISO().slice(0, 7),
    dia: r.dia === "" || r.dia == null ? "" : Math.min(31, Math.max(1, parseInt(r.dia) || 1)),
    descricao: r.descricao || "",
    valor: parseValor(r.valor),
    forma: pick("forma", "Pix"),
    status: r.status === "nao_pago" ? "nao_pago" : "pago",
    categoria: secao === "extra" ? pick("categoria", "Extra") : "",
    servico: secao === "receita" ? pick("servico", "Social Media") : "",
    tipo: secao === "receita" ? pick("tipo", "") : "",
    info: r.info || "",
  };
}

// Converte um lançamento vindo da IA (com data AAAA-MM-DD)
function fromAI(t, mesAtual) {
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(t.data || "");
  return normalize({ ...t, mes: ok ? t.data.slice(0, 7) : mesAtual, dia: ok ? +t.data.slice(8, 10) : "" });
}

function load() {
  try {
    const v2 = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (Array.isArray(v2)) return v2.map(normalize);
    // migra a versão anterior da página
    const v1 = JSON.parse(localStorage.getItem("aigo-financeiro-v1") || "[]");
    return v1.map(t => normalize({
      secao: t.tipo === "entrada" ? "receita" : "variavel",
      mes: (t.data || "").slice(0, 7), dia: (t.data || "").slice(8, 10),
      descricao: t.descricao || t.cliente, valor: t.valor,
      status: t.status === "pendente" ? "nao_pago" : "pago", info: t.obs,
    }));
  } catch { return []; }
}

const sortRows = rows => [...rows].sort((a, b) =>
  a.mes.localeCompare(b.mes) || (a.dia === "" ? 99 : a.dia) - (b.dia === "" ? 99 : b.dia));

const chipOf = (field, val) => CHIPS[field]?.find(o => o[0] === val);
const cellText = (r, c) => {
  const col = COL[c];
  if (col.kind === "calc") return num(col.calc(r));
  if (c === "valor") return num(r.valor);
  if (c === "status") return r.status === "pago" ? "Pago" : "Não pago";
  return r[c] ?? "";
};

function toTSV(rows, cols) {
  const clean = v => String(v ?? "").replace(/[\t\r\n]+/g, " ");
  return rows.map(r => cols.map(c => clean(cellText(r, c))).join("\t")).join("\n");
}

function toCSV(rows) {
  const cols = ["mes","secao","dia","descricao","valor","p80","p20","forma","status","categoria","servico","tipo","info"];
  const head = ["Mês","Seção","Dia","Descrição","Valor","80% empresa","20% empresa","Forma de pag.","Status","Categoria","Serviço","Fotografia","Info"];
  const esc = v => { const s = String(v ?? ""); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const val = (r, c) => {
    if (c === "mes") { const [y, m] = r.mes.split("-"); return `${MESES[+m-1]} ${y}`; }
    if (c === "secao") return SECTIONS[r.secao].title;
    if ((c === "p80" || c === "p20") && r.secao !== "receita") return "";
    return cellText(r, c);
  };
  return "﻿" + [head.join(";"), ...rows.map(r => cols.map(c => esc(val(r, c))).join(";"))].join("\r\n");
}

function downloadFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
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

// ── Células editáveis ──────────────────────────────────────────────────────
const cellBase = {
  width:"100%", border:"none", background:"transparent", fontFamily:FONT, fontSize:12,
  color:P.tinta, padding:"6px 8px", outline:"none", borderRadius:0,
};

function TextCell({ value, onChange, onBlur, align, placeholder, bold }) {
  return <input className="fin-cell" value={value} placeholder={placeholder}
    onChange={e => onChange(e.target.value)} onBlur={onBlur}
    style={{ ...cellBase, textAlign:align || "left", fontWeight:bold ? 600 : 500 }}/>;
}

function MoneyCell({ value, onChange }) {
  const [txt, setTxt] = useState(null);
  return <input className="fin-cell" inputMode="decimal"
    value={txt ?? (value ? brl(value) : "")} placeholder="R$ 0,00"
    onFocus={() => setTxt(value ? num(value) : "")}
    onChange={e => { setTxt(e.target.value); onChange(parseValor(e.target.value)); }}
    onBlur={() => setTxt(null)}
    style={{ ...cellBase, textAlign:"right", fontWeight:600 }}/>;
}

function ChipSelect({ field, value, onChange }) {
  const o = chipOf(field, value);
  const [, bg, fg] = o || [null, "#F1EFF6", P.suave];
  return (
    <div style={{ position:"relative", padding:"3px 6px", maxWidth:160 }}>
      <select className="fin-cell" value={value} onChange={e => onChange(e.target.value)}
        style={{ appearance:"none", WebkitAppearance:"none", width:"100%", border:"none", cursor:"pointer",
          background:bg, color:fg, fontFamily:FONT, fontSize:11, fontWeight:600,
          padding:"4px 20px 4px 9px", borderRadius:100, outline:"none" }}>
        {field === "tipo" && <option value="">—</option>}
        {CHIPS[field].map(([v, , , label]) => <option key={v} value={v}>{label || v}</option>)}
      </select>
      <span style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", fontSize:8,
        color:fg, pointerEvents:"none" }}>▼</span>
    </div>
  );
}

// ── Seção (tabela estilo planilha) ─────────────────────────────────────────
function Section({ secao, rows, onEdit, onAdd, onRemove, onSortDia, onCopy, extra }) {
  const { title, cols } = SECTIONS[secao];
  const pago = rows.filter(r => r.status === "pago").reduce((s, r) => s + r.valor, 0);
  const naoPago = rows.filter(r => r.status !== "pago").reduce((s, r) => s + r.valor, 0);
  const total = pago + naoPago;
  const th = { background:P.lilas, color:P.tinta, fontSize:11, fontWeight:700, padding:"6px 8px",
    borderRight:`1px solid ${P.papel}`, whiteSpace:"nowrap", textAlign:"left" };
  const td = { borderBottom:`1px solid ${P.linha}`, borderRight:`1px solid ${P.linha}`, padding:0, background:P.papel };

  return (
    <div style={{ background:P.papel, borderRadius:12, overflow:"hidden", boxShadow:"0 1px 3px rgba(59,28,126,.08)",
      border:`1px solid ${P.linha}` }}>
      <div style={{ background:P.roxo, color:"#fff", padding:"9px 14px", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <div style={{ fontSize:12, fontWeight:800, letterSpacing:".08em", textTransform:"uppercase" }}>{title}</div>
        <div style={{ fontSize:11, opacity:.6 }}>{rows.length} {rows.length === 1 ? "linha" : "linhas"}</div>
        <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
          {extra}
          <HeadBtn onClick={onCopy} disabled={!rows.length} title="Copia as linhas para colar na sua planilha">📋 Copiar</HeadBtn>
        </div>
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse", width:"100%", minWidth:cols.reduce((s, c) => s + COL[c].w, 30), fontFamily:FONT }}>
          <thead>
            <tr>
              {cols.map(c => <th key={c} style={{ ...th, width:COL[c].w, textAlign:["valor","p80","p20"].includes(c) ? "right" : c === "dia" ? "center" : "left" }}>{COL[c].label}</th>)}
              <th style={{ ...th, width:30, borderRight:"none" }}/>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="fin-row">
                {cols.map(c => {
                  const col = COL[c];
                  const set = v => onEdit(r.id, { [c]: v });
                  let cell;
                  if (col.kind === "dia") cell = <TextCell value={r.dia} align="center" placeholder="—"
                    onChange={v => set(v.replace(/\D/g, "").slice(0, 2))} onBlur={onSortDia}/>;
                  else if (col.kind === "money") cell = <MoneyCell value={r.valor} onChange={set}/>;
                  else if (col.kind === "calc") cell = <div style={{ ...cellBase, textAlign:"right", color:P.suave }}>{brl(col.calc(r))}</div>;
                  else if (col.kind === "chip") cell = <ChipSelect field={c} value={r[c]} onChange={set}/>;
                  else cell = <TextCell value={r[c]} onChange={set} bold={c === "descricao"} placeholder={c === "descricao" ? "Descrição" : ""}/>;
                  return <td key={c} style={td}>{cell}</td>;
                })}
                <td style={{ ...td, borderRight:"none", textAlign:"center" }}>
                  <button className="fin-del" onClick={() => onRemove(r.id)} title="Excluir linha"
                    style={{ border:"none", background:"none", color:P.vermelho, cursor:"pointer", fontSize:13, padding:"4px 8px" }}>✕</button>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={cols.length + 1} style={{ padding:0 }}>
                <button onClick={onAdd} style={{ width:"100%", border:"none", background:P.lilasClaro, color:P.roxo2,
                  fontFamily:FONT, fontSize:12, fontWeight:700, padding:"8px", cursor:"pointer", textAlign:"left", paddingLeft:14 }}>
                  ＋ Adicionar linha
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", borderTop:`1px solid ${P.linha}` }}>
        <Total label="Pagos" value={pago} color={P.verde}/>
        <Total label="Não pago" value={naoPago} color={P.vermelho} highlight={naoPago > 0}/>
        <Total label="Total" value={total} color={P.tinta}/>
      </div>
    </div>
  );
}

function Total({ label, value, color, highlight }) {
  return (
    <div style={{ flex:"1 1 120px", padding:"9px 14px", borderRight:`1px solid ${P.linha}`,
      background: highlight ? "#FFF4F4" : "transparent" }}>
      <div style={{ fontSize:10, fontWeight:700, color:P.suave, textTransform:"uppercase", letterSpacing:".07em" }}>{label}</div>
      <div style={{ fontSize:15, fontWeight:800, color, marginTop:2 }}>{brl(value)}</div>
    </div>
  );
}

function HeadBtn({ children, onClick, disabled, title }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      background:"rgba(255,255,255,.14)", border:"1px solid rgba(255,255,255,.22)", color:"#fff", borderRadius:8,
      padding:"4px 10px", fontFamily:FONT, fontSize:11, fontWeight:700, cursor:disabled ? "default" : "pointer",
      opacity:disabled ? .45 : 1, whiteSpace:"nowrap" }}>{children}</button>
  );
}

function Btn({ children, onClick, primary, disabled, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: primary ? P.roxo : P.papel, color: primary ? "#fff" : P.roxo,
      border:`1px solid ${primary ? P.roxo : P.lilas}`, borderRadius:10, padding:"9px 15px",
      fontFamily:FONT, fontSize:12, fontWeight:700, cursor:disabled ? "default" : "pointer",
      opacity:disabled ? .5 : 1, whiteSpace:"nowrap", ...style }}>{children}</button>
  );
}

function Kpi({ label, value, sub, color }) {
  return (
    <div style={{ background:P.papel, border:`1px solid ${P.linha}`, borderRadius:12, padding:"14px 16px",
      borderTop:`4px solid ${color}` }}>
      <div style={{ fontSize:10, fontWeight:700, color:P.suave, textTransform:"uppercase", letterSpacing:".08em" }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:900, color:P.tinta, marginTop:6, letterSpacing:"-.01em" }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:P.suave, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

// ── "Para onde foi o dinheiro" (rosca + ranking) ───────────────────────────
const COR_GRUPO = {
  "Gastos fixos":"#4C27A0", "Gastos variáveis":"#E07020", "Maringá":"#1F5FBF", "Investimento":"#A0712B",
  "Mercado":"#0E8C9A", "Extra":"#D4A20B", "Alimentação":"#C2185B", "Transporte":"#2E9E6B", "Outro":"#8E8A9E",
  "Pix":"#2E9E6B", "Sicoob":"#0E6B3B", "Nubank":"#8A3FD1", "Mercado Pago":"#1F5FBF", "Cartão":"#607D8B", "Dinheiro":"#D4A20B",
};
const COR_ORDEM = ["#4C27A0","#E07020","#1F5FBF","#2E9E6B","#C2185B","#A0712B","#0E8C9A","#D4A20B"];
const COR_OUTROS = "#B9B4C7";
const MODOS = {
  categoria: { label:"Categoria", key:r => r.secao === "fixo" ? "Gastos fixos" : r.secao === "variavel" ? "Gastos variáveis" : (r.categoria || "Extra") },
  item:      { label:"Item",      key:r => r.descricao.trim() || "(sem descrição)" },
  forma:     { label:"Forma de pag.", key:r => r.forma },
};

function ParaOndeFoi({ rows, titulo }) {
  const [modo, setModo] = useState("categoria");
  const [hover, setHover] = useState(null);
  const [aberto, setAberto] = useState(null);

  const total = rows.reduce((s, r) => s + r.valor, 0);
  const grupos = useMemo(() => {
    const map = {};
    rows.forEach(r => {
      const nome = MODOS[modo].key(r);
      const k = nome.toLowerCase();
      map[k] = map[k] || { nome, valor:0, itens:[] };
      map[k].valor += r.valor;
      map[k].itens.push(r);
    });
    let list = Object.values(map).filter(g => g.valor > 0).sort((a, b) => b.valor - a.valor);
    if (list.length > 8) {
      const resto = list.slice(7);
      list = [...list.slice(0, 7), { nome:`Outros (${resto.length})`, valor:resto.reduce((s, g) => s + g.valor, 0),
        itens:resto.flatMap(g => g.itens), outros:true }];
    }
    return list.map((g, i) => ({ ...g, cor: g.outros ? COR_OUTROS : (COR_GRUPO[g.nome] || COR_ORDEM[i % COR_ORDEM.length]) }));
  }, [rows, modo]);

  // rosca
  const R = 74, SW = 28, C = 2 * Math.PI * R, GAP = grupos.length > 1 ? 2 : 0;
  let acc = 0;
  const arcos = grupos.map(g => {
    const len = total ? g.valor / total * C : 0;
    const a = { ...g, dash:Math.max(0, len - GAP), off:-acc };
    acc += len;
    return a;
  });
  const foco = grupos.find(g => g.nome === (hover || aberto));

  const pill = on => ({ border:`1px solid ${on ? P.roxo : P.lilas}`, background:on ? P.roxo : P.papel, color:on ? "#fff" : P.roxo,
    borderRadius:100, padding:"4px 11px", fontFamily:FONT, fontSize:11, fontWeight:700, cursor:"pointer" });

  return (
    <div style={{ background:P.papel, border:`1px solid ${P.linha}`, borderRadius:12, overflow:"hidden" }}>
      <div style={{ background:P.roxo, color:"#fff", padding:"9px 14px", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <div style={{ fontSize:12, fontWeight:800, letterSpacing:".08em", textTransform:"uppercase" }}>💸 Para onde foi o dinheiro · {titulo}</div>
      </div>
      <div style={{ padding:"14px 16px 6px", display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:11, color:P.suave, fontWeight:600, marginRight:4 }}>Agrupar por</span>
        {Object.entries(MODOS).map(([k, m]) => <button key={k} onClick={() => { setModo(k); setAberto(null); }} style={pill(modo === k)}>{m.label}</button>)}
      </div>
      {!total ? <div style={{ padding:"30px 16px", textAlign:"center", fontSize:12, color:P.suave }}>Nenhum gasto lançado neste período.</div> : (
        <div style={{ display:"flex", flexWrap:"wrap", gap:24, padding:"10px 16px 18px", alignItems:"flex-start" }}>
          <svg viewBox="0 0 200 200" width="200" height="200" style={{ flex:"0 0 auto", margin:"0 auto" }}>
            <g transform="rotate(-90 100 100)">
              <circle cx="100" cy="100" r={R} fill="none" stroke={P.lilasClaro} strokeWidth={SW}/>
              {arcos.map(a => (
                <circle key={a.nome} cx="100" cy="100" r={R} fill="none" stroke={a.cor}
                  strokeWidth={foco && foco.nome === a.nome ? SW + 6 : SW}
                  strokeDasharray={`${a.dash} ${C}`} strokeDashoffset={a.off}
                  opacity={foco && foco.nome !== a.nome ? .35 : 1}
                  style={{ cursor:"pointer", transition:"opacity .15s, stroke-width .15s" }}
                  onMouseEnter={() => setHover(a.nome)} onMouseLeave={() => setHover(null)}
                  onClick={() => setAberto(x => x === a.nome ? null : a.nome)}/>
              ))}
            </g>
            <text x="100" y="88" textAnchor="middle" fontSize="10" fontWeight="700" fill={P.suave} fontFamily="Montserrat, sans-serif">
              {(foco ? foco.nome : "Total de gastos").slice(0, 22)}
            </text>
            <text x="100" y="108" textAnchor="middle" fontSize="15" fontWeight="900" fill={P.tinta} fontFamily="Montserrat, sans-serif">
              {brl(foco ? foco.valor : total)}
            </text>
            <text x="100" y="124" textAnchor="middle" fontSize="10" fontWeight="600" fill={P.suave} fontFamily="Montserrat, sans-serif">
              {foco ? `${(foco.valor / total * 100).toFixed(1).replace(".", ",")}% dos gastos` : `${rows.length} lançamentos`}
            </text>
          </svg>

          <div style={{ flex:"1 1 300px", minWidth:0, display:"flex", flexDirection:"column", gap:4 }}>
            {grupos.map(g => {
              const pct = g.valor / total * 100;
              const open = aberto === g.nome;
              return (
                <div key={g.nome} style={{ borderRadius:10, background: open ? P.lilasClaro : hover === g.nome ? "#FAF8FF" : "transparent" }}>
                  <div onClick={() => setAberto(open ? null : g.nome)} onMouseEnter={() => setHover(g.nome)} onMouseLeave={() => setHover(null)}
                    style={{ padding:"8px 10px", cursor:"pointer" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
                      <span style={{ width:10, height:10, borderRadius:3, background:g.cor, flex:"0 0 auto" }}/>
                      <span style={{ fontWeight:700, color:P.tinta, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{g.nome}</span>
                      <span style={{ color:P.suave, fontSize:11 }}>{g.itens.length}×</span>
                      <span style={{ marginLeft:"auto", color:P.suave, fontSize:11, fontWeight:600 }}>{pct.toFixed(0)}%</span>
                      <span style={{ fontWeight:800, color:P.tinta, minWidth:92, textAlign:"right" }}>{brl(g.valor)}</span>
                      <span style={{ color:P.suave, fontSize:9, width:10 }}>{open ? "▲" : "▼"}</span>
                    </div>
                    <div style={{ height:6, background:P.lilasClaro, borderRadius:4, marginTop:6, marginLeft:18 }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:g.cor, borderRadius:4 }}/>
                    </div>
                  </div>
                  {open && (
                    <div style={{ padding:"0 10px 10px 28px" }}>
                      {[...g.itens].sort((a, b) => b.valor - a.valor).map(r => (
                        <div key={r.id} style={{ display:"flex", gap:8, fontSize:11, padding:"4px 0", borderTop:`1px solid ${P.linha}`, color:P.tinta }}>
                          <span style={{ color:P.suave, width:44, flex:"0 0 auto" }}>{r.dia ? `${pad(r.dia)}/${r.mes.slice(5)}` : r.mes.slice(5) + "/" + r.mes.slice(2, 4)}</span>
                          <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.descricao || "—"}</span>
                          {r.info && <span style={{ color:P.suave }}>· {r.info}</span>}
                          <span style={{ marginLeft:"auto", fontWeight:700, whiteSpace:"nowrap" }}>{brl(r.valor)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Aba "Geral" (resumo do ano) ────────────────────────────────────────────
function Geral({ rows, ano, onPick }) {
  const [hover, setHover] = useState(null);
  const data = MESES.map((nome, m) => {
    const rs = rows.filter(r => r.mes === mesKey(ano, m));
    const sum = f => rs.filter(f).reduce((s, r) => s + r.valor, 0);
    const receitas = sum(r => r.secao === "receita");
    const fixo = sum(r => r.secao === "fixo"), variavel = sum(r => r.secao === "variavel"), extra = sum(r => r.secao === "extra");
    const gastos = fixo + variavel + extra;
    return { nome, m, receitas, fixo, variavel, extra, gastos, saldo: receitas - gastos,
      social: sum(r => r.secao === "receita" && r.servico === "Social Media"),
      foto: sum(r => r.secao === "receita" && r.servico === "Fotografia"),
      vazio: !rs.length };
  });
  const tot = k => data.reduce((s, d) => s + d[k], 0);
  const max = Math.max(1, ...data.flatMap(d => [d.receitas, d.gastos]));
  const H = 170;
  const th = { background:P.lilas, fontSize:11, fontWeight:700, padding:"7px 10px", textAlign:"right", whiteSpace:"nowrap" };
  const td = { fontSize:12, padding:"7px 10px", textAlign:"right", borderBottom:`1px solid ${P.linha}`, whiteSpace:"nowrap" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12 }}>
        <Kpi label={`Receitas ${ano}`} value={brl(tot("receitas"))} color={P.verde}
          sub={`Social Media ${brl(tot("social"))} · Foto ${brl(tot("foto"))}`}/>
        <Kpi label={`Gastos ${ano}`} value={brl(tot("gastos"))} color={P.vermelho}
          sub={`Fixos ${brl(tot("fixo"))}`}/>
        <Kpi label="Saldo do ano" value={<span style={{ color:tot("saldo") >= 0 ? P.verde : P.vermelho }}>{brl(tot("saldo"))}</span>} color={P.roxo}
          sub={tot("receitas") ? `Margem ${(tot("saldo") / tot("receitas") * 100).toFixed(0)}%` : ""}/>
        <Kpi label="20% empresa" value={brl(tot("receitas") * .2)} color={P.laranja} sub="Soma da coluna 20% das receitas"/>
      </div>

      <ParaOndeFoi rows={rows.filter(r => r.secao !== "receita" && r.mes.startsWith(`${ano}-`))} titulo={`${ano}`}/>

      <div style={{ background:P.papel, border:`1px solid ${P.linha}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ background:P.roxo, color:"#fff", padding:"9px 14px", fontSize:12, fontWeight:800, letterSpacing:".08em", textTransform:"uppercase" }}>
          Receitas x Gastos · {ano}
        </div>
        <div style={{ padding:"16px 16px 12px" }}>
          <div style={{ display:"flex", gap:16, fontSize:11, color:P.suave, marginBottom:12 }}>
            <span style={{ display:"flex", alignItems:"center", gap:6 }}><i style={{ width:10, height:10, borderRadius:2, background:P.roxo2 }}/>Receitas</span>
            <span style={{ display:"flex", alignItems:"center", gap:6 }}><i style={{ width:10, height:10, borderRadius:2, background:P.laranja }}/>Gastos</span>
          </div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:H, borderBottom:`1px solid ${P.linha}` }}>
            {data.map((d, i) => (
              <div key={d.m} onClick={() => onPick(d.m)} onMouseEnter={() => setHover(d.m)} onMouseLeave={() => setHover(null)}
                style={{ flex:1, minWidth:0, height:"100%", display:"flex", alignItems:"flex-end", justifyContent:"center", gap:2,
                  cursor:"pointer", position:"relative", borderRadius:6, background: hover === d.m ? P.lilasClaro : "transparent" }}>
                <div style={{ width:"36%", maxWidth:20, height:`${d.receitas / max * 100}%`, minHeight:d.receitas ? 2 : 0, background:P.roxo2, borderRadius:"4px 4px 0 0" }}/>
                <div style={{ width:"36%", maxWidth:20, height:`${d.gastos / max * 100}%`, minHeight:d.gastos ? 2 : 0, background:P.laranja, borderRadius:"4px 4px 0 0" }}/>
                {hover === d.m && !d.vazio && (
                  <div style={{ position:"absolute", top:0, ...(i < 6 ? { left:0 } : { right:0 }), background:P.papel,
                    border:`1px solid ${P.linha}`, borderRadius:10, padding:"9px 12px", fontSize:11, whiteSpace:"nowrap",
                    zIndex:5, boxShadow:"0 8px 24px rgba(59,28,126,.15)", color:P.tinta }}>
                    <div style={{ fontWeight:800, marginBottom:4 }}>{d.nome}</div>
                    <div>Receitas {brl(d.receitas)}</div>
                    <div>Gastos {brl(d.gastos)}</div>
                    <div style={{ fontWeight:700, color:d.saldo >= 0 ? P.verde : P.vermelho }}>Saldo {brl(d.saldo)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:4, marginTop:6 }}>
            {data.map(d => <div key={d.m} style={{ flex:1, minWidth:0, textAlign:"center", fontSize:10, fontWeight:600, color:P.suave, overflow:"hidden" }}>{d.nome.slice(0, 3)}</div>)}
          </div>
        </div>
      </div>

      <div style={{ background:P.papel, border:`1px solid ${P.linha}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ borderCollapse:"collapse", width:"100%", minWidth:760, fontFamily:FONT, color:P.tinta }}>
            <thead><tr>
              <th style={{ ...th, textAlign:"left" }}>Mês</th>
              <th style={th}>Receitas</th><th style={th}>Gastos fixos</th><th style={th}>Variáveis</th>
              <th style={th}>Parcelas e extras</th><th style={th}>Total gastos</th><th style={th}>Saldo</th>
            </tr></thead>
            <tbody>
              {data.map(d => (
                <tr key={d.m} className="fin-row" onClick={() => onPick(d.m)} style={{ cursor:"pointer", opacity:d.vazio ? .45 : 1 }}>
                  <td style={{ ...td, textAlign:"left", fontWeight:700 }}>{d.nome}</td>
                  <td style={td}>{brl(d.receitas)}</td><td style={td}>{brl(d.fixo)}</td><td style={td}>{brl(d.variavel)}</td>
                  <td style={td}>{brl(d.extra)}</td><td style={{ ...td, fontWeight:700 }}>{brl(d.gastos)}</td>
                  <td style={{ ...td, fontWeight:800, color:d.saldo >= 0 ? P.verde : P.vermelho }}>{brl(d.saldo)}</td>
                </tr>
              ))}
              <tr style={{ background:P.lilasClaro }}>
                <td style={{ ...td, textAlign:"left", fontWeight:800 }}>Total</td>
                {["receitas","fixo","variavel","extra","gastos"].map(k => <td key={k} style={{ ...td, fontWeight:800 }}>{brl(tot(k))}</td>)}
                <td style={{ ...td, fontWeight:900, color:tot("saldo") >= 0 ? P.verde : P.vermelho }}>{brl(tot("saldo"))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────
function FinanceiroApp({ senha, sair }) {
  const now = new Date();
  const [rows, setRows] = useState(load);
  const [ano, setAno] = useState(now.getFullYear());
  const [aba, setAba] = useState(now.getMonth());           // 0-11 ou "geral"
  const [review, setReview] = useState([]);
  const [reading, setReading] = useState(false);
  const [msg, setMsg] = useState("");
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();
  const backupRef = useRef();

  useEffect(() => { document.title = "ai.go — Financeiro"; }, []);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); } catch {} }, [rows]);

  const mes = aba === "geral" ? null : mesKey(ano, aba);
  const doMes = useMemo(() => rows.filter(r => r.mes === mes), [rows, mes]);
  const bySec = s => doMes.filter(r => r.secao === s);

  const resumo = useMemo(() => {
    const sum = f => doMes.filter(f).reduce((s, r) => s + r.valor, 0);
    const receitas = sum(r => r.secao === "receita");
    const recebido = sum(r => r.secao === "receita" && r.status === "pago");
    const gastos = sum(r => r.secao !== "receita");
    const naoPago = sum(r => r.secao !== "receita" && r.status !== "pago");
    return { receitas, recebido, gastos, naoPago, saldo: receitas - gastos };
  }, [doMes]);

  // ── edição ──
  const edit = (id, patch) => setRows(rs => rs.map(r => r.id === id ? normalize({ ...r, ...patch }) : r));
  const add = secao => setRows(rs => [...rs, normalize({ secao, mes, dia:"", status: secao === "receita" ? "pago" : "nao_pago" })]);
  const remove = id => {
    const r = rows.find(x => x.id === id);
    if ((r.descricao || r.valor) && !window.confirm(`Excluir "${r.descricao || brl(r.valor)}"?`)) return;
    setRows(rs => rs.filter(x => x.id !== id));
  };
  const sortDia = () => setRows(sortRows);

  function puxarFixos() {
    const prev = aba === 0 ? mesKey(ano - 1, 11) : mesKey(ano, aba - 1);
    const atuais = new Set(bySec("fixo").map(r => r.descricao.trim().toLowerCase()));
    const novos = rows.filter(r => r.mes === prev && r.secao === "fixo" && !atuais.has(r.descricao.trim().toLowerCase()))
      .map(r => normalize({ ...r, id: uid(), mes, status:"nao_pago" }));
    if (!novos.length) { setMsg("⚠️ Nada para puxar: o mês anterior não tem gastos fixos (ou eles já estão aqui)."); return; }
    setRows(rs => sortRows([...rs, ...novos]));
    setMsg(`✅ ${novos.length} gastos fixos copiados do mês anterior, todos como "Não pago".`);
  }

  async function copiar(secao) {
    const rs = bySec(secao);
    try {
      await navigator.clipboard.writeText(toTSV(rs, SECTIONS[secao].cols));
      setMsg(`📋 ${rs.length} linhas de ${SECTIONS[secao].title} copiadas. Na sua planilha, clique na primeira célula vazia da coluna "Dia" e cole (Ctrl+V).`);
    } catch { setMsg("⚠️ Não consegui copiar. Use o botão Baixar."); }
  }

  // ── prints ──
  async function handleFiles(files) {
    files = [...files].filter(f => f.type.startsWith("image/"));
    if (!files.length) return;
    if (files.length > 10) { setMsg("⚠️ Envie no máximo 10 prints por vez."); return; }
    setReading(true);
    setMsg(`Lendo ${files.length} print${files.length > 1 ? "s" : ""} com IA...`);
    try {
      const images = await Promise.all(files.map(compressImage));
      const resp = await fetch("/api/ler-financeiro", {
        method:"POST", headers:{ "Content-Type":"application/json", "x-fin-senha": senha },
        body: JSON.stringify({ images, hoje: hojeISO(), clientes: CLIENTS, opcoes: OPTS }),
      });
      if (resp.status === 413) throw new Error("Imagens muito grandes. Tente com menos prints por vez.");
      if (resp.status === 401) { sair(); return; }
      const out = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(out.error || `HTTP ${resp.status}`);
      const found = (out.lancamentos || []).map(t => fromAI(t, mes || mesKey(ano, now.getMonth())));
      if (!found.length) setMsg("⚠️ Não encontrei lançamentos nesses prints. Adicione a linha manualmente.");
      else {
        setReview(r => [...r, ...found]);
        setMsg(`✅ ${found.length} lançamento${found.length > 1 ? "s" : ""} encontrado${found.length > 1 ? "s" : ""}. Confira e clique em "Lançar na planilha".`);
      }
    } catch (e) { setMsg("⚠️ Erro: " + (e.message || String(e))); }
    setReading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function confirmar() {
    setRows(rs => sortRows([...rs, ...review]));
    const first = review[0];
    if (first) { const [y, m] = first.mes.split("-"); setAno(+y); setAba(+m - 1); }
    setMsg(`✅ ${review.length} lançamento${review.length > 1 ? "s" : ""} adicionado${review.length > 1 ? "s" : ""}.`);
    setReview([]);
  }

  function importBackup(file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const arr = JSON.parse(fr.result);
        if (!Array.isArray(arr)) throw new Error("formato inválido");
        setRows(rs => { const ids = new Set(rs.map(r => r.id)); return sortRows([...rs, ...arr.map(normalize).filter(r => !ids.has(r.id))]); });
        setMsg("✅ Backup restaurado.");
      } catch (e) { setMsg("⚠️ Backup inválido: " + e.message); }
    };
    fr.readAsText(file);
  }

  const titulo = aba === "geral" ? `Geral ${ano}` : `${MESES[aba]} ${ano}`;
  const exportRows = aba === "geral" ? rows.filter(r => r.mes.startsWith(String(ano))) : doMes;

  const tab = active => ({
    padding:"10px 16px", border:"none", borderTop:`3px solid ${active ? P.roxo : "transparent"}`,
    background: active ? P.papel : "transparent", color: active ? P.roxo : P.suave,
    fontFamily:FONT, fontSize:13, fontWeight: active ? 800 : 600, cursor:"pointer", whiteSpace:"nowrap",
  });

  return (
    <div style={{ minHeight:"100vh", background:P.bg, fontFamily:FONT, color:P.tinta }}>
      <style>{CSS}</style>

      {/* topo */}
      <div style={{ background:P.papel, borderBottom:`1px solid ${P.linha}` }}>
        <div className="fin-top">
          <div style={{ fontWeight:900, fontSize:18, color:P.roxo }}>ai<span style={{ color:P.laranja }}>.go</span></div>
          <div className="fin-nome" style={{ fontWeight:700, fontSize:15 }}>Financeiro Empresa</div>
          <div style={{ display:"flex", alignItems:"center", gap:4, marginLeft:4 }}>
            <button onClick={() => setAno(a => a - 1)} style={{ border:"none", background:"none", cursor:"pointer", color:P.suave, fontSize:14, padding:4 }}>‹</button>
            <span style={{ fontWeight:800, fontSize:15, color:P.roxo }}>{ano}</span>
            <button onClick={() => setAno(a => a + 1)} style={{ border:"none", background:"none", cursor:"pointer", color:P.suave, fontSize:14, padding:4 }}>›</button>
          </div>
          <button onClick={sair} title="Sair (pede a senha de novo)" style={{ marginLeft:"auto", border:`1px solid ${P.lilas}`, background:P.papel,
            color:P.roxo, borderRadius:8, padding:"6px 10px", fontFamily:FONT, fontSize:12, fontWeight:700, cursor:"pointer" }}>🔒 Sair</button>
        </div>
        {/* abas como no Google Planilhas */}
        <div className="fin-tabs" style={{ display:"flex", overflowX:"auto", background:"#EFEBF8", padding:"0 8px", maxWidth:"100%" }}>
          <button onClick={() => setAba("geral")} style={tab(aba === "geral")}>Geral</button>
          {MESES.map((m, i) => <button key={m} onClick={() => setAba(i)} style={tab(aba === i)}>{m}</button>)}
        </div>
      </div>

      <div style={{ padding:"20px 16px 60px", maxWidth:1800, margin:"0 auto" }}>
        {/* faixa do mês + ações */}
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:14 }}>
          <div style={{ background:P.roxo, color:"#fff", borderRadius:10, padding:"10px 22px", fontWeight:900, fontSize:16,
            letterSpacing:".1em", textTransform:"uppercase" }}>{titulo}</div>
          <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap" }}>
            <Btn onClick={() => downloadFile(`financeiro-${titulo.replace(/\s+/g, "-").toLowerCase()}.csv`, toCSV(exportRows), "text/csv;charset=utf-8")}
              disabled={!exportRows.length}>⬇ Baixar {aba === "geral" ? "ano" : "mês"} (CSV)</Btn>
            <Btn primary onClick={() => fileRef.current?.click()} disabled={reading}>{reading ? "⏳ Lendo..." : "📸 Enviar prints"}</Btn>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => handleFiles(e.target.files)}/>
        <div onClick={() => !reading && fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
          style={{ border:`2px dashed ${drag ? P.roxo2 : P.lilas}`, background: drag ? P.lilasClaro : P.papel, borderRadius:12,
            padding:"14px 16px", textAlign:"center", cursor:"pointer", marginBottom:12, fontSize:12, color:P.suave }}>
          <b style={{ color:P.roxo }}>{reading ? "Analisando prints..." : "Arraste os prints aqui"}</b> · PIX, comprovantes, extratos, faturas · a IA separa em Fixos, Variáveis, Parcelas e Receitas
        </div>

        {msg && (
          <div style={{ fontSize:12, padding:"10px 14px", borderRadius:10, marginBottom:14, wordBreak:"break-word",
            background: msg.startsWith("⚠️") ? "#FFF0F0" : "#EEF8F0", color: msg.startsWith("⚠️") ? P.vermelho : P.verde,
            border:`1px solid ${msg.startsWith("⚠️") ? "#F5C6C6" : "#C8E6CF"}`, display:"flex", gap:10, alignItems:"flex-start" }}>
            <span style={{ flex:1 }}>{msg}</span>
            <button onClick={() => setMsg("")} style={{ border:"none", background:"none", cursor:"pointer", color:"inherit" }}>✕</button>
          </div>
        )}

        {/* revisão do que a IA leu */}
        {review.length > 0 && (
          <div style={{ background:P.papel, border:`2px solid ${P.roxo2}`, borderRadius:12, marginBottom:20, overflow:"hidden" }}>
            <div style={{ background:P.roxo2, color:"#fff", padding:"9px 14px", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <b style={{ fontSize:12, letterSpacing:".06em", textTransform:"uppercase" }}>🔎 Confira o que a IA leu ({review.length})</b>
              <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
                <HeadBtn onClick={() => setReview([])}>Descartar</HeadBtn>
                <button onClick={confirmar} style={{ background:"#fff", color:P.roxo, border:"none", borderRadius:8, padding:"5px 12px",
                  fontFamily:FONT, fontSize:11, fontWeight:800, cursor:"pointer" }}>✓ Lançar na planilha</button>
              </div>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ borderCollapse:"collapse", width:"100%", minWidth:900, fontFamily:FONT }}>
                <thead><tr>
                  {["Seção","Mês","Dia","Descrição","Valor","Forma de pag.","Status","Categoria / Serviço",""].map((h, i) =>
                    <th key={i} style={{ background:P.lilas, fontSize:11, fontWeight:700, padding:"6px 8px", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {review.map(r => {
                    const set = patch => setReview(rv => rv.map(x => x.id === r.id ? normalize({ ...x, ...patch }) : x));
                    const td = { borderBottom:`1px solid ${P.linha}`, padding:0 };
                    return (
                      <tr key={r.id} className="fin-row">
                        <td style={td}>
                          <select className="fin-cell" value={r.secao} onChange={e => set({ secao:e.target.value })}
                            style={{ ...cellBase, fontWeight:700, color:P.roxo, cursor:"pointer" }}>
                            {Object.entries(SECTIONS).map(([k, s]) => <option key={k} value={k}>{s.title}</option>)}
                          </select>
                        </td>
                        <td style={td}>
                          <select className="fin-cell" value={r.mes.slice(5)} onChange={e => set({ mes:`${r.mes.slice(0, 4)}-${e.target.value}` })}
                            style={{ ...cellBase, cursor:"pointer" }}>
                            {MESES.map((m, i) => <option key={m} value={pad(i + 1)}>{m.slice(0, 3)}/{r.mes.slice(2, 4)}</option>)}
                          </select>
                        </td>
                        <td style={{ ...td, width:50 }}><TextCell value={r.dia} align="center" onChange={v => set({ dia:v.replace(/\D/g, "").slice(0, 2) })}/></td>
                        <td style={td}><TextCell value={r.descricao} bold onChange={v => set({ descricao:v })}/></td>
                        <td style={{ ...td, width:110 }}><MoneyCell value={r.valor} onChange={v => set({ valor:v })}/></td>
                        <td style={td}><ChipSelect field="forma" value={r.forma} onChange={v => set({ forma:v })}/></td>
                        <td style={td}><ChipSelect field="status" value={r.status} onChange={v => set({ status:v })}/></td>
                        <td style={td}>
                          {r.secao === "extra" && <ChipSelect field="categoria" value={r.categoria} onChange={v => set({ categoria:v })}/>}
                          {r.secao === "receita" && <div style={{ display:"flex" }}>
                            <ChipSelect field="servico" value={r.servico} onChange={v => set({ servico:v })}/>
                            <ChipSelect field="tipo" value={r.tipo} onChange={v => set({ tipo:v })}/>
                          </div>}
                        </td>
                        <td style={{ ...td, textAlign:"center" }}>
                          <button onClick={() => setReview(rv => rv.filter(x => x.id !== r.id))}
                            style={{ border:"none", background:"none", color:P.vermelho, cursor:"pointer", padding:"4px 8px" }}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {aba === "geral" ? <Geral rows={rows} ano={ano} onPick={setAba}/> : (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12, marginBottom:20 }}>
              <Kpi label="Receitas" value={brl(resumo.receitas)} color={P.verde}
                sub={`20% empresa: ${brl(resumo.receitas * .2)}`}/>
              <Kpi label="Gastos" value={brl(resumo.gastos)} color={P.vermelho}
                sub="Fixos + variáveis + parcelas"/>
              <Kpi label="Saldo do mês" value={<span style={{ color:resumo.saldo >= 0 ? P.verde : P.vermelho }}>{brl(resumo.saldo)}</span>}
                color={P.roxo} sub={resumo.receitas ? `Margem ${(resumo.saldo / resumo.receitas * 100).toFixed(0)}%` : "Receitas − gastos"}/>
              <Kpi label="Falta pagar" value={<span style={{ color:resumo.naoPago ? P.vermelho : P.tinta }}>{brl(resumo.naoPago)}</span>}
                color={P.laranja} sub={resumo.receitas - resumo.recebido ? `A receber: ${brl(resumo.receitas - resumo.recebido)}` : "Gastos marcados como não pago"}/>
            </div>

            <div style={{ marginBottom:20 }}>
              <ParaOndeFoi key={mes} rows={doMes.filter(r => r.secao !== "receita")} titulo={titulo}/>
            </div>

            <div className="fin-cols">
              <div style={{ display:"flex", flexDirection:"column", gap:20, minWidth:0 }}>
                {GASTOS.map(s => (
                  <Section key={s} secao={s} rows={bySec(s)} onEdit={edit} onAdd={() => add(s)} onRemove={remove}
                    onSortDia={sortDia} onCopy={() => copiar(s)}
                    extra={s === "fixo" && <HeadBtn onClick={puxarFixos} title="Copia os gastos fixos do mês anterior">↻ Puxar do mês anterior</HeadBtn>}/>
                ))}
              </div>
              <div style={{ minWidth:0 }}>
                <Section secao="receita" rows={bySec("receita")} onEdit={edit} onAdd={() => add("receita")} onRemove={remove}
                  onSortDia={sortDia} onCopy={() => copiar("receita")}/>
              </div>
            </div>
          </>
        )}

        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginTop:24, fontSize:11, color:P.suave }}>
          <span>Os dados ficam salvos neste navegador.</span>
          <Btn onClick={() => downloadFile(`backup-financeiro-${hojeISO()}.json`, JSON.stringify(rows, null, 2), "application/json")}
            style={{ padding:"6px 12px", fontSize:11 }}>Fazer backup</Btn>
          <Btn onClick={() => backupRef.current?.click()} style={{ padding:"6px 12px", fontSize:11 }}>Restaurar backup</Btn>
          <input ref={backupRef} type="file" accept="application/json" hidden
            onChange={e => { e.target.files[0] && importBackup(e.target.files[0]); e.target.value = ""; }}/>
        </div>
      </div>
    </div>
  );
}

// ── Senha de acesso ────────────────────────────────────────────────────────
const SENHA_KEY = "aigo-fin-senha";

async function conferirSenha(senha) {
  const r = await fetch("/api/fin-auth", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ senha }) });
  const out = await r.json().catch(() => ({}));
  return { ok: r.ok, erro: out.error || `Erro ${r.status}` };
}

export default function Financeiro() {
  const [senha, setSenha] = useState(() => { try { return localStorage.getItem(SENHA_KEY) || ""; } catch { return ""; } });
  const [estado, setEstado] = useState(senha ? "conferindo" : "login");   // login | conferindo | ok
  const [digitada, setDigitada] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (estado !== "conferindo") return;
    conferirSenha(senha).then(({ ok, erro }) => {
      if (ok) { try { localStorage.setItem(SENHA_KEY, senha); } catch {} setEstado("ok"); }
      else { setErro(erro); setEstado("login"); try { localStorage.removeItem(SENHA_KEY); } catch {} }
    }).catch(() => { setErro("Sem conexão. Tente de novo."); setEstado("login"); });
  }, [estado, senha]);

  const sair = () => { try { localStorage.removeItem(SENHA_KEY); } catch {} setSenha(""); setDigitada(""); setErro(""); setEstado("login"); };

  if (estado === "ok") return <FinanceiroApp senha={senha} sair={sair}/>;

  return (
    <div style={{ minHeight:"100vh", background:P.bg, fontFamily:FONT, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <style>{CSS}</style>
      <form onSubmit={e => { e.preventDefault(); if (digitada) { setErro(""); setSenha(digitada); setEstado("conferindo"); } }}
        style={{ background:P.papel, border:`1px solid ${P.linha}`, borderRadius:16, padding:"28px 24px", width:"100%", maxWidth:340,
          boxShadow:"0 10px 30px rgba(59,28,126,.10)", textAlign:"center" }}>
        <div style={{ fontWeight:900, fontSize:24, color:P.roxo }}>ai<span style={{ color:P.laranja }}>.go</span></div>
        <div style={{ fontWeight:800, fontSize:15, color:P.tinta, marginTop:6 }}>Financeiro Empresa</div>
        <div style={{ fontSize:12, color:P.suave, marginTop:4, marginBottom:20 }}>Acesso restrito</div>
        <input type="password" autoFocus value={digitada} onChange={e => setDigitada(e.target.value)} placeholder="Senha"
          style={{ width:"100%", border:`1px solid ${P.lilas}`, borderRadius:10, padding:"11px 14px", fontFamily:FONT, fontSize:14, outline:"none", color:P.tinta }}/>
        {erro && <div style={{ fontSize:12, color:P.vermelho, marginTop:10 }}>{erro}</div>}
        <button type="submit" disabled={estado === "conferindo"} style={{ width:"100%", marginTop:14, background:P.roxo, color:"#fff", border:"none",
          borderRadius:10, padding:"11px", fontFamily:FONT, fontSize:14, fontWeight:800, cursor:"pointer", opacity: estado === "conferindo" ? .6 : 1 }}>
          {estado === "conferindo" ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
