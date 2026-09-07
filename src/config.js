const num = (v, d) => (v === undefined || v === "" ? d : Number(v));

export const config = {
  port: num(process.env.PORT, 3000),

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
    // "minimal" / "low" = jawaban cepat untuk chatbot. Kosongkan kalau model tidak mendukung reasoning.
    reasoningEffort: process.env.OPENAI_REASONING_EFFORT ?? "low",
  },

  waha: {
    url: (process.env.WAHA_URL || "").replace(/\/$/, ""),
    apiKey: process.env.WAHA_API_KEY || "",
    session: process.env.WAHA_SESSION || "default",
  },

  webhookSecret: process.env.WEBHOOK_SECRET || "",
  redisUrl: process.env.REDIS_URL || "",

  debounceMs: num(process.env.DEBOUNCE_MS, 4000),
  maxConcurrent: num(process.env.MAX_CONCURRENT, 8),
  historyTurns: num(process.env.HISTORY_TURNS, 20),
  replyGapMinMs: num(process.env.REPLY_GAP_MIN_MS, 900),
  replyGapMaxMs: num(process.env.REPLY_GAP_MAX_MS, 2200),

  timezone: process.env.TIMEZONE || "Asia/Riyadh",

  // Komplain
  complaintWebhookUrl: process.env.COMPLAINT_WEBHOOK_URL || "",   // n8n webhook (opsional)
  ticketStart: num(process.env.TICKET_START, 1042),                // nomor tiket pertama

  offTopicMax: num(process.env.OFFTOPIC_MAX, 3),
  lockMinutes: num(process.env.LOCK_MINUTES, 60),
  lockMessage: process.env.LOCK_MESSAGE || "This chat is locked for a few hours. Please message us again later.\nتم قفل هذه المحادثة لبضع ساعات. يرجى مراسلتنا لاحقاً.",

  botName: process.env.BOT_NAME || "Mia",
  businessName: process.env.BUSINESS_NAME || "BON Cafe",
};

if (!config.openai.apiKey) console.warn("[config] OPENAI_API_KEY belum diisi");
if (!config.waha.url) console.warn("[config] WAHA_URL belum diisi");
