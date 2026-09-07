import express from "express";
import { config } from "./config.js";
import { waha, resolvePhone } from "./waha.js";
import { debounce } from "./debounce.js";
import { enqueue, queueStats } from "./queue.js";
import { generateReply } from "./ai.js";
import { sendHumanLike } from "./reply.js";
import { memory } from "./memory.js";
import { LANG_PROMPT, LANG_RETRY, WELCOME, parseLangChoice } from "./language.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

// Dedupe: WAHA bisa mengirim ulang event yang sama setelah reconnect
const seen = new Map(); // messageId -> timestamp
const SEEN_TTL = 20 * 60 * 1000;
function isDuplicate(id) {
  if (!id) return false;
  const now = Date.now();
  if (seen.has(id)) return true;
  seen.set(id, now);
  if (seen.size > 5000) for (const [k, t] of seen) if (now - t > SEEN_TTL) seen.delete(k);
  return false;
}

const isGreeting = (t) => /^(hi|hello|hey|hai|halo|salam|hola|السلام عليكم|سلام|مرحبا|هلا|اهلا|أهلا)[\s!.,]*$/i.test((t || "").trim());

app.get("/", (_req, res) => res.json({ ok: true, name: "wa-gpt-bot", queue: queueStats() }));
app.get("/health", (_req, res) => res.send("ok"));

const phoneCache = new Map(); // chatId -> phone digits (in-memory, cukup)

app.post("/webhook", async (req, res) => {
  // Balas 200 SEGERA — WAHA tidak boleh menunggu GPT
  res.sendStatus(200);

  if (config.webhookSecret && req.get("X-Webhook-Secret") !== config.webhookSecret) {
    console.warn("[webhook] secret salah, event diabaikan");
    return;
  }

  const { event, payload } = req.body || {};
  if (event !== "message" || !payload) return;

  const chatId = payload.from;
  const messageId = payload.id;
  const text = (payload.body || "").trim();

  if (payload.fromMe) return;                 // pesan dari bot sendiri
  if (!chatId || chatId.endsWith("@g.us")) return; // abaikan grup
  if (isDuplicate(messageId)) return;

  if (payload.hasMedia && !text) {
    // Media tanpa teks: balas langsung tanpa masuk debounce
    enqueue(chatId, () =>
      sendHumanLike(chatId, "Sorry, I can only read text messages for now 🙏")
    );
    return;
  }
  if (!text) return;

  if (text.toLowerCase() === "/reset") {
    enqueue(chatId, async () => {
      await memory.clear(chatId);
      await waha.sendText(chatId, "Okay, let's start fresh.");
    });
    return;
  }

  // Chat terkunci → diam total (tidak sendSeen, tidak typing, tidak balas)
  if (await memory.isLocked(chatId)) return;

  waha.sendSeen(chatId); // centang biru langsung → terasa "dibaca"

  // Nomor HP pelanggan: dari chatId, payload, atau tanya WAHA (lid → pn). Di-cache per chat.
  if (!phoneCache.has(chatId)) {
    const ph = await resolvePhone(chatId, payload);
    phoneCache.set(chatId, ph);
    if (ph) console.log(`[phone] ${chatId} → ${ph}`);
  }

  debounce(chatId, text, { messageId }, (id, combined) => {
    enqueue(id, async () => {
      if (await memory.isLocked(id)) return; // terkunci saat pesan masih di buffer

      // ── Ganti bahasa kapan pun lewat pesan pendek: "english", "2", "عربي" ──
      let lang = await memory.getLang(id);
      const quick = parseLangChoice(combined);
      if (lang && quick && quick !== lang) {
        await memory.setLang(id, quick);
        await waha.sendText(id, WELCOME[quick]);
        return;
      }

      // ── Sesi harian: belum pilih bahasa hari ini? ──
      if (!lang) {
        const choice = parseLangChoice(combined);
        if (!choice) {
          // Pesan pertama hari ini bukan pilihan bahasa → tahan pesannya, tanya bahasa.
          // Kalau sudah pernah ditanya dan masih bukan pilihan → ulangi dengan versi singkat.
          const held = await memory.popPending(id);
          await memory.setPending(id, held || combined);
          await waha.sendText(id, held ? LANG_RETRY : LANG_PROMPT);
          return;
        }
        await memory.setLang(id, choice);
        lang = choice;
        await waha.sendText(id, WELCOME[lang]);
        // Kalau tadi ada pertanyaan yang tertahan, jawab sekarang
        const held = await memory.popPending(id);
        if (!held || isGreeting(held)) return; // sapaan saja tidak perlu dijawab lagi
        combined = held;
      }

      const t0 = Date.now();
      await waha.startTyping(id); // typing SEBELUM panggil GPT, bukan sesudah
      try {
        const { text, locked } = await generateReply(id, combined, lang, phoneCache.get(id) || null);
        if (locked) {
          await waha.stopTyping(id);
          await waha.sendText(id, config.lockMessage);
          console.log(`[locked] ${id} for ${config.lockMinutes}m`);
          return;
        }
        await sendHumanLike(id, text);
        console.log(`[reply] ${id} ${Date.now() - t0}ms | ${combined.slice(0, 60).replace(/\n/g, " ")}`);
      } catch (e) {
        console.error(`[error] ${id}`, e);
        await waha.stopTyping(id);
        await waha.sendText(id, "Sorry, something went wrong on my end. Please try again 🙏").catch(() => {});
      }
    });
  });
});

app.listen(config.port, () => {
  console.log(`wa-gpt-bot listening on :${config.port}`);
  console.log(`model=${config.openai.model} debounce=${config.debounceMs}ms concurrent=${config.maxConcurrent}`);
});
