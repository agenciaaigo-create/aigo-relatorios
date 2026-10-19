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

function buildPromptPessoal({ hoje, mesAberto, opcoes = {} }) {
  const list = k => (opcoes[k] || []).join(", ");
  return `Você é o assistente das FINANÇAS PESSOAIS da Dani. Analise os prints enviados (prints da planilha pessoal, comprovantes de PIX, boletos, faturas de cartão, extratos) e extraia TODOS os gastos.

Hoje é ${hoje}. Se o print não mostrar o ano, use o ano mais provável considerando a data de hoje.
O usuário está com o mês ${mesAberto} aberto no sistema. Quando o print mostrar só o dia (sem mês), use esse mês ${mesAberto}.

PRINT DE PLANILHA/TABELA:
- Copie linha por linha, exatamente como está escrito. Não resuma, não renomeie e não junte linhas.
- "data" = ${mesAberto}-DD, usando o número da coluna Dia (com 2 dígitos). IGNORE o nome de mês escrito em títulos/cabeçalhos.
- "valor" = coluna Valor, lida dígito por dígito (formato brasileiro: "R$ 1.599,43" vira 1599.43). Linha sem valor: "valor": 0.
- "status": "Pago" vira "pago"; "Não pago" vira "nao_pago".
- "forma" e "info" = copie das colunas correspondentes (info é algo como "3/10" ou "4/12").
- A seção vem do título roxo acima da tabela: "GASTOS FIXOS" = p_fixo, "GASTOS CASA" = p_casa, "PARCELAS E GASTOS EXTRAS" = p_extra. Um print pode ter várias tabelas lado a lado: veja o título de cada uma.
- Ignore cabeçalhos, quadros de totais/resumo, linhas vazias e qualquer tabela de entradas/receitas.

Fora da planilha (comprovantes/extratos), classifique:
- "p_fixo": contas fixas pessoais (Fies, celular, plano, assinatura pessoal)
- "p_casa": contas e gastos da casa (aluguel, condomínio, luz, água, internet, gás, diarista, mercado da casa)
- "p_extra": compras parceladas e gastos avulsos

Para cada lançamento retorne:
- "secao": p_fixo | p_casa | p_extra
- "data": AAAA-MM-DD (string vazia se não houver)
- "descricao": o nome do gasto, igual ao print
- "valor": número positivo com ponto decimal
- "forma": uma destas: ${list("forma")}
- "status": "pago" ou "nao_pago"
- "info": parcela ("3/10") ou observação curta, ou string vazia
- "classeCasa": só para p_casa, a coluna Categoria: uma destas: ${list("classeCasa")}; senão string vazia
- "classeExtra": só para p_extra, a coluna Categoria: uma destas: ${list("classeExtra")}; senão string vazia
- "categoria": o grupo do gasto, um destes: ${list("grupo")}. Guia: aluguel, condomínio, luz, água, gás, internet de casa = "Casa e contas"; combustível, carro, IPVA, Uber, estacionamento = "Carro e transporte"; farmácia, médico, plano de saúde, academia = "Saúde"; móveis, utensílios, decoração, "coisa p/ casa" = "Coisas p/ casa"; roupas, beleza, presentes, lazer = "Pessoal"; Fies, faculdade, cursos = "Estudos"; celular, Netflix, Spotify, iCloud = "Assinaturas e celular"; mercado, padaria, delivery, restaurante = "Mercado e dia a dia"; se nada servir, "Outros"

Regras:
- Não invente valores. Em comprovantes/extratos, se não conseguir ler o valor, não inclua.
- Não duplique o mesmo lançamento que aparecer em mais de um print.

Responda APENAS com JSON válido, sem markdown:
{"lancamentos":[{"secao":"","data":"","descricao":"","valor":0,"forma":"","status":"","info":"","classeCasa":"","classeExtra":"","categoria":""}]}`;
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
- "categoria": para todo GASTO (fixo, variavel, extra), a mais adequada destas: ${list("categoria")}. Guia: salários, pró-labore e pagamentos de pessoas da equipe = "Equipe e salários"; FGTS, INSS, DAS, contador = "Impostos e encargos"; aluguel, água, energia, internet = "Estrutura do estúdio"; Adobe, Canva, Capcut, iCloud, Google Drive, site = "Ferramentas e assinaturas"; empréstimo, consórcio, financiamento = "Dívidas e financiamentos"; compra de equipamentos/móveis e investimentos = "Investimentos"; anúncios, Facebook/Meta Ads = "Marketing e anúncios"; combustível, pedágio, gastos em Maringá ou viagens = "Maringá e viagens"; se nada servir, "Outros". Para receitas use string vazia
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
    { type: "text", text: (body.espaco === "pessoal" ? buildPromptPessoal : buildPrompt)({
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
