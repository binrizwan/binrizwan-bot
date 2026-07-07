// ============================================
// Bin Rizwan — Broadcast / Marketing System
// Meta Cloud API | Self-hosted | No third-party credits
// ============================================
// Yeh aap ke bot ke saath chalta hai. Apni customer list ko
// official API se broadcast bhejta hai — safe rate pe (ban nahi).
// ============================================

import express from "express";
import fs from "fs";

const router = express.Router();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID       = process.env.PHONE_ID;
const ADMIN_KEY      = process.env.ADMIN_KEY; // aap ka apna secret, broadcast trigger karne ke liye

// Customer list ek simple JSON file mein (aap ki apni database)
const DB = "./customers.json";

function loadCustomers() {
  try { return JSON.parse(fs.readFileSync(DB, "utf8")); }
  catch { return []; }
}
function saveCustomers(list) {
  fs.writeFileSync(DB, JSON.stringify(list, null, 2));
}

// ============================================
// CUSTOMER LIST — add / import
// ============================================

// Ek customer add karo (bot isse auto-call kar sakta hai jab koi message kare)
export function addCustomer(number, name = "", tag = "general") {
  const list = loadCustomers();
  if (!list.find(c => c.number === number)) {
    list.push({ number, name, tag, added: new Date().toISOString() });
    saveCustomers(list);
  }
}

// Bulk import — CSV/list se numbers daalne ke liye
// POST /admin/import  body: { key, customers: [{number, name, tag}] }
router.post("/admin/import", express.json(), (req, res) => {
  if (req.body.key !== ADMIN_KEY) return res.status(403).send("Wrong key");
  const list = loadCustomers();
  let added = 0;
  for (const c of req.body.customers || []) {
    const num = normalizeNumber(c.number);
    if (num && !list.find(x => x.number === num)) {
      list.push({ number: num, name: c.name || "", tag: c.tag || "general", added: new Date().toISOString() });
      added++;
    }
  }
  saveCustomers(list);
  res.send(`Imported ${added} naye customers. Total: ${list.length}`);
});

// List dekho
router.get("/admin/customers", (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.status(403).send("Wrong key");
  const list = loadCustomers();
  res.json({ total: list.length, tags: countTags(list) });
});

// ============================================
// BROADCAST — apni list ko campaign bhejo
// ============================================
// POST /admin/broadcast
// body: { key, template, tag, params: [] }
//   template = Meta pe approved template ka naam
//   tag      = kis segment ko (general / repeat / vip / all)
router.post("/admin/broadcast", express.json(), async (req, res) => {
  if (req.body.key !== ADMIN_KEY) return res.status(403).send("Wrong key");

  const { template, tag = "all", params = [] } = req.body;
  if (!template) return res.status(400).send("template naam chahiye");

  let list = loadCustomers();
  if (tag !== "all") list = list.filter(c => c.tag === tag);

  if (list.length === 0) return res.send("Is segment mein koi customer nahi.");

  // Turant response, broadcast background mein chalega
  res.send(`Broadcast shuru: ${list.length} customers ko "${template}". Safe rate pe ja raha hai, thodi der lagegi.`);

  // ---- SAFE RATE: ek-ek kar ke, thodi der ke gap se (ban se bachne ke liye) ----
  let sent = 0, failed = 0;
  for (const cust of list) {
    try {
      await sendTemplate(cust.number, template, cust.name, params);
      sent++;
    } catch (e) {
      failed++;
      console.error("Fail:", cust.number, e.message);
    }
    await sleep(1200 + Math.random() * 800); // ~1-2 sec gap har message
  }
  console.log(`Broadcast done. Sent: ${sent}, Failed: ${failed}`);
});

// ============================================
// SEND TEMPLATE MESSAGE (Meta official API)
// ============================================
async function sendTemplate(to, templateName, name, params) {
  const components = [];

  // Agar template mein {{1}} name variable hai
  if (name) {
    components.push({
      type: "body",
      parameters: [{ type: "text", text: name }, ...params.map(p => ({ type: "text", text: p }))],
    });
  } else if (params.length) {
    components.push({ type: "body", parameters: params.map(p => ({ type: "text", text: p })) });
  }

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
      template: {
        name: templateName,
        language: { code: "en" }, // template ki language jo Meta pe set ki
        components,
      },
    }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ============================================
// HELPERS
// ============================================
function normalizeNumber(n) {
  if (!n) return null;
  let s = String(n).replace(/[^\d]/g, "");
  if (s.startsWith("0")) s = "92" + s.slice(1);   // 03xx -> 923xx (Pakistan)
  if (s.startsWith("3")) s = "92" + s;            // 3xx -> 923xx
  return s.length >= 11 ? s : null;
}
function countTags(list) {
  const t = {};
  for (const c of list) t[c.tag] = (t[c.tag] || 0) + 1;
  return t;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export default router;
