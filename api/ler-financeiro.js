import { bloquear } from "./fin-auth.js";

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

function buildPrompt({ hoje, mesAberto, clientes, opcoes = {} }) {
  const list = k => (opcoes[k] || []).join(", ");
  return `Você é o assistente financeiro da ai.go (agência de social media e fotografia). Analise os prints enviados (comprovantes de PIX, transferências, boletos, extratos bancários, faturas de cartão, notas, recibos ou prints de PLANILHA/tabela) e extraia TODOS os lançamentos financeiros.

Hoje é ${hoje}. Se o print não mostrar o ano, use o ano mais provável considerando a data de hoje.
O usuário está com o mês ${mesAberto} aberto no sistema. Quando o print mostrar só o dia (sem mês), use esse mês ${mesAberto}.

PRINT DE PLANILHA/TABELA (linhas com colunas como Dia, Descrição/Gastos Fixos, Valor, Forma de pag., Status, Info):
- Copie linha por linha, exatamente como está escrito. Não resuma, não renomeie e não junte linhas.
- "descricao" = o texto da coluna de descrição, igual ao print (ex.: "Alessa Salário", "Google Drive Fotos").
- "data" = ${mesAberto}-DD, usando o número da coluna Dia (com 2 dígitos). IGNORE o nome de mês escrito em títulos/cabeçalhos da planilha.
- "valor" = o valor da coluna Valor, lido com atenção dígito por dígito (formato brasileiro: "R$ 1.599,43" vira 1599.43).
- "status" = copie da coluna Status: "Pago" vira "pago"; "Não pago"/"Não p..." vira "nao_pago".
- "forma" e "info" = copie das colunas correspondentes.
- A seção vem do título acima da tabela: "GASTOS FIXOS" = fixo, "GASTOS VARIÁVEIS" = variavel, "PARCELAS E EXTRAS" = extra, "RECEITAS" = receita.
- Linha sem valor preenchido: inclua mesmo assim com "valor": 0.
- Ignore quadros de totais/resumo (ex.: "PAGOS", "NÃO PAGO") e cabeçalhos.
- Ignore linhas vazias (sem descrição e sem valor), mesmo que tenham só o dia ou só os menus de seleção.
- Um mesmo print pode ter VÁRIAS tabelas (uma embaixo da outra ou lado a lado). Antes de ler cada linha, veja em qual tabela ela está pelo título roxo acima dela e use a seção daquela tabela. A tabela da direita com colunas "80% empresa" / "20% empresa" é RECEITAS.
- Um mesmo nome pode aparecer em duas tabelas (ex.: "Kamilly" em Gastos Fixos e em Gastos Variáveis): são lançamentos diferentes, mantenha cada um na sua seção.
- Em RECEITAS sem descrição preenchida, use "descricao": "" (não invente nome).

Classifique cada lançamento em uma "secao":
- "receita": dinheiro que ENTROU (pagamento de cliente, sinal de ensaio, mensalidade etc.)
- "fixo": gasto fixo mensal (salários, contador, FGTS, INSS, DAS, internet, água, energia, aluguel, assinaturas como Adobe, Canva, Capcut, iCloud, Google Drive, site, pró-labore)
- "extra": compras parceladas, investimentos, viagens, combustível, pedágio, alimentação, mercado, despesas avulsas
- "variavel": outros gastos que variam no mês (anúncios, empréstimo, freelas, consórcio, Facebook Ads etc.)

Para cada lançamento retorne:
- "secao": receita | fixo | variavel | extra
- "data": AAAA-MM-DD (string vazia se não houver)
- "descricao": curta. Para receitas use o nome do cliente/pagador (se for um destes clientes use o nome exato: ${clientes.join(", ")}). Para gastos use o nome do gasto (ex.: "Canva", "Contador", "Pedágio Maringá")
- "valor": número positivo com ponto decimal (ex.: 1250.90)
- "forma": conta/forma usada, uma destas: ${list("forma")}
- "status": "pago" se já foi efetivado, "nao_pago" se é boleto/fatura a vencer
- "info": observação curta (ex.: "parcelado", "3/10" para parcela, "hora extra") ou string vazia
- "categoria": só para "extra", uma destas: ${list("categoria")}; senão string vazia
- "servico": só para "receita", uma destas: ${list("servico")}; senão string vazia
- "tipo": só para "receita", uma destas: ${list("tipo")}; senão string vazia

Regras:
- Em extratos com várias linhas, um lançamento por linha. Ignore linhas de saldo.
- Não invente valores. Em comprovantes/extratos, se não conseguir ler o valor, não inclua.
- Não duplique o mesmo lançamento que aparecer em mais de um print.

Responda APENAS com JSON válido, sem markdown:
{"lancamentos":[{"secao":"","data":"","descricao":"","valor":0,"forma":"","status":"","info":"","categoria":"","servico":"","tipo":""}]}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (bloquear(req, res, req.headers["x-fin-senha"])) return;
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
      mesAberto: /^\d{4}-\d{2}$/.test(body.mesAberto || "") ? body.mesAberto : (body.hoje || new Date().toISOString()).slice(0, 7),
      clientes: body.clientes || [],
      opcoes: body.opcoes || {},
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
        model: "claude-haiku-5-5",
        max_tokens: 16000,
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
    if (json.stop_reason === "refusal") {
      return res.status(502).json({ error: "A IA não conseguiu ler esses prints. Tente de novo ou com outro print." });
    }
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
