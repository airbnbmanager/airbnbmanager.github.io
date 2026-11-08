/**
 * 👁️ MULTIMODAL VISION PARSER (Gemini Vision AI)
 * Automatically detects and extracts:
 * 1. UPI Payment Proof (PhonePe, GPay, Paytm, UTR, Amount)
 * 2. Government Photo ID (Aadhaar, DL, Passport, Name, Last 4 digits)
 * 3. General Room Photos & Inquiries
 */

const https = require('https');

async function parseImageWithGemini(base64Image, mimeType = 'image/jpeg', apiKey = '') {
  const geminiKey = apiKey || process.env.GEMINI_API_KEY || '';

  if (!geminiKey) {
    return {
      category: 'GENERAL',
      raw: 'No Gemini API Key configured in environment',
      auto_reply_message: '🙏 Dhanyawad! Aapki photo receive ho gayi hai. Hamare property manager ise jaldi review kar lenge.'
    };
  }

  const promptText = `You are the expert Multimodal AI Assistant for "The Unique Haven Homes" luxury homestays in Lucknow.
Analyze this image sent by a guest on WhatsApp.
Classify the image into ONE of these categories:
1. "PAYMENT" — A digital payment receipt/screenshot (UPI, PhonePe, Google Pay, Paytm, Cred, NetBanking, IMPS).
2. "GOVT_ID" — A Government Identity Document (Aadhaar Card front/back, Driving License, Passport, Voter ID).
3. "GENERAL" — Any other photo (room maintenance issue, luggage, selfie, location view, or document).

Return ONLY raw JSON without markdown formatting or codeblocks:
{
  "category": "PAYMENT" | "GOVT_ID" | "GENERAL",
  "payment": {
    "is_valid": true/false,
    "amount": 3500,
    "utr": "412345678901",
    "status": "SUCCESS" | "PENDING" | "FAILED",
    "app": "PhonePe / Google Pay / Paytm / Bank",
    "sender_name": "Name on receipt if visible",
    "timestamp": "Time/Date on receipt"
  },
  "govt_id": {
    "is_valid": true/false,
    "id_type": "Aadhaar Card" | "Driving License" | "Passport" | "Voter ID",
    "name": "Full Name",
    "id_last4": "1234"
  },
  "general": {
    "description": "Short explanation of the photo"
  },
  "auto_reply_message": "Polite, professional WhatsApp reply in welcoming Hindi/Hinglish confirming receipt and next steps"
}`;

  try {
    const postData = JSON.stringify({
      contents: [{
        parts: [
          { text: promptText },
          { inline_data: { mime_type: mimeType, data: base64Image } }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 500
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const res = await new Promise((resolve, reject) => {
      const req = https.request(options, (resp) => {
        let body = '';
        resp.on('data', chunk => body += chunk);
        resp.on('end', () => resolve({ statusCode: resp.statusCode, body }));
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    if (res.statusCode >= 200 && res.statusCode < 300) {
      const parsedRes = JSON.parse(res.body);
      const rawOutput = parsedRes.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleanJson = rawOutput.replace(/```json/gi, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanJson);

      // Customize friendly auto-replies
      if (result.category === 'PAYMENT' && result.payment?.amount) {
        const amt = result.payment.amount;
        const utr = result.payment.utr || 'Under Review';
        result.auto_reply_message =
`✅ *Payment Screenshot Received!*

💵 *Amount:* ₹${amt}
🏦 *UTR / Ref No:* ${utr}
📊 *Status:* ${result.payment.status || 'Verified'}

Dhanyawad ji! Aapka payment acknowledgment register ho gaya hai. Hamari reservation team dates lock karke booking confirmation receipt turant share kar rahi hai. 🙏`;
      } else if (result.category === 'GOVT_ID' && result.govt_id?.name) {
        result.auto_reply_message =
`🪪 *ID Verification Received!*

👤 *Name:* ${result.govt_id.name}
📄 *Document:* ${result.govt_id.id_type || 'Govt ID'} ${result.govt_id.id_last4 ? `(Ending in ${result.govt_id.id_last4})` : ''}

Aapka government ID proof safely record ho gaya hai. Digital check-in formalities complete ho gayi hain. Caretaker check-in ke waqt assist karenge. Welcome to The Unique Haven Homes! ✨`;
      }

      return result;
    } else {
      console.warn('⚠️ Gemini Vision API responded with:', res.statusCode, res.body);
    }
  } catch (err) {
    console.error('❌ Error in Gemini Vision parser:', err.message);
  }

  // Fallback response
  return {
    category: 'GENERAL',
    auto_reply_message: '🙏 Dhanyawad ji! Aapka photo document receive ho gaya hai. Team ise turant check kar rahi hai.'
  };
}

module.exports = {
  parseImageWithGemini
};
