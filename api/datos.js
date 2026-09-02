// Guarda y devuelve la libreta compartida de Mardel Lunch.
// Cada libreta se identifica por la huella de su clave: sin la clave,
// no hay forma de pedir los datos.
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function prepararTabla() {
  await sql`CREATE TABLE IF NOT EXISTS libretas (
    clave_hash TEXT PRIMARY KEY,
    datos JSONB NOT NULL,
    actualizado TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
}

export default async function handler(req, res) {
  try {
    if (!process.env.DATABASE_URL) return res.status(500).json({ error: "Falta conectar la base de datos en Vercel" });
    await prepararTabla();

    if (req.method === "GET") {
      const h = String(req.query.h || "");
      if (h.length !== 64) return res.status(400).json({ error: "clave inválida" });
      const filas = await sql`SELECT datos FROM libretas WHERE clave_hash = ${h}`;
      return res.status(200).json({ datos: filas[0] ? filas[0].datos : {} });
    }

    if (req.method === "POST") {
      const { h, datos } = req.body || {};
      if (!h || String(h).length !== 64) return res.status(400).json({ error: "clave inválida" });
      if (!datos || typeof datos !== "object") return res.status(400).json({ error: "sin datos" });
      await sql`
        INSERT INTO libretas (clave_hash, datos, actualizado)
        VALUES (${h}, ${JSON.stringify(datos)}, now())
        ON CONFLICT (clave_hash) DO UPDATE SET datos = EXCLUDED.datos, actualizado = now()
      `;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Método no permitido" });
  } catch (e) {
    return res.status(500).json({ error: "Error de la base: " + (e.message || "desconocido") });
  }
}
