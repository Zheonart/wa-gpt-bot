// Riwayat percakapan per chat. Redis kalau ada REDIS_URL, kalau tidak pakai memori proses.
import Redis from "ioredis";
import { config } from "./config.js";

const TTL_SECONDS = 60 * 60 * 24 * 3; // riwayat kedaluwarsa 3 hari tanpa aktivitas
let redis = null;
const mem = new Map();
const strikes = new Map(); // chatId -> { n, exp }
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
    return mem.get(chatId) || [];
  },

  async append(chatId, items) {
    const hist = (await this.get(chatId)).concat(items);
    // simpan hanya N giliran terakhir (user+assistant = 2 item per giliran)
    const trimmed = hist.slice(-config.historyTurns * 2);
    if (redis) await redis.set(key(chatId), JSON.stringify(trimmed), "EX", TTL_SECONDS);
    else mem.set(chatId, trimmed);
  },

  async clear(chatId) {
    if (redis) await redis.del(key(chatId), `strike:${chatId}`, `lock:${chatId}`);
    else { mem.delete(chatId); strikes.delete(chatId); locks.delete(chatId); }
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
