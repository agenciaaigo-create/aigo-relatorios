// Junta os lançamentos que chegam de um aparelho com os que já estão na nuvem.
// Arquivo com "_" na frente: a Vercel não publica como rota, é só usado por fin-dados.js.

const DIA = 24 * 60 * 60 * 1000;

// Mesmo lançamento digitado em dois aparelhos (mesmo mês, seção, dia, descrição e valor)
const chave = r => [r.mes, r.secao, r.dia, String(r.descricao || "").trim().toLowerCase(), (Number(r.valor) || 0).toFixed(2)].join("|");

/**
 * nuvem/chegou: { rows: [...], apagados: [{ id, upd }] }
 * Regras:
 * - por id, fica a versão com "upd" (hora da última alteração) mais recente;
 * - um apagamento mais novo que a linha remove a linha (e vale para os outros aparelhos);
 * - linhas iguais vindas de aparelhos diferentes viram uma só (a mais antiga fica).
 */
export function juntar(nuvem, chegou, agora = Date.now()) {
  const apagados = new Map();
  for (const a of [...(nuvem.apagados || []), ...(chegou.apagados || [])]) {
    if (!a || !a.id) continue;
    if (!apagados.has(a.id) || apagados.get(a.id) < (a.upd || 0)) apagados.set(a.id, a.upd || 0);
  }
  const porId = new Map();
  for (const r of [...(nuvem.rows || []), ...(chegou.rows || [])]) {
    if (!r || !r.id) continue;
    const atual = porId.get(r.id);
    if (!atual || (r.upd || 0) > (atual.upd || 0)) porId.set(r.id, r);
  }
  for (const [id, upd] of apagados) {
    const r = porId.get(id);
    if (r && upd >= (r.upd || 0)) porId.delete(id);
  }
  // duplicados entre aparelhos
  const vistos = new Map();
  for (const r of [...porId.values()].sort((a, b) => (a.upd || 0) - (b.upd || 0) || String(a.id).localeCompare(String(b.id)))) {
    if (!String(r.descricao || "").trim() || !(Number(r.valor) > 0)) continue;
    const k = chave(r), primeiro = vistos.get(k);
    if (!primeiro) { vistos.set(k, r); continue; }
    if ((primeiro.disp || "") !== (r.disp || "")) {
      porId.delete(r.id);
      apagados.set(r.id, Math.max(r.upd || 0, agora));
    }
  }
  // apagamentos com mais de 1 ano já foram vistos por todos os aparelhos
  const limite = agora - 365 * DIA;
  return {
    rows: [...porId.values()],
    apagados: [...apagados].filter(([, upd]) => upd > limite || upd === 0).map(([id, upd]) => ({ id, upd })),
  };
}
