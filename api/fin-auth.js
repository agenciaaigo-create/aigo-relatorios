// Confere a senha do financeiro (só existe no site separado, com VITE_APP=financeiro)
// Required env vars: VITE_APP=financeiro, FIN_SENHA
import { timingSafeEqual } from "node:crypto";

export function senhaOk(senha) {
  const certa = process.env.FIN_SENHA || "";
  const a = Buffer.from(String(senha || ""));
  const b = Buffer.from(certa);
  return certa.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

// Devolve uma mensagem de erro (e já responde) se o acesso não for permitido
export function bloquear(req, res, senha) {
  if (process.env.VITE_APP !== "financeiro") { res.status(404).json({ error: "Não encontrado" }); return true; }
  if (!process.env.FIN_SENHA) { res.status(500).json({ error: "Configure a variável FIN_SENHA na Vercel" }); return true; }
  if (!senhaOk(senha)) { res.status(401).json({ error: "Senha incorreta" }); return true; }
  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const senha = req.body && typeof req.body === "object" ? req.body.senha : "";
  if (bloquear(req, res, senha)) return;
  return res.status(200).json({ ok: true });
}
