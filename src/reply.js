// Mengirim balasan seperti agen manusia:
// dipecah per paragraf, tiap bubble didahului typing dengan jeda proporsional panjang teks.
import { waha } from "./waha.js";
import { config } from "./config.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function splitReply(text, maxBubbles = 4) {
  const parts = text
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length <= maxBubbles) return parts;
  // Terlalu banyak potongan → gabungkan sisanya ke bubble terakhir
  return [...parts.slice(0, maxBubbles - 1), parts.slice(maxBubbles - 1).join("\n\n")];
}

function typingDelay(text) {
  // ~55 kata/menit ≈ 4.5 karakter/detik, dengan variasi ±30%, dibatasi min/max
  const base = (text.length / 4.5) * 1000;
  const jitter = 0.7 + Math.random() * 0.6;
  return Math.min(config.replyGapMaxMs, Math.max(config.replyGapMinMs, base * jitter));
}

export async function sendHumanLike(chatId, text) {
  const bubbles = splitReply(text);
  for (let i = 0; i < bubbles.length; i++) {
    await waha.startTyping(chatId);
    await sleep(typingDelay(bubbles[i]));
    await waha.stopTyping(chatId);
    await waha.sendText(chatId, bubbles[i]);
  }
}
