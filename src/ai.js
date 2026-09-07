// Lapisan GPT: OpenAI Responses API + loop function calling.
// Riwayat dikelola sendiri (Redis/memori), jadi model tidak perlu previous_response_id.
import OpenAI from "openai";
import { config } from "./config.js";
import { systemPrompt, languageLine } from "./prompt.js";
import { toolDefs, runTool } from "./tools/index.js";
import { memory } from "./memory.js";

const client = new OpenAI({ apiKey: config.openai.apiKey });
const MAX_TOOL_ROUNDS = 8;

export async function generateReply(chatId, userText, lang = "en") {
  const ctx = { chatId, locked: false, lang };
  const history = await memory.get(chatId);
  const input = [...history, { role: "user", content: userText }];
  const newItems = [{ role: "user", content: userText }];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const res = await client.responses.create({
      model: config.openai.model,
      instructions: systemPrompt + "\n\n" + languageLine(ctx.lang), // bagian statis di depan → kena prompt cache
      input,
      tools: toolDefs,
      ...(config.openai.reasoningEffort ? { reasoning: { effort: config.openai.reasoningEffort } } : {}),
    });

    const calls = res.output.filter((o) => o.type === "function_call");

    if (calls.length === 0 || ctx.locked) {
      const text = (res.output_text || "").trim() || "Sorry, could you say that again?";
      newItems.push({ role: "assistant", content: ctx.locked ? config.lockMessage : text });
      await memory.append(chatId, newItems);
      return { text, locked: ctx.locked };
    }

    // Kirim balik SELURUH output (termasuk item reasoning — wajib untuk model gpt-5/o-series),
    // lalu jalankan tiap tool call dan tambahkan hasilnya
    input.push(...res.output);
    for (const call of calls) {
      let args = {};
      try { args = JSON.parse(call.arguments || "{}"); } catch {}
      const result = await runTool(call.name, args, ctx);
      console.log(`[tool] ${chatId} ${call.name}(${JSON.stringify(args)})`);
      input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
    }
  }

  const fallback = "Sorry, I had trouble fetching that. Please try again in a moment.";
  await memory.append(chatId, [...newItems, { role: "assistant", content: fallback }]);
  return { text: fallback, locked: false };
}
