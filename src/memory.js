// Riwayat percakapan per chat. Redis kalau ada REDIS_URL, kalau tidak pakai memori proses.
import Redis from "ioredis";
import { config } from "./config.js";

// Detik tersisa sampai 00:00 berikutnya di zona waktu bisnis.
// Riwayat dan bahasa pilihan kedaluwarsa tepat tengah malam → hari baru = sesi baru.
export function secondsUntilMidnight(tz = config.timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const elapsed = (get("hour") % 24) * 3600 + get("minute") * 60 + get("second");
  return Math.max(60, 86400 - elapsed);
}
let redis = null;
const mem = new Map();
const strikes = new Map(); // chatId -> { n, exp }
const langs = new Map();   // chatId -> { lang, exp }
const pending = new Map(); // chatId -> { text, exp }
const memExp = new Map();  // chatId -> exp riwayat (fallback tanpa Redis)
const locks = new Map();   // chatId -> untilTimestamp
const STRIKE_TTL = 6 * 60 * 60;

if (config.redisUrl) {
  redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 2 });
  redis.on("error", (e) => console.error("[redis]", e.message));
  console.log("[memory] pakai Redis");
} else {
  console.log("[memory] pakai memori proses (riwayat hilang saat restart)");
}

const key = (chatId) => `hist:${chatId}`;

export const memory = {
  async get(chatId) {
    if (redis) {
      const raw = await redis.get(key(chatId));
      return raw ? JSON.parse(raw) : [];
    }
    const exp = memExp.get(chatId);
    if (exp && Date.now() > exp) { mem.delete(chatId); memExp.delete(chatId); }
    return mem.get(chatId) || [];
  },

  async append(chatId, items) {
    const hist = (await this.get(chatId)).concat(items);
    // simpan hanya N giliran terakhir (user+assistant = 2 item per giliran)
    const trimmed = hist.slice(-config.historyTurns * 2);
    const ttl = secondsUntilMidnight();
    if (redis) await redis.set(key(chatId), JSON.stringify(trimmed), "EX", ttl);
    else { mem.set(chatId, trimmed); memExp.set(chatId, Date.now() + ttl * 1000); }
  },

  async clear(chatId) {
    if (redis) await redis.del(key(chatId), `strike:${chatId}`, `lock:${chatId}`, `lang:${chatId}`, `pending:${chatId}`);
    else { mem.delete(chatId); memExp.delete(chatId); strikes.delete(chatId); locks.delete(chatId); langs.delete(chatId); pending.delete(chatId); }
  },

  // ── Bahasa pilihan (kedaluwarsa tengah malam) ──
  async getLang(chatId) {
    if (redis) return (await redis.get(`lang:${chatId}`)) || null;
    const e = langs.get(chatId);
    if (!e) return null;
    if (Date.now() > e.exp) { langs.delete(chatId); return null; }
    return e.lang;
  },
  async setLang(chatId, lang) {
    const ttl = secondsUntilMidnight();
    if (redis) await redis.set(`lang:${chatId}`, lang, "EX", ttl);
    else langs.set(chatId, { lang, exp: Date.now() + ttl * 1000 });
  },

  // ── Pesan yang tertahan sementara menunggu pilihan bahasa ──
  async setPending(chatId, text) {
    if (redis) await redis.set(`pending:${chatId}`, text, "EX", 600);
    else pending.set(chatId, { text, exp: Date.now() + 600_000 });
  },
  async popPending(chatId) {
    if (redis) {
      const t = await redis.get(`pending:${chatId}`);
      if (t) await redis.del(`pending:${chatId}`);
      return t || null;
    }
    const e = pending.get(chatId);
    pending.delete(chatId);
    return e && Date.now() < e.exp ? e.text : null;
  },

  // ── Off-topic strikes (kedaluwarsa 6 jam) ──
  async addStrike(chatId) {
    if (redis) {
      const k = `strike:${chatId}`;
      const n = await redis.incr(k);
      await redis.expire(k, STRIKE_TTL);
      return n;
    }
    const e = strikes.get(chatId);
    const n = e && Date.now() < e.exp ? e.n + 1 : 1;
    strikes.set(chatId, { n, exp: Date.now() + STRIKE_TTL * 1000 });
    return n;
  },

  // ── Lock: bot diam total selama durasi ──
  async lock(chatId, minutes) {
    if (redis) {
      await redis.set(`lock:${chatId}`, "1", "EX", minutes * 60);
      await redis.del(`strike:${chatId}`);
    } else {
      locks.set(chatId, Date.now() + minutes * 60 * 1000);
      strikes.delete(chatId);
    }
  },

  async isLocked(chatId) {
    if (redis) return (await redis.exists(`lock:${chatId}`)) === 1;
    const until = locks.get(chatId);
    if (!until) return false;
    if (Date.now() > until) { locks.delete(chatId); return false; }
    return true;
  },
};
