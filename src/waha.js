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

export const waha = {
  sendText: (chatId, text) => call("/api/sendText", { chatId, text }),
  sendSeen: (chatId) => call("/api/sendSeen", { chatId }).catch(() => {}),
  startTyping: (chatId) => call("/api/startTyping", { chatId }).catch(() => {}),
  stopTyping: (chatId) => call("/api/stopTyping", { chatId }).catch(() => {}),
};
