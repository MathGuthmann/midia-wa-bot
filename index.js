import express from "express";
import qrcode from "qrcode";
import pkg from "whatsapp-web.js";

const { Client, LocalAuth } = pkg;

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Pasta do disco persistente (Render)
const AUTH_PATH = process.env.AUTH_PATH || "/var/data/wwebjs";

// Token para proteger o endpoint de envio
const BOT_TOKEN = process.env.BOT_TOKEN || "";

// ID do grupo (formato "...@g.us")
const GROUP_ID = process.env.GROUP_ID || "";

// Números para DM: "+55DDDNUM,+55DDDNUM"
const DM_NUMBERS = (process.env.DM_NUMBERS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

let lastQr = null;
let ready = false;

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: AUTH_PATH
  }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
});

client.on("qr", (qr) => {
  lastQr = qr;
  ready = false;
  console.log("[WA] QR gerado. Acesse /qr para escanear.");
});

client.on("ready", async () => {
  ready = true;
  console.log("[WA] Client pronto.");

  // Lista grupos no log (pra você pegar o GROUP_ID)
  try {
    const chats = await client.getChats();
    const groups = chats.filter(c => c.isGroup);
    console.log("[WA] Grupos encontrados:");
    for (const g of groups) {
      console.log(`- ${g.name} => ${g.id._serialized}`);
    }
  } catch (e) {
    console.log("[WA] Não consegui listar chats:", e?.message);
  }
});

client.on("auth_failure", (msg) => {
  ready = false;
  console.log("[WA] Falha de auth:", msg);
});

client.initialize();

app.get("/health", (_req, res) => {
  res.json({ ok: true, ready });
});

app.get("/qr", async (_req, res) => {
  if (ready) return res.status(200).send("✅ Já autenticado (Client ready).");
  if (!lastQr) return res.status(404).send("Ainda não há QR. Veja logs.");
  const png = await qrcode.toBuffer(lastQr, { type: "png", width: 320 });
  res.setHeader("Content-Type", "image/png");
  res.send(png);
});

app.post("/send-daily", async (req, res) => {
  const token = req.headers["x-bot-token"];
  if (!BOT_TOKEN || token !== BOT_TOKEN) return res.status(401).json({ ok: false });

  if (!ready) return res.status(503).json({ ok: false, error: "WA not ready" });

  const message = req.body?.message || "📋 Escala de hoje: (mensagem de teste)";

  try {
    if (GROUP_ID) await client.sendMessage(GROUP_ID, message);

    for (const phone of DM_NUMBERS) {
      const waId = phone.replace(/\D/g, "") + "@c.us";
      await client.sendMessage(waId, message);
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

app.listen(PORT, () => console.log(`HTTP on :${PORT}`));
