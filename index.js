// ============================================
// Bin Rizwan WhatsApp Chatbot
// Self-hosted | Meta Cloud API | Menu + AI fallback
// ============================================

import express from "express";

const app = express();
app.use(express.json());

// ---- CONFIG (yeh values .env se aati hain) ----
const VERIFY_TOKEN   = process.env.VERIFY_TOKEN;      // apni marzi ka koi bhi word
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;    // Meta se milega
const PHONE_ID       = process.env.PHONE_ID;          // Meta se milega
const ANTHROPIC_KEY  = process.env.ANTHROPIC_KEY;     // AI fallback ke liye (optional)

const SITE = "binrizwan.com";

// Simple in-memory session (kis user ne kya select kiya)
const sessions = {};

// ============================================
// 1. WEBHOOK VERIFICATION (Meta isse connect verify karta hai)
// ============================================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified ✅");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// ============================================
// 2. INCOMING MESSAGES
// ============================================
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // Meta ko turant OK bhejo

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const msg = change?.messages?.[0];
    if (!msg) return;

    const from = msg.from; // customer ka number
    const text = (msg.text?.body || msg.button?.text || "").trim();

    await handleMessage(from, text);
  } catch (e) {
    console.error("Error:", e);
  }
});

// ============================================
// 3. MESSAGE ROUTING LOGIC
// ============================================
async function handleMessage(from, text) {
  const lower = text.toLowerCase();

  // Greeting / start
  if (["hi","hello","salam","assalam","start","menu","hey"].some(g => lower.includes(g)) || !sessions[from]) {
    sessions[from] = { stage: "menu" };
    return sendText(from, WELCOME);
  }

  // Menu selections
  if (text === "1" || lower.includes("product") || lower.includes("collection")) {
    return sendText(from, PRODUCTS);
  }
  if (text === "2" || lower.includes("order") || lower.includes("status")) {
    sessions[from].stage = "order";
    return sendText(from, ORDER_ASK);
  }
  if (text === "3" || lower.includes("size")) {
    return sendText(from, SIZE_GUIDE);
  }
  if (text === "4" || lower.includes("delivery") || lower.includes("payment") || lower.includes("cod")) {
    return sendText(from, DELIVERY);
  }
  if (text === "5" || lower.includes("baat") || lower.includes("human") || lower.includes("agent")) {
    return sendText(from, "Aap ki request team ko forward kar di hai. Koi thodi der mein reply karega. 🙏\n\nUrgent? Call/WhatsApp: [apna number daalein]");
  }

  // Order number diya
  if (sessions[from]?.stage === "order" && /#?br?\d+/i.test(text)) {
    return sendText(from, `Aap ka order (${text}) check kar rahe hain — team abhi status confirm kar ke batati hai. 📦\n\nAksar orders 2-4 din mein deliver ho jate hain.`);
  }

  // ---- AI FALLBACK (jo menu mein na aaye) ----
  if (ANTHROPIC_KEY) {
    const reply = await aiReply(text);
    return sendText(from, reply);
  }

  // AI off hai to menu wapas
  return sendText(from, "Maaf kijiye samajh nahi aaya 🙏\n\n" + WELCOME);
}

// ============================================
// 4. AI FALLBACK (Claude)
// ============================================
async function aiReply(userText) {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userText }],
      }),
    });
    const data = await r.json();
    return data.content?.[0]?.text || ("Thodi der baad koshish karein ya menu ke liye 'menu' likhein.");
  } catch (e) {
    console.error("AI error:", e);
    return "Abhi reply nahi de pa raha. 'menu' likhein options ke liye. 🙏";
  }
}

// ============================================
// 5. SEND MESSAGE (Meta Cloud API)
// ============================================
async function sendText(to, body) {
  await fetch(`https://graph.facebook.com/v21.0/${PHONE_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });
}

// ============================================
// MESSAGE TEMPLATES (Roman Urdu / English)
// ============================================
const WELCOME = `Assalam-o-Alaikum! 👋 Bin Rizwan mein khush-aamdeed.

Premium Arabic thobes, kameez shalwar aur festive wear — international quality, made in Pakistan. 🇵🇰

Main kaise madad karun?

1️⃣ Products dekhein
2️⃣ Order status
3️⃣ Size guide
4️⃣ Delivery & payment
5️⃣ Kisi se baat karein

Number reply karein ya seedha sawaal likhein.`;

const PRODUCTS = `Hamara collection 👇

🕌 Thobes: ${SITE}/collections/thobes
👔 Kameez Shalwar: ${SITE}/collections/kameez-shalwar
✨ Festive Wear: ${SITE}/collections/festive
🧢 Accessories: ${SITE}/collections/accessories

Koi khaas cheez chahiye? Naam ya style likhein!`;

const SIZE_GUIDE = `📏 Size Guide

Apni chest aur height batayein, main perfect size bataun.

• S — Chest 38-40", Ht 5'4"-5'6"
• M — Chest 40-42", Ht 5'6"-5'8"
• L — Chest 42-44", Ht 5'8"-5'10"
• XL — Chest 44-46", Ht 5'10"-6'0"
• XXL — Chest 46-48", Ht 6'0"+

Length customize bhi ho sakti hai!`;

const DELIVERY = `🚚 Delivery & Payment

✅ Cash on Delivery — poore Pakistan
✅ Bank transfer / card (advance)
✅ Delivery: 2-4 working days
✅ International (EU/USA) bhi available

"international" likhein details ke liye.`;

const ORDER_ASK = `Apna order number batayein (jaise #BR1234) — main status check karta hoon. 📦`;

const SYSTEM_PROMPT = `You are the WhatsApp assistant for Bin Rizwan, a premium Pakistani Eastern menswear brand (Arabic thobes, kameez shalwar, festive wear, accessories). Reply in warm Roman Urdu/English mix, like a friendly Pakistani shopkeeper. Keep replies short (2-4 lines) with occasional emojis. Always guide toward a purchase or the website (${SITE}). For sizing ask chest+height. Never invent prices, stock, or delivery dates — for those, direct to the website or offer to connect a human. Brand tone: premium, respectful, international quality made in Pakistan.`;

// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bin Rizwan bot running on port ${PORT} 🚀`));
