// ============================================
// Bin Rizwan WhatsApp Bot — Vercel version
// File ka naam/jagah: api/webhook.js  (bilkul aise hi)
// ============================================

const VERIFY_TOKEN   = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID       = process.env.PHONE_ID;
const ANTHROPIC_KEY  = process.env.ANTHROPIC_KEY; // optional (AI replies)

const SITE = "binrizwan.com";

export default async function handler(req, res) {
  // ---- Meta webhook verification (GET) ----
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
  }

  // ---- Incoming messages (POST) ----
  if (req.method === "POST") {
    res.status(200).json({ ok: true }); // Meta ko turant OK

    try {
      const entry = req.body.entry?.[0];
      const change = entry?.changes?.[0]?.value;
      const msg = change?.messages?.[0];
      if (!msg) return;

      const from = msg.from;
      const text = (msg.text?.body || msg.button?.text || "").trim();
      await handleMessage(from, text);
    } catch (e) {
      console.error("Error:", e);
    }
    return;
  }

  res.status(405).send("Method not allowed");
}

// ============================================
// ROUTING (stateless — har message khud mukammal)
// ============================================
async function handleMessage(from, text) {
  const lower = text.toLowerCase();

  if (text === "1" || lower.includes("product") || lower.includes("collection")) {
    return sendText(from, PRODUCTS);
  }
  if (text === "2" || lower.includes("order") || lower.includes("status") || /#?br\d+/i.test(lower)) {
    // Order number saath hai to woh bhi handle
    const orderMatch = text.match(/#?br?\d+/i);
    if (orderMatch) {
      return sendText(from, `Aap ka order (${orderMatch[0]}) team check kar ke thodi der mein confirm karti hai. 📦\n\nAksar orders 2-4 din mein deliver ho jate hain.`);
    }
    return sendText(from, ORDER_ASK);
  }
  if (text === "3" || lower.includes("size")) {
    return sendText(from, SIZE_GUIDE);
  }
  if (text === "4" || lower.includes("delivery") || lower.includes("payment") || lower.includes("cod")) {
    return sendText(from, DELIVERY);
  }
  if (text === "5" || lower.includes("baat") || lower.includes("human") || lower.includes("agent")) {
    return sendText(from, "Aap ki request team ko de di hai — koi thodi der mein khud reply karega. 🙏");
  }
  if (["hi","hello","salam","assalam","start","menu","hey","aoa"].some(g => lower.includes(g))) {
    return sendText(from, WELCOME);
  }

  // AI fallback
  if (ANTHROPIC_KEY) {
    const reply = await aiReply(text);
    return sendText(from, reply);
  }
  return sendText(from, "Maaf kijiye samajh nahi aaya 🙏\n\n" + WELCOME);
}

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
    return data.content?.[0]?.text || "Thodi der baad koshish karein ya 'menu' likhein.";
  } catch {
    return "Abhi reply nahi de pa raha. 'menu' likhein options ke liye. 🙏";
  }
}

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
// TEMPLATES
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

const SYSTEM_PROMPT = `You are the WhatsApp assistant for Bin Rizwan, a premium Pakistani Eastern menswear brand (Arabic thobes, kameez shalwar, festive wear, accessories). Reply in warm Roman Urdu/English mix, like a friendly Pakistani shopkeeper. Keep replies short (2-4 lines) with occasional emojis. Always guide toward a purchase or the website (${SITE}). For sizing ask chest+height. Never invent prices, stock, or delivery dates — direct to the website or offer a human. Brand tone: premium, respectful, international quality made in Pakistan.`;
