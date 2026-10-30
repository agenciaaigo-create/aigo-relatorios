// Dados do financeiro na nuvem (Upstash Redis, conectado pelo painel da Vercel).
// Cada aparelho manda o que tem; o servidor junta com o que está guardado e devolve tudo.
// Required env vars: VITE_APP=financeiro, FIN_SENHA e (KV_REST_API_URL + KV_REST_API_TOKEN)
//   ou STORAGE_REST_API_* ou UPSTASH_REDIS_REST_*
import { bloquear } from "./fin-auth.js";
import { juntar } from "./_fin-merge.js";

// Aceita o prefixo escolhido ao conectar o banco na Vercel (KV, STORAGE ou o padrão do Upstash)
const URL_ = process.env.KV_REST_API_URL || process.env.STORAGE_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.STORAGE_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const ANOS = "fin:anos", APAGADOS = "fin:apagados", CORES = "fin:cores", CLIENTES = "fin:clientes", INVEST = "fin:invest", ano = a => `fin:ano:${a}`;

// Investimentos: { id: {...campos simples, upd, apagado} } (investimentos, movimentações e "_meta"). Vale a versão mais recente.
const CAMPOS_TXT = ["nome", "instituicao", "tipo", "ticker", "dataBase", "inv", "data", "info", "kind", "mov"];
const CAMPOS_NUM = ["pct", "qtd", "custo", "saldo", "liq", "meta", "ord", "upd", "valor"];
function juntarInvest(a = {}, b = {}) {
  const out = { ...a };
  for (const [id, v] of Object.entries(b || {})) {
    if (!v || typeof v !== "object" || typeof id !== "string" || id.length > 80) continue;
    const limpo = {};
    CAMPOS_TXT.forEach(k => { if (typeof v[k] === "string") limpo[k] = v[k].slice(0, 120); });
    CAMPOS_NUM.forEach(k => { if (v[k] != null && isFinite(Number(v[k]))) limpo[k] = Number(v[k]); });
    if (v.apagado) limpo.apagado = true;
    limpo.upd = Number(v.upd) || 0;
    if (!out[id] || limpo.upd > (Number(out[id].upd) || 0)) out[id] = limpo;
  }
  return out;
}

// Cores escolhidas para as categorias: { "empresa|Investimentos": { cor:"#c2185b", upd:123 } }
// Por categoria, fica a escolha mais recente (cor null = voltou à cor original).
function juntarCores(a = {}, b = {}) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b || {})) {
    if (!v || typeof v !== "object" || typeof k !== "string" || k.length > 200) continue;
    const cor = v.cor === null || /^#[0-9a-fA-F]{6}$/.test(v.cor || "") ? v.cor : undefined;
    if (cor === undefined) continue;
    if (!out[k] || (Number(v.upd) || 0) > (Number(out[k].upd) || 0)) out[k] = { cor, upd: Number(v.upd) || 0 };
  }
  return out;
}

async function redis(comandos) {
  const r = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(comandos),
  });
  if (!r.ok) throw new Error(`Banco de dados respondeu ${r.status}`);
  const out = await r.json();
  const erro = out.find(x => x && x.error);
  if (erro) throw new Error(erro.error);
  return out.map(x => x.result);
}
const ler = v => { try { return v ? JSON.parse(v) : null; } catch { return null; } };

// Clientes (aba Geral): { id: { nome, servico, valor, inicio, info, ord, upd, apagado } } e "_meta": { valor, upd }.
// Por cliente, fica a versão mais recente (apagado:true = removido).
const txt = (v, n) => typeof v === "string" ? v.slice(0, n) : "";
function juntarClientes(a = {}, b = {}) {
  const out = { ...a };
  for (const [id, v] of Object.entries(b || {})) {
    if (!v || typeof v !== "object" || typeof id !== "string" || id.length > 80) continue;
    const limpo = id === "_meta" ? { valor: Number(v.valor) || 0, upd: Number(v.upd) || 0 }
      : { nome: txt(v.nome, 120), servico: txt(v.servico, 60), valor: Number(v.valor) || 0, inicio: txt(v.inicio, 10),
          info: txt(v.info, 200), pago: txt(v.pago, 7), ord: Number(v.ord) || 0, upd: Number(v.upd) || 0, ...(v.apagado ? { apagado: true } : {}) };
    if (!out[id] || limpo.upd > (Number(out[id].upd) || 0)) out[id] = limpo;
  }
  return out;
}

async function lerTudo() {
  const [anosTxt, apagTxt, coresTxt, clientesTxt, investTxt] = await redis([["GET", ANOS], ["GET", APAGADOS], ["GET", CORES], ["GET", CLIENTES], ["GET", INVEST]]);
  const anos = ler(anosTxt) || [];
  const partes = anos.length ? await redis(anos.map(a => ["GET", ano(a)])) : [];
  return { rows: partes.flatMap(p => ler(p) || []), apagados: ler(apagTxt) || [], cores: ler(coresTxt) || {}, clientes: ler(clientesTxt) || {}, invest: ler(investTxt) || {} };
}

async function gravar({ rows, apagados }) {
  const porAno = {};
  for (const r of rows) { const a = String(r.mes || "").slice(0, 4) || "sem-ano"; (porAno[a] = porAno[a] || []).push(r); }
  const anos = Object.keys(porAno).sort();
  await redis([
    ...anos.map(a => ["SET", ano(a), JSON.stringify(porAno[a])]),
    ["SET", ANOS, JSON.stringify(anos)],
    ["SET", APAGADOS, JSON.stringify(apagados)],
  ]);
}

async function lerCorpo(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const raw = await new Promise((resolve, reject) => {
    let d = ""; req.on("data", c => { d += c; }); req.on("end", () => resolve(d)); req.on("error", reject);
  });
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (bloquear(req, res, req.headers["x-fin-senha"])) return;
  if (!URL_ || !TOKEN) return res.status(503).json({ error: "Nuvem ainda não conectada", semNuvem: true });
  try {
    const corpo = await lerCorpo(req);
    const chegou = { rows: Array.isArray(corpo.rows) ? corpo.rows : [], apagados: Array.isArray(corpo.apagados) ? corpo.apagados : [] };
    const nuvem = await lerTudo();
    const { cores: coresNuvem, clientes: clientesNuvem, invest: investNuvem, ...dadosNuvem } = nuvem;
    const junto = juntar(dadosNuvem, chegou);
    if (JSON.stringify(junto) !== JSON.stringify(dadosNuvem)) await gravar(junto);
    const cores = juntarCores(coresNuvem, corpo.cores && typeof corpo.cores === "object" ? corpo.cores : {});
    if (JSON.stringify(cores) !== JSON.stringify(coresNuvem)) await redis([["SET", CORES, JSON.stringify(cores)]]);
    const clientes = juntarClientes(clientesNuvem, corpo.clientes && typeof corpo.clientes === "object" ? corpo.clientes : {});
    if (JSON.stringify(clientes) !== JSON.stringify(clientesNuvem)) await redis([["SET", CLIENTES, JSON.stringify(clientes)]]);
    const invest = juntarInvest(investNuvem, corpo.invest && typeof corpo.invest === "object" ? corpo.invest : {});
    if (JSON.stringify(invest) !== JSON.stringify(investNuvem)) await redis([["SET", INVEST, JSON.stringify(invest)]]);
    return res.status(200).json({ ...junto, cores, clientes, invest, quando: Date.now() });
  } catch (e) {
    return res.status(502).json({ error: "Falha ao falar com a nuvem: " + (e.message || String(e)) });
  }
}
