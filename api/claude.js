// Función serverless de Vercel: habla con Claude usando tu API key,
// que queda guardada en Vercel y nunca viaja al celular.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "Falta la variable ANTHROPIC_API_KEY en Vercel" });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: req.body.messages,
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || "Error de la API" });
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: "No se pudo conectar con Claude" });
  }
}
