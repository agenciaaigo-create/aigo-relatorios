export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.ANTHROPIC_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_KEY nao configurada" });
  }

  let body;
  try {
    let raw = "";
    if (req.body && typeof req.body === "object") {
      body = req.body;
    } else {
      raw = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", chunk => { data += chunk; });
        req.on("end", () => resolve(data));
        req.on("error", reject);
      });
      body = JSON.parse(raw);
    }
  } catch (e) {
    return res.status(400).json({ error: "Erro ao ler corpo: " + String(e) });
  }

  let anthropicResp;
  let anthropicText;
  try {
    anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: body.messages,
      }),
    });
    anthropicText = await anthropicResp.text();
  } catch (e) {
    return res.status(500).json({ error: "Falha na chamada Anthropic: " + String(e) });
  }

  // Retorna a resposta crua da Anthropic junto com o status
  res.setHeader("Content-Type", "application/json");
  return res.status(200).json({
    ok: anthropicResp.ok,
    status: anthropicResp.status,
    raw: anthropicText
  });
}
