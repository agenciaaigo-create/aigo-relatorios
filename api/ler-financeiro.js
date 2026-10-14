// Lê prints de comprovantes / extratos / PIX / notas e devolve uma lista de lançamentos
// Required env var: ANTHROPIC_KEY

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const raw = await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
  return JSON.parse(raw);
}

function buildPrompt({ hoje, clientes, categorias }) {
  return `Você é um assistente financeiro de uma agência de marketing (ai.go). Analise os prints enviados (comprovantes de PIX, transferências, boletos, extratos bancários, faturas de cartão, notas fiscais, recibos) e extraia TODOS os lançamentos financeiros que aparecerem.

Hoje é ${hoje}. Se o print não mostrar o ano, use o ano mais provável considerando a data de hoje.

Para cada lançamento, retorne um objeto com:
- "data": data no formato AAAA-MM-DD (string vazia se não houver)
- "descricao": descrição curta e clara (ex.: "PIX recebido - Coperfarma", "Assinatura Canva", "Meta Ads")
- "tipo": "entrada" se o dinheiro entrou na conta da agência, "saida" se saiu
- "valor": número positivo com ponto decimal, sem símbolo (ex.: 1250.90)
- "categoria": escolha a mais adequada desta lista: ${categorias.join(", ")}
- "cliente": se o lançamento for de/para um destes clientes, use exatamente o nome da lista; senão string vazia. Clientes: ${clientes.join(", ")}
- "forma": uma destas: PIX, Transferência, Boleto, Cartão de crédito, Cartão de débito, Dinheiro, Outro
- "status": "pago" se já foi efetivado, "pendente" se é um boleto/fatura a vencer ou agendamento
- "obs": observação curta útil (ex.: nome do pagador/recebedor, nº do documento) ou string vazia

Regras:
- Em extratos com várias linhas, crie um lançamento por linha. Ignore linhas de saldo.
- Não invente valores. Se não conseguir ler o valor, não inclua o lançamento.
- Não duplique o mesmo lançamento se ele aparecer em mais de um print.

Responda APENAS com um JSON válido, sem markdown, no formato:
{"lancamentos":[{"data":"","descricao":"","tipo":"","valor":0,"categoria":"","cliente":"","forma":"","status":"","obs":""}]}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.ANTHROPIC_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_KEY nao configurada" });
  }

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    return res.status(400).json({ error: "Erro ao ler corpo: " + String(e) });
  }

  const images = Array.isArray(body.images) ? body.images : [];
  if (!images.length) return res.status(400).json({ error: "Nenhuma imagem enviada" });

  const content = [
    ...images.map(data => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } })),
    { type: "text", text: buildPrompt({
      hoje: body.hoje || new Date().toISOString().slice(0, 10),
      clientes: body.clientes || [],
      categorias: body.categorias || [],
    }) },
  ];

  let resp, text;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        messages: [{ role: "user", content }],
      }),
    });
    text = await resp.text();
  } catch (e) {
    return res.status(500).json({ error: "Falha na chamada Anthropic: " + String(e) });
  }

  if (!resp.ok) {
    return res.status(502).json({ error: `Anthropic respondeu com erro ${resp.status}: ${text}` });
  }

  try {
    const json = JSON.parse(text);
    const raw = (json.content || []).map(b => b.text || "").join("");
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    const clean = (match ? match[1] : raw).trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    const parsed = JSON.parse(clean.slice(start, end + 1));
    return res.status(200).json({ lancamentos: parsed.lancamentos || [] });
  } catch (e) {
    return res.status(502).json({ error: "Não consegui interpretar a resposta da IA: " + String(e) });
  }
}
