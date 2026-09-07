// Menampung pesan beruntun dari pengirim yang sama, lalu melepasnya sebagai SATU pesan
// setelah jeda sunyi. Timer di-reset setiap pesan baru datang, jadi jendela dihitung
// dari pesan TERAKHIR — persis seperti orang menunggu lawan bicara selesai mengetik.
import { config } from "./config.js";

const buffers = new Map(); // chatId -> { texts: [], timer, meta }

export function debounce(chatId, text, meta, onFlush) {
  const entry = buffers.get(chatId) || { texts: [], timer: null, meta };
  entry.texts.push(text);
  entry.meta = meta; // pakai pesan terakhir untuk id/threading

  if (entry.timer) clearTimeout(entry.timer);

  // Fragmen panjang (kemungkinan paste / forward) diberi jeda lebih lama
  const longFragment = text.length > 600;
  const wait = longFragment ? config.debounceMs * 2 : config.debounceMs;

  entry.timer = setTimeout(() => {
    buffers.delete(chatId);
    onFlush(chatId, entry.texts.join("\n"), entry.meta);
  }, wait);

  buffers.set(chatId, entry);
}
