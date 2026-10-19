// Dados do financeiro na nuvem (Upstash Redis, conectado pelo painel da Vercel).
// Cada aparelho manda o que tem; o servidor junta com o que está guardado e devolve tudo.
// Required env vars: VITE_APP=financeiro, FIN_SENHA e (KV_REST_API_URL + KV_REST_API_TOKEN)
//   ou (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
import { bloquear } from "./fin-auth.js";
import { juntar } from "./_fin-merge.js";

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const ANOS = "fin:anos", APAGADOS = "fin:apagados", ano = a => `fin:ano:${a}`;

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

async function lerTudo() {
  const [anosTxt, apagTxt] = await redis([["GET", ANOS], ["GET", APAGADOS]]);
  const anos = ler(anosTxt) || [];
  const partes = anos.length ? await redis(anos.map(a => ["GET", ano(a)])) : [];
  return { rows: partes.flatMap(p => ler(p) || []), apagados: ler(apagTxt) || [] };
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
    const junto = juntar(nuvem, chegou);
    if (JSON.stringify(junto) !== JSON.stringify(nuvem)) await gravar(junto);
    return res.status(200).json({ ...junto, quando: Date.now() });
  } catch (e) {
    return res.status(502).json({ error: "Falha ao falar com a nuvem: " + (e.message || String(e)) });
  }
}
