// Registry tool. Setiap tool: definisi (untuk GPT) + handler (dijalankan di server).
import { searchProducts, getProduct, getBusinessHours, listCategories } from "./products.js";
import { memory } from "../memory.js";
import { config } from "../config.js";
import { fileComplaint, phoneFromChatId } from "./complaints.js";

export const tools = [
  {
    def: {
      type: "function",
      name: "search_products",
      description: "Search the menu by product name, category (hot, cold, frappe, tea, pastry, food, dessert, beans) or SKU. Returns price in SAR.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "keywords, e.g. 'spanish latte', 'iced', 'cheesecake', 'frappe'" } },
        required: ["query"],
      },
    },
    handler: searchProducts,
  },
  {
    def: {
      type: "function",
      name: "get_product",
      description: "Details of one product by SKU.",
      parameters: {
        type: "object",
        properties: { sku: { type: "string" } },
        required: ["sku"],
      },
    },
    handler: getProduct,
  },
  {
    def: {
      type: "function",
      name: "get_business_hours",
      description: "Opening hours of the cafe.",
      parameters: { type: "object", properties: {} },
    },
    handler: getBusinessHours,
  },
  {
    def: {
      type: "function",
      name: "list_categories",
      description: "List available menu categories.",
      parameters: { type: "object", properties: {} },
    },
    handler: listCategories,
  },
  {
    def: {
      type: "function",
      name: "switch_language",
      description: "Call this when the customer asks to change the conversation language (e.g. 'use English', 'talk in Arabic', 'بالعربي', 'English please'). After calling it, continue your reply in the new language.",
      parameters: {
        type: "object",
        properties: { language: { type: "string", enum: ["en", "ar"] } },
        required: ["language"],
      },
    },
    handler: async ({ language }, ctx) => {
      await memory.setLang(ctx.chatId, language);
      ctx.lang = language;
      console.log(`[lang] ${ctx.chatId} → ${language}`);
      return { ok: true, language, instruction: `Reply in ${language === "ar" ? "Arabic" : "English"} from now on.` };
    },
  },
  {
    def: {
      type: "function",
      name: "mark_off_topic",
      description: "Call this EVERY time the customer asks something unrelated to BON Cafe, before you reply. Returns the warning count. If it returns locked=true, do not write a reply — the system will send the lock message.",
      parameters: {
        type: "object",
        properties: { topic: { type: "string", description: "short label of what they asked, e.g. 'homework'" } },
        required: ["topic"],
      },
    },
    handler: async ({ topic }, ctx) => {
      const n = await memory.addStrike(ctx.chatId);
      console.log(`[off-topic] ${ctx.chatId} #${n} (${topic})`);
      if (n >= config.offTopicMax) {
        await memory.lock(ctx.chatId, config.lockMinutes);
        ctx.locked = true;
        return { strike: n, max: config.offTopicMax, locked: true };
      }
      return {
        strike: n, max: config.offTopicMax, locked: false,
        remaining: config.offTopicMax - n,
        instruction: n === config.offTopicMax - 1
          ? "Warn clearly: one more unrelated question and this chat will be paused for a while."
          : "Politely decline and steer back to the menu.",
      };
    },
  },
  {
    def: {
      type: "function",
      name: "file_complaint",
      description: "File a customer complaint as a ticket. Call ONLY after you have the customer's name, the location of the cafe they visited (street/area/landmark, as they describe it), and a clear description of what happened. Phone is auto-filled from WhatsApp when available; if the result says phone is missing, ask the customer for it. Returns the ticket number.",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string" },
          phone: { type: "string", description: "only if the customer gave it; otherwise omit" },
          address: { type: "string", description: "the cafe location as the customer describes it, e.g. 'King Saud road', 'near Apsco', 'Prince Naif street'. Keep their wording, in English." },
          category: { type: "string", enum: ["ORDER", "SERVICE"], description: "ORDER = about the drink/food itself (wrong, cold, missing, quality). SERVICE = about staff, waiting, cleanliness, place." },
          description: { type: "string", description: "one or two sentences in English, in the customer's words, e.g. 'The coffee was served cold.'" },
        },
        required: ["customer_name", "address", "category", "description"],
      },
    },
    handler: fileComplaint,
  },
  {
    def: {
      type: "function",
      name: "handoff_to_human",
      description: "Serahkan percakapan ke CS manusia. Panggil kalau pelanggan minta manusia, komplain serius, atau kamu tidak bisa membantu.",
      parameters: {
        type: "object",
        properties: { reason: { type: "string" } },
        required: ["reason"],
      },
    },
    handler: async ({ reason }, ctx) => {
      // TODO: kirim notifikasi ke nomor admin / simpan flag "human_mode" di Redis
      console.log(`[handoff] ${ctx.chatId}: ${reason}`);
      return { ok: true, message: "Our team has been notified and will reach out shortly." };
    },
  },
];

export const toolDefs = tools.map((t) => t.def);

export async function runTool(name, args, ctx) {
  const tool = tools.find((t) => t.def.name === name);
  if (!tool) return { error: `unknown tool ${name}` };
  try {
    return await tool.handler(args, ctx);
  } catch (e) {
    console.error(`[tool:${name}]`, e.message);
    return { error: e.message };
  }
}
