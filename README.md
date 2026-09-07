# wa-gpt-bot

Chatbot WhatsApp berbasis GPT, tanpa n8n. WhatsApp lewat **WAHA** (di VPS), otak bot di **Railway**.

```
WhatsApp → WAHA (VPS) → webhook → Railway
                                    ├─ dedupe (message id)
                                    ├─ debounce per pengirim (gabung pesan beruntun)
                                    ├─ antrian FIFO per chat, paralel antar chat
                                    ├─ GPT + tools (hanya saat butuh data)
                                    └─ balasan dipecah per paragraf + typing
                                            ↓
                                     WAHA sendText → WhatsApp
```

## Struktur

| File | Tugas |
|---|---|
| `src/server.js` | Terima webhook WAHA, filter, dedupe, alur utama |
| `src/debounce.js` | Tampung pesan beruntun, lepas setelah jeda sunyi |
| `src/queue.js` | FIFO per chat + batas paralel global |
| `src/ai.js` | Panggil OpenAI Responses API, loop function calling |
| `src/tools/` | Definisi tool + handler (sekarang data dummy) |
| `src/reply.js` | Pecah balasan jadi beberapa bubble, typing indicator |
| `src/memory.js` | Riwayat per chat (Redis / memori) |
| `src/prompt.js` | System prompt |
| `src/waha.js` | Klien WAHA |

## Deploy ke Railway

1. Push folder ini ke repo GitHub.
2. Railway → **New Project → Deploy from GitHub repo**.
3. (Opsional, disarankan) **+ New → Database → Redis**. Railway otomatis menyediakan `REDIS_URL`; tambahkan ke service bot sebagai variable reference `${{Redis.REDIS_URL}}`.
4. Isi Variables sesuai `.env.example` (minimal `OPENAI_API_KEY`, `WAHA_URL`, `WAHA_API_KEY`).
5. Settings → Networking → **Generate Domain**. Catat URL-nya.

## Setting WAHA (di VPS)

Arahkan webhook session ke Railway. Lewat env WAHA:

```
WHATSAPP_HOOK_URL=https://<domain-railway>.up.railway.app/webhook
WHATSAPP_HOOK_EVENTS=message
WHATSAPP_HOOK_CUSTOM_HEADERS=X-Webhook-Secret:isi-rahasia-yang-sama
```

atau saat start session lewat API (`POST /api/sessions/start`) di field `config.webhooks`.

Pastikan `WEBHOOK_SECRET` di Railway sama dengan yang dikirim WAHA.

## Test lokal

```
cp .env.example .env   # isi
npm install
npm run dev
```

Simulasi webhook tanpa WhatsApp:

```
curl -X POST localhost:3000/webhook -H 'Content-Type: application/json' -d '{
  "event":"message",
  "payload":{"id":"t1","from":"6281234567890@c.us","fromMe":false,"body":"halo, kopi susu berapa?"}
}'
```

Bot akan memanggil WAHA untuk membalas — jadi WAHA_URL tetap harus valid saat test.

## Mengganti data dummy

Edit `src/tools/products.js` saja. Ganti isi `searchProducts`, `getProduct`, `getBusinessHours` dengan query ke Supabase / Sheets / API. Tanda tangan fungsi tetap; `index.js`, `ai.js`, dan prompt tidak perlu disentuh.

Menambah tool baru: tambah satu objek `{ def, handler }` di `src/tools/index.js`.

## Parameter yang paling menentukan "rasa manusia"

| Variable | Default | Efek |
|---|---|---|
| `DEBOUNCE_MS` | 4000 | Makin besar, makin sabar menunggu pelanggan selesai; makin lambat respons pertama |
| `REPLY_GAP_MIN_MS` / `MAX` | 900 / 2200 | Jeda antar bubble |
| `MAX_CONCURRENT` | 8 | Jumlah chat diproses bersamaan |
| `HISTORY_TURNS` | 20 | Konteks yang diingat per chat |

## Sesi harian & bahasa

- Pesan pertama dari sebuah nomor **hari ini** → bot mengirim pilihan bahasa (dwibahasa): 1 English / 2 العربية. Pesan pelanggan ditahan dan dijawab setelah bahasa dipilih.
- Bahasa dan riwayat chat disimpan sampai **00:00 waktu `TIMEZONE`** (default Asia/Riyadh), lalu hilang. Setelah tengah malam, pesan berikutnya dianggap sesi baru dan ditanya bahasa lagi.
- Teks pilihan bahasa & sambutan ada di `src/language.js`.

## Komplain → tiket

Bot tidak menyelesaikan komplain. Dia mengumpulkan nama, lokasi kafe (jalan/area sesuai kata pelanggan), dan kejadian, lalu memanggil `file_complaint` → tiket `CS-xxxx` (counter di Redis, mulai `TICKET_START`). Kategori ORDER/SERVICE diputuskan GPT. Nomor HP diambil dari WhatsApp kalau tersedia (`@c.us`); kalau engine memberi `@lid`, bot menanyakan nomornya.

Tiket disimpan di Redis (`ticket:CS-xxxx`, 90 hari) dan, kalau `COMPLAINT_WEBHOOK_URL` diisi, dikirim sebagai JSON POST (header `X-Webhook-Secret` ikut):

```json
{
  "ticket": "CS-1042",
  "customer": { "name": "Nawaf Al-Otaibi", "phone": "+966 55 214 8890" },
  "address": "King Saud 1",
  "issue": { "category": "ORDER", "description": "The coffee was served cold." },
  "language": "en", "chat_id": "9665...@c.us",
  "created_at": "2026-09-07T15:53:00.000Z", "status": "OPEN"
}
```

## Kunci otomatis (off-topic)

Setiap pertanyaan di luar topik BON Cafe → GPT memanggil `mark_off_topic` → counter per chat naik (kedaluwarsa 6 jam). Peringatan ke-2 memberi tahu pelanggan bahwa satu lagi akan menghentikan chat. Pada ke-`OFFTOPIC_MAX` (default 3) bot mengirim `LOCK_MESSAGE` lalu **diam total** selama `LOCK_MINUTES` (default 60): tidak dibaca, tidak typing, tidak dibalas. Setelah itu counter mulai dari nol.

`/reset` juga menghapus kunci — hanya untuk testing, hapus command itu di produksi kalau tidak mau pelanggan bisa membuka kunci sendiri.

## Batas versi ini

- Debounce & antrian ada di memori proses → cukup untuk **1 instance** Railway. Kalau scale ke >1 instance, ganti `queue.js` ke GroupMQ dan `debounce.js` ke Redis.
- Belum ada mode "human takeover" — `handoff_to_human` baru mencatat log. Langkah berikutnya: simpan flag di Redis dan lewati bot selama flag aktif.
- Media (gambar/voice) belum diproses.
