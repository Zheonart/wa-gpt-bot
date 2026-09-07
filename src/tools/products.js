// Menu BON Cafe — harga dalam SAR (dari POS Prince Naif branch, Sep 2026).
// Nanti tinggal ganti PRODUCTS dengan hasil query Supabase/Sheets; tanda tangan fungsi tetap.

const P = (name, price, category, size = null) => ({ name, price, category, size });

const PRODUCTS = [
  // ── Hot ──
  P("Espresso", 9, "hot"), P("Espresso (Specialty)", 11, "hot"),
  P("Macchiato", 9, "hot", "R"), P("Macchiato Double", 12, "hot"),
  P("Macchiato Caramel", 12, "hot", "R"), P("Macchiato Hazelnut", 12, "hot", "R"), P("Macchiato Vanilla", 12, "hot", "R"),
  P("Cortado", 11, "hot"), P("Flat White", 14, "hot"),
  P("Cappuccino", 12, "hot", "R"), P("Cappuccino", 14, "hot", "L"),
  P("Coffee Latte", 12, "hot", "R"), P("Coffee Latte", 14, "hot", "L"),
  P("Americano", 11, "hot"), P("Americano Milk", 12, "hot"), P("French Coffee", 11, "hot"),
  P("Spanish Latte", 17, "hot"), P("Spanish Matcha", 18, "hot"),
  P("Salted Caramel Latte", 16, "hot"), P("Pistachio Latte", 15, "hot"),
  P("Turkish Coffee", 10, "hot"), P("Turkish Milk", 11, "hot"), P("Turkish Plain", 10, "hot"), P("Turkish Plain with Milk", 11, "hot"),
  P("Saudi Coffee", 10, "hot"),
  P("Coffee of the Day", 8, "hot", "R"), P("Coffee of the Day", 10, "hot", "L"),
  P("Hot Chocolate", 13, "hot", "R"), P("Hot Chocolate", 15, "hot", "L"),
  P("Mocha", 15, "hot", "R"), P("Mocha", 17, "hot", "L"),
  P("White Mocha", 15, "hot", "R"), P("White Mocha", 17, "hot", "L"),
  P("Sahlab", 12, "hot"), P("Pistachio Sahlab", 14, "hot"),

  // ── Cold ──
  P("Iced Latte", 13, "cold"), P("Iced Latte", 16, "cold", "16oz"),
  P("Iced Americano", 12, "cold"),
  P("Iced Spanish Latte", 16, "cold"), P("Iced Spanish Latte", 19, "cold", "16oz"),
  P("Iced Pistachio Latte", 16, "cold"),
  P("Iced Salted Caramel Latte", 16, "cold"), P("Iced Salted Caramel Latte", 19, "cold", "16oz"),
  P("Iced Mocha", 16, "cold"), P("Iced Mocha", 20, "cold", "16oz"),
  P("Iced Caramel Mocha", 16, "cold"),
  P("Iced White Mocha", 16, "cold"), P("Iced White Mocha", 20, "cold", "16oz"),
  P("Iced Rose White Mocha", 16, "cold"),
  P("Iced Hazelnut Double Macchiato", 17, "cold"), P("Iced Hazelnut Double Macchiato", 21, "cold", "16oz"),
  P("Iced Caramel Double Macchiato", 17, "cold"), P("Iced Caramel Double Macchiato", 21, "cold", "16oz"),
  P("Iced Coffee of the Day", 8, "cold", "R"), P("Iced Coffee of the Day", 10, "cold", "L"),
  P("Iced Matcha Latte", 16, "cold"), P("Iced Spanish Matcha", 18, "cold"),
  P("Iced Hibiscus", 12, "cold"), P("Iced Hibiscus", 15, "cold", "16oz"),
  P("Hibiscus Lemon Mint", 12, "cold"), P("Lemon Mint", 8, "cold"),
  P("Iced Tea Peach", 15, "cold"), P("Iced Tea Peach", 18, "cold", "16oz"),
  P("Moroccan Iced Tea", 15, "cold"), P("Tropical Iced Tea", 15, "cold"),
  P("Mojito Passion Fruit", 15, "cold"), P("Mojito Blue Ocean", 15, "cold"), P("Tropical Lagoon Mojito", 12, "cold"),
  P("Sunset", 18, "cold"),
  P("Bon Berry", 10, "cold", "R"), P("Bon Berry", 13, "cold", "L"), P("Bon Berry", 16, "cold", "16oz"),
  P("Mocha Frappe", 16, "frappe"), P("White Mocha Frappe", 17, "frappe"),
  P("Caramel Frappe", 16, "frappe"), P("Salted Caramel Frappe", 17, "frappe"),
  P("French Frappe", 16, "frappe"), P("Adani Frappe", 16, "frappe"), P("Tropical Matcha Frappe", 17, "frappe"),
  P("Choco Frappe", 11, "frappe", "R"), P("Choco Frappe", 14, "frappe", "L"),

  // ── Tea ──
  P("Tea", 6, "tea", "L"), P("Green Tea", 6, "tea"), P("Moroccan Tea", 6, "tea"),
  P("Tea with Milk", 7, "tea", "L"), P("Milk", 5, "tea"),
  P("Adani Tea", 12, "tea"), P("Karak Tea", 12, "tea"),

  // ── Pastry & food ──
  P("Sandwich Hallomy", 15, "food"), P("Sandwich Turkey", 15, "food"), P("Spinach Feta Pretzel", 15, "food"),
  P("Tunisian Spicy Tuna", 16, "food"), P("Chicken Fajita Brioche", 16, "food"),
  P("Toast 4 Cheese Sandwich", 14, "food"), P("Toast Tuna Sandwich", 14, "food"),
  P("Croissant Yellow", 8, "pastry"), P("Croissant White", 8, "pastry"),
  P("Muffin Chocolate", 8, "pastry"), P("Muffin Vanilla", 8, "pastry"),
  P("English Cake Chocolate", 8, "pastry"), P("English Cake Vanilla", 8, "pastry"),
  P("Donuts Chocolate", 7, "pastry"), P("Cake Bar", 7, "pastry"),
  P("Cookies Vanilla", 8, "pastry"), P("Cookies Chocolate", 8, "pastry"), P("Mini Cookies", 9, "pastry"),
  P("Mini Brownies", 10, "pastry"), P("Brownies Bites", 12, "pastry"), P("Choco Flakes", 11, "pastry"),
  P("Choco Stick Caramel", 8, "pastry"), P("Choco Stick Peanut Butter", 8, "pastry"),
  P("Cheese Cake Pecan", 16, "dessert"), P("Cheese Cake Lotus", 16, "dessert"), P("Cheese Cake Strawberry", 16, "dessert"),
  P("Coconut Cheesecake", 16, "dessert"), P("Labaniyah Cheesecake", 16, "dessert"),
  P("Chocolate Crunchy Cake", 22, "dessert"), P("Chocolate Red Velvet Pudding", 19, "dessert"),

  // ── Coffee bags (retail) ──
  P("American Coffee Bag", 21, "beans", "250g"), P("Espresso Beans Bag", 42, "beans", "500g"),
  P("Espresso Grinding Bag", 21, "beans", "250g"), P("French Coffee Bag", 29, "beans", "250g"),
  P("Saudi Coffee Bag", 30, "beans", "250g"), P("Turkish Coffee with Cardamom Bag", 22, "beans", "250g"),

  // ── Other ──
  P("Water Berain 600 mL", 2, "other"),
].map((p, i) => ({ sku: `BON-${String(i + 1).padStart(3, "0")}`, currency: "SAR", ...p }));

const HOURS = { open_24_hours: true, days: "Every day, including holidays", note: "BON Cafe is open 24/7 — never closes" };

const norm = (s) => (s || "").toLowerCase().trim();

export function searchProducts({ query }) {
  const q = norm(query);
  const words = q.split(/\s+/).filter(Boolean);
  const hits = PRODUCTS.filter((p) => {
    const hay = `${p.name} ${p.category} ${p.size || ""}`.toLowerCase();
    const tight = hay.replace(/\s+/g, ""); // "cheesecake" cocok dengan "Cheese Cake"
    return words.every((w) => hay.includes(w) || tight.includes(w.replace(/\s+/g, ""))) || norm(p.sku) === q;
  });
  return hits.slice(0, 15).map(({ sku, name, size, price, currency, category }) => ({
    sku, name: size ? `${name} (${size})` : name, price, currency, category,
  }));
}

export function getProduct({ sku }) {
  const p = PRODUCTS.find((x) => norm(x.sku) === norm(sku));
  return p || { error: "not_found" };
}

export function getBusinessHours() {
  return HOURS;
}

export function listCategories() {
  return [...new Set(PRODUCTS.map((p) => p.category))];
}
