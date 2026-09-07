// Klien tipis ke WAHA HTTP API (https://waha.devlike.pro)
import { config } from "./config.js";

async function call(path, body) {
  const res = await fetch(`${config.waha.url}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.waha.apiKey ? { "X-Api-Key": config.waha.apiKey } : {}),
    },
    body: JSON.stringify({ session: config.waha.session, ...body }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`WAHA ${path} -> ${res.status} ${txt}`);
  }
  return res.json().catch(() => ({}));
}

async function get(path) {
  const res = await fetch(`${config.waha.url}${path}`, {
    headers: config.waha.apiKey ? { "X-Api-Key": config.waha.apiKey } : {},
  });
  if (!res.ok) throw new Error(`WAHA GET ${path} -> ${res.status}`);
  return res.json();
}

// "9665...@c.us" → nomor langsung. "1234@lid" → tanya WAHA (pemetaan lid→pn). Gagal → null.
export async function resolvePhone(chatId, payload) {
  const m = /^(\d{8,15})@c\.us$/.exec(chatId || "");
  if (m) return m[1];
  if (!/@lid$/.test(chatId || "")) return null;

  // 1) beberapa versi WAHA menyertakan nomor asli di payload
  const cand = payload?._data?.key?.senderPn || payload?._data?.key?.participantPn || payload?.pn;
  const c = /^(\d{8,15})@/.exec(cand || "");
  if (c) return c[1];

  // 2) tanya WAHA: GET /api/{session}/lids/{lid}
  try {
    const lid = chatId.replace(/@lid$/, "");
    const r = await get(`/api/${config.waha.session}/lids/${lid}`);
    const pn = /^(\d{8,15})@/.exec(r?.pn || r?.phoneNumber || "");
    if (pn) return pn[1];
  } catch (e) {
    console.warn(`[waha] lid→phone gagal ${chatId}: ${e.message}`);
  }
  return null;
}

export const waha = {
  sendText: (chatId, text) => call("/api/sendText", { chatId, text }),
  sendSeen: (chatId) => call("/api/sendSeen", { chatId }).catch(() => {}),
  startTyping: (chatId) => call("/api/startTyping", { chatId }).catch(() => {}),
  stopTyping: (chatId) => call("/api/stopTyping", { chatId }).catch(() => {}),
};
