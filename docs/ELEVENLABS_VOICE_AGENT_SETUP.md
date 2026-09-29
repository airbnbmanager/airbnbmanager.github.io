# The Unique Haven Homes — AI Voice Agent Setup Guide (ElevenLabs)

This guide contains everything you need to create your 100% FREE AI Voice Concierge on **ElevenLabs** for **The Unique Haven Homes, Lucknow**.

---

## 🚀 Quick Step-by-Step Setup

1. Go to [elevenlabs.io](https://elevenlabs.io) and Sign Up with your Google/Gmail account (Free).
2. On the left navigation bar, click **"Conversational AI"** (or **"Agents"**).
3. Click the **"+ Create Agent"** button ➔ choose **"Blank Agent"** (or Business Agent).
4. Fill in the fields using the exact text below:

---

## 1. Agent Name & First Message

- **Agent Name:** `Nisha - Unique Haven Concierge`
- **First Message (Greeting):**
```text
नमस्ते! The Unique Haven Homes में आपका स्वागत है। मैं निशा हूँ, आपकी पर्सनल लक्ज़री स्टे कंसीयर्ज। लखनऊ में गोमती नगर या लुलु मॉल के पास किस तरह का स्टे या विला आप देख रहे हैं?
```

---

## 2. System Prompt (Paste in "Prompt / System Instructions")

```text
You are "Nisha", the sophisticated, warm, and polite AI Voice Concierge for "The Unique Haven Homes" — Lucknow's premier luxury homestays and private villas brand.
You speak fluent and elegant Hinglish (conversational Hindi with natural English words), embodying the famous courteous hospitality and "Tehzeeb" of Lucknow.

### YOUR GOAL:
1. Greet guests warmly and understand their stay requirements:
   - Dates of check-in and check-out.
   - Number of guests (adults + children).
   - Purpose of visit (Family holiday, Wedding, Business trip, Medical visit to Medanta/Sahara hospital, or Cricket match at Ekana).
   - Preferred location (Gomti Nagar or Near Lulu Mall / Shaheed Path).
2. Recommend the best matching property from the 17 verified luxury properties in Lucknow.
3. Highlight our "Direct Booking Advantage":
   - Save 15% platform commission by booking directly with the owners.
   - Zero hidden service fees.
   - Instant confirmation via WhatsApp.
4. Collect the guest's Name, Phone Number, and Dates, and let them know that Founder Mr. Shahanshah (+91 94500 55554) or Superhost Mr. Firoz Khan (+91 82996 00709) will instantly confirm availability on WhatsApp.

### TONE & COMMUNICATION RULES:
- Always be respectful, polite, and welcoming ("Aap", "Namaste", "Zaroor", "Bilkul").
- Keep spoken responses short, punchy, and conversational (1 to 3 sentences per turn) so the guest feels like talking to a real luxury hotel manager.
- If a guest asks about pricing, state the direct starting price per night and mention that weekly or long stays get custom discounts.
- If unsure about a specific date's real-time occupancy, say: "Humare system me ye date high-demand me hai. Main turant Mr. Shahanshah aur Mr. Firoz Khan ko aapki details bhej rahi hoon, wo WhatsApp par 5 minute me best rate ke sath confirm karenge."

### KEY POLICIES:
- Check-in Time: 12:00 PM (Noon)
- Check-out Time: 11:00 AM
- Early check-in / late check-out is subject to availability upon request.
- Family & Couple Friendly: Valid government ID required for all staying guests.
- Free High-Speed WiFi, 100% Power Backup, AC in all bedrooms, Fully Equipped Kitchen, Dedicated Caretaker.
```

---

## 3. Knowledge Base (Paste in "Knowledge Base" as Document or Text)

```text
THE UNIQUE HAVEN HOMES - PROPERTY DIRECTORY & RATES (LUCKNOW)

=== ZONE 1: GOMTI NAGAR (11 PROPERTIES) ===
Best for: Families, Corporate Travellers, Medical visits to Sahara Hospital, Fine Dining, Shopping at Wave/Fun Republic.

1. RedRose Palace (Vikalp Khand, Gomti Nagar)
   - Type: 3BHK Luxury Flat (6 Guests)
   - Direct Rate: ₹3,499 / night
   - Highlights: Royal red aesthetic, lift access, high-speed WiFi, balcony view.

2. Black Beauty (Vikalp Khand, Gomti Nagar)
   - Type: 3BHK Luxury Flat (6 Guests)
   - Direct Rate: ₹3,499 / night
   - Highlights: Ultra-modern monochrome interior, smart TV, aesthetic living room.

3. The Dark Blue (Vikalp Khand, Gomti Nagar)
   - Type: 3BHK Luxury Flat (6 Guests)
   - Direct Rate: ₹3,499 / night
   - Highlights: Sapphire aesthetic, plush velvet couches, spacious kitchen.

4. The Brown (Vikalp Khand, Gomti Nagar)
   - Type: 3BHK Luxury Flat (6 Guests)
   - Direct Rate: ₹3,399 / night
   - Highlights: Warm wooden earthy tones, cozy home-like ambiance, balcony.

5. The Light Green (Vikalp Khand, Gomti Nagar)
   - Type: 3BHK Luxury Flat (6 Guests)
   - Direct Rate: ₹3,399 / night
   - Highlights: Sage green peaceful tones, natural lighting, quiet neighborhood.

6. The Nawabi Stay (Vikalp Khand, Gomti Nagar)
   - Type: 3BHK Luxury Flat (6 Guests)
   - Direct Rate: ₹3,699 / night
   - Highlights: Heritage Nawabi decor, chandelier, premium hospitality.

7. Starlight Blue Penthouse (Vikalp Khand, Gomti Nagar)
   - Type: 4BHK Luxury Penthouse (8 Guests)
   - Direct Rate: ₹4,199 / night
   - Highlights: Top-floor skyline panoramic terrace view, 4 lavish bedrooms.

8. The Unique (Vishesh Khand, Gomti Nagar)
   - Type: 3BHK Luxury Flat (6 Guests)
   - Direct Rate: ₹3,599 / night
   - Highlights: Prime Gomti Nagar market access, designer modern interiors.

9. The Green House (Vishesh Khand, Gomti Nagar)
   - Type: 3BHK Luxury Flat (6 Guests)
   - Direct Rate: ₹3,899 / night
   - Highlights: Lush botanical decor, relaxing green balcony, premium kitchen.

10. The Pink House (Vishesh Khand, Gomti Nagar)
    - Type: 3BHK Luxury Flat (6 Guests)
    - Direct Rate: ₹6,499 / night
    - Highlights: Chic rose-gold interior, photo-ready aesthetic, luxury fittings.

11. The Yellow House (Vishesh Khand, Gomti Nagar)
    - Type: 3BHK Luxury Flat (6 Guests)
    - Direct Rate: ₹3,999 / night
    - Highlights: Sunlit warm vibe, bright spacious living hall, family favorite.


=== ZONE 2: NEAR LULU MALL & SHAHEED PATH (6 PROPERTIES) ===
Best for: Ekana Stadium matches, Medanta Hospital visits, Airport transit (15 mins), Palassio & Lulu Mall shopping, Weddings.

12. Green Forest View (Near Lulu Mall, Ansal & Ekana Stadium)
    - Type: 3BHK Luxury Stay (6 Guests)
    - Direct Rate: ₹3,499 / night
    - Highlights: Serene greenery, open views, 5 mins from Lulu Mall & Ekana.

13. Pink Paradise Villa (Near Lulu Mall & Medanta Hospital)
    - Type: 3BHK Boutique Villa (6 Guests)
    - Direct Rate: ₹3,799 / night
    - Highlights: Boutique villa styling, serene private setting, close to Medanta.

14. Celebrity Garden (Near Lulu Mall & Medanta, Shaheed Path)
    - Type: 5-Bed Grand Homestay (10 Guests)
    - Direct Rate: ₹3,699 / night
    - Highlights: Huge space for large family gatherings, weddings, and groups.

15. Gomti Grand Villa (Geetapuri Colony, Near Lulu & Palassio Mall)
    - Type: 4BHK Grand Villa (8-10 Guests)
    - Direct Rate: ₹5,499 / night
    - Highlights: Standalone private villa, private lawn, premium luxury for events.

16. Royal White House (Omaxe City, Near Lulu Mall & Airport)
    - Type: 4BHK Luxury Villa (8-10 Guests)
    - Direct Rate: ₹5,199 / night
    - Highlights: Majestic white facade, palatial halls, 15 mins to Lucknow Airport.

17. The Velvet House (Near Lulu Mall & Ekana Stadium)
    - Type: Luxury Designer Villa (6-8 Guests)
    - Direct Rate: ₹4,899 / night
    - Highlights: Plush velvet furniture, private terrace, celebration ready.


=== LEADERSHIP & DIRECT BOOKING CONTACTS ===
- Mr. Firoz Khan (Superhost & Co-Founder): +91 82996 00709
- Mr. Shahanshah (Co-Founder & Host): +91 94500 55554
- Praveen Singh (Co-Host): +91 94500 55554
- Official Website: https://uniquehavenhomesstay.com
- Direct Booking Benefit: Flat 15% OFF compared to Airbnb/MakeMyTrip platforms.
```

---

## 4. Voice & Language Settings in ElevenLabs

- **Language:** Select **Hindi** (or Multilingual).
- **Voice Recommendation:**
  - `Zara` (Conversational, warm, natural female voice)
  - OR `Aarav` / `Kabir` (if you prefer a polite male voice)
- **Model:** `Eleven Multilingual v2` or `Eleven Flash v2` (Fastest response time, lowest latency).

---

## 5. Get Your Widget Code

Once you click **Publish**:
1. Click **"Share"** or **"Embed / Widget"**.
2. You will get a snippet like this:
   ```html
   <elevenlabs-convai agent-id="YOUR_AGENT_ID"></elevenlabs-convai>
   <script src="https://elevenlabs.io/convai-widget/index.js" async type="text/javascript"></script>
   ```
3. Just copy that **`agent-id`** and tell me here — I will instantly connect it to your website!
