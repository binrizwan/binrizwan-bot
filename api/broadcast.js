// ============================================
// Bin Rizwan — Broadcast Script (laptop se chalane ke liye)
// Chalane ka tareeqa (guide mein detail):
//   node broadcast-local.js new_collection all
// ============================================

import fs from "fs";

// ---- YEH 2 VALUES BHARO (Meta se milengi) ----
const WHATSAPP_TOKEN = "YAHAN_APNA_META_TOKEN_PASTE_KARO";
const PHONE_ID       = "YAHAN_APNA_PHONE_ID_PASTE_KARO";

// ---- Command se template aur segment ----
const templateName = process.argv[2]; // jaise: new_collection
const tag          = process.argv[3] || "all"; // all / vip / repeat / general

if (!templateName) {
  console.log("Aise chalao:  node broadcast-local.js TEMPLATE_NAAM [tag]");
  console.log("Misaal:       node broadcast-local.js new_collection all");
  process.exit(1);
}

// ---- Customer list: customers.csv (isi folder mein) ----
// Format (pehli line header):
// number,name,tag
// 03001234567,Ahmed,repeat
// 03119876543,Bilal,vip
let rows;
try {
  rows = fs.readFileSync("./customers.csv", "utf8").trim().split("\n").slice(1);
} catch {
  console.log("❌ customers.csv nahi mili. Isi folder mein banao (guide dekho).");
  process.exit(1);
}

let customers = rows.map(line => {
  const [number, name, ctag] = line.split(",").map(s => (s || "").trim());
  return { number: normalize(number), name, tag: ctag || "general" };
}).filter(c => c.number);

if (tag !== "all") customers = customers.filter(c => c.tag === tag);

console.log(`📢 Broadcast: "${templateName}" → ${customers.length} customers (tag: ${tag})`);
console.log("Safe rate pe ja raha hai (~1-2 sec per message). Chalne do...\n");

let sent = 0, failed = 0;
for (const c of customers) {
  try {
    await sendTemplate(c.number, templateName, c.name);
    sent++;
    console.log(`✅ ${sent}/${customers.length}  ${c.number}`);
  } catch (e) {
    failed++;
    console.log(`❌ Fail: ${c.number} — ${e.message.slice(0, 120)}`);
  }
  await sleep(1200 + Math.random() * 800);
}

console.log(`\n🎉 Mukammal! Sent: ${sent}, Failed: ${failed}`);

// ============================================
async function sendTemplate(to, name, custName) {
  const components = custName
    ? [{ type: "body", parameters: [{ type: "text", text: custName }] }]
    : [];

  const r = await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: { name, language: { code: "en" }, components },
    }),
  });
  if (!r.ok) throw new Error(await r.text());
}

function normalize(n) {
  if (!n) return null;
  let s = String(n).replace(/[^\d]/g, "");
  if (s.startsWith("0")) s = "92" + s.slice(1);
  else if (s.startsWith("3")) s = "92" + s;
  return s.length >= 11 ? s : null;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
