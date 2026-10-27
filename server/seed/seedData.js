const clauses = [
  {
    clauseId: 'G-01',
    category: 'tone',
    severity: 'high',
    text: 'Maintain an inviting, respectful, and craft-centric tone. Never use aggressive sales pressure, condescending statements, insults, or urgency baiting (e.g., "you would be stupid not to buy", "buy now before you regret it").'
  },
  {
    clauseId: 'G-02',
    category: 'tone',
    severity: 'medium',
    text: 'Reflect warmth, artisanal dedication, and agricultural transparency in all public storytelling. Celebrate the farmer cooperative and estate heritage.'
  },
  {
    clauseId: 'G-03',
    category: 'tone',
    severity: 'low',
    text: 'Avoid overly corporate jargon or dry technical agro-forestry terminology without explaining it in approachable consumer language.'
  },
  {
    clauseId: 'G-04',
    category: 'terminology',
    severity: 'high',
    text: 'Never refer to Brewline coffee as "cheap", "bargain", "budget", or "discount beans". Use "accessible luxury", "fairly priced", or "value-conscious direct trade".'
  },
  {
    clauseId: 'G-05',
    category: 'terminology',
    severity: 'high',
    text: 'Do not use colloquial slang such as "java", "mud", or "joe" in brand collateral. Refer to products as "coffee", "single-origin roast", "specialty blend", or "brew".'
  },
  {
    clauseId: 'G-06',
    category: 'terminology',
    severity: 'medium',
    text: 'Never label competing products as "toxic", "garbage", or "junk coffee". Maintain competitive dignity and focus exclusively on our own roast qualities.'
  },
  {
    clauseId: 'G-07',
    category: 'terminology',
    severity: 'medium',
    text: 'Use "Coorg Estate Reserve" rather than "Kodagu plantation beans" for brand consistency across overseas and domestic marketing channels.'
  },
  {
    clauseId: 'G-08',
    category: 'messaging',
    severity: 'high',
    text: 'Highlight 100% shade-grown Arabica and ethical direct trade compensations (35% above fair-trade baseline) in core product announcements.'
  },
  {
    clauseId: 'G-09',
    category: 'messaging',
    severity: 'medium',
    text: 'Every seasonal product launch announcement must state the specific harvest region and roast profile (e.g., Medium Dark, Cinnamon Light).'
  },
  {
    clauseId: 'G-10',
    category: 'messaging',
    severity: 'low',
    text: 'Include compostable packaging disposal guidelines whenever retail pouches or cold brew cans are featured.'
  },
  {
    clauseId: 'G-11',
    category: 'accessibility',
    severity: 'high',
    text: 'All hyperlinks and call-to-action triggers must have descriptive anchor text. Never use ambiguous phrases like "click here", "read more", "this link", or "here".'
  },
  {
    clauseId: 'G-12',
    category: 'accessibility',
    severity: 'high',
    text: 'All visual asset references (posters, estate photos, cans) in promotional copy must include descriptive alternative text (alt text) outlining subject, context, and environment.'
  },
  {
    clauseId: 'G-13',
    category: 'accessibility',
    severity: 'medium',
    text: 'Avoid text formatting entirely in ALL CAPS for sentences or headlines longer than 3 words, as screen readers may spell out words letter by letter.'
  },
  {
    clauseId: 'G-14',
    category: 'accessibility',
    severity: 'low',
    text: 'Do not rely solely on color indicators to convey flavor notes or urgency; always provide text alternatives for sensory differentiation.'
  },
  {
    clauseId: 'G-15',
    category: 'claims',
    severity: 'high',
    text: 'Never publish unsupported absolute superlatives such as "best coffee in India", "#1 brand worldwide", or "most delicious roast on Earth" unless backed by a cited national certification.'
  },
  {
    clauseId: 'G-16',
    category: 'claims',
    severity: 'high',
    text: 'All published product retail prices, subscription costs, and seasonal discounts must strictly match the current approved official price master.'
  },
  {
    clauseId: 'G-17',
    category: 'claims',
    severity: 'high',
    text: 'Never claim medical, pharmacological, or permanent health benefits (e.g., "cures fatigue forever", "prevents heart illness", "guarantees 100% focus"). Restrict claims to natural alertness and sensory refreshment.'
  },
  {
    clauseId: 'G-18',
    category: 'claims',
    severity: 'medium',
    text: 'All seasonal tasting tour dates, booking periods, and estate access windows must strictly match official tourism schedules.'
  },
  {
    clauseId: 'G-19',
    category: 'visual',
    severity: 'medium',
    text: 'Always pair the primary horizontal logo with minimum clear space equal to the height of the letter "B". Never distort proportions or apply drop shadows.'
  },
  {
    clauseId: 'G-20',
    category: 'visual',
    severity: 'low',
    text: 'Official brand palette accents must feature Warm Copper (#C86432) and Deep Forest Green (#1B3B2B). Bright neon or fluorescent accents are forbidden.'
  }
];

const facts = [
  {
    factId: 'F-01',
    statement: 'Brewline Coffee Co. was founded in 2021 in Madikeri, Coorg, Karnataka, partnering with 42 generational family coffee farmers.'
  },
  {
    factId: 'F-02',
    statement: 'The retail price of the 250g Monsoon Malabar Reserve roast is ₹499 (inclusive of all taxes).'
  },
  {
    factId: 'F-03',
    statement: 'All Brewline green beans are 100% shade-grown Arabica cultivated at an altitude between 3,600 and 4,400 feet above sea level.'
  },
  {
    factId: 'F-04',
    statement: 'Brewline Estate tasting tours and workshops run exclusively from November 15 to February 28 each harvest year.'
  },
  {
    factId: 'F-05',
    statement: 'Brewline Nitro Cold Brew cans contain exactly 180mg of naturally extracted caffeine per 250ml serving with zero added sugar.'
  },
  {
    factId: 'F-06',
    statement: 'Brewline pays partner farm workers a minimum wage 35% above the regional agricultural statutory baseline.'
  },
  {
    factId: 'F-07',
    statement: 'Standard domestic shipping across India is free on all prepaid orders exceeding ₹999.'
  },
  {
    factId: 'F-08',
    statement: 'Brewline holds SCA (Specialty Coffee Association) verified cupping scores consistently above 84.5 points for all micro-lots.'
  }
];

const terms = [
  {
    preferred: 'accessible luxury',
    banned: ['cheap', 'bargain', 'budget coffee', 'discount beans'],
    note: 'Preserve the brand premium while emphasizing fair access and ethical pricing.'
  },
  {
    preferred: 'specialty coffee',
    banned: ['java', 'mud', 'joe'],
    note: 'Maintain craft dignity; avoid casual slang.'
  },
  {
    preferred: 'explore the collection',
    banned: ['click here', 'tap here', 'this link'],
    note: 'Accessibility rule: anchor text must be clear, descriptive, and actionable.'
  },
  {
    preferred: 'commercial coffee',
    banned: ['junk coffee', 'toxic beans', 'garbage roast'],
    note: 'Maintain ethical respect toward industry competitors.'
  },
  {
    preferred: 'Coorg Estate Reserve',
    banned: ['plantation beans', 'bulk beans'],
    note: 'Respect regional heritage naming.'
  },
  {
    preferred: 'artisan small-batch roast',
    banned: ['factory roast', 'industrial roast'],
    note: 'Highlight batch roasted quality.'
  },
  {
    preferred: 'natural alertness',
    banned: ['miracle energy', 'guaranteed focus', 'fatigue cure'],
    note: 'Avoid medical and unsubstantiated health claims.'
  },
  {
    preferred: 'single-origin Arabica',
    banned: ['generic coffee', 'standard beans'],
    note: 'Emphasize botanical provenance.'
  },
  {
    preferred: 'direct-trade partnership',
    banned: ['middleman supply', 'broker lots'],
    note: 'Reinforce grower transparency.'
  },
  {
    preferred: 'complimentary shipping',
    banned: ['free freight giveaway', 'shipping handout'],
    note: 'Professional promotional phrasing.'
  }
];

const assets = [
  {
    name: 'Primary Wordmark Logo (Horizontal)',
    usageRule: 'Must be rendered in Forest Green (#1B3B2B) or Crisp Cream (#FAF7F2). Maintain minimum 24px padding on all sides with no drop shadows.'
  },
  {
    name: 'Heritage Coorg Coffee Stamp',
    usageRule: 'Permitted only on packaging seals, official letterheads, and verified estate merchandise. Never rotate beyond 15 degrees.'
  },
  {
    name: 'Brand Color Palette',
    usageRule: 'Dominant: Deep Forest (#1B3B2B), Accent: Warm Copper (#C86432), Neutral: Cream Paper (#F5EFEB). Neon hues strictly prohibited.'
  },
  {
    name: 'Hero Estate Photography Library',
    usageRule: 'Must only feature real photographed partner farms in Coorg with natural morning or golden hour lighting. Stock imagery is strictly forbidden.'
  }
];

const demoUsers = [
  {
    name: 'Aarav Mehta',
    email: 'creator@brewline.com',
    role: 'creator',
    password: 'demo123'
  },
  {
    name: 'Maya Sen',
    email: 'manager@brewline.com',
    role: 'manager',
    password: 'demo123'
  },
  {
    name: 'Rohan Deshmukh',
    email: 'reviewer@brewline.com',
    role: 'reviewer',
    password: 'demo123'
  },
  {
    name: 'Priya Sharma',
    email: 'admin@brewline.com',
    role: 'admin',
    password: 'demo123'
  }
];

const sampleDrafts = [
  {
    title: 'Monsoon Roast Social Announcement',
    channel: 'Instagram',
    intent: 'Promote the seasonal release of our Monsoon Malabar beans to young urban coffee lovers with exciting craft storytelling.',
    content: `Meet our newest batch! Brewline is officially voted the best coffee in India by every real connoisseur. 

Forget ordinary supermarket mud—we are offering this limited harvest as cheap java for just ₹199 per 250g bag! 

You'd have to be stupid not to order right now before our inventory vanishes! 

Click here to claim your bag today and taste true mountain perfection.`
  },
  {
    title: 'Coorg Estate Tasting Weekend Press Release',
    channel: 'Press Release',
    intent: 'Announce public tasting sessions and farm tours at the Madikeri estate for travel journalists and coffee enthusiasts.',
    content: `Brewline Coffee Co. invites coffee lovers to our lush shade-grown Arabica estate in Coorg. 

DO NOT MISS THIS EXCLUSIVE OPPORTUNITY!!! 

Our estate tasting tours begin October 1st and run throughout autumn. Guests will participate in live cupping workshops with master roasters. 

[Image: Photo of estate sun deck]

For full itinerary and VIP passes, click here to reserve your spot today.`
  },
  {
    title: 'Cold Brew Can Morning Newsletter',
    channel: 'Email Newsletter',
    intent: 'Re-engage our subscriber base with the benefits of our ready-to-drink Nitro Cold Brew cans for busy mornings.',
    content: `Tired of choking down bitter junk coffee on your morning commute? Brewline Nitro Cold Brew cans deliver 450mg of pure organic caffeine per can. 

Our proprietary slow steep cures morning fatigue permanently and guarantees 100% focus all day long without any midday crash. 

Experience the pinnacle of Kodagu plantation beans at an unbelievable bargain price. 

Tap here to order a 6-pack to your doorstep with complimentary delivery!`
  }
];

module.exports = {
  clauses,
  facts,
  terms,
  assets,
  demoUsers,
  sampleDrafts
};
