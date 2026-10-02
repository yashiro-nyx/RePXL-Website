/**
 * RePXL AI Concierge — shared web copy of the mobile concierge logic.
 *
 * FAITHFUL PORT of `react-native/data/ai-concierge.ts` so the website chat widget
 * and the mobile Support screen answer identically (one support "brain", two
 * frontends). The logic is a pure, local, rule-based responder — there is no
 * server, database, human agent, or network call involved. It never fabricates
 * order/account/tracking data; order-specific questions are answered with
 * guidance that points the customer to their authenticated Orders page.
 *
 * Parity with the mobile source is enforced by `src/lib/ai-concierge.test.ts`.
 * If you change one, change the other (or extract both into a shared package).
 *
 * Keep this file dependency-free (no imports) so it stays a pure function usable
 * in the browser, on the server, and in tests unchanged.
 */

export interface PromptCategory {
  id: string;
  label: string;
  icon: string;
  prompts: string[];
}

export interface AiAction {
  type: 'orders' | 'browse' | 'faq' | 'contact' | 'compare';
  label: string;
  payload?: string;
}

export interface AiResponseResult {
  text: string;
  suggestedFollowUps?: string[];
  action?: AiAction;
}

export const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: 'popular',
    label: 'Popular',
    icon: 'zap',
    prompts: [
      'Recommend a CCD camera',
      'How does condition grading work?',
      'Where is my order?',
      'What is your return policy?',
      'How to transfer photos to phone?',
      'What payment methods do you accept?',
    ],
  },
  {
    id: 'recommendations',
    label: 'Buying Guide',
    icon: 'camera',
    prompts: [
      'Best camera for Y2K flash photography',
      'Best camera for warm vintage colors',
      'Best compact digicam for travel',
      'Best budget vintage camera under ₱3,500',
      'Best camera for beginners',
      'Canon IXY vs Sony Cyber-shot',
    ],
  },
  {
    id: 'grading',
    label: 'Grading & Quality',
    icon: 'award',
    prompts: [
      'How does condition grading work?',
      'What is included with Excellent condition?',
      'How are sensors and lenses tested?',
      'Do vintage cameras have fungus or haze?',
      'Does LCD yellowing affect photos?',
      'Are all cameras 100% authentic vintage?',
    ],
  },
  {
    id: 'tech',
    label: 'Battery & Storage',
    icon: 'battery-charging',
    prompts: [
      'What memory card size should I use?',
      'Does it come with battery and charger?',
      'How to fix Memory Card Error on older cameras?',
      'How to care for vintage batteries?',
      'Can I use standard AA batteries?',
      'How to transfer photos to phone?',
    ],
  },
  {
    id: 'orders',
    label: 'Orders & Shipping',
    icon: 'truck',
    prompts: [
      'Where is my order?',
      'How long does shipping take in the Philippines?',
      'Can I request same-day delivery in Metro Manila?',
      'How are cameras packaged for delivery?',
      'Can I cancel or change my order?',
      'Do you offer international shipping?',
    ],
  },
  {
    id: 'returns',
    label: 'Payment & Returns',
    icon: 'shield',
    prompts: [
      'What is your 14-day return policy?',
      'What payment methods do you accept?',
      'How does Cash on Delivery (COD) work?',
      'What if my camera arrives damaged?',
      'Do you have discount codes or vouchers?',
      'How long do refunds take?',
    ],
  },
  {
    id: 'aesthetics',
    label: 'Aesthetics & Tips',
    icon: 'sliders',
    prompts: [
      'Why do CCD sensors look better than phones?',
      'What is the "Try the Look" simulator?',
      'Why are my indoor photos blurry or dark?',
      'Can vintage digicams shoot video?',
      'How to store and clean vintage cameras?',
      'How can I sell my camera to RePXL?',
    ],
  },
];

export const QUICK_PROMPTS = PROMPT_CATEGORIES[0].prompts;

/** Standard response when no supported RePXL answer can be identified. */
export const FALLBACK_REPLY = "Thanks for your question. I don't have enough information to answer that accurately. I can help with RePXL cameras, condition grading, orders, shipping, payments, and returns. Please rephrase your question or choose a suggested topic. If you still need help, contact our support team through Contact Us.";

function fallbackResponse(): AiResponseResult {
  return {
    text: FALLBACK_REPLY,
    suggestedFollowUps: ['How does condition grading work?', 'Where is my order?', 'What payment methods do you accept?'],
    action: { type: 'contact', label: 'Contact Support' },
  };
}

function hasSupportContext(query: string): boolean {
  // Broad words such as "good", "code", "where is", and "how long" alone
  // are not evidence that a question concerns this store or vintage cameras.
  const conversation = /^(?:hi|hello|hey|kamusta|musta|sup|yo|greetings|good\s*(?:morning|day|afternoon|evening)|thanks?(?: you)?|salamat|matsala|awesome|cool|that(?: was| is)? helpful)[\s!?.]*$/i;
  const identityOrSupport = /\b(who are you|what are you|what can you do|are you ai|are you a bot|bot info|human support|support team|customer service|contact us|contact support|contact human|real person|speak (?:to|with) (?:an? )?(?:human|agent|representative)|talk to (?:an? )?(?:human|agent|representative))\b/i;
  const topics = /\b(repxl|repixl|cameras?|digicams?|ccd|cmos|photos?|photography|canon|ixy|ixus|powershot|sony|cyber[ -]?shot|kodak|easyshare|fujifilm|finepix|nikon|coolpix|olympus|camedia|casio|exilim|batter(?:y|ies)|chargers?|memory card|sd cards?|sdhc|sdxc|memory stick|xd card|card reader|condition|grading|fungus|haze|lcd|sensor|lens|lenses|try the look|compare tool|orders?|purchases|packages?|parcels?|shipping|ship|lead time|transit time|delivery|courier|tracking|gcash|maya|paymongo|cod|cash on delivery|payment methods?|voucher|promo|coupon|return policy|return request|refund policy|refund status|refund processing|refunds|warranty|consignment|trade-in)\b/i;
  const shortTopic = /^(?:returns?|refund|payments?|shipping|delivery|grading|mint|excellent|good|fair|authenticity|international shipping|video capabilities|can it shoot video)[\s!?.]*$/i;
  return conversation.test(query) || identityOrSupport.test(query) || topics.test(query) || shortTopic.test(query)
    || PROMPT_CATEGORIES.some((category) => category.prompts.some((prompt) => prompt.trim().toLowerCase() === query));
}

export function generateAiResponse(input: string): AiResponseResult {
  const query = input.trim().toLowerCase();
  if (!hasSupportContext(query)) return fallbackResponse();

  // 1. Greetings & Small Talk
  if (/^(hi|hello|hey|kamusta|musta|good\s*(morning|day|afternoon|evening)|sup|yo|greetings)[\s!?.]*$/i.test(query) || query === 'hi' || query === 'hello' || query === 'hey' || query === 'kamusta') {
    return {
      text: `👋 Kumusta! Welcome to RePXL, your curated home for vintage digital cameras.

I'm your AI Concierge, specially trained on:
• 2000s CCD color science & digicam aesthetics
• Standardized condition grading (Mint, Excellent, Good, Fair)
• Battery care, SD card compatibility & photo transfers
• Live order tracking, payments, and 14-day returns

How can I help you find your dream camera or assist with your order today?`,
      suggestedFollowUps: [
        'Recommend a CCD camera',
        'How does condition grading work?',
        'Where is my order?',
        'How to transfer photos to phone?',
      ],
      action: { type: 'browse', label: 'Explore Vintage Cameras' },
    };
  }

  // 2. Appreciation & Thanks
  if (/\b(thank|thanks|salamat|appreciate|helpful|awesome|great help|matsala|cool)\b/i.test(query)) {
    return {
      text: `You're very welcome! 😊

Vintage photography is all about slowing down, enjoying the authentic Y2K look, and rediscovering the tactile joy of digital cameras.

If you have more questions about camera specs, accessories, or tracking an order, feel free to ask anytime!`,
      suggestedFollowUps: [
        'Recommend a CCD camera',
        'What is your return policy?',
        'Where is my order?',
      ],
      action: { type: 'browse', label: 'Browse Available Cameras' },
    };
  }

  // 3. Bot Identity & About RePXL
  if (/\b(who are you|what are you(?=[\s?!.]*$)|what can you do|about repxl|what is repxl|are you ai|are you a bot|bot info)\b/i.test(query)) {
    return {
      text: `🤖 I am the **RePXL AI Concierge**!

RePXL is a specialized marketplace dedicated to curated, authenticated, and collector-tested vintage digital cameras from the golden 1998–2010 CCD era.

You can ask me anything about:
• **Camera buying advice** tailored to your budget or aesthetic
• **Technical guidance** on memory cards, batteries, and transfer cables
• **Condition grading standards** and optical inspections
• **Shipping timeframes, payment methods, and return policies**`,
      suggestedFollowUps: [
        'How does condition grading work?',
        'Recommend a CCD camera',
        'Contact human team',
      ],
      action: { type: 'browse', label: 'Explore Catalog' },
    };
  }

  // 4. Human Support / Agent
  if (/\b(human|agent|representative|talk to|speak to|real person|customer service|live agent|contact person)\b/i.test(query)) {
    return {
      text: `I can connect you directly with our human support team! 👥

• **In-App Message**: Switch to the **Contact Us** tab to send a ticket with your details.
• **Email**: Reach us directly at **support@repxl.com**.
• **Operating Hours**: Monday to Saturday, 9:00 AM – 6:00 PM PHT.
• **Response Time**: Usually within 24 hours on business days.`,
      suggestedFollowUps: [
        'Track an active order',
        'What is your return policy?',
        'How to sell to RePXL',
      ],
      action: { type: 'contact', label: 'Open Contact Form' },
    };
  }

  // 5. CCD vs CMOS & Color Science
  if (/\b(ccd|cmos|color science|film look|film aesthetic|why ccd|sensor difference|digicam look|ccd sensor)\b/i.test(query)) {
    return {
      text: `🎞️ **Why Vintage CCD Sensors Are Legendary:**

Cameras made between 2000 and 2010 utilized **CCD (Charge-Coupled Device)** sensors rather than modern smartphone CMOS sensors.

**What makes CCD special?**
• **Rich Color Saturation**: Warm, flattering skin tones, punchy reds, and cinematic blues straight out of camera.
• **Natural Highlight Roll-off**: Gentle bloom around bright light sources rather than artificial digital clipping.
• **Authentic Optical Character**: Real multi-element zoom glass captures genuine depth of field without AI blur.
• **Zero AI Post-Processing**: What you shoot is authentic, unadulterated retro nostalgia.

Check out the **'Try the Look'** color simulation on any camera listing to preview each CCD sensor's unique output!`,
      suggestedFollowUps: [
        'Recommend a CCD camera',
        'What is Try the Look?',
        'Best camera for Y2K flash photography',
      ],
      action: { type: 'browse', label: 'Explore CCD Cameras' },
    };
  }

  // 6. Party / Night / Y2K Flash Photography
  if (/\b(y2k|party|club|flash|night|celebrity|paparazzi|strobe)\b/i.test(query)) {
    return {
      text: `📸 **Top Picks for the Y2K Flash Party Aesthetic:**

To get that iconic 2000s celebrity night-out photo with a crisp, illuminated subject and dark background, look for these compact digicams with punchy xenon strobes:

1. **Canon IXY Digital / PowerShot SD Series** (e.g. IXY 930 IS, SD1000)
   • Ultra-crisp flash synchronization with flattering, warm skin tones.
2. **Sony Cyber-shot DSC-W Series** (e.g. W80, W300)
   • Carl Zeiss Vario-Tessar lens with high micro-contrast and quick shutter response.
3. **Fujifilm FinePix F-Series** (e.g. F30, F31fd)
   • Famous for natural flash balance and low-light performance.

💡 **Pro Tip**: Set your camera to **Forced Flash (Fill Flash)** and stand 1.5–2.5 meters from your subject!`,
      suggestedFollowUps: [
        'How to transfer photos to phone?',
        'What memory card size should I use?',
        'Canon IXY vs Sony Cyber-shot',
      ],
      action: { type: 'browse', label: 'Browse Party Digicams' },
    };
  }

  // 7. Warm / Golden / Kodacolor Nostalgia
  if (/\b(warm|kodak|easyshare|nostalgic|golden hour|vintage color|filmic|retro color)\b/i.test(query)) {
    return {
      text: `🌅 **Best Cameras for Warm Nostalgic Colors:**

If you love golden, filmic photos with rich reds, ambers, and nostalgic warmth:

1. **Kodak EasyShare Series** (e.g. C-series, Z-series)
   • Renowned for Kodak Kodacolor color science—gives instant golden-hour nostalgia with zero editing.
2. **Fujifilm FinePix Series** (Super CCD models)
   • Velvia and Provia film simulation modes deliver vibrant organic greens and skies.
3. **Olympus Camedia Series**
   • Classic Japanese color profile with dreamy pastel tones and soft contrast.

Check out the **'Try the Look'** color preview button on any camera listing!`,
      suggestedFollowUps: [
        'What batteries does Kodak use?',
        'Recommend a CCD camera',
        'Best camera for beginners',
      ],
      action: { type: 'browse', label: 'View Kodak & Fuji Cameras' },
    };
  }

  // 8. Beginners / Starter Camera
  if (/\b(beginner|first camera|first digicam|starter|easy to use|new to vintage|entry level|simple to use)\b/i.test(query)) {
    return {
      text: `✨ **Best Vintage Digicams for Beginners:**

Starting your vintage camera journey? Here are our most user-friendly recommendations:

1. **Canon PowerShot A-Series** (e.g. A590 IS, A570 IS, A720 IS)
   • **Why it's great**: Runs on standard AA rechargeable batteries and uses standard SD cards. No hunting for rare proprietary chargers!
2. **Canon PowerShot SD1000 / IXUS 70**
   • **Why it's great**: Minimalist metal box body, instant startup, and foolproof automatic modes.
3. **Nikon Coolpix L-Series** (e.g. L20, L22)
   • **Why it's great**: Intuitive menu, durable build, and easy AA power.

All of these models have easily accessible accessories and straightforward photo transfer!`,
      suggestedFollowUps: [
        'Can I use standard AA batteries?',
        'What memory card size should I use?',
        'How does condition grading work?',
      ],
      action: { type: 'browse', label: 'Browse Beginner Cameras' },
    };
  }

  // 9. Budget / Affordable (< ₱3,500)
  if (/\b(budget|cheap|affordable|3500|3000|4000|5000|low price|inexpensive|sulit)\b/i.test(query)) {
    return {
      text: `🏷️ **Best Value Vintage Digicams Under ₱3,500:**

You don't need a huge budget to experience real CCD vintage photography! Look out for:

1. **Olympus Camedia & FE Series**
   • Pocket-friendly, distinct early-2000s color character, and very affordable.
2. **Casio Exilim EX-Z Series**
   • Ultra-slim aluminum bodies, snappy shutter lag, and great battery life.
3. **Nikon Coolpix L or S Series**
   • Solid construction, reliable metering, and punchy CCD saturation.

💡 **Grade Tip**: Choosing **Good** condition on RePXL is the most cost-effective way to get a fully tested camera with authentic vintage patina!`,
      suggestedFollowUps: [
        'What is included with Good condition?',
        'What payment methods do you accept?',
        'What is your return policy?',
      ],
      action: { type: 'browse', label: 'Browse Budget Deals' },
    };
  }

  // 10. Slim / Pocketable / Metal Body
  if (/\b(slim|pocket|metal|sliding|edc|compact|tiny|small|sleek)\b/i.test(query)) {
    return {
      text: `📱 **Sleekest Metal Pocket Digicams:**

For a camera that slides effortlessly into a jacket or jeans pocket:

1. **Sony Cyber-shot DSC-T Series** (e.g. T10, T77, T90)
   • Signature vertical slide-down lens cover, premium brushed metal chassis, and periscope optical zoom.
2. **Canon Digital IXUS / IXY Series** (e.g. IXY 600, IXUS 80 IS)
   • Iconic Japanese aluminum unibody styling, lightweight, and pocket-perfect.
3. **Casio Exilim Card Series**
   • Incredibly thin (credit-card footprint), fast startup, and vibrant LCD screen.`,
      suggestedFollowUps: [
        'What memory card does Sony use?',
        'Recommend a CCD camera',
        'Compare Canon vs Sony',
      ],
      action: { type: 'browse', label: 'Browse Pocket Digicams' },
    };
  }

  // 11. Brand Comparisons
  if (/\b(canon(?: ixy)? vs sony(?: cyber-shot)?|sony vs canon|fuji vs canon|nikon vs canon|compare brands|which brand)\b/i.test(query)) {
    return {
      text: `⚖️ **Vintage Camera Brand Comparison:**

• **Canon (PowerShot & IXY)**: The gold standard for warm, natural skin tones, sharp optics, and intuitive menus.
• **Sony (Cyber-shot)**: Powered by Carl Zeiss lenses—features razor-sharp micro-contrast, punchy saturation, and high-tech slim bodies.
• **Kodak (EasyShare)**: Warmest, most nostalgic film-like color science; exceptional golden hour warmth.
• **Fujifilm (FinePix)**: Unique Super CCD sensors that offer rich greens, dynamic range, and retro film simulations.
• **Nikon (Coolpix)**: Balanced, true-to-life colors and durable, rugged build quality.

You can compare any models side-by-side using the Compare tool in this app!`,
      suggestedFollowUps: [
        'Best camera for Y2K flash photography',
        'Recommend a CCD camera',
        'What is Try the Look?',
      ],
      action: { type: 'compare', label: 'Open Compare Tool' },
    };
  }

  // 12. General Recommendations
  if (/\b(recommend|recommendation|best camera|which camera|suggest|what should i buy|what camera)\b/i.test(query)) {
    return {
      text: `📸 **Finding Your Ideal Vintage Camera:**

Here is our quick guide based on what you want to achieve:
• **Party & Night Flash**: Go with **Canon IXY** or **Sony Cyber-shot W-series**
• **Warm Nostalgic Color**: Choose **Kodak EasyShare** or **Fujifilm FinePix**
• **Beginner Ease & AA Batteries**: Choose **Canon PowerShot A-series**
• **Sleek Slim Pocket Design**: Choose **Sony Cyber-shot T-series**

Every camera on RePXL is graded, cleaned, and tested with authentic multi-angle photos of the exact unit!`,
      suggestedFollowUps: [
        'Best camera for beginners',
        'Best camera for Y2K flash photography',
        'How does condition grading work?',
      ],
      action: { type: 'browse', label: 'Browse Full Catalog' },
    };
  }

  // 13. Batteries & Chargers
  if (/\b(battery|batteries|charger|charging|power|aa battery|aa batteries|nimh|drain|holding charge)\b/i.test(query)) {
    return {
      text: `🔋 **Battery & Charger Guide for Vintage Digicams:**

• **What batteries do they use?**
  - Some models use standard **AA batteries** (we recommend rechargeable NiMH like Eneloop).
  - Others use **proprietary lithium-ion batteries** (e.g. Canon NB-4L, Sony NP-BG1).
• **Are batteries tested?**
  - Yes! RePXL charge-cycles and capacity-tests every battery before listing.
  - **Mint & Excellent** listings include a verified battery and charger/charging cable.
  - **Good** listings include a tested working battery.
• **Battery Care Pro-Tips:**
  - If storing your camera for more than 2 weeks, **always remove the battery** to avoid terminal corrosion.
  - Avoid letting lithium-ion vintage batteries drop to 0% for prolonged periods.`,
      suggestedFollowUps: [
        'What memory card size should I use?',
        'What is included with Excellent condition?',
        'Can I use standard AA batteries?',
      ],
      action: { type: 'faq', label: 'Read Battery FAQs' },
    };
  }

  // 14. Memory Cards & Storage Compatibility
  if (/\b(memory card|sd card|sdhc|sdxc|card error|locked|storage|memory stick|xd card|compact flash|cf card|capacity|gb limit|card size)\b/i.test(query)) {
    return {
      text: `💾 **Vintage Digicam Memory Card Guide:**

⚠️ **Crucial Compatibility Rule**:
Older digital cameras (made before 2007) **do NOT support modern SDXC cards (64GB, 128GB, etc.)**! Using an oversized card will cause a \`CARD ERROR\` or camera freeze.

**What cards to use:**
• **Pre-2006 Cameras**: Standard SD cards (max **1GB or 2GB**).
• **2007–2010 Cameras**: SDHC cards (up to **8GB, 16GB, or 32GB**).
• **Sony Cyber-shot**: Uses **Memory Stick Pro Duo** (or a microSD-to-MemoryStick adapter).
• **Olympus & Fujifilm**: Some models use **xD-Picture Cards** or CompactFlash (CF).

💡 **RePXL Guarantee**: Excellent and Mint grade cameras come with a tested, guaranteed-compatible memory card included!`,
      suggestedFollowUps: [
        'How to transfer photos to phone?',
        'What is included with Excellent condition?',
        'Does it come with battery and charger?',
      ],
      action: { type: 'faq', label: 'View Storage FAQs' },
    };
  }

  // 15. Photo & Video Transfer
  if (/\b(transfer|photos to phone|iphone|android|computer|pc|mac|export|download photos|dongle|card reader|import)\b/i.test(query)) {
    return {
      text: `📲 **How to Transfer Photos to iPhone, Android, or PC:**

Getting your vintage photos onto your phone takes less than 30 seconds!

**Method 1: SD Card Reader Adapter (Recommended)**
• Buy a Lightning (for older iPhone) or USB-C (for iPhone 15/16 and Android) SD card reader adapter.
• Remove the SD card from your camera and plug it into the adapter.
• Plug into your phone: The Apple Photos or Android Files app opens automatically with an **'Import'** button!

**Method 2: Multi-Card Reader on Computer**
• Plug an external USB card reader into your Mac or PC to copy photos directly.

**Method 3: USB Cable**
• Connect the camera's mini-USB cable directly to your PC while the camera is powered on.`,
      suggestedFollowUps: [
        'Can vintage digicams shoot video?',
        'What memory card size should I use?',
        'Recommend a CCD camera',
      ],
      action: { type: 'browse', label: 'Browse Digicams' },
    };
  }

  // 16. Video Capabilities
  if (/\b(video|record video|movie|fps|vga|480p|audio|record|microphone)\b/i.test(query)) {
    return {
      text: `🎥 **Video Capabilities of Vintage Digicams:**

Yes! Most digital cameras from 2000–2010 record video with that authentic early-YouTube and home-video aesthetic.

• **Resolution**: Typically **640x480 VGA** or **320x240 QVGA** at 15 to 30 frames per second.
• **Audio**: Built-in mono microphone with warm, lo-fi mechanical vintage character.
• **File Formats**: Recorded as \`.AVI\` or \`.MOV\` (QuickTime) files.
• **Aesthetic**: Authentic retro texture, natural pixelation, and motion blur without digital filters!

Perfect for TikTok montages, indie music videos, and travel vlog interludes.`,
      suggestedFollowUps: [
        'How to transfer photos to phone?',
        'Recommend a CCD camera',
        'What memory card size should I use?',
      ],
      action: { type: 'browse', label: 'Explore Cameras' },
    };
  }

  // 17. Blurry / Dark / Low-light Photos & Flash Tips
  if (/\b(blurry|dark|low light|grainy|night photo|indoor photo|focus issue|camera blurry)\b/i.test(query)) {
    return {
      text: `💡 **Why Are My Photos Blurry or Dark? (Pro Tips):**

Vintage digicams have small sensors designed around low ISO settings (ISO 50–400). In dim ambient light, the shutter stays open longer, causing motion blur!

**How to get sharp vintage photos:**
1. **Force Flash ON**: Change the flash setting from 'Auto' to **Forced Flash (lightning bolt icon)**. This produces the iconic Y2K paparazzi look!
2. **Half-Press Shutter**: Press halfway and wait for the green focus square/beep before pressing all the way down.
3. **Optimal Distance**: Keep your subject between 1 and 2.5 meters away so the flash illuminates them evenly.
4. **Stable Grip**: Hold the camera with both hands and brace your elbows.`,
      suggestedFollowUps: [
        'Best camera for Y2K flash photography',
        'Why do CCD sensors look better than phones?',
        'Recommend a CCD camera',
      ],
      action: { type: 'browse', label: 'Browse Party Cameras' },
    };
  }

  // 18. Cleaning, Storage & Humidity
  if (/\b(clean|cleaning|care|storage|store|humidity|moisture|silica|maintain|fungus prevention)\b/i.test(query)) {
    return {
      text: `🧼 **Vintage Camera Care & Storage Tips:**

In tropical climates like the Philippines, humidity is the #1 enemy of camera optics!

• **Storage**: Always store your camera in an airtight box or pouch with **silica gel packs** to prevent lens fungus and internal haze.
• **Battery Care**: If you aren't using the camera for more than a week or two, **take the battery out**.
• **Cleaning**:
  - Exterior: Use a gentle microfiber cloth lightly dampened with isopropyl alcohol.
  - Lens Glass: Use an air blower to remove dust first, then clean with dedicated lens cleaning solution and lens paper. Never rub dry grit against the lens!`,
      suggestedFollowUps: [
        'How are sensors and lenses tested?',
        'What is your return policy?',
        'How does condition grading work?',
      ],
      action: { type: 'faq', label: 'Read Maintenance FAQs' },
    };
  }

  // 19. "Try the Look" Simulator
  if (/\b(try the look|look simulation|simulator|color simulation|preset|filter preview)\b/i.test(query)) {
    return {
      text: `🎨 **What is 'Try the Look'?**

'Try the Look' is RePXL's exclusive interactive color simulator built into our mobile app!

When you open any camera product page:
• Tap **'Try the Look'** to see side-by-side photo simulations.
• Experience how that specific camera's CCD sensor renders colors (e.g. Kodak Portra warmth, Fuji Velvia contrast, Canon cinematic skin tones, Sony vivid punch).
• Test different photo scenes before placing your order!`,
      suggestedFollowUps: [
        'Recommend a CCD camera',
        'Why do CCD sensors look better than phones?',
        'Compare cameras in app',
      ],
      action: { type: 'browse', label: 'Try Look on Catalog' },
    };
  }

  // 20. Compare Tool
  if (/\b(compare|comparison|compare tool|side by side|specs compare)\b/i.test(query)) {
    return {
      text: `⚖️ **RePXL Camera Comparison Tool:**

You can compare up to 4 vintage cameras side-by-side!

• Tap the **Compare icon** on any product card or go to the **Compare screen**.
• Compare key technical specs: Megapixels, Sensor type (CCD vs CMOS), Optical Zoom range, LCD Screen size, Battery format, and Storage medium.
• Evaluate condition grades and pricing in one consolidated view.`,
      suggestedFollowUps: [
        'Canon IXY vs Sony Cyber-shot',
        'How does condition grading work?',
        'Recommend a CCD camera',
      ],
      action: { type: 'compare', label: 'Open Compare Tool' },
    };
  }

  // 21. Condition Grading Tiers (Mint, Excellent, Good, Fair)
  if (/\b(grade|grading|condition|mint|fair|good|excellent|tier|rating system)\b/i.test(query)) {
    return {
      text: `💎 **RePXL 4-Tier Condition Grading System:**

Every camera is manually inspected and classified into one of four tiers:

• **MINT (9.5–10/10)**: Flawless museum-grade condition. Shows virtually zero signs of use. Includes original box, manuals, and complete accessories.
• **EXCELLENT (8.5–9/10)**: Pristine optics and mechanics with minimal cosmetic wear. Includes tested battery, charger/cable, and verified memory card.
• **GOOD (7–8/10)**: Authentic vintage patina with minor scuffs or rub marks. 100% functional optics, flash, and sensor. Includes tested battery.
• **FAIR (5–6.5/10)**: Visible cosmetic wear or minor quirks (clearly documented). Shutter, zoom, and sensor operate properly. Camera body only.

All listings feature high-resolution photos of the **exact physical unit** you will receive!`,
      suggestedFollowUps: [
        'What is included with Excellent condition?',
        'How are sensors and lenses tested?',
        'What is your return policy?',
      ],
      action: { type: 'faq', label: 'View Grading FAQs' },
    };
  }

  // 22. What's Included / In the Box
  if (/\b(included|what comes with|what is included|in the box|accessories|strap|cables)\b/i.test(query)) {
    return {
      text: `📦 **What Comes With Your Camera?**

What's included depends on the condition tier:

• **Mint**: Camera, original packaging box, manual, wrist strap, battery, charger, and AV/data cables.
• **Excellent**: Camera, tested rechargeable battery, charger/cable, verified compatible memory card, and wrist strap.
• **Good**: Camera body and tested working battery.
• **Fair**: Camera body only (unless specified on the listing page).

You can view the exact included items list on every product page!`,
      suggestedFollowUps: [
        'How are batteries tested?',
        'What memory card size should I use?',
        'How does condition grading work?',
      ],
      action: { type: 'faq', label: 'Read Packaging FAQs' },
    };
  }

  // 23. Sensor & Lens Inspection (Fungus, Haze, Dust)
  if (/\b(fungus|haze|scratch|dust|sensor clean|defect|inspection|testing|tested)\b/i.test(query)) {
    return {
      text: `🔬 **Our Rigorous Multi-Point Testing Process:**

Every vintage camera undergoes hands-on assessment by experienced collectors:

• **Optical Clarity**: Inspected under high-intensity backlight for internal fungus, haze, cement separation, or front-element scratches.
• **Sensor Testing**: Test shots taken at closed apertures against a uniform white background to verify zero sensor dust or dead pixel clusters.
• **Mechanics**: Zoom barrel drive, shutter mechanism, dial clicks, and memory card eject springs are tested.
• **Flash Strobe**: Flash capacitor and firing cycle are tested across 10 consecutive shots.

Mint and Excellent grades are guaranteed 100% free of optical fungus or haze!`,
      suggestedFollowUps: [
        'What is your return policy?',
        'Does LCD yellowing affect photos?',
        'How does condition grading work?',
      ],
      action: { type: 'faq', label: 'Read Inspection Details' },
    };
  }

  // 24. LCD Yellowing & Screen Aging
  if (/\b(yellowing|yellow screen|lcd burn|polarizer|screen color|display yellow)\b/i.test(query)) {
    return {
      text: `📱 **Does LCD Screen Yellowing Affect My Photos?**

**No, it does NOT affect your photos at all!**

Some vintage LCD screens from 2002–2008 show slight edge yellowing or darkening due to natural aging of the polarizer adhesive layer.
• Photos saved to your memory card are 100% pristine digital files recorded directly from the sensor.
• When transferred to your phone or computer, your photos look crystal clear and vibrant!
• We always note any noticeable LCD cosmetic aging in the listing description.`,
      suggestedFollowUps: [
        'How to transfer photos to phone?',
        'How are sensors and lenses tested?',
        'How does condition grading work?',
      ],
      action: { type: 'faq', label: 'Read Grading FAQs' },
    };
  }

  // 25. Authenticity Guarantee
  if (/\b(authentic|authenticity|real|original|fake|replica|knockoff|reproduction)\b/i.test(query)) {
    return {
      text: `🛡️ **100% Authentic Vintage Guarantee:**

• RePXL only deals in **authentic original vintage digital cameras** from genuine manufacturers (Canon, Sony, Nikon, Kodak, Fujifilm, Olympus, Casio, etc.).
• We do not sell cheap toy reproductions, counterfeit replicas, or plastic clones disguised as vintage cameras.
• Every camera has its official manufacturer serial number logged and verified against our database.`,
      suggestedFollowUps: [
        'How does condition grading work?',
        'What is your return policy?',
        'Browse authentic digicams',
      ],
      action: { type: 'browse', label: 'Browse Authentic Cameras' },
    };
  }

  // 26. Shipping Timeframes & Packaging
  if (/\b(shipping|delivery|lead time|transit time|courier|metro manila|provincial|ship)\b/i.test(query)) {
    return {
      text: `🚚 **Shipping Times & Domestic Delivery:**

• **Metro Manila**: 3 to 5 business days.
• **Provincial Addresses**: 5 to 7 business days.

**Packaging Standards:**
Every camera is double-boxed with anti-static wrap and heavy-duty bubble padding to ensure safe transit through courier sorting hubs.

Track your package status step-by-step in the **Orders** tab!`,
      suggestedFollowUps: [
        'Where is my order?',
        'Can I do same-day delivery?',
        'What payment methods do you accept?',
      ],
      action: { type: 'orders', label: 'View My Orders' },
    };
  }

  // 27. Same-Day / Rush Delivery
  if (/\b(same day|express|rush|lalamove|grab|pickup|urgent delivery)\b/i.test(query)) {
    return {
      text: `⚡ **Same-Day Delivery in Metro Manila:**

Need your camera today for a shoot or weekend event?
• We can arrange same-day courier dispatch via **Grab Express or Lalamove** for Metro Manila addresses!
• After placing your order, message us immediately with your order number via the **Contact Us** tab or email \`support@repxl.com\`.
• Courier booking fee is settled directly upon courier pickup/arrival.`,
      suggestedFollowUps: [
        'Where is my order?',
        'What payment methods do you accept?',
        'Shipping timeframes',
      ],
      action: { type: 'contact', label: 'Contact Support for Rush' },
    };
  }

  // 28. International Shipping
  if (/\b(international|overseas|worldwide|abroad|usa|singapore|australia|global shipping)\b/i.test(query)) {
    return {
      text: `🌏 **International Shipping Status:**

• RePXL currently ships to all locations nationwide across the **Philippines**.
• We are actively working on international shipping to Southeast Asia (Singapore, Malaysia, Indonesia) and North America.
• If you are an international collector interested in rare units, please contact us through the **Contact Us** form for special freight quotes!`,
      suggestedFollowUps: [
        'Domestic shipping timeframes',
        'Payment methods',
        'What is your return policy?',
      ],
      action: { type: 'contact', label: 'Send International Inquiry' },
    };
  }

  // 29. Order Tracking
  if (/\b(order|track|order status|tracking number|status of my package|purchases)\b/i.test(query)) {
    return {
      text: `📦 **Tracking Your RePXL Order:**

You can check the live status of all your orders directly in the app:

1. Go to your **Account** tab and tap **Orders / Purchases**.
2. Tap any order to view its status: **Processing → Shipped → Delivered**.
3. Once shipped, your courier tracking number and real-time tracking route appear automatically.

You will also receive push notifications as soon as your parcel is out for delivery!`,
      suggestedFollowUps: [
        'How long does shipping take?',
        'Can I cancel my order?',
        'What is your return policy?',
      ],
      action: { type: 'orders', label: 'Track My Orders' },
    };
  }

  // 30. Order Cancellation & Modification
  if (/\b(cancel|cancellation|change address|modify order|wrong address|edit order)\b/i.test(query)) {
    return {
      text: `✏️ **Cancelling or Updating an Order:**

• **Cancellation**: You can cancel an order directly from the Order Details screen as long as its status is still **'Processing'** (before handover to the courier).
• **Address Modification**: If you need to change your delivery address or contact number, message our team immediately through the **Contact Us** tab with your Order Number before dispatch!
• Once an order has reached **'Shipped'**, it cannot be cancelled while in transit.`,
      suggestedFollowUps: [
        'Contact support team',
        'How long do refunds take?',
        'Tracking my order',
      ],
      action: { type: 'orders', label: 'Manage Orders' },
    };
  }

  // 31. Payment Methods & COD
  if (/\b(pay|payment|gcash|maya|cod|cash on delivery|card|visa|mastercard|paymongo)\b/i.test(query)) {
    return {
      text: `💳 **Payment Methods at RePXL:**

We offer flexible, highly secure checkout options:

• **E-Wallets**: GCash & Maya (instant confirmation via PayMongo).
• **Cards**: Visa & Mastercard debit/credit cards (256-bit SSL encrypted).
• **Cash on Delivery (COD)**: Available for all serviceable domestic addresses across the Philippines! Pay cash directly to the courier upon delivery.

We never store raw card credentials or sensitive payment tokens.`,
      suggestedFollowUps: [
        'Do you have voucher promo codes?',
        'Shipping times in the Philippines',
        'What is your return policy?',
      ],
      action: { type: 'faq', label: 'View Payment FAQs' },
    };
  }

  // 32. Promo Codes, Vouchers & Discounts
  if (/\b(voucher|promo|discount|coupon|promo code|discount code|sale|welcome10|cheaper|voucher code)\b/i.test(query)) {
    return {
      text: `🎟️ **Vouchers & Discount Codes:**

• **First Time Buyer**: Use promo code **\`WELCOME10\`** at checkout for **10% off** your first camera order!
• **How to Redeem**: Enter the code into the 'Voucher Code' field on the Checkout screen and tap Apply.
• Stay tuned to the **Notifications** tab for flash drops and seasonal holiday vouchers!`,
      suggestedFollowUps: [
        'What payment methods do you accept?',
        'Recommend a CCD camera',
        'Where is my order?',
      ],
      action: { type: 'browse', label: 'Shop Available Cameras' },
    };
  }

  // 33. Returns, Refunds & 14-Day Guarantee
  if (/\b(returns?|refunds?|warranty|exchange|money back|guarantee|mismatch)\b/i.test(query)) {
    return {
      text: `🔄 **14-Day Return & Condition Guarantee:**

Your purchase is 100% protected:

• **Condition Guarantee**: If the camera condition does not match the listing grade or has undisclosed mechanical defects, you are eligible for a **full refund within 14 days** of delivery.
• **Free Return Shipping**: RePXL covers return courier shipping for condition mismatches.
• **Refund Processing**: Once the returned item is inspected at our hub, refunds are credited back to your original payment method (GCash, Maya, or Card) within **5–7 business days**.`,
      suggestedFollowUps: [
        'What if my camera arrives damaged?',
        'How does condition grading work?',
        'Contact support team',
      ],
      action: { type: 'faq', label: 'Read Return FAQs' },
    };
  }

  // 34. Damaged in Transit
  if (/\b(damaged in transit|arrives damaged|broken on arrival|package broken|box crushed|damaged package|broken camera)\b/i.test(query)) {
    return {
      text: `🚨 **What If My Camera Arrives Damaged?**

We take packaging seriously, but if courier transit mishandling occurs:

1. Take clear photos or an unboxing video of the outer box, bubble wrap, and damaged camera within **48 hours** of delivery.
2. Go to your **Orders** tab or the **Contact Us** tab to submit a damage report.
3. We will immediately schedule a complimentary courier pickup and issue a **full refund or identical replacement unit**.`,
      suggestedFollowUps: [
        'What is your return policy?',
        'Contact support team',
        'Where is my order?',
      ],
      action: { type: 'contact', label: 'Report Damaged Package' },
    };
  }

  // 35. Selling to RePXL & Consignment
  if (/\b(sell|selling|consignment|trade|buy my camera|trade-in|appraise|quote)\b/i.test(query)) {
    return {
      text: `🤝 **Selling Your Vintage Cameras to RePXL:**

Got vintage digicams sitting in your drawer? We buy them!

**How to sell:**
1. Switch to the **Contact Us** tab above.
2. Select the subject **'Selling'**.
3. Include camera brand, model, cosmetic condition, and functional notes.
4. Our curation team will review your submission and make a cash offer or store trade-in credit within **24–48 hours**!`,
      suggestedFollowUps: [
        'How does condition grading work?',
        'What is included with Excellent condition?',
        'About RePXL',
      ],
      action: { type: 'contact', label: 'Submit Selling Inquiry' },
    };
  }

  // Unknown store questions and unrelated topics use the same honest reply.
  return fallbackResponse();
}

// ─── Web-specific action → route mapping ─────────────────────────────────────
// The concierge's `action.type` is platform-agnostic. On the website these map
// to real storefront routes. Order/account destinations are ownership-checked by
// their own pages/APIs — this only produces a link, never bypasses auth.

export function webActionHref(action: AiAction | undefined): string | null {
  if (!action) return null;
  switch (action.type) {
    case 'orders':
      return '/account/orders';
    case 'browse':
      return '/products';
    case 'faq':
      return '/faq';
    case 'contact':
      return '/contact';
    case 'compare':
      return '/compare';
    default:
      return null;
  }
}
