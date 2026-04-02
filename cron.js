const SERVICE_URL = process.env.SERVICE_URL; // ex: https://seu-bot.onrender.com
const BOT_TOKEN = process.env.BOT_TOKEN;
const MESSAGE = process.env.MESSAGE || "📋 Escala de hoje: (teste)";

if (!SERVICE_URL || !BOT_TOKEN) {
  console.error("Faltou SERVICE_URL ou BOT_TOKEN nas variáveis do Cron Job.");
  process.exit(1);
}

const url = `${SERVICE_URL}/send-daily`;

const run = async () => {
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bot-token": BOT_TOKEN
    },
    body: JSON.stringify({ message: MESSAGE })
  });

  const text = await resp.text();
  console.log("Status:", resp.status);
  console.log("Resposta:", text);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
