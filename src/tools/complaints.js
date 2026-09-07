// Pencatatan komplain → tiket CS-xxxx.
// Bot TIDAK menyelesaikan komplain; hanya mengumpulkan data, membuat tiket,
// dan meneruskannya (ke n8n webhook kalau COMPLAINT_WEBHOOK_URL diisi).
import { config } from "../config.js";
import { memory } from "../memory.js";

export const CATEGORIES = ["ORDER", "SERVICE"];

// "966501234567@c.us" → "+966 50 123 4567"; "@lid" → null (harus tanya pelanggan)
export function formatPhone(digits) {
  const d = (digits || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("966") && d.length === 12) return `+966 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  return `+${d}`;
}

export function phoneFromChatId(chatId) {
  const m = /^(\d{8,15})@c\.us$/.exec(chatId || "");
  return m ? formatPhone(m[1]) : null;
}

export async function fileComplaint({ customer_name, phone, address, category, description }, ctx) {
  const cat = CATEGORIES.includes((category || "").toUpperCase()) ? category.toUpperCase() : "SERVICE";
  const addr = (address || "").trim();
  const ph = phone || (ctx.phone ? formatPhone(ctx.phone) : null) || phoneFromChatId(ctx.chatId);
  if (!customer_name || !ph || !addr || !description) {
    return { error: "missing_fields", need: [!customer_name && "customer_name", !ph && "phone", !addr && "address", !description && "description"].filter(Boolean) };
  }

  const ticket = await memory.nextTicket();
  const record = {
    ticket,
    customer: { name: customer_name.trim(), phone: ph.trim() },
    address: addr,
    issue: { category: cat, description: description.trim() },
    language: ctx.lang || "en",
    chat_id: ctx.chatId,
    created_at: new Date().toISOString(),
    status: "OPEN",
  };

  await memory.saveTicket(record);
  console.log(`[complaint] ${ticket} [${addr}] ${cat} | ${record.customer.name} | ${record.issue.description.slice(0, 80)}`);

  if (config.complaintWebhookUrl) {
    try {
      const res = await fetch(config.complaintWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(config.webhookSecret ? { "X-Webhook-Secret": config.webhookSecret } : {}) },
        body: JSON.stringify(record),
      });
      if (!res.ok) console.error(`[complaint] webhook ${res.status}`);
    } catch (e) {
      console.error("[complaint] webhook failed:", e.message);
    }
  }

  return { ok: true, ticket, category: cat, address: addr };
}
