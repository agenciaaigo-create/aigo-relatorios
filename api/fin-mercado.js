// Dados de mercado para a aba Investimentos (só dados públicos, nada da Dani):
// - CDI diário oficial do Banco Central (série SGS 12, % ao dia útil)
// - Cotação e histórico das ações da B3 (Yahoo Finance; se falhar, brapi.dev)
// GET /api/fin-mercado?desde=AAAA-MM-DD&tickers=BBAS3,PETR4
// Required env var: VITE_APP=financeiro. Opcional: BRAPI_TOKEN.

const cache = new Map();   // guarda as respostas por 20 minutos (por instância)
const MIN20 = 20 * 60 * 1000;

async function buscar(url, opts = {}) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (aigo-financeiro)", Accept: "application/json" }, ...opts });
  if (!r.ok) throw new Error(`${new URL(url).host} respondeu ${r.status}`);
  return r.json();
}
async function comCache(chave, fn) {
  const c = cache.get(chave);
  if (c && Date.now() - c.t < MIN20) return c.v;
  const v = await fn();
  cache.set(chave, { t: Date.now(), v });
  return v;
}
const br = iso => iso.split("-").reverse().join("/");

async function cdi(desde) {
  const hoje = new Date().toISOString().slice(0, 10);
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=${br(desde)}&dataFinal=${br(hoje)}`;
  const out = await buscar(url);
  return out.map(x => ({ data: x.data.split("/").reverse().join("-"), taxa: Number(x.valor) })).filter(x => x.taxa >= 0);
}

async function acaoYahoo(t, desde) {
  const p1 = Math.floor(new Date(desde + "T00:00:00Z").getTime() / 1000) - 7 * 86400, p2 = Math.floor(Date.now() / 1000) + 86400;
  const j = await buscar(`https://query1.finance.yahoo.com/v8/finance/chart/${t}.SA?period1=${p1}&period2=${p2}&interval=1d`);
  const r = j?.chart?.result?.[0];
  if (!r) throw new Error("sem dados");
  const ts = r.timestamp || [], cl = r.indicators?.quote?.[0]?.close || [];
  const hist = ts.map((s, i) => [new Date((s - 3 * 3600) * 1000).toISOString().slice(0, 10), cl[i]]).filter(([, c]) => c != null)
    .map(([d, c]) => [d, Math.round(c * 100) / 100]);
  // fechamento do pregão anterior (o último dia do histórico pode ser hoje)
  const hojeBR = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  const ant = hist.length ? (hist[hist.length - 1][0] === hojeBR ? hist[hist.length - 2]?.[1] : hist[hist.length - 1][1]) : null;
  return { preco: r.meta.regularMarketPrice, anterior: ant ?? null,
    hora: r.meta.regularMarketTime ? new Date(r.meta.regularMarketTime * 1000).toISOString() : null, hist, fonte: "Yahoo Finance" };
}
async function acaoBrapi(t, desde) {
  const tok = process.env.BRAPI_TOKEN ? `&token=${process.env.BRAPI_TOKEN}` : "";
  const j = await buscar(`https://brapi.dev/api/quote/${t}?range=3mo&interval=1d${tok}`);
  const r = j?.results?.[0];
  if (!r) throw new Error("sem dados");
  const hist = (r.historicalDataPrice || []).map(h => [new Date(h.date * 1000).toISOString().slice(0, 10), h.close])
    .filter(([d, c]) => c != null && d >= desde);
  return { preco: r.regularMarketPrice, anterior: r.regularMarketPreviousClose ?? null, hora: r.regularMarketTime || null, hist, fonte: "brapi.dev" };
}

export default async function handler(req, res) {
  if (process.env.VITE_APP !== "financeiro") return res.status(404).json({ error: "Not found" });
  const url = new URL(req.url, "http://x");
  const desde = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("desde") || "") ? url.searchParams.get("desde") : new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10);
  const tickers = (url.searchParams.get("tickers") || "").toUpperCase().split(",").map(s => s.trim()).filter(t => /^[A-Z]{4}\d{1,2}$/.test(t)).slice(0, 20);
  const out = { cdi: [], acoes: {}, erros: [], quando: new Date().toISOString() };
  try { out.cdi = await comCache(`cdi|${desde}`, () => cdi(desde)); } catch (e) { out.erros.push(`CDI: ${e.message}`); }
  await Promise.all(tickers.map(async t => {
    try { out.acoes[t] = await comCache(`${t}|${desde}`, () => acaoYahoo(t, desde).catch(() => acaoBrapi(t, desde))); }
    catch (e) { out.erros.push(`${t}: ${e.message}`); }
  }));
  res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
  return res.status(200).json(out);
}
