// Antrian FIFO per percakapan, paralel antar percakapan.
// - Satu chatId tidak pernah diproses 2 job bersamaan (urutan balasan terjaga)
// - Chat berbeda jalan paralel, dibatasi MAX_CONCURRENT agar API/VPS tidak kewalahan
//
// Cukup untuk 1 instance Railway. Kalau nanti butuh >1 instance,
// ganti ke GroupMQ (per-group FIFO di Redis) dengan antarmuka yang sama.
import { config } from "./config.js";

const chains = new Map(); // chatId -> Promise (ekor antrian)
let active = 0;
const waiting = []; // job menunggu slot global

function acquire() {
  if (active < config.maxConcurrent) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => waiting.push(resolve));
}

function release() {
  const next = waiting.shift();
  if (next) next(); // slot langsung dioper, active tidak berubah
  else active--;
}

export function enqueue(chatId, job) {
  const prev = chains.get(chatId) || Promise.resolve();

  const run = prev
    .catch(() => {}) // error job sebelumnya jangan memutus rantai
    .then(async () => {
      await acquire();
      try {
        await job();
      } finally {
        release();
      }
    });

  chains.set(chatId, run);
  run.finally(() => {
    if (chains.get(chatId) === run) chains.delete(chatId);
  });
  return run;
}

export const queueStats = () => ({ active, waiting: waiting.length, chats: chains.size });
