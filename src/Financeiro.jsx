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
    ["Parcelado", "#DCE8FB", "#1F5FBF"],
    ["Outro", "#E8EAED", "#3C4043"],
  ],
  // Pessoal: categorias da sua planilha
  classeCasa: [
    ["Fixo", "#1F5FBF", "#FFFFFF"],
    ["Parcela", "#DCE8FB", "#1F4E79"],
    ["Extra", "#FFE9A8", "#8A6500"],
  ],
  classeExtra: [
    ["pessoal", "#3E2723", "#FFFFFF"],
    ["coisa p/ casa", "#ECECEC", "#333333"],
  ],
  // Pessoal: grupos do gráfico "para onde foi" — [nome, cor] (paleta categórica validada, ordem fixa)
  grupo: [
    ["Casa e contas", "#2a78d6"],
    ["Carro e transporte", "#eb6834"],
    ["Saúde", "#1baf7a"],
    ["Coisas p/ casa", "#eda100"],
    ["Pessoal", "#e87ba4"],
    ["Estudos", "#008300"],
    ["Assinaturas e celular", "#6250d6"],
    ["Mercado e dia a dia", "#e34948"],
    ["Outros", "#9A94AC"],
  ],
  status: [
    ["pago", "#D7EFD9", "#1E7B34", "Pago"],
    ["nao_pago", "#FBD9DB", "#C62828", "Não pago"],
  ],
  // Categorias de gasto: [nome, cor] — paleta categórica validada, ordem fixa
  categoria: [
    ["Equipe e salários", "#2a78d6"],
    ["Impostos e encargos", "#eb6834"],
    ["Estrutura do estúdio", "#1baf7a"],
    ["Ferramentas e assinaturas", "#eda100"],
    ["Dívidas e financiamentos", "#e87ba4"],
    ["Investimentos", "#008300"],
    ["Marketing e anúncios", "#6250d6"],
    ["Maringá e viagens", "#e34948"],
    ["Outros", "#9A94AC"],
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
const COR_CAT = { ...Object.fromEntries(CHIPS.grupo), ...Object.fromEntries(CHIPS.categoria) };

// Categorias criadas por você ("＋ Nova categoria…"). Vêm dos próprios lançamentos, então sincronizam junto.
const CAT_EXTRA = { empresa:[], pessoal:[] };
const CORES_EXTRA = ["#0f8b8d", "#a0522d", "#8e44ad", "#c2185b", "#5d7a1f", "#1f3a93", "#b8860b", "#00838f", "#6d4c41", "#d81b60"];
const CAT_LEGADO = ["Investimento", "Maringá"];
const catPadrao = esp => esp === "pessoal" ? OPTS.grupo : OPTS.categoria;
const listaCat = esp => { const p = catPadrao(esp); return [...p.filter(c => c !== "Outros"), ...CAT_EXTRA[esp], "Outros"]; };
const corCat = n => COR_CAT[n] || CORES_EXTRA[Math.max(0, [...CAT_EXTRA.empresa, ...CAT_EXTRA.pessoal].indexOf(n)) % CORES_EXTRA.length];
const NOVA_CAT = "__nova__";
function pedirNovaCategoria(esp) {
  const nome = (window.prompt(`Nova categoria (${esp === "pessoal" ? "🏠 Pessoal" : "🏢 Empresa"}):`) || "").trim().replace(/\s+/g, " ");
  if (!nome) return "";
  const existe = listaCat(esp).find(c => c.toLowerCase() === nome.toLowerCase());
  if (existe) return existe;
  const novo = nome[0].toUpperCase() + nome.slice(1);
  CAT_EXTRA[esp] = [...CAT_EXTRA[esp], novo];
  return novo;
}
// Opções criadas nas listas coloridas (Forma, Serviço, Fotografia, categorias do Pessoal)
const CHIP_EXTRA = { forma:[], servico:[], tipo:[], classeCasa:[], classeExtra:[] };
const CHIP_ONDE = { servico:"receita", tipo:"receita", classeCasa:"p_casa", classeExtra:"p_extra" };
const CHIP_PERGUNTA = { forma:"Nova forma de pagamento:", servico:"Novo serviço:", tipo:"Nova opção de Fotografia:",
  classeCasa:"Nova categoria (Gastos Casa):", classeExtra:"Nova categoria (Parcelas e Gastos Extras):" };
const opcoesChip = f => [...OPTS[f], ...(CHIP_EXTRA[f] || [])];
function pedirNovaOpcao(f) {
  const nome = (window.prompt(CHIP_PERGUNTA[f] || "Nova opção:") || "").trim().replace(/\s+/g, " ");
  if (!nome) return "";
  const existe = opcoesChip(f).find(o => o.toLowerCase() === nome.toLowerCase() || (chipOf(f, o)?.[3] || "").toLowerCase() === nome.toLowerCase());
  if (existe) return existe;
  CHIP_EXTRA[f] = [...CHIP_EXTRA[f], nome];
  return nome;
}

// Recalcula as categorias criadas a partir dos lançamentos
function atualizarCatExtra(rows) {
  Object.keys(CHIP_EXTRA).forEach(f => {
    const achadas = new Set(rows.filter(r => r[f] && (!CHIP_ONDE[f] || r.secao === CHIP_ONDE[f]) && !OPTS[f].includes(r[f])).map(r => r[f]));
    CHIP_EXTRA[f] = [...new Set([...CHIP_EXTRA[f].filter(o => achadas.has(o)), ...achadas])];
  });
  const out = { empresa:new Set(), pessoal:new Set() };
  rows.forEach(r => {
    if (!r.categoria || r.secao === "receita") return;
    const esp = espacoDe(r.secao);
    if (!catPadrao(esp).includes(r.categoria) && !CAT_LEGADO.includes(r.categoria)) out[esp].add(r.categoria);
  });
  // mantém as recém-criadas (ainda sem lançamento salvo) e a ordem de criação
  ["empresa", "pessoal"].forEach(esp => {
    CAT_EXTRA[esp] = [...new Set([...CAT_EXTRA[esp].filter(c => out[esp].has(c)), ...out[esp]])];
  });
}

// Pessoal: sugere o grupo pelo nome (e pela categoria da planilha, quando ajuda)
const REGRAS_GRUPO = [
  ["Saúde", /sa[uú]de|m[eé]dic|dentista|farm[aá]cia|rem[eé]dio|exame|terapia|academia|psic/],
  ["Estudos", /fies|faculdade|curso|escola|mensalidade escolar|livro|material escolar/],
  ["Carro e transporte", /carro|seguro|combust|abastec|\bposto\b|gasolina|etanol|ped[aá]gio|uber|[oô]nibus|passagem|ipva|licenciamento|mec[aâ]nic|estacionamento/],
  ["Assinaturas e celular", /netflix|spotify|youtube|prime|disney|hbo|globoplay|celular|recarga|cr[eé]dito celular|icloud|assinatura|streaming/],
  ["Mercado e dia a dia", /mercado|supermercado|katuxa|padaria|a[cç]ougue|feira|ifood|lanche|restaurante|almo[cç]o|janta|caf[eé]/],
  ["Casa e contas", /aluguel|caixa|financiamento|condom[ií]nio|energia|\bluz\b|[aá]gua|internet|g[aá]s|ilda|diarista|iptu/],
  ["Coisas p/ casa", /port[aã]o|placa solar|tinta|riotintas|m[oó]vel|eletro|geladeira|fog[aã]o|sof[aá]|cama|colch[aã]o|panela|reforma|constru|casa|decora/],
  ["Pessoal", /renner|riachuelo|shein|zara|marisa|hering|\bc&a\b|roupa|saia|blusa|brusinha|conjunto|t[eê]nis|sapato|cabelo|unha|presente|raquete|livelo|viagem|lazer/],
];
function sugerirGrupo(descricao = "", classe = "") {
  const d = descricao.toLowerCase();
  const achou = REGRAS_GRUPO.find(([, re]) => re.test(d));
  if (achou) return achou[0];
  if (classe === "coisa p/ casa") return "Coisas p/ casa";
  if (classe === "pessoal") return "Pessoal";
  return "Outros";
}

// Sugere a categoria pelo nome do gasto (a ordem importa: "Alessa Tráfego" é equipe, não anúncio)
const REGRAS_CAT = [
  ["Maringá e viagens", /maring|ped[aá]gio|combust|abastec|\bposto\b|gasolina|etanol|uber|viagem|hotel|passagem/],
  ["Impostos e encargos", /\bfgts\b|\binss\b|\bdas\b|contador|contabil|imposto|\biss\b|darf|simples nacional|irpf|tributo/],
  ["Dívidas e financiamentos", /empr[eé]stimo|cons[oó]rcio|financiamento|juros/],
  ["Equipe e salários", /sal[aá]rio|pr[oó][ -]?labore|alessa|kamilly|mikaelly|ilda|freela|funcion|equipe|vale|f[eé]rias|13º|décimo/],
  ["Estrutura do estúdio", /aluguel|[aá]gua|energia|\bluz\b|internet|condom[ií]nio|telefone|limpeza|iptu/],
  ["Ferramentas e assinaturas", /adobe|canva|capcut|icloud|google|drive|\bsite\b|dom[ií]nio|hospedagem|assinatura|notion|figma|chatgpt|claude|lightroom|spotify|software|app\b/],
  ["Marketing e anúncios", /an[uú]ncio|\bads\b|facebook|meta|instagram|impulsion|tr[aá]fego pago|marketing|brinde/],
  ["Investimentos", /investimento|equipamento|c[aâ]mera|lente|mesa|cadeira|notebook|computador|m[oó]vel|est[uú]dio|ilumina|trip[eé]/],
];
function sugerirCategoria(descricao = "", antiga = "") {
  if (antiga === "Investimento") return "Investimentos";
  if (antiga === "Maringá") return "Maringá e viagens";
  const d = descricao.toLowerCase();
  const achou = REGRAS_CAT.find(([, re]) => re.test(d));
  return achou ? achou[0] : "Outros";
}
// Na sua planilha, Parcelas e Extras usa outras categorias; ao copiar, convertemos
const CAT_PLANILHA = { "Investimentos":"Investimento", "Maringá e viagens":"Maringá" };

const COL = {
  dia:       { label:"Dia", w:36, kind:"dia" },
  descricao: { label:"Descrição", w:118, kind:"text" },
  valor:     { label:"Valor", w:92, kind:"money" },
  p80:       { label:"80% empresa", w:84, kind:"calc", calc:r => r.valor * .8 },
  p20:       { label:"20% empresa", w:84, kind:"calc", calc:r => r.valor * .2 },
  forma:     { label:"Forma", w:86, kind:"chip" },
  status:    { label:"Status", w:86, kind:"chip" },
  categoria: { label:"Categoria", w:146, kind:"cat" },
  classeCasa:  { label:"Categoria", w:96, kind:"chip" },
  classeExtra: { label:"Categoria", w:108, kind:"chip" },
  servico:   { label:"Serviço", w:106, kind:"chip" },
  tipo:      { label:"Fotografia", w:110, kind:"chip" },
  info:      { label:"Info", w:48, kind:"text" },
  infoRec:   { label:"Info", w:140, kind:"text", campo:"info" },   // Receitas: Info mais larga
};

// cols = o que aparece na tela; copia = a ordem das colunas da sua planilha (para colar)
const SECTIONS = {
  fixo:     { title:"Gastos Fixos",      cols:["dia","descricao","valor","categoria","forma","status","info"], copia:["dia","descricao","valor","forma","status","info"] },
  variavel: { title:"Gastos Variáveis",  cols:["dia","descricao","valor","categoria","forma","status","info"], copia:["dia","descricao","valor","forma","status","info"] },
  extra:    { title:"Parcelas e Extras", cols:["dia","descricao","valor","categoria","forma","status","info"], copia:["dia","descricao","valor","categoria","status","forma","info"] },
  receita:  { title:"Receitas",          cols:["dia","descricao","valor","p80","p20","servico","tipo","infoRec"], copia:["dia","descricao","valor","p80","p20","servico","tipo","forma","info"] },
};
const GASTOS = ["fixo","variavel","extra"];

// ── Pessoal: mesma ideia, com as tabelas da sua planilha pessoal ──
Object.assign(SECTIONS, {
  p_fixo:  { title:"Gastos Fixos",             cols:["dia","descricao","valor","forma","status","info"],         copia:["dia","descricao","valor","forma","status","info"] },
  p_casa:  { title:"Gastos Casa",              cols:["dia","descricao","valor","classeCasa","status","forma"],   copia:["dia","descricao","valor","classeCasa","status","forma","info"] },
  p_extra: { title:"Parcelas e Gastos Extras", cols:["dia","descricao","valor","forma","status","classeExtra","info"], copia:["dia","descricao","valor","forma","status","classeExtra","info"] },
});
const ESPACOS = {
  empresa: { nome:"Empresa", icone:"🏢", secoes:["fixo","variavel","extra","receita"] },
  pessoal: { nome:"Pessoal", icone:"🏠", secoes:["p_fixo","p_casa","p_extra"] },
};
const espacoDe = secao => secao.startsWith("p_") ? "pessoal" : "empresa";
// Troca um lançamento de lado (Empresa ↔ Pessoal), escolhendo a tabela equivalente
const PARA_LADO = { pessoal:{ fixo:"p_fixo", variavel:"p_extra", extra:"p_extra" }, empresa:{ p_fixo:"fixo", p_casa:"variavel", p_extra:"extra" } };
const trocarLado = (r, lado) => espacoDe(r.secao) === lado || !PARA_LADO[lado][r.secao] ? r
  : normalize({ ...r, secao:PARA_LADO[lado][r.secao], categoria:"" });

const STORAGE_KEY = "aigo-financeiro-v2";
const REVIEW_KEY = "aigo-financeiro-conferencia";   // o que a IA leu e ainda não foi salvo
const HIST_KEY = "aigo-financeiro-historico";       // últimas importações (para conferir/desfazer)
const APAG_KEY = "aigo-financeiro-apagados";        // o que foi excluído (para excluir também nos outros aparelhos)

// Identifica este aparelho (para juntar o mesmo lançamento feito em dois aparelhos)
const DISP = (() => {
  try { let d = localStorage.getItem("aigo-fin-disp"); if (!d) { d = Math.random().toString(36).slice(2, 10); localStorage.setItem("aigo-fin-disp", d); } return d; }
  catch { return "sem-id"; }
})();
const lerJSON = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? def; } catch { return def; } };

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
.fin-2col{display:grid;grid-template-columns:1fr;gap:14px;align-items:start}
@media (min-width:1100px){.fin-2col{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
.fin-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:12px}
@media (min-width:1200px){.fin-kpis{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media (max-width:560px){.fin-kpis{grid-template-columns:1fr}}
.fin-avisos{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-bottom:14px}
.fin-top{display:flex;align-items:center;gap:8px 12px;flex-wrap:wrap;padding:10px 16px;max-width:1380px;margin:0 auto}
@media (max-width:600px){.fin-nome{display:none}}
.fin-cell:focus{outline:2px solid ${P.roxo2};outline-offset:-2px;background:#fff !important}
.fin-row:hover td{filter:brightness(.985)}
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

// A categoria serve para este lado? (as padrão dele ou uma criada; nunca a padrão do outro lado)
function catPropria(secao, c) {
  if (!c || typeof c !== "string" || CAT_LEGADO.includes(c)) return false;
  const esp = espacoDe(secao), outro = esp === "pessoal" ? "empresa" : "pessoal";
  return catPadrao(esp).includes(c) || (!catPadrao(outro).includes(c) && (CAT_EXTRA[esp].includes(c) || !CAT_EXTRA[outro].includes(c)));
}
function normalize(r) {
  const secao = SECTIONS[r.secao] ? r.secao : "variavel";
  // aceita as opções padrão e as criadas por você (texto livre); a IA é filtrada antes, em fromAI
  const pick = (k, def = "") => OPTS[k].includes(r[k]) || (typeof r[k] === "string" && r[k].trim() && k in CHIP_EXTRA) ? r[k] : def;
  return {
    id: r.id || uid(),
    secao,
    mes: /^\d{4}-\d{2}$/.test(r.mes || "") ? r.mes : hojeISO().slice(0, 7),
    dia: r.dia === "" || r.dia == null ? "" : Math.min(31, Math.max(1, parseInt(r.dia) || 1)),
    descricao: r.descricao || "",
    valor: parseValor(r.valor),
    forma: pick("forma", "Pix"),
    status: r.status === "nao_pago" ? "nao_pago" : "pago",
    categoria: secao === "receita" ? ""
      : catPropria(secao, r.categoria) ? r.categoria
      : espacoDe(secao) === "pessoal" ? sugerirGrupo(r.descricao, r.classeExtra || r.classe)
      : sugerirCategoria(r.descricao, r.categoria),
    classeCasa: secao === "p_casa" ? (pick("classeCasa") || (OPTS.classeCasa.includes(r.classe) ? r.classe : "Fixo")) : "",
    classeExtra: secao === "p_extra" ? (pick("classeExtra") || (OPTS.classeExtra.includes(r.classe) ? r.classe : "pessoal")) : "",
    servico: secao === "receita" ? pick("servico", "Social Media") : "",
    tipo: secao === "receita" ? pick("tipo", "") : "",
    info: r.info || "",
    upd: Number(r.upd) || 0,     // hora da última alteração (para sincronizar)
    disp: r.disp || "",          // aparelho onde foi criado
    ord: Number(r.ord) || 0,     // ordem de criação (mantém a ordem dentro do mesmo dia)
  };
}

// Converte um lançamento vindo da IA (com data AAAA-MM-DD)
function fromAI(t, mesAtual) {
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(t.data || "");
  const sec = SECTIONS[t.secao] ? t.secao : "variavel";
  const categoria = listaCat(espacoDe(sec)).includes(t.categoria) ? t.categoria : "";
  const chips = Object.fromEntries(Object.keys(CHIP_EXTRA).map(f => [f, opcoesChip(f).includes(t[f]) ? t[f] : ""]));
  return normalize({ ...t, ...chips, categoria, mes: ok ? t.data.slice(0, 7) : mesAtual, dia: ok ? +t.data.slice(8, 10) : "" });
}

function load() {
  try {
    const v2 = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (Array.isArray(v2)) return v2.map((r, i) => normalize({ ...r, ord: r.ord ?? i + 1 }));
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
  a.mes.localeCompare(b.mes) || (a.dia === "" ? 99 : a.dia) - (b.dia === "" ? 99 : b.dia) || a.ord - b.ord || a.id.localeCompare(b.id));
// Marca uma linha nova ou alterada para a sincronização
const marcar = r => ({ ...r, upd: Date.now(), disp: r.disp || DISP, ord: r.ord || Date.now() });
const igual = (a, b) => { const k = x => JSON.stringify([...x].sort((p, q) => String(p.id).localeCompare(String(q.id)))); return k(a) === k(b); };

// Identifica lançamentos iguais (para não duplicar ao importar o mesmo print de novo)
const chave = r => [r.mes, r.secao, r.dia, r.descricao.trim().toLowerCase(), r.valor.toFixed(2)].join("|");

const chipOf = (field, val) => CHIPS[field]?.find(o => o[0] === val);
const cellText = (r, c) => {
  const col = COL[c];
  if (col.kind === "calc") return num(col.calc(r));
  if (c === "valor") return num(r.valor);
  if (c === "status") return r.status === "pago" ? "Pago" : "Não pago";
  if (c === "categoria") return CAT_PLANILHA[r.categoria] || "Extra";
  return r[c] ?? "";
};

function toTSV(rows, cols) {
  const clean = v => String(v ?? "").replace(/[\t\r\n]+/g, " ");
  return rows.map(r => cols.map(c => clean(cellText(r, c))).join("\t")).join("\n");
}

function downloadFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

// O lado maior fica em até 1568px (o máximo que a IA aproveita); com muitos prints
// reduz um pouco para o envio caber no limite da Vercel (~4,5 MB)
function compressImage(file, total = 1) {
  const lado = total <= 4 ? 1568 : total <= 7 ? 1300 : 1100;
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, lado / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      res(canvas.toDataURL("image/jpeg", 0.8).split(",")[1]);
    };
    img.onerror = rej;
    img.src = url;
  });
}

// ── Células editáveis ──────────────────────────────────────────────────────
const cellBase = {
  width:"100%", border:"none", background:"transparent", fontFamily:FONT, fontSize:11.5,
  color:P.tinta, padding:"4px 6px", outline:"none", borderRadius:0,
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
  const [, bg, fg] = o || (value ? [null, "#E6DEF7", "#4A3F6B"] : [null, "#F1EFF6", P.suave]);   // opção criada: lilás neutro
  return (
    <div style={{ position:"relative", padding:"2px 4px", maxWidth:130 }}>
      <select className="fin-cell" value={value} onChange={e => {
          const v = e.target.value === NOVA_CAT ? pedirNovaOpcao(field) : e.target.value;
          if (v) onChange(v); else e.target.value = value;
        }}
        style={{ appearance:"none", WebkitAppearance:"none", width:"100%", border:"none", cursor:"pointer",
          background:bg, color:fg, fontFamily:FONT, fontSize:10.5, fontWeight:600,
          padding:"3px 18px 3px 8px", borderRadius:100, outline:"none" }}>
        {field === "tipo" && <option value="">—</option>}
        {CHIPS[field].map(([v, , , label]) => <option key={v} value={v}>{label || v}</option>)}
        {(CHIP_EXTRA[field] || []).map(v => <option key={v} value={v}>{v}</option>)}
        {field in CHIP_EXTRA && <option value={NOVA_CAT}>＋ Novo…</option>}
      </select>
      <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:7,
        color:fg, pointerEvents:"none" }}>▼</span>
    </div>
  );
}

// Categoria: quadradinho colorido + nome (mais discreto que um chip)
function CatSelect({ value, onChange, espaco = "empresa" }) {
  const lista = listaCat(espaco);
  return (
    <div style={{ position:"relative", display:"flex", alignItems:"center", padding:"0 4px 0 8px" }}>
      <span style={{ width:9, height:9, borderRadius:2, background:corCat(value) || "#ccc", flex:"0 0 auto", pointerEvents:"none" }}/>
      <select className="fin-cell" value={value} onChange={e => {
          const v = e.target.value === NOVA_CAT ? pedirNovaCategoria(espaco) : e.target.value;
          if (v) onChange(v); else e.target.value = value;
        }}
        style={{ ...cellBase, appearance:"none", WebkitAppearance:"none", cursor:"pointer", color:P.suave,
          fontSize:10.5, fontWeight:600, paddingLeft:5, whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
        {lista.map(c => <option key={c} value={c}>{c}</option>)}
        <option value={NOVA_CAT}>＋ Nova categoria…</option>
      </select>
    </div>
  );
}

// ── Seção (tabela estilo planilha) ─────────────────────────────────────────
function Section({ secao, rows, onEdit, onAdd, onRemove, onSortDia, onCopy, extra, sel, onToggle, onToggleAll, destaque }) {
  const { title, cols } = SECTIONS[secao];
  const pago = rows.filter(r => r.status === "pago").reduce((s, r) => s + r.valor, 0);
  const naoPago = rows.filter(r => r.status !== "pago").reduce((s, r) => s + r.valor, 0);
  const total = pago + naoPago;
  const rec = secao === "receita";   // Receitas num roxo um pouco mais claro, para separar do que sai
  const claro = rec || secao === "p_casa";
  const th = { background: claro ? "#DCD0F7" : P.lilas, color:P.tinta, fontSize:10.5, fontWeight:700, padding:"5px 6px",
    borderRight:`1px solid ${P.papel}`, whiteSpace:"nowrap", textAlign:"left" };
  const td = { borderBottom:`1px solid ${P.linha}`, borderRight:`1px solid ${P.linha}`, padding:0, background:P.papel };
  const todos = rows.length > 0 && rows.every(r => sel.has(r.id));
  const caixa = { width:14, height:14, cursor:"pointer", accentColor:P.roxo2 };
  const fundo = r => sel.has(r.id) ? { background:"#EFE8FF" } : destaque.has(r.id) ? { background:"#FFF6D5" } : {};
  // Marcar várias linhas arrastando o dedo/mouse pelos quadradinhos (ou Shift + clique)
  const arrasto = useRef(null), ultimo = useRef(null);
  const faixa = (a, b) => rows.slice(Math.min(a, b), Math.max(a, b) + 1).map(r => r.id);
  function inicioMarcar(e, i) {
    if (e.button > 0) return;
    e.preventDefault();
    const alvo = !sel.has(rows[i].id);
    if (e.shiftKey && ultimo.current != null && ultimo.current < rows.length) onToggleAll(faixa(ultimo.current, i), true);
    else onToggleAll([rows[i].id], alvo);
    ultimo.current = i;
    arrasto.current = { alvo, ini:i };
    const mover = ev => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.(`[data-marcar="${secao}"]`);
      if (el && arrasto.current) onToggleAll(faixa(arrasto.current.ini, +el.dataset.idx), arrasto.current.alvo);
    };
    const fim = () => { arrasto.current = null; window.removeEventListener("pointermove", mover); window.removeEventListener("pointerup", fim); window.removeEventListener("pointercancel", fim); };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", fim);
    window.addEventListener("pointercancel", fim);
  }

  return (
    <div style={{ background:P.papel, borderRadius:12, overflow:"hidden", boxShadow:"0 1px 3px rgba(59,28,126,.08)",
      border:`1px solid ${P.linha}` }}>
      <div style={{ background: claro ? "#5E35B1" : P.roxo, color:"#fff", padding:"8px 12px", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <div style={{ fontSize:11.5, fontWeight:800, letterSpacing:".08em", textTransform:"uppercase" }}>{title}</div>
        <div style={{ fontSize:11, opacity:.6 }}>{rows.length} {rows.length === 1 ? "linha" : "linhas"}</div>
        <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
          {extra}
          <HeadBtn onClick={onCopy} disabled={!rows.length} title="Copia todas as linhas desta tabela para colar na sua planilha">📋 Copiar tudo</HeadBtn>
        </div>
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ borderCollapse:"collapse", width:"100%", minWidth:cols.reduce((s, c) => s + COL[c].w, 54), fontFamily:FONT }}>
          <thead>
            <tr>
              <th style={{ ...th, width:28, textAlign:"center" }}>
                <input type="checkbox" checked={todos} disabled={!rows.length} title="Selecionar todas"
                  onChange={e => onToggleAll(rows.map(r => r.id), e.target.checked)} style={caixa}/>
              </th>
              {cols.map(c => <th key={c} style={{ ...th, width:COL[c].w, textAlign:["valor","p80","p20"].includes(c) ? "right" : c === "dia" ? "center" : "left" }}>{COL[c].label}</th>)}
              <th style={{ ...th, width:26, borderRight:"none" }}/>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="fin-row">
                <td data-marcar={secao} data-idx={i} onPointerDown={e => inicioMarcar(e, i)} title="Arraste para marcar várias linhas"
                  style={{ ...td, textAlign:"center", cursor:"pointer", touchAction:"none", userSelect:"none", WebkitUserSelect:"none", ...fundo(r) }}>
                  <input type="checkbox" checked={sel.has(r.id)} onChange={() => onToggle(r.id)} aria-label="Selecionar linha"
                    style={{ ...caixa, pointerEvents:"none" }}/>
                </td>
                {cols.map(c => {
                  const col = COL[c], f = col.campo || c;
                  const set = v => onEdit(r.id, { [f]: v });
                  let cell;
                  if (col.kind === "dia") cell = <TextCell value={r.dia} align="center" placeholder="—"
                    onChange={v => set(v.replace(/\D/g, "").slice(0, 2))} onBlur={onSortDia}/>;
                  else if (col.kind === "money") cell = <MoneyCell value={r.valor} onChange={set}/>;
                  else if (col.kind === "calc") cell = <div style={{ ...cellBase, textAlign:"right", color:P.suave }}>{brl(col.calc(r))}</div>;
                  else if (col.kind === "chip") cell = <ChipSelect field={c} value={r[c]} onChange={set}/>;
                  else if (col.kind === "cat") cell = <CatSelect value={r.categoria} onChange={set} espaco={espacoDe(secao)}/>;
                  else cell = <TextCell value={r[f]} onChange={set} bold={c === "descricao"} placeholder={c === "descricao" ? "Descrição" : ""}/>;
                  return <td key={c} style={{ ...td, ...fundo(r) }}>{cell}</td>;
                })}
                <td style={{ ...td, borderRight:"none", textAlign:"center", ...fundo(r) }}>
                  <button className="fin-del" onClick={() => onRemove(r.id)} title="Excluir linha"
                    style={{ border:"none", background:"none", color:P.vermelho, cursor:"pointer", fontSize:12, padding:"2px 6px" }}>✕</button>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={cols.length + 2} style={{ padding:0 }}>
                <button onClick={onAdd} style={{ width:"100%", border:"none", background: claro ? "#F3EEFD" : P.lilasClaro, color:P.roxo2,
                  fontFamily:FONT, fontSize:11.5, fontWeight:700, padding:"6px", cursor:"pointer", textAlign:"left", paddingLeft:12 }}>
                  ＋ Adicionar linha
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", borderTop:`1px solid ${P.linha}` }}>
        <Total label={rec ? "Recebido" : "Pagos"} value={pago} color={P.verde}/>
        {rec ? <Total label="20% empresa" value={total * .2} color={P.tinta}/>
             : <Total label="Não pago" value={naoPago} color={P.vermelho} highlight={naoPago > 0}/>}
        <Total label="Total" value={total} color={P.tinta}/>
      </div>
    </div>
  );
}

function Total({ label, value, color, highlight }) {
  return (
    <div style={{ flex:"1 1 110px", padding:"7px 12px", borderRight:`1px solid ${P.linha}`,
      background: highlight ? "#FFF4F4" : "transparent" }}>
      <div style={{ fontSize:10, fontWeight:700, color:P.suave, textTransform:"uppercase", letterSpacing:".07em" }}>{label}</div>
      <div style={{ fontSize:13.5, fontWeight:800, color, marginTop:1 }}>{brl(value)}</div>
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

// ── Cabeçalho roxo dos blocos ──────────────────────────────────────────────
function Cabeca({ titulo, sub, children, cor = P.roxo }) {
  return (
    <div style={{ background:cor, color:"#fff", padding:"8px 12px", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
      <div style={{ fontSize:11.5, fontWeight:800, letterSpacing:".08em", textTransform:"uppercase" }}>{titulo}</div>
      {sub && <div style={{ fontSize:11, opacity:.65 }}>{sub}</div>}
      {children && <div style={{ marginLeft:"auto", display:"flex", gap:6, flexWrap:"wrap" }}>{children}</div>}
    </div>
  );
}
const caixaBloco = { background:P.papel, border:`1px solid ${P.linha}`, borderRadius:12, overflow:"hidden" };

// Variação em relação ao mês anterior (bomSubir=false para gastos)
function Variacao({ atual, anterior, bomSubir = true, curto }) {
  if (!anterior) return <span style={{ fontSize:10.5, fontWeight:700, color:P.suave }}>{atual ? "novo" : ""}</span>;
  const p = (atual - anterior) / anterior * 100;
  if (Math.abs(p) < 0.5) return <span style={{ fontSize:10.5, fontWeight:700, color:P.suave }}>= igual</span>;
  const sobe = p > 0, bom = sobe === bomSubir;
  return <span style={{ fontSize:10.5, fontWeight:700, color: bom ? P.verde : P.vermelho, whiteSpace:"nowrap" }}>
    {sobe ? "▲" : "▼"} {Math.abs(p).toFixed(0)}%{curto ? "" : " vs mês anterior"}</span>;
}

// Mini-gráfico de linha dos últimos meses
function Linha({ valores, cor, w = 110, h = 34 }) {
  if (valores.length < 2 || valores.every(v => !v)) return null;
  const mx = Math.max(...valores), mn = Math.min(...valores);
  const pts = valores.map((v, i) => [i * (w / (valores.length - 1)), h - 4 - (v - mn) / ((mx - mn) || 1) * (h - 8)]);
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={w} height={h} style={{ flex:"0 0 auto" }} aria-hidden="true">
      <polyline points={pts.map(p => p.join(",")).join(" ")} fill="none" stroke={cor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={lx} cy={ly} r="3.5" fill={cor}/>
    </svg>
  );
}

function KpiLinha({ label, value, cor, variacao, sub, serie, corLinha }) {
  return (
    <div style={{ background:P.papel, border:`1px solid ${P.linha}`, borderRadius:12, padding:"12px 14px",
      display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:8, minWidth:0 }}>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:9.5, fontWeight:700, color:P.suave, textTransform:"uppercase", letterSpacing:".08em" }}>{label}</div>
        <div style={{ fontSize:21, fontWeight:900, color:cor || P.tinta, marginTop:4, whiteSpace:"nowrap" }}>{value}</div>
        <div style={{ marginTop:3 }}>{variacao}</div>
        {sub && <div style={{ fontSize:11, color:P.suave, marginTop:2 }}>{sub}</div>}
      </div>
      {serie && <Linha valores={serie} cor={corLinha}/>}
    </div>
  );
}

// ── "Para onde foi o dinheiro" ─────────────────────────────────────────────
const COR_FORMA = { "Pix":"#1baf7a", "Sicoob":"#008300", "Nubank":"#6250d6", "Mercado Pago":"#2a78d6", "Cartão":"#eb6834", "Dinheiro":"#eda100", "Outro":"#9A94AC" };
const COR_ITEM = OPTS.categoria.slice(0, 8).map(c => COR_CAT[c]);
const MODOS = {
  categoria: { label:"Categoria",     key:r => r.categoria || "Outros", cor:(n) => corCat(n) },
  item:      { label:"Item",          key:r => r.descricao.trim() || "(sem descrição)" },
  forma:     { label:"Forma de pag.", key:r => r.forma, cor:(n) => COR_FORMA[n] },
};

function agrupar(rows, modo) {
  const map = {};
  rows.forEach(r => {
    const nome = MODOS[modo].key(r), k = nome.toLowerCase();
    map[k] = map[k] || { nome, valor:0, itens:[] };
    map[k].valor += r.valor; map[k].itens.push(r);
  });
  return map;
}

function ParaOndeFoi({ rows, anteriores = [], titulo, compararCom, rotulo = "💸 Para onde foi o dinheiro", listaGrupos, onMudarGrupo }) {
  const [modo, setModo] = useState("categoria");
  const [aberto, setAberto] = useState(null);
  const total = rows.reduce((s, r) => s + r.valor, 0);
  const grupos = useMemo(() => {
    const atual = agrupar(rows, modo), ant = agrupar(anteriores, modo);
    let list = Object.values(atual).filter(g => g.valor > 0).sort((a, b) => b.valor - a.valor)
      .map(g => ({ ...g, anterior: ant[g.nome.toLowerCase()]?.valor || 0 }));
    if (modo === "item" && list.length > 8) {
      const resto = list.slice(7);
      list = [...list.slice(0, 7), { nome:`Outros (${resto.length})`, valor:resto.reduce((s, g) => s + g.valor, 0),
        itens:resto.flatMap(g => g.itens), anterior:0, outros:true }];
    }
    return list.map((g, i) => ({ ...g, cor: g.outros ? "#B9B4C7" : (MODOS[modo].cor?.(g.nome) || COR_ITEM[i % COR_ITEM.length]) }));
  }, [rows, anteriores, modo]);
  const mx = Math.max(1, ...grupos.map(g => g.valor));
  const botao = on => ({ background: on ? "#fff" : "rgba(255,255,255,.14)", color: on ? P.roxo : "#fff",
    border:"1px solid rgba(255,255,255,.22)", borderRadius:7, padding:"3px 9px", fontFamily:FONT, fontSize:10.5, fontWeight:700, cursor:"pointer" });

  return (
    <div style={caixaBloco}>
      <Cabeca titulo={`${rotulo}${titulo ? " · " + titulo : ""}`} sub={total ? `${brl(total)} em ${rows.length} gastos` : ""}>
        {Object.entries(MODOS).map(([k, m]) => <button key={k} onClick={() => { setModo(k); setAberto(null); }} style={botao(modo === k)}>{m.label}</button>)}
      </Cabeca>
      {!total ? <div style={{ padding:"30px 16px", textAlign:"center", fontSize:12, color:P.suave }}>Nenhum gasto lançado neste período.</div> : (
        <div style={{ padding:"14px 16px" }}>
          <div style={{ display:"flex", gap:2, height:22 }}>
            {grupos.map(g => (
              <div key={g.nome} title={`${g.nome}: ${brl(g.valor)}`} onClick={() => setAberto(a => a === g.nome ? null : g.nome)}
                style={{ width:`${g.valor / total * 100}%`, background:g.cor, borderRadius:3, cursor:"pointer", minWidth:3 }}/>
            ))}
          </div>
          <div style={{ marginTop:6 }}>
            {grupos.map(g => {
              const open = aberto === g.nome;
              return (
                <div key={g.nome} style={{ borderBottom:`1px solid ${P.linha}`, background: open ? P.lilasClaro : "transparent", borderRadius: open ? 8 : 0 }}>
                  <div onClick={() => setAberto(open ? null : g.nome)} style={{ padding:"7px 6px", cursor:"pointer" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
                      <span style={{ width:10, height:10, borderRadius:3, background:g.cor, flex:"0 0 auto" }}/>
                      <b style={{ fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{g.nome}</b>
                      <span style={{ color:P.suave, fontSize:11 }}>{g.itens.length}×</span>
                      <span style={{ marginLeft:"auto", color:P.suave, fontSize:11 }}>{(g.valor / total * 100).toFixed(0)}%</span>
                      <b style={{ minWidth:96, textAlign:"right", fontSize:12.5 }}>{brl(g.valor)}</b>
                      {compararCom && <span style={{ minWidth:58, textAlign:"right" }}>{!g.outros && <Variacao atual={g.valor} anterior={g.anterior} bomSubir={false} curto/>}</span>}
                      <span style={{ color:P.suave, fontSize:8, width:10 }}>{open ? "▲" : "▼"}</span>
                    </div>
                    <div style={{ height:6, background:P.lilasClaro, borderRadius:4, margin:"5px 0 0 18px" }}>
                      <div style={{ height:"100%", width:`${g.valor / mx * 100}%`, background:g.cor, borderRadius:4 }}/>
                    </div>
                  </div>
                  {open && (
                    <div style={{ padding:"0 10px 8px 24px" }}>
                      {[...g.itens].sort((a, b) => b.valor - a.valor).map(r => (
                        <div key={r.id} style={{ display:"flex", gap:8, fontSize:11, padding:"4px 0", borderTop:`1px solid ${P.linha}` }}>
                          <span style={{ color:P.suave, width:44, flex:"0 0 auto" }}>{r.dia ? `${pad(r.dia)}/${r.mes.slice(5)}` : `${r.mes.slice(5)}/${r.mes.slice(2, 4)}`}</span>
                          <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.descricao || "—"}</span>
                          {r.info && <span style={{ color:P.suave }}>· {r.info}</span>}
                          <span style={{ marginLeft:"auto", fontWeight:700, whiteSpace:"nowrap" }}>{brl(r.valor)}</span>
                          {onMudarGrupo && modo === "categoria" && (
                            <select value={r.categoria} onChange={e => onMudarGrupo(r.id, e.target.value)} onClick={e => e.stopPropagation()}
                              title="Mudar o grupo deste gasto" style={{ fontFamily:FONT, fontSize:10.5, color:P.suave, border:`1px solid ${P.linha}`,
                                borderRadius:6, background:P.papel, padding:"1px 4px", maxWidth:130 }}>
                              {listaGrupos.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {compararCom && <div style={{ fontSize:10.5, color:P.suave, marginTop:8 }}>▲▼ comparado com {compararCom}. Clique numa categoria para ver os gastos.</div>}
        </div>
      )}
    </div>
  );
}

// ── Últimos 6 meses (receitas x gastos) ────────────────────────────────────
function UltimosMeses({ serie, onPick, soGastos, titulo = "📊 Últimos 6 meses" }) {
  const [hover, setHover] = useState(null);
  const W = 560, H = 190, pl = 46, pb = 24;
  const mx = Math.max(1000, ...serie.flatMap(d => soGastos ? [d.gastos] : [d.receitas, d.gastos]));
  const passo = mx > 20000 ? 10000 : mx > 8000 ? 5000 : mx > 3000 ? 1000 : 500;
  const topo = Math.ceil(mx / passo) * passo;
  const y = v => H - pb - v / topo * (H - pb - 14);
  const bw = (W - pl - 6) / serie.length;
  const grade = [];
  for (let v = 0; v <= topo; v += passo) grade.push(v);
  return (
    <div style={caixaBloco}>
      {soGastos ? <Cabeca titulo={titulo} sub="total de gastos por mês"/> : (
        <Cabeca titulo={titulo}>
          <span style={{ fontSize:10.5, fontWeight:700 }}><span style={{ color:"#C9BCF0" }}>■</span> Receitas</span>
          <span style={{ fontSize:10.5, fontWeight:700 }}><span style={{ color:"#F6A15B" }}>■</span> Gastos</span>
        </Cabeca>
      )}
      <div style={{ padding:"10px 12px 6px", position:"relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={soGastos ? "Gastos por mês" : "Receitas e gastos dos últimos 6 meses"}>
          {grade.map(v => (
            <g key={v}>
              <line x1={pl} x2={W} y1={y(v)} y2={y(v)} stroke="#ECE8F5"/>
              <text x={pl - 6} y={y(v) + 3} textAnchor="end" fontSize="9.5" fill="#8C84A3" fontFamily="Montserrat, sans-serif">{v >= 1000 ? `${v / 1000} mil` : v}</text>
            </g>
          ))}
          {soGastos ? serie.map((d, i) => {
            const x = pl + i * bw + bw * .2, w = bw * .6, ult = i === serie.length - 1, on = hover === i;
            return (
              <g key={d.mes} style={{ cursor:"pointer" }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onPick(d.mes)}>
                <rect x={pl + i * bw} y={0} width={bw} height={H - pb} fill={on ? "#F5F1FD" : "transparent"}/>
                <rect x={x} y={y(d.gastos)} width={w} height={H - pb - y(d.gastos)} rx="3" fill="#4C27A0" opacity={ult || on ? 1 : .55}/>
                <text x={x + w / 2} y={H - 6} textAnchor="middle" fontSize="10.5" fontWeight={ult ? 800 : 600} fill={ult ? P.roxo : P.suave} fontFamily="Montserrat, sans-serif">{d.rotulo}</text>
                {d.gastos ? <text x={x + w / 2} y={y(d.gastos) - 6} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={P.roxo}
                  fontFamily="Montserrat, sans-serif">{(d.gastos / 1000).toFixed(1)}k</text> : null}
              </g>
            );
          }) : serie.map((d, i) => {
            const x = pl + i * bw + bw * .18, w = bw * .3, ult = i === serie.length - 1, on = hover === i;
            const saldo = d.receitas - d.gastos;
            return (
              <g key={d.mes} style={{ cursor:"pointer" }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onPick(d.mes)}>
                <rect x={pl + i * bw} y={0} width={bw} height={H - pb} fill={on ? "#F5F1FD" : "transparent"}/>
                <rect x={x} y={y(d.receitas)} width={w} height={H - pb - y(d.receitas)} rx="3" fill="#4C27A0" opacity={ult || on ? 1 : .55}/>
                <rect x={x + w + 2} y={y(d.gastos)} width={w} height={H - pb - y(d.gastos)} rx="3" fill="#E07020" opacity={ult || on ? 1 : .55}/>
                <text x={x + w + 1} y={H - 6} textAnchor="middle" fontSize="10.5" fontWeight={ult ? 800 : 600} fill={ult ? P.roxo : P.suave} fontFamily="Montserrat, sans-serif">{d.rotulo}</text>
                {(d.receitas || d.gastos) ? <text x={x + w + 1} y={Math.min(y(d.receitas), y(d.gastos)) - 6} textAnchor="middle" fontSize="9.5" fontWeight="700"
                  fill={saldo >= 0 ? P.verde : P.vermelho} fontFamily="Montserrat, sans-serif">{saldo >= 0 ? "+" : "−"}{(Math.abs(saldo) / 1000).toFixed(1)}k</text> : null}
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div style={{ position:"absolute", top:10, ...(hover < serie.length / 2 ? { left:60 } : { right:16 }), background:P.papel, border:`1px solid ${P.linha}`,
            borderRadius:10, padding:"8px 11px", fontSize:11, boxShadow:"0 8px 24px rgba(59,28,126,.15)", pointerEvents:"none" }}>
            <b>{serie[hover].nome}</b>
            {soGastos ? <div>Gastos {brl(serie[hover].gastos)}</div> : <>
            <div>Receitas {brl(serie[hover].receitas)}</div>
            <div>Gastos {brl(serie[hover].gastos)}</div>
            <div style={{ fontWeight:700, color: serie[hover].receitas - serie[hover].gastos >= 0 ? P.verde : P.vermelho }}>Sobrou {brl(serie[hover].receitas - serie[hover].gastos)}</div></>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── De onde vem o dinheiro ─────────────────────────────────────────────────
function DeOndeVem({ receitas }) {
  const total = receitas.reduce((s, r) => s + r.valor, 0);
  const sm = receitas.filter(r => r.servico === "Social Media").reduce((s, r) => s + r.valor, 0);
  const foto = receitas.filter(r => r.servico === "Fotografia").reduce((s, r) => s + r.valor, 0);
  const outro = total - sm - foto;
  const por = {};
  receitas.forEach(r => { const k = r.descricao.trim() || "(sem nome)"; por[k] = (por[k] || 0) + r.valor; });
  const top = Object.entries(por).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const fatias = [["Social Media", sm, "#1F5FBF"], ["Fotografia", foto, "#5B2BA6"], ["Outro", outro, "#9A94AC"]].filter(f => f[1] > 0);
  return (
    <div style={caixaBloco}>
      <Cabeca titulo="💜 De onde vem o dinheiro"/>
      <div style={{ padding:"12px 16px" }}>
        {!total ? <div style={{ fontSize:12, color:P.suave, textAlign:"center", padding:"10px 0" }}>Nenhuma receita lançada neste mês.</div> : <>
          <div style={{ display:"flex", height:22, borderRadius:5, overflow:"hidden", gap:2 }}>
            {fatias.map(([n, v, c]) => (
              <div key={n} title={`${n}: ${brl(v)}`} style={{ width:`${v / total * 100}%`, background:c, color:"#fff", fontSize:10.5, fontWeight:700,
                padding:"4px 8px", whiteSpace:"nowrap", overflow:"hidden" }}>{n} {(v / total * 100).toFixed(0)}%</div>
            ))}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:5, fontSize:11, color:P.suave }}>
            {fatias.map(([n, v]) => <span key={n}>{n}: {brl(v)}</span>)}
          </div>
          <div style={{ fontSize:11.5, fontWeight:800, margin:"12px 0 6px" }}>Maiores clientes do mês</div>
          {top.map(([n, v], i) => (
            <div key={n} style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", fontSize:11.5 }}>
              <span>{i + 1}. {n}</span><b>{brl(v)}</b>
            </div>
          ))}
        </>}
      </div>
    </div>
  );
}

// ── Avisos "Fique de olho" ─────────────────────────────────────────────────
function gerarAvisos({ gastos, anteriores, mes, hojeDia, nomeProximo }) {
  const avisos = [];
  const abertos = gastos.filter(g => g.status !== "pago" && g.valor > 0);
  if (hojeDia) {
    const atrasados = abertos.filter(g => g.dia && g.dia < hojeDia);
    if (atrasados.length) avisos.push({ cor:P.vermelho, titulo:"Em atraso",
      texto:`${atrasados.length} conta${atrasados.length > 1 ? "s" : ""} com dia já passado e marcada${atrasados.length > 1 ? "s" : ""} como não paga${atrasados.length > 1 ? "s" : ""}: ${brl(atrasados.reduce((s, g) => s + g.valor, 0))}` });
  }
  const porDia = {};
  abertos.filter(g => g.dia && (!hojeDia || g.dia >= hojeDia)).forEach(g => { (porDia[g.dia] = porDia[g.dia] || []).push(g); });
  const dias = Object.entries(porDia).map(([d, gs]) => ({ d:+d, gs, t:gs.reduce((s, g) => s + g.valor, 0) }));
  const proximos = dias.filter(x => !hojeDia || x.d <= hojeDia + 7);
  const alvo = (proximos.length ? proximos : dias).sort((a, b) => b.t - a.t)[0];
  if (alvo) avisos.push({ cor:P.vermelho, titulo:`Vence dia ${alvo.d}`,
    texto:`${alvo.gs.slice(0, 3).map(g => g.descricao || "sem nome").join(", ")}${alvo.gs.length > 3 ? ` e mais ${alvo.gs.length - 3}` : ""}: ${brl(alvo.t)}` });
  const ultimas = gastos.filter(g => { const m = /(\d+)\s*\/\s*(\d+)/.exec(g.info || ""); return m && +m[1] === +m[2] && +m[2] > 1; });
  if (ultimas.length) {
    const t = ultimas.reduce((s, g) => s + g.valor, 0);
    avisos.push({ cor:P.laranja, titulo:"Última parcela",
      texto:`${ultimas.slice(0, 2).map(g => `${g.descricao} (${g.info})`).join(", ")}: sobra ${brl(t)} a partir de ${nomeProximo}` });
  }
  const catAtual = agrupar(gastos, "categoria"), catAnt = agrupar(anteriores, "categoria");
  const novas = Object.values(catAtual).filter(g => g.valor > 0 && !catAnt[g.nome.toLowerCase()] && anteriores.length);
  if (novas.length) {
    const g = novas.sort((a, b) => b.valor - a.valor)[0];
    avisos.push({ cor:"#6250d6", titulo:"Novo este mês", texto:`${g.nome}: ${brl(g.valor)} (${g.itens.slice(0, 3).map(i => i.descricao).join(", ")})` });
  } else {
    const subiu = Object.values(catAtual).map(g => ({ ...g, ant: catAnt[g.nome.toLowerCase()]?.valor || 0 }))
      .filter(g => g.ant > 0 && g.valor - g.ant > 200 && g.valor / g.ant > 1.2).sort((a, b) => (b.valor - b.ant) - (a.valor - a.ant))[0];
    if (subiu) avisos.push({ cor:"#6250d6", titulo:"Subiu este mês", texto:`${subiu.nome}: +${brl(subiu.valor - subiu.ant)} em relação ao mês anterior` });
  }
  return avisos.slice(0, 3);
}

function Avisos({ avisos }) {
  if (!avisos.length) return null;
  return (
    <div className="fin-avisos">
      {avisos.map((a, i) => (
        <div key={i} style={{ background:P.papel, border:`1px solid ${P.linha}`, borderLeft:`4px solid ${a.cor}`, borderRadius:10, padding:"8px 12px", minWidth:0 }}>
          <div style={{ fontSize:9.5, fontWeight:800, color:a.cor, textTransform:"uppercase", letterSpacing:".07em" }}>🔔 {a.titulo}</div>
          <div style={{ fontSize:11.5, marginTop:3, lineHeight:1.35 }}>{a.texto}</div>
        </div>
      ))}
    </div>
  );
}

// ── Calendário de vencimentos (compacto) ───────────────────────────────────
function Vencimentos({ gastos, ano, mesIdx, hojeDia }) {
  const nDias = new Date(ano, mesIdx + 1, 0).getDate();
  const vazio = new Date(ano, mesIdx, 1).getDay();
  const porDia = {};
  gastos.filter(g => g.dia && g.valor > 0).forEach(g => { (porDia[g.dia] = porDia[g.dia] || []).push(g); });
  const aVencer = gastos.filter(g => g.status !== "pago" && (!hojeDia || !g.dia || g.dia >= hojeDia)).reduce((s, g) => s + g.valor, 0);
  const cel = [];
  for (let i = 0; i < vazio; i++) cel.push(<div key={"v" + i}/>);
  for (let d = 1; d <= nDias; d++) {
    const it = porDia[d] || [], tot = it.reduce((s, g) => s + g.valor, 0), aberto = it.some(g => g.status !== "pago");
    const hoje = d === hojeDia;
    cel.push(
      <div key={d} title={it.map(g => `${g.status === "pago" ? "✓" : "●"} ${g.descricao}: ${brl(g.valor)}`).join("\n")}
        style={{ background: aberto ? "#FFF4F4" : it.length ? "#F0FAF2" : P.papel, border: hoje ? `2px solid ${P.roxo}` : `1px solid ${P.linha}`,
          borderRadius:7, padding:"3px 6px", minHeight:46, minWidth:0, overflow:"hidden" }}>
        <div style={{ fontSize:10, fontWeight:700, color: hoje ? P.roxo : P.suave }}>{d}{hoje ? " · hoje" : ""}</div>
        {it.length > 0 && <div style={{ fontSize:10.5, fontWeight:800, color: aberto ? P.vermelho : P.verde, whiteSpace:"nowrap" }}>{brl(tot)}</div>}
        {it.slice(0, 2).map(g => (
          <div key={g.id} style={{ fontSize:9, lineHeight:1.25, color: g.status === "pago" ? P.verde : P.vermelho, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
            {g.status === "pago" ? "✓" : "●"} {g.descricao}</div>
        ))}
        {it.length > 2 && <div style={{ fontSize:8.5, color:P.suave }}>+{it.length - 2}</div>}
      </div>
    );
  }
  return (
    <div style={caixaBloco}>
      <Cabeca titulo={`📅 Vencimentos de ${MESES[mesIdx].toLowerCase()}`}
        sub={hojeDia ? `ainda vão sair ${brl(aVencer)} de hoje até o fim do mês` : `${brl(aVencer)} marcados como não pagos`}>
        <span style={{ fontSize:10.5, fontWeight:700 }}><span style={{ color:"#FFB4B4" }}>●</span> falta pagar</span>
        <span style={{ fontSize:10.5, fontWeight:700 }}><span style={{ color:"#9BE3AE" }}>✓</span> pago</span>
      </Cabeca>
      <div style={{ padding:"10px 12px", display:"grid", gridTemplateColumns:"repeat(7,minmax(0,1fr))", gap:5 }}>
        {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(s => <div key={s} style={{ fontSize:9.5, fontWeight:700, color:P.suave, textAlign:"center", textTransform:"uppercase" }}>{s}</div>)}
        {cel}
      </div>
    </div>
  );
}

// ── Pessoal: parcelas em andamento ─────────────────────────────────────────
const parcela = r => { const m = /(\d+)\s*\/\s*(\d+)/.exec(r.info || ""); return m && +m[2] > 1 ? { n:+m[1], de:+m[2] } : null; };
function resumoParcelas(gastos) {
  const ps = gastos.map(r => ({ r, p: parcela(r) })).filter(x => x.p && x.r.valor > 0);
  return {
    lista: ps,
    falta: ps.reduce((s, { r, p }) => s + r.valor * Math.max(0, p.de - p.n), 0),
    terminam: ps.filter(({ p }) => p.n >= p.de).length,
  };
}
function ParcelasAndamento({ gastos }) {
  const { lista, falta } = resumoParcelas(gastos);
  return (
    <div style={caixaBloco}>
      <Cabeca titulo="🧾 Parcelas em andamento" sub={lista.length ? `ainda faltam ${brl(falta)} no total` : ""}/>
      <div style={{ padding:"8px 16px" }}>
        {!lista.length ? <div style={{ fontSize:12, color:P.suave, textAlign:"center", padding:"14px 0" }}>Nenhuma parcela neste mês. Escreva na Info no formato 3/10.</div> :
          lista.sort((a, b) => (b.r.valor * (b.p.de - b.p.n)) - (a.r.valor * (a.p.de - a.p.n))).map(({ r, p }) => (
            <div key={r.id} style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) 80px 110px", gap:8, alignItems:"center", padding:"5px 0",
              borderBottom:`1px solid ${P.linha}`, fontSize:11.5 }}>
              <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}><b style={{ fontWeight:600 }}>{r.descricao}</b> <span style={{ color:P.suave }}>· {p.n}/{p.de}</span></span>
              <div title={`${p.n} de ${p.de} parcelas`} style={{ height:6, background:P.lilasClaro, borderRadius:4 }}>
                <div style={{ height:"100%", width:`${Math.min(100, p.n / p.de * 100)}%`, background:P.roxo2, borderRadius:4 }}/>
              </div>
              <span style={{ textAlign:"right", color: p.n >= p.de ? P.verde : P.suave, fontWeight: p.n >= p.de ? 700 : 500 }}>
                {p.n >= p.de ? "✓ última" : `falta ${brl(r.valor * (p.de - p.n))}`}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

// ── Pessoal: tela do mês ───────────────────────────────────────────────────
function MesPessoal({ ano, aba, mes, bySec, analise, edit, add, remove, sortDia, copiar, sel, toggleSel, toggleAll, destaque, puxarFixos, setAno, setAba, mudarGrupo }) {
  const gastos = analise.gastosMes;
  const total = gastos.reduce((s, r) => s + r.valor, 0);
  const pago = gastos.filter(r => r.status === "pago").reduce((s, r) => s + r.valor, 0);
  const casa = bySec("p_casa").reduce((s, r) => s + r.valor, 0);
  const parc = resumoParcelas(gastos);
  const pagas = gastos.filter(r => r.status === "pago").length;
  const props = s => ({ secao:s, rows:bySec(s), onEdit:edit, onAdd:() => add(s), onRemove:remove, onSortDia:sortDia, onCopy:() => copiar(s),
    sel, onToggle:toggleSel, onToggleAll:toggleAll, destaque });
  const puxar = s => <HeadBtn onClick={() => puxarFixos(s)} title="Copia do mês anterior">↻ Puxar do mês anterior</HeadBtn>;
  return (
    <>
      <div className="fin-kpis">
        <KpiLinha label="Gastos do mês" value={brl(total)}
          variacao={<Variacao atual={total} anterior={analise.tAnt.gastos} bomSubir={false}/>}
          sub={total ? <>casa = <b style={{ color:P.tinta }}>{(casa / total * 100).toFixed(0)}%</b> dos gastos</> : null}
          serie={analise.serie.map(d => d.gastos)} corLinha={P.roxo2}/>
        <KpiLinha label="Já pago" value={brl(pago)} cor={P.verde}
          variacao={<span style={{ fontSize:10.5, fontWeight:700, color:P.suave }}>{pagas} de {gastos.length} contas</span>}/>
        <KpiLinha label="Falta pagar" value={brl(total - pago)} cor={total - pago ? P.vermelho : P.tinta}
          variacao={<span style={{ fontSize:10.5, fontWeight:700, color:P.tinta }}>
            {analise.abertos.length ? `${analise.abertos.length} conta${analise.abertos.length > 1 ? "s" : ""}` : "Tudo pago ✓"}
            {analise.proxima ? ` · próxima: ${analise.proxima.descricao || "sem nome"} dia ${analise.proxima.dia}` : ""}</span>}/>
        <KpiLinha label="Parcelas em aberto" value={brl(parc.falta)}
          variacao={<span style={{ fontSize:10.5, fontWeight:700, color:P.suave }}>
            {parc.lista.length} parcelamento{parc.lista.length !== 1 ? "s" : ""}{parc.terminam ? ` · ${parc.terminam} termina${parc.terminam > 1 ? "m" : ""} este mês` : ""}</span>}/>
      </div>

      <Avisos avisos={analise.avisos}/>

      <div className="fin-2col">
        <div style={{ display:"flex", flexDirection:"column", gap:14, minWidth:0 }}>
          <Section {...props("p_fixo")} extra={puxar("p_fixo")}/>
          <Section {...props("p_extra")}/>
        </div>
        <Section {...props("p_casa")} extra={puxar("p_casa")}/>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:10, margin:"26px 0 12px" }}>
        <span style={{ fontSize:13, fontWeight:900, color:P.roxo, letterSpacing:".08em", textTransform:"uppercase" }}>📈 Análise do mês</span>
        <span style={{ flex:1, height:1, background:P.lilas }}/>
      </div>
      <div className="fin-2col">
        <ParaOndeFoi key={mes} rows={gastos} anteriores={analise.anteriores} compararCom={analise.nomeAnt}
          rotulo="💸 Para onde foi o meu dinheiro" listaGrupos={listaCat("pessoal")} onMudarGrupo={mudarGrupo}/>
        <div style={{ display:"flex", flexDirection:"column", gap:14, minWidth:0 }}>
          <ParcelasAndamento gastos={gastos}/>
          <UltimosMeses serie={analise.serie} soGastos onPick={m => { const d = analise.serie.find(x => x.mes === m); if (d) { setAno(d.ano); setAba(d.mes); } }}/>
        </div>
      </div>
    </>
  );
}

// ── Pessoal: aba Geral (ano) ───────────────────────────────────────────────
function GeralPessoal({ rows, ano, onPick }) {
  const doAno = rows.filter(r => r.mes.startsWith(`${ano}-`));
  const data = MESES.map((nome, m) => {
    const rs = doAno.filter(r => r.mes === mesKey(ano, m));
    const sum = s => rs.filter(r => r.secao === s).reduce((t, r) => t + r.valor, 0);
    const fixo = sum("p_fixo"), casa = sum("p_casa"), extra = sum("p_extra");
    return { m, mes:m, ano, nome, rotulo:nome.slice(0, 3), fixo, casa, extra, gastos: fixo + casa + extra, receitas:0, vazio: !rs.length };
  });
  const tot = k => data.reduce((s, d) => s + d[k], 0);
  const comDados = data.filter(d => !d.vazio);
  const maisCaro = [...comDados].sort((a, b) => b.gastos - a.gastos)[0];
  const th = { background:P.lilas, fontSize:11, fontWeight:700, padding:"7px 10px", textAlign:"right", whiteSpace:"nowrap" };
  const td = { fontSize:12, padding:"7px 10px", textAlign:"right", borderBottom:`1px solid ${P.linha}`, whiteSpace:"nowrap" };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div className="fin-kpis">
        <KpiLinha label={`Gastos em ${ano}`} value={brl(tot("gastos"))} variacao={<span style={{ fontSize:10.5, color:P.suave, fontWeight:700 }}>{comDados.length} meses lançados</span>}/>
        <KpiLinha label="Média por mês" value={brl(comDados.length ? tot("gastos") / comDados.length : 0)} variacao={null}/>
        <KpiLinha label="Mês mais caro" value={maisCaro ? maisCaro.nome : "—"} variacao={maisCaro ? <span style={{ fontSize:10.5, color:P.suave, fontWeight:700 }}>{brl(maisCaro.gastos)}</span> : null}/>
        <KpiLinha label="Casa no ano" value={brl(tot("casa"))} variacao={tot("gastos") ? <span style={{ fontSize:10.5, color:P.suave, fontWeight:700 }}>{(tot("casa") / tot("gastos") * 100).toFixed(0)}% dos gastos</span> : null}/>
      </div>
      <div className="fin-2col">
        <ParaOndeFoi rows={doAno} rotulo="💸 Para onde foi o meu dinheiro" titulo={`${ano}`}/>
        <UltimosMeses serie={data} soGastos titulo={`📊 Gastos por mês · ${ano}`} onPick={m => onPick(m)}/>
      </div>
      <div style={caixaBloco}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ borderCollapse:"collapse", width:"100%", minWidth:620, fontFamily:FONT, color:P.tinta }}>
            <thead><tr>
              <th style={{ ...th, textAlign:"left" }}>Mês</th><th style={th}>Gastos fixos</th><th style={th}>Gastos casa</th>
              <th style={th}>Parcelas e extras</th><th style={th}>Total</th>
            </tr></thead>
            <tbody>
              {data.map(d => (
                <tr key={d.m} className="fin-row" onClick={() => onPick(d.m)} style={{ cursor:"pointer", opacity: d.vazio ? .45 : 1 }}>
                  <td style={{ ...td, textAlign:"left", fontWeight:700 }}>{d.nome}</td>
                  <td style={td}>{brl(d.fixo)}</td><td style={td}>{brl(d.casa)}</td><td style={td}>{brl(d.extra)}</td>
                  <td style={{ ...td, fontWeight:800 }}>{brl(d.gastos)}</td>
                </tr>
              ))}
              <tr style={{ background:P.lilasClaro }}>
                <td style={{ ...td, textAlign:"left", fontWeight:800 }}>Total</td>
                {["fixo","casa","extra","gastos"].map(k => <td key={k} style={{ ...td, fontWeight:800 }}>{brl(tot(k))}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
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
  const [espaco, setEspaco] = useState(() => { try { return localStorage.getItem("aigo-fin-espaco") === "pessoal" ? "pessoal" : "empresa"; } catch { return "empresa"; } });
  useEffect(() => { try { localStorage.setItem("aigo-fin-espaco", espaco); } catch {} }, [espaco]);
  const pessoal = espaco === "pessoal";
  const [review, setReview] = useState(() => lerJSON(REVIEW_KEY, []).map(normalize));
  atualizarCatExtra(review.length ? [...rows, ...review] : rows);   // categorias criadas (vêm dos lançamentos)
  const [historico, setHistorico] = useState(() => lerJSON(HIST_KEY, []));
  const [sel, setSel] = useState(() => new Set());
  const [destaque, setDestaque] = useState(() => new Set());
  const [salvo, setSalvo] = useState({ ok:true, quando:null });
  const [apagados, setApagados] = useState(() => lerJSON(APAG_KEY, []));
  const [nuvem, setNuvem] = useState({ estado:"conectando", quando:null });   // conectando | enviando | ok | sem | erro
  const [reading, setReading] = useState(false);
  const [msg, setMsg] = useState("");
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();
  const backupRef = useRef();

  useEffect(() => { document.title = "ai.go — Financeiro"; }, []);
  // Salva e confere lendo de volta; se o navegador não guardar, avisa na tela
  useEffect(() => {
    try {
      const json = JSON.stringify(rows);
      localStorage.setItem(STORAGE_KEY, json);
      setSalvo({ ok: localStorage.getItem(STORAGE_KEY) === json, quando: new Date() });
    } catch { setSalvo({ ok:false, quando: new Date() }); }
  }, [rows]);
  useEffect(() => { try { localStorage.setItem(REVIEW_KEY, JSON.stringify(review)); } catch {} }, [review]);
  useEffect(() => { try { localStorage.setItem(APAG_KEY, JSON.stringify(apagados)); } catch {} }, [apagados]);

  // ── Nuvem: manda o que este aparelho tem e recebe tudo já juntado com os outros aparelhos ──
  const atual = useRef({ rows, apagados });
  atual.current = { rows, apagados };
  const sync = useRef({ rodando:false, pendente:false });
  async function sincronizar() {
    if (sync.current.rodando) { sync.current.pendente = true; return; }
    sync.current.rodando = true;
    setNuvem(n => ({ ...n, estado: n.estado === "ok" ? "enviando" : n.estado }));
    try {
      const enviado = atual.current;
      const resp = await fetch("/api/fin-dados", {
        method:"POST", headers:{ "Content-Type":"application/json", "x-fin-senha": senha },
        body: JSON.stringify({ rows: enviado.rows, apagados: enviado.apagados }),
      });
      if (resp.status === 401) { sair(); return; }
      const out = await resp.json().catch(() => ({}));
      if (resp.status === 503 && out.semNuvem) { setNuvem({ estado:"sem", quando:null }); return; }
      if (!resp.ok) throw new Error(out.error || `HTTP ${resp.status}`);
      if (atual.current.rows !== enviado.rows || atual.current.apagados !== enviado.apagados) {
        sync.current.pendente = true;          // mudou algo enquanto enviava: manda de novo antes de aplicar
      } else {
        const daNuvem = (out.rows || []).map(normalize);
        if (!igual(daNuvem, enviado.rows)) setRows(sortRows(daNuvem));
        if (!igual(out.apagados || [], enviado.apagados)) setApagados(out.apagados || []);
      }
      setNuvem({ estado:"ok", quando:new Date() });
    } catch {
      setNuvem({ estado:"erro", quando:null });
    } finally {
      sync.current.rodando = false;
      if (sync.current.pendente) { sync.current.pendente = false; setTimeout(sincronizar, 300); }
    }
  }
  // depois de cada alteração (espera 1 segundo sem mexer)
  useEffect(() => { const t = setTimeout(sincronizar, 1000); return () => clearTimeout(t); }, [rows, apagados]);
  // a cada 15 segundos e ao voltar para a aba, para receber o que foi lançado no outro aparelho
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") sincronizar(); }, 15000);
    const ver = () => { if (document.visibilityState === "visible") sincronizar(); };
    document.addEventListener("visibilitychange", ver);
    window.addEventListener("focus", ver);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", ver); window.removeEventListener("focus", ver); };
  }, []);
  useEffect(() => { try { localStorage.setItem(HIST_KEY, JSON.stringify(historico)); } catch {} }, [historico]);
  // Site aberto em outra aba: recebe o que ela salvou, em vez de sobrescrever
  useEffect(() => {
    const onStorage = e => {
      if (!e.newValue) return;
      try {
        if (e.key === STORAGE_KEY) setRows(JSON.parse(e.newValue).map(normalize));
        if (e.key === APAG_KEY) setApagados(JSON.parse(e.newValue));
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const mes = aba === "geral" ? null : mesKey(ano, aba);
  const rowsEsp = useMemo(() => rows.filter(r => ESPACOS[espaco].secoes.includes(r.secao)), [rows, espaco]);
  const doMes = useMemo(() => rowsEsp.filter(r => r.mes === mes), [rowsEsp, mes]);
  // Em Parcelas e Extras e em todas as tabelas do Pessoal, as linhas com parcela no Info (ex.: 3/10) ficam sempre no topo
  const bySec = s => {
    const rs = doMes.filter(r => r.secao === s);
    if (s !== "extra" && !s.startsWith("p_")) return rs;
    const ordem = sortRows(rs);
    return [...ordem.filter(r => parcela(r)), ...ordem.filter(r => !parcela(r))];
  };

  const resumo = useMemo(() => {
    const sum = f => doMes.filter(f).reduce((s, r) => s + r.valor, 0);
    const receitas = sum(r => r.secao === "receita");
    const recebido = sum(r => r.secao === "receita" && r.status === "pago");
    const gastos = sum(r => r.secao !== "receita");
    const naoPago = sum(r => r.secao !== "receita" && r.status !== "pago");
    const fixos = sum(r => r.secao === "fixo");
    return { receitas, recebido, gastos, naoPago, fixos, saldo: receitas - gastos };
  }, [doMes]);

  // ── análises: mês anterior, últimos 6 meses, avisos ──
  const analise = useMemo(() => {
    if (aba === "geral") return null;
    const deslocar = n => { const d = new Date(ano, aba + n, 1); return { ano:d.getFullYear(), m:d.getMonth(), key:mesKey(d.getFullYear(), d.getMonth()) }; };
    const ant = deslocar(-1), prox = deslocar(1);
    const totais = key => {
      const rs = rowsEsp.filter(r => r.mes === key);
      const sum = f => rs.filter(f).reduce((s, r) => s + r.valor, 0);
      return { receitas: sum(r => r.secao === "receita"), gastos: sum(r => r.secao !== "receita"), n: rs.length };
    };
    const serie = [-5, -4, -3, -2, -1, 0].map(n => {
      const d = deslocar(n), t = totais(d.key);
      return { mes:d.m, ano:d.ano, key:d.key, rotulo:MESES[d.m].slice(0, 3), nome:`${MESES[d.m]} ${d.ano}`, ...t };
    });
    const tAnt = totais(ant.key);
    const anteriores = rowsEsp.filter(r => r.mes === ant.key && r.secao !== "receita");
    const gastosMes = doMes.filter(r => r.secao !== "receita");
    const hoje = new Date();
    const hojeDia = hoje.getFullYear() === ano && hoje.getMonth() === aba ? hoje.getDate() : null;
    const abertos = gastosMes.filter(g => g.status !== "pago" && g.valor > 0);
    const proxima = abertos.filter(g => g.dia && (!hojeDia || g.dia >= hojeDia)).sort((a, b) => a.dia - b.dia)[0];
    return {
      serie, tAnt, anteriores, gastosMes, hojeDia, abertos, proxima,
      nomeAnt: MESES[ant.m].toLowerCase(),
      avisos: gerarAvisos({ gastos:gastosMes, anteriores, mes, hojeDia, nomeProximo: MESES[prox.m].toLowerCase() }),
    };
  }, [rowsEsp, doMes, aba, ano, mes]);

  // ── edição ──
  const edit = (id, patch) => setRows(rs => rs.map(r => r.id === id ? marcar(normalize({ ...r, ...patch })) : r));
  const add = secao => setRows(rs => [...rs, marcar(normalize({ secao, mes, dia:"", status: secao === "receita" ? "pago" : "nao_pago" }))]);
  const registrarApagados = ids => { const agora = Date.now(); setApagados(ap => [...ap.filter(a => !ids.includes(a.id)), ...ids.map(id => ({ id, upd:agora }))]); };
  const remove = id => {
    const r = rows.find(x => x.id === id);
    if ((r.descricao || r.valor) && !window.confirm(`Excluir "${r.descricao || brl(r.valor)}"?`)) return;
    setRows(rs => rs.filter(x => x.id !== id));
    registrarApagados([id]);
  };
  const sortDia = () => setRows(sortRows);

  function puxarFixos(secao = "fixo") {
    const prev = aba === 0 ? mesKey(ano - 1, 11) : mesKey(ano, aba - 1);
    const atuais = new Set(bySec(secao).map(r => r.descricao.trim().toLowerCase()));
    const novos = rows.filter(r => r.mes === prev && r.secao === secao && !atuais.has(r.descricao.trim().toLowerCase()))
      .map(r => marcar(normalize({ ...r, id: uid(), mes, status:"nao_pago", disp:"", ord:0 })));
    if (!novos.length) { setMsg(`⚠️ Nada para puxar: o mês anterior não tem ${SECTIONS[secao].title.toLowerCase()} (ou eles já estão aqui).`); return; }
    setRows(rs => sortRows([...rs, ...novos]));
    setMsg(`✅ ${novos.length} ${SECTIONS[secao].title.toLowerCase()} copiados do mês anterior, todos como "Não pago".`);
  }


  async function copiarLinhas(lista) {
    const porSecao = Object.keys(SECTIONS).map(k => [k, lista.filter(r => r.secao === k)]).filter(([, rs]) => rs.length);
    if (!porSecao.length) return;
    try {
      await navigator.clipboard.writeText(porSecao.map(([k, rs]) => toTSV(rs, SECTIONS[k].copia)).join("\n\n"));
      const nomes = porSecao.map(([k, rs]) => `${rs.length} de ${SECTIONS[k].title}`).join(", ");
      setMsg(`📋 Copiado: ${nomes}. Na sua planilha, clique na célula da coluna "Dia" da primeira linha vazia e cole (Ctrl+V ou ⌘V).`
        + (porSecao.length > 1 ? " Atenção: você copiou de mais de uma tabela; elas vêm separadas por uma linha em branco." : ""));
    } catch { setMsg("⚠️ Não consegui copiar. Tente de novo clicando no botão."); }
  }
  const copiar = secao => copiarLinhas(bySec(secao));

  const toggleSel = id => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = (ids, on) => setSel(s => { const n = new Set(s); ids.forEach(id => on ? n.add(id) : n.delete(id)); return n; });
  const selecionados = rows.filter(r => sel.has(r.id));

  function excluirSelecionados() {
    if (!selecionados.length) return;
    if (!window.confirm(`Excluir ${selecionados.length} lançamento${selecionados.length > 1 ? "s" : ""} selecionado${selecionados.length > 1 ? "s" : ""}?`)) return;
    const ids = new Set(selecionados.map(r => r.id));
    setRows(rs => rs.filter(r => !ids.has(r.id)));
    registrarApagados([...ids]);
    setMsg(`🗑 ${ids.size} lançamento${ids.size > 1 ? "s" : ""} excluído${ids.size > 1 ? "s" : ""}.`);
    setSel(new Set());
  }

  // Mudar várias linhas de uma vez (Forma, Status, Categoria, Mover para)
  function emLote(patchDe, aviso) {
    const ids = new Set(selecionados.map(r => r.id));
    setRows(rs => sortRows(rs.map(r => ids.has(r.id) ? marcar(normalize({ ...r, ...patchDe(r) })) : r)));
    setDestaque(ids);
    alterados.current = new Set([...alterados.current, ...ids]);
    setMsg(`✅ ${aviso} em ${ids.size} lançamento${ids.size > 1 ? "s" : ""}.`);
  }
  function moverPara(secao) {
    const outro = espacoDe(secao) !== espaco;
    emLote(() => ({ secao }), `Movido para ${SECTIONS[secao].title}${outro ? ` (${ESPACOS[espacoDe(secao)].icone} ${ESPACOS[espacoDe(secao)].nome})` : ""}`);
    setSel(new Set());
  }
  const comCategoria = selecionados.filter(r => r.secao !== "receita");
  const espLote = comCategoria.length && comCategoria.every(r => espacoDe(r.secao) === "pessoal") ? "pessoal"
    : comCategoria.length && comCategoria.every(r => espacoDe(r.secao) === "empresa") ? "empresa" : null;
  const listaCatLote = espLote ? listaCat(espLote) : null;

  // "✓ Concluir": termina a ação em lote e desmarca tudo (também com Esc)
  const alterados = useRef(new Set());
  function concluir() {
    const n = [...alterados.current].filter(id => sel.has(id)).length;
    setSel(new Set());
    if (n) setMsg(`✅ Pronto! ${n} lançamento${n > 1 ? "s" : ""} atualizado${n > 1 ? "s" : ""}.`);
  }
  useEffect(() => { if (!sel.size) alterados.current = new Set(); }, [sel]);
  useEffect(() => {
    if (!sel.size) return;
    const tecla = e => { if (e.key === "Escape") concluir(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  // limpa a seleção ao trocar de mês/ano
  useEffect(() => { setSel(new Set()); }, [aba, ano]);

  // ── prints ──
  async function handleFiles(files) {
    files = [...files].filter(f => f.type.startsWith("image/"));
    if (!files.length) return;
    if (files.length > 10) { setMsg("⚠️ Envie no máximo 10 prints por vez."); return; }
    setReading(true);
    setMsg(`Lendo ${files.length} print${files.length > 1 ? "s" : ""} com IA...`);
    try {
      const images = await Promise.all(files.map(f => compressImage(f, files.length)));
      const resp = await fetch("/api/ler-financeiro", {
        method:"POST", headers:{ "Content-Type":"application/json", "x-fin-senha": senha },
        body: JSON.stringify({ images, hoje: hojeISO(), mesAberto: mes || mesKey(ano, now.getMonth()), clientes: CLIENTS, opcoes: { ...OPTS, ...Object.fromEntries(Object.keys(CHIP_EXTRA).map(f => [f, opcoesChip(f)])),
          categoria: listaCat("empresa"), grupo: listaCat("pessoal") }, espaco }),
      });
      if (resp.status === 413) throw new Error("Imagens muito grandes. Tente com menos prints por vez.");
      if (resp.status === 401) { sair(); return; }
      const out = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(out.error || `HTTP ${resp.status}`);
      const found = (out.lancamentos || []).map(t => fromAI(pessoal && !String(t.secao).startsWith("p_") ? { ...t, secao: t.secao === "fixo" ? "p_fixo" : "p_extra" }
        : !pessoal && String(t.secao).startsWith("p_") ? { ...t, secao:"variavel" } : t, mes || mesKey(ano, now.getMonth())))
        .filter(r => r.descricao.trim() || r.valor > 0);
      if (!found.length) setMsg("⚠️ Não encontrei lançamentos nesses prints. Adicione a linha manualmente.");
      else {
        setReview(r => { const ja = new Set(r.map(chave)); return [...r, ...found.filter(x => !ja.has(chave(x)))]; });
        setMsg(`🔎 ${found.length} lançamento${found.length > 1 ? "s" : ""} encontrado${found.length > 1 ? "s" : ""}. Confira abaixo e clique em "Salvar lançamentos" (sem isso eles não são salvos).`);
      }
    } catch (e) { setMsg("⚠️ Erro: " + (e.message || String(e))); }
    setReading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function confirmar() {
    const existentes = new Set(rows.map(chave));
    const novos = review.filter(r => !existentes.has(chave(r))).map((r, i) => marcar({ ...r, ord: Date.now() + i }));
    const repetidos = review.length - novos.length;
    setRows(rs => sortRows([...rs, ...novos]));
    setDestaque(new Set(novos.map(r => r.id)));
    const first = novos[0];
    if (first) { const [y, m] = first.mes.split("-"); setAno(+y); setAba(+m - 1); setEspaco(espacoDe(first.secao)); }
    const porMes = {};
    novos.forEach(r => { const [y, m] = r.mes.split("-"); const k = `${MESES[+m - 1]} ${y}`; porMes[k] = (porMes[k] || 0) + 1; });
    const onde = (first && novos.every(r => espacoDe(r.secao) === espacoDe(first.secao)) ? `${ESPACOS[espacoDe(first.secao)].icone} ` : "") + Object.entries(porMes).map(([k, n]) => `${n} em ${k}`).join(", ");
    if (novos.length) setHistorico(h => [{ id: uid(), quando: new Date().toISOString(), ids: novos.map(r => r.id), onde,
      mes: novos[0].mes }, ...h].slice(0, 15));
    const nEmp = novos.filter(r => espacoDe(r.secao) === "empresa").length, nPes = novos.length - nEmp;
    const lados = nEmp && nPes ? ` — ${nEmp} na 🏢 Empresa e ${nPes} no 🏠 Pessoal` : "";
    setMsg(`✅ ${novos.length} lançamento${novos.length !== 1 ? "s" : ""} salvo${novos.length !== 1 ? "s" : ""}${lados}${onde ? ` (${onde})` : ""}. Eles estão destacados em amarelo.`
      + (repetidos ? ` ${repetidos} já existia${repetidos > 1 ? "m" : ""} e não ${repetidos > 1 ? "foram duplicados" : "foi duplicado"}.` : ""));
    setReview([]);
  }

  function verImportacao(h) {
    const [y, m] = h.mes.split("-"); setAno(+y); setAba(+m - 1);
    const r = rows.find(x => h.ids.includes(x.id));
    if (r) setEspaco(espacoDe(r.secao));
    setDestaque(new Set(h.ids));
  }

  function desfazerImportacao(h) {
    const ids = new Set(h.ids);
    const n = rows.filter(r => ids.has(r.id)).length;
    if (!window.confirm(`Desfazer esta importação? ${n} lançamento${n !== 1 ? "s" : ""} será${n !== 1 ? "ão" : ""} removido${n !== 1 ? "s" : ""}.`)) return;
    setRows(rs => rs.filter(r => !ids.has(r.id)));
    registrarApagados([...ids]);
    setHistorico(hs => hs.filter(x => x.id !== h.id));
    setMsg(`↩ Importação desfeita: ${n} lançamento${n !== 1 ? "s" : ""} removido${n !== 1 ? "s" : ""}.`);
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
          <div className="fin-nome" style={{ fontWeight:700, fontSize:15 }}>Financeiro</div>
          <div role="tablist" aria-label="Empresa ou pessoal" style={{ display:"inline-flex", background:P.lilasClaro, borderRadius:100, padding:3 }}>
            {Object.entries(ESPACOS).map(([k, e]) => (
              <button key={k} role="tab" aria-selected={espaco === k} onClick={() => { setEspaco(k); setSel(new Set()); }}
                style={{ border:"none", cursor:"pointer", fontFamily:FONT, fontSize:12, padding:"5px 13px", borderRadius:100, whiteSpace:"nowrap",
                  background: espaco === k ? P.papel : "transparent", color: espaco === k ? P.roxo : P.suave, fontWeight: espaco === k ? 800 : 600,
                  boxShadow: espaco === k ? "0 1px 3px rgba(59,28,126,.15)" : "none" }}>{e.icone} {e.nome}</button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4, marginLeft:4 }}>
            <button onClick={() => setAno(a => a - 1)} style={{ border:"none", background:"none", cursor:"pointer", color:P.suave, fontSize:14, padding:4 }}>‹</button>
            <span style={{ fontWeight:800, fontSize:15, color:P.roxo }}>{ano}</span>
            <button onClick={() => setAno(a => a + 1)} style={{ border:"none", background:"none", cursor:"pointer", color:P.suave, fontSize:14, padding:4 }}>›</button>
          </div>
          {(() => {
            const hora = d => d ? " às " + d.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" }) : "";
            const st = !salvo.ok ? ["#FFF0F0", P.vermelho, "⚠ Não foi salvo", "O navegador não deixou salvar. Não use janela anônima."]
              : nuvem.estado === "ok" ? ["#EEF8F0", P.verde, `☁ Sincronizado${hora(nuvem.quando)}`, "Salvo na nuvem: aparece igual no computador e no iPad"]
              : nuvem.estado === "sem" ? ["#FFF6E5", "#A85A00", "⚠ Nuvem não conectada", "Por enquanto salvo só neste aparelho"]
              : nuvem.estado === "erro" ? ["#FFF6E5", "#A85A00", "⚠ Sem conexão", "Salvo neste aparelho; sincroniza sozinho quando a internet voltar"]
              : [P.lilasClaro, P.roxo, "☁ Sincronizando…", "Enviando para a nuvem"];
            return <div title={st[3]} style={{ marginLeft:"auto", fontSize:11, fontWeight:700, padding:"5px 10px", borderRadius:100,
              whiteSpace:"nowrap", background:st[0], color:st[1] }}>{st[2]}</div>;
          })()}
          <button onClick={sair} title="Sair (pede a senha de novo)" style={{ border:`1px solid ${P.lilas}`, background:P.papel,
            color:P.roxo, borderRadius:8, padding:"6px 10px", fontFamily:FONT, fontSize:12, fontWeight:700, cursor:"pointer" }}>🔒 Sair</button>
        </div>
        {/* abas como no Google Planilhas */}
        <div className="fin-tabs" style={{ display:"flex", overflowX:"auto", background:"#EFEBF8", padding:"0 8px", maxWidth:"100%" }}>
          <button onClick={() => setAba("geral")} style={tab(aba === "geral")}>Geral</button>
          {MESES.map((m, i) => <button key={m} onClick={() => setAba(i)} style={tab(aba === i)}>{m}</button>)}
        </div>
      </div>

      <div style={{ padding:"18px 16px 60px", maxWidth:1380, margin:"0 auto" }}>
        {/* faixa do mês + ações */}
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:14 }}>
          <div style={{ background: pessoal ? "#5B2BA6" : P.roxo, color:"#fff", borderRadius:10, padding:"10px 22px", fontWeight:900, fontSize:16,
            letterSpacing:".1em", textTransform:"uppercase" }}>{titulo}{pessoal ? " · Pessoal" : ""}</div>
          <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap" }}>
            <Btn primary onClick={() => fileRef.current?.click()} disabled={reading}>{reading ? "⏳ Lendo..." : "📸 Enviar prints"}</Btn>
          </div>
        </div>

        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => handleFiles(e.target.files)}/>
        <div onClick={() => !reading && fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
          style={{ border:`2px dashed ${drag ? P.roxo2 : P.lilas}`, background: drag ? P.lilasClaro : P.papel, borderRadius:12,
            padding:"14px 16px", textAlign:"center", cursor:"pointer", marginBottom:12, fontSize:12, color:P.suave }}>
          <b style={{ color:P.roxo }}>{reading ? "Analisando prints..." : "Arraste os prints aqui"}</b> · PIX, comprovantes, extratos, faturas · {pessoal ? "a IA separa em Fixos, Casa e Parcelas e extras" : "a IA separa em Fixos, Variáveis, Parcelas e Receitas"}
        </div>

        {msg && (
          <div style={{ fontSize:12, padding:"10px 14px", borderRadius:10, marginBottom:14, wordBreak:"break-word",
            background: msg.startsWith("⚠️") ? "#FFF0F0" : msg.startsWith("🔎") ? P.lilasClaro : "#EEF8F0", color: msg.startsWith("⚠️") ? P.vermelho : msg.startsWith("🔎") ? P.roxo : P.verde,
            border:`1px solid ${msg.startsWith("⚠️") ? "#F5C6C6" : "#C8E6CF"}`, display:"flex", gap:10, alignItems:"flex-start" }}>
            <span style={{ flex:1 }}>{msg}</span>
            <button onClick={() => setMsg("")} style={{ border:"none", background:"none", cursor:"pointer", color:"inherit" }}>✕</button>
          </div>
        )}

        {historico.length > 0 && (
          <details style={{ background:P.papel, border:`1px solid ${P.linha}`, borderRadius:12, marginBottom:14, fontSize:12 }}>
            <summary style={{ padding:"10px 14px", cursor:"pointer", fontWeight:700, color:P.roxo }}>
              🕘 Conferir importações ({historico.length}) — veja o que foi salvo e onde
            </summary>
            <div style={{ padding:"0 14px 10px" }}>
              {historico.map(h => {
                const existem = rows.filter(r => h.ids.includes(r.id)).length;
                return (
                  <div key={h.id} style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", padding:"8px 0", borderTop:`1px solid ${P.linha}` }}>
                    <span style={{ color:P.suave, minWidth:110 }}>{new Date(h.quando).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })}</span>
                    <span style={{ flex:1, color:P.tinta }}>{h.onde || `${h.ids.length} lançamentos`}</span>
                    <span style={{ fontWeight:700, color: existem === h.ids.length ? P.verde : P.laranja }}>
                      {existem === h.ids.length ? `✓ ${existem} salvos` : `${existem} de ${h.ids.length} ainda salvos`}
                    </span>
                    <button onClick={() => verImportacao(h)} style={{ border:`1px solid ${P.lilas}`, background:P.papel, color:P.roxo, borderRadius:8,
                      padding:"3px 10px", fontFamily:FONT, fontSize:11, fontWeight:700, cursor:"pointer" }}>👁 Ver</button>
                    <button onClick={() => desfazerImportacao(h)} disabled={!existem} style={{ border:`1px solid #F5C6C6`, background:P.papel, color:P.vermelho, borderRadius:8,
                      padding:"3px 10px", fontFamily:FONT, fontSize:11, fontWeight:700, cursor: existem ? "pointer" : "default", opacity: existem ? 1 : .4 }}>↩ Desfazer</button>
                  </div>
                );
              })}
            </div>
          </details>
        )}

        {/* revisão do que a IA leu */}
        {review.length > 0 && (
          <div style={{ background:P.papel, border:`2px solid ${P.roxo2}`, borderRadius:12, marginBottom:20, overflow:"hidden" }}>
            <div style={{ background:P.roxo2, color:"#fff", padding:"9px 14px", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <b style={{ fontSize:12, letterSpacing:".06em", textTransform:"uppercase" }}>🔎 Confira o que a IA leu ({review.length})</b>
              <div style={{ marginLeft:"auto", display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                <select value="" onChange={e => { const v = e.target.value; if (v) setReview(rv => rv.map(r => normalize({ ...r, mes:v }))); }}
                  style={{ background:"rgba(255,255,255,.14)", border:"1px solid rgba(255,255,255,.22)", color:"#fff", borderRadius:8,
                    padding:"4px 8px", fontFamily:FONT, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                  <option value="" style={{ color:P.tinta }}>📅 Mudar mês de todos…</option>
                  {MESES.map((m, i) => <option key={m} value={mesKey(ano, i)} style={{ color:P.tinta }}>{m} {ano}</option>)}
                </select>
                <HeadBtn onClick={() => setReview(rv => rv.map(r => trocarLado(r, "empresa")))}>🏢 Tudo Empresa</HeadBtn>
                <HeadBtn onClick={() => setReview(rv => rv.map(r => trocarLado(r, "pessoal")))}>🏠 Tudo Pessoal</HeadBtn>
                <HeadBtn onClick={() => setReview([])}>Descartar</HeadBtn>
                <button onClick={confirmar} style={{ background:"#fff", color:P.roxo, border:"none", borderRadius:8, padding:"5px 12px",
                  fontFamily:FONT, fontSize:11, fontWeight:800, cursor:"pointer" }}>✓ Salvar lançamentos</button>
              </div>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ borderCollapse:"collapse", width:"100%", minWidth:900, fontFamily:FONT }}>
                <thead><tr>
                  {["De quem","Seção","Mês","Dia","Descrição","Valor","Forma de pag.","Status","Categoria / Serviço",""].map((h, i) =>
                    <th key={i} style={{ background:P.lilas, fontSize:11, fontWeight:700, padding:"6px 8px", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {review.map(r => {
                    const set = patch => setReview(rv => rv.map(x => x.id === r.id ? normalize({ ...x, ...patch }) : x));
                    const lado = espacoDe(r.secao);
                    const td = { borderBottom:`1px solid ${P.linha}`, padding:0, ...(lado === "pessoal" ? { background:"#FFF2F7" } : {}) };
                    const pilula = (k, on, cor) => (
                      <button key={k} onClick={() => setReview(rv => rv.map(x => x.id === r.id ? trocarLado(x, k) : x))}
                        disabled={!on && !PARA_LADO[k][r.secao]} aria-pressed={on}
                        title={!on && !PARA_LADO[k][r.secao] ? "Receitas ficam só na Empresa" : undefined}
                        style={{ border:"none", borderRadius:999, padding:"4px 9px", fontFamily:FONT, fontSize:11, fontWeight:700, whiteSpace:"nowrap",
                          background: on ? cor : "transparent", color: on ? "#fff" : P.suave,
                          cursor: on || !PARA_LADO[k][r.secao] ? "default" : "pointer", opacity: !on && !PARA_LADO[k][r.secao] ? .4 : 1 }}>
                        {ESPACOS[k].icone}<span className="fin-nome"> {ESPACOS[k].nome}</span>
                      </button>
                    );
                    return (
                      <tr key={r.id} className="fin-row">
                        <td style={{ ...td, padding:"3px 6px" }}>
                          <div style={{ display:"inline-flex", background:"#EEE8FB", borderRadius:999, padding:2, gap:2 }}>
                            {pilula("empresa", lado === "empresa", P.roxo)}{pilula("pessoal", lado === "pessoal", "#D9578A")}
                          </div>
                        </td>
                        <td style={td}>
                          <select className="fin-cell" value={r.secao} onChange={e => set({ secao:e.target.value, ...(espacoDe(e.target.value) !== lado ? { categoria:"" } : {}) })}
                            style={{ ...cellBase, fontWeight:700, color:P.roxo, cursor:"pointer" }}>
                            {Object.entries(ESPACOS).map(([k, e]) => (
                              <optgroup key={k} label={`${e.icone} ${e.nome}`}>
                                {e.secoes.map(x => <option key={x} value={x}>{SECTIONS[x].title}</option>)}
                              </optgroup>
                            ))}
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
                          {r.secao === "p_casa" && <ChipSelect field="classeCasa" value={r.classeCasa} onChange={v => set({ classeCasa:v })}/>}
                          {r.secao === "p_extra" && <ChipSelect field="classeExtra" value={r.classeExtra} onChange={v => set({ classeExtra:v })}/>}
                          {r.secao !== "receita" && <CatSelect value={r.categoria} espaco={espacoDe(r.secao)} onChange={v => set({ categoria:v })}/>}
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
            <div style={{ padding:"9px 14px", background:"#F7F4FD", fontSize:12, display:"flex", gap:20, flexWrap:"wrap" }}>
              {Object.entries(ESPACOS).map(([k, e]) => {
                const rs = review.filter(r => espacoDe(r.secao) === k);
                return <span key={k}>{e.icone} <b>{e.nome}:</b> {rs.length} lançamento{rs.length !== 1 ? "s" : ""} · {brl(rs.reduce((t, r) => t + r.valor, 0))}</span>;
              })}
            </div>
          </div>
        )}

        {aba === "geral" ? (pessoal ? <GeralPessoal rows={rowsEsp} ano={ano} onPick={setAba}/> : <Geral rows={rowsEsp} ano={ano} onPick={setAba}/>) : pessoal ? (
          <MesPessoal {...{ ano, aba, mes, bySec, analise, edit, add, remove, sortDia, copiar, sel, toggleSel, toggleAll, destaque, puxarFixos, setAno, setAba,
            mudarGrupo: (id, g) => edit(id, { categoria:g }) }}/>
        ) : (
          <>
            <div className="fin-kpis">
              <KpiLinha label="Receitas" value={brl(resumo.receitas)}
                variacao={<Variacao atual={resumo.receitas} anterior={analise.tAnt.receitas}/>}
                serie={analise.serie.map(d => d.receitas)} corLinha={P.verde}/>
              <KpiLinha label="Gastos" value={brl(resumo.gastos)}
                variacao={<Variacao atual={resumo.gastos} anterior={analise.tAnt.gastos} bomSubir={false}/>}
                sub={resumo.receitas ? <>fixos = <b style={{ color:P.tinta }}>{(resumo.fixos / resumo.receitas * 100).toFixed(0)}%</b> do que entrou</> : null}
                serie={analise.serie.map(d => d.gastos)} corLinha={P.vermelho}/>
              <KpiLinha label="Lucro do mês" value={brl(resumo.saldo)} cor={resumo.saldo >= 0 ? P.verde : P.vermelho}
                variacao={<Variacao atual={resumo.saldo} anterior={analise.tAnt.receitas - analise.tAnt.gastos}/>}
                sub={resumo.receitas ? `sobra ${Math.max(0, resumo.saldo / resumo.receitas * 100).toFixed(0)}% do que entrou` : null}
                serie={analise.serie.map(d => d.receitas - d.gastos)} corLinha={P.roxo2}/>
              <KpiLinha label="Falta pagar" value={brl(resumo.naoPago)} cor={resumo.naoPago ? P.vermelho : P.tinta}
                variacao={<span style={{ fontSize:10.5, fontWeight:700, color:P.tinta }}>
                  {analise.abertos.length ? `${analise.abertos.length} conta${analise.abertos.length > 1 ? "s" : ""}` : "Tudo pago ✓"}
                  {analise.proxima ? ` · próxima: ${analise.proxima.descricao || "sem nome"} dia ${analise.proxima.dia}` : ""}</span>}
                sub={resumo.receitas - resumo.recebido > 0 ? `a receber: ${brl(resumo.receitas - resumo.recebido)}` : null}/>
            </div>

            <Avisos avisos={analise.avisos}/>

            <div className="fin-2col">
              <Section secao="fixo" rows={bySec("fixo")} onEdit={edit} onAdd={() => add("fixo")} onRemove={remove}
                onSortDia={sortDia} onCopy={() => copiar("fixo")} sel={sel} onToggle={toggleSel} onToggleAll={toggleAll} destaque={destaque}
                extra={<HeadBtn onClick={() => puxarFixos("fixo")} title="Copia os gastos fixos do mês anterior">↻ Puxar do mês anterior</HeadBtn>}/>
              <Section secao="receita" rows={bySec("receita")} onEdit={edit} onAdd={() => add("receita")} onRemove={remove}
                onSortDia={sortDia} onCopy={() => copiar("receita")} sel={sel} onToggle={toggleSel} onToggleAll={toggleAll} destaque={destaque}/>
            </div>
            <div className="fin-2col" style={{ marginTop:14 }}>
              {["variavel", "extra"].map(s => (
                <Section key={s} secao={s} rows={bySec(s)} onEdit={edit} onAdd={() => add(s)} onRemove={remove}
                  onSortDia={sortDia} onCopy={() => copiar(s)} sel={sel} onToggle={toggleSel} onToggleAll={toggleAll} destaque={destaque}/>
              ))}
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:10, margin:"26px 0 12px" }}>
              <span style={{ fontSize:13, fontWeight:900, color:P.roxo, letterSpacing:".08em", textTransform:"uppercase" }}>📈 Análise do mês</span>
              <span style={{ flex:1, height:1, background:P.lilas }}/>
            </div>
            <div className="fin-2col">
              <ParaOndeFoi key={mes} rows={analise.gastosMes} anteriores={analise.anteriores} compararCom={analise.nomeAnt}/>
              <div style={{ display:"flex", flexDirection:"column", gap:14, minWidth:0 }}>
                <UltimosMeses serie={analise.serie} onPick={m => { const d = analise.serie.find(x => x.mes === m); if (d) { setAno(d.ano); setAba(d.mes); } }}/>
                <DeOndeVem receitas={bySec("receita")}/>
              </div>
            </div>
            <div style={{ marginTop:14 }}>
              <Vencimentos gastos={analise.gastosMes} ano={ano} mesIdx={aba} hojeDia={analise.hojeDia}/>
            </div>
          </>
        )}

        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginTop:24, fontSize:11, color:P.suave }}>
          <span>{nuvem.estado === "ok" ? "Os dados ficam salvos na nuvem e sincronizam entre os seus aparelhos." : "Os dados ficam salvos neste navegador."}</span>
          <Btn onClick={() => downloadFile(`backup-financeiro-${hojeISO()}.json`, JSON.stringify(rows, null, 2), "application/json")}
            style={{ padding:"6px 12px", fontSize:11 }}>Fazer backup</Btn>
          <Btn onClick={() => backupRef.current?.click()} style={{ padding:"6px 12px", fontSize:11 }}>Restaurar backup</Btn>
          <input ref={backupRef} type="file" accept="application/json" hidden
            onChange={e => { e.target.files[0] && importBackup(e.target.files[0]); e.target.value = ""; }}/>
        </div>
      </div>

      {selecionados.length > 0 && (
        <div style={{ position:"fixed", left:12, right:12, bottom:12, margin:"0 auto", width:"fit-content", zIndex:20,
          background:P.roxo, color:"#fff", borderRadius:14, padding:"10px 12px 10px 16px", display:"flex", alignItems:"center", gap:7, justifyContent:"center",
          flexWrap:"wrap", boxShadow:"0 10px 30px rgba(59,28,126,.35)", fontSize:13 }}>
          <b style={{ marginRight:6 }}>{selecionados.length} selecionado{selecionados.length > 1 ? "s" : ""}</b>
          <button onClick={() => copiarLinhas(selecionados)} style={{ background:"#fff", color:P.roxo, border:"none", borderRadius:9,
            padding:"7px 12px", fontFamily:FONT, fontSize:12, fontWeight:800, cursor:"pointer" }}>📋 Copiar</button>
          <SelLote rotulo="↪ Mover para" onPick={moverPara}>
            {Object.entries(ESPACOS).map(([k, e]) => (
              <optgroup key={k} label={`${e.icone} ${e.nome}`}>
                {e.secoes.map(s => <option key={s} value={s}>{SECTIONS[s].title}</option>)}
              </optgroup>
            ))}
          </SelLote>
          <SelLote rotulo="💳 Forma" onPick={v => { const f = v === NOVA_CAT ? pedirNovaOpcao("forma") : v;
              if (f) emLote(() => ({ forma:f }), `Forma de pagamento → ${f}`); }}>
            {opcoesChip("forma").map(f => <option key={f} value={f}>{f}</option>)}
            <option value={NOVA_CAT}>＋ Nova forma…</option>
          </SelLote>
          <SelLote rotulo="✓ Status" onPick={v => emLote(() => ({ status:v }), `Status → ${v === "pago" ? "Pago" : "Não pago"}`)}>
            <option value="pago">Pago</option><option value="nao_pago">Não pago</option>
          </SelLote>
          {listaCatLote && (
            <SelLote rotulo="🏷 Categoria" onPick={v => { const c = v === NOVA_CAT ? pedirNovaCategoria(espLote) : v;
                if (c) emLote(r => r.secao === "receita" ? {} : { categoria:c }, `Categoria → ${c}`); }}>
              {listaCatLote.map(c => <option key={c} value={c}>{c}</option>)}
              <option value={NOVA_CAT}>＋ Nova categoria…</option>
            </SelLote>
          )}
          <button onClick={excluirSelecionados} style={{ background:"#FFE3E3", color:P.vermelho, border:"none", borderRadius:9,
            padding:"7px 12px", fontFamily:FONT, fontSize:12, fontWeight:800, cursor:"pointer" }}>🗑 Excluir</button>
          <button onClick={concluir} title="Termina e desmarca tudo (Esc)" style={{ background:"#1E9E4A", color:"#fff", border:"none",
            borderRadius:9, padding:"7px 16px", fontFamily:FONT, fontSize:13, fontWeight:800, cursor:"pointer" }}>✓ Concluir</button>
        </div>
      )}
    </div>
  );
}

// Botão da barra de selecionados que abre uma lista (select nativo: funciona bem no iPad)
function SelLote({ rotulo, onPick, children }) {
  return (
    <label style={{ position:"relative", background:"#fff", color:P.roxo, borderRadius:9, padding:"7px 12px", fontFamily:FONT,
      fontSize:12, fontWeight:800, cursor:"pointer", whiteSpace:"nowrap" }}>
      {rotulo} ▾
      <select value="" aria-label={rotulo.replace(/^\S+\s/, "")} onChange={e => { if (e.target.value) onPick(e.target.value); e.target.value = ""; }}
        style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer", width:"100%", fontSize:16 }}>
        <option value="" disabled>{rotulo.replace(/^\S+\s/, "")}…</option>
        {children}
      </select>
    </label>
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
