export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.ANTHROPIC_KEY) {
    res.status(500).json({ error: "ANTHROPIC_KEY nao configurada na Vercel" });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === "string") body = JSON.parse(body);

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
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

    const data = await resp.json();

    if (!resp.ok) {
      res.status(resp.status).json({
        error: "Erro da Anthropic",
        detalhe: data,
      });
      return;
    }

    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: "Erro na funcao", detalhe: String(e) });
  }
}
