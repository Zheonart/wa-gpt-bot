// Pemilihan bahasa di awal sesi harian.
export const LANG_PROMPT =
  "Welcome to BON Cafe ☕\nPlease choose your language:\n\n" +
  "أهلاً بك في بون كافيه ☕\nيرجى اختيار اللغة:\n\n" +
  "1️⃣ English\n2️⃣ العربية";

export const LANG_RETRY =
  "Please reply with 1 for English or 2 for Arabic.\n" +
  "يرجى الرد بـ 1 للإنجليزية أو 2 للعربية.";

export const WELCOME = {
  en: "Great, English it is! 😊\n\nHow can I help you today — our menu or opening hours?",
  ar: "تمام، سنتحدث بالعربية! 😊\n\nكيف أقدر أساعدك اليوم — القائمة أو ساعات العمل؟",
};

export const LANG_NAME = { en: "English", ar: "Arabic" };

const EN = /^(1|1️⃣|en|eng|english|انجليزي|إنجليزي|انقلش)\.?$/i;
const AR = /^(2|2️⃣|ar|ara|arabic|عربي|عربى|العربية|عربية|بالعربي)\.?$/i;

// Mengembalikan "en" | "ar" | null
export function parseLangChoice(text) {
  const t = (text || "").trim().toLowerCase().replace(/[!؟?،,]/g, "");
  if (EN.test(t)) return "en";
  if (AR.test(t)) return "ar";
  return null;
}
