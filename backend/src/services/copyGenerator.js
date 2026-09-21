const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/env');
const supabase = require('../db/supabase');
const { trackApiUsage } = require('./apiUsageTracker');

const genAI = new GoogleGenerativeAI(config.geminiApiKey || '');

const LANGUAGE_PATTERNS = [
  { pattern: /portugal|lisboa|porto|faro|braga|coimbra|aveiro|leiria|funchal|algarve|sintra|evora|setubal|viseu|guarda|beja|braganca|castelo branco|portalegre|santarem|viana do castelo|vila real/i, code: 'pt-PT', name: 'Portuguese (Portugal)' },
  { pattern: /espa[nñ]a|madrid|barcelona|sevilla|valencia|bilbao|malaga|zaragoza|murcia|palma|las palmas|granada|alicante|cordoba|valladolid|vigo|gijon|hospitalet|vitoria|santander|pamplona|toledo|badajoz|salamanca|leon|castellon|huelva|logrono|tarragona|lleida|girona|caceres|jaen|algeciras|marbella|cadiz/i, code: 'es', name: 'Spanish' },
  { pattern: /france|paris|lyon|marseille|toulouse|nice|nantes|strasbourg|montpellier|bordeaux|lille|rennes|reims|toulon|grenoble|dijon|angers|nimes|clermont|le havre|brest|tours|amiens|limoges|perpignan/i, code: 'fr', name: 'French' },
  { pattern: /italia|italy|roma|rome|milano|milan|napoli|torino|palermo|genova|bologna|firenze|florence|catania|venezia|venice|verona|messina|padova|trieste|brescia|parma|modena|prato|reggio|perugia|livorno|cagliari|ravenna|rimini|ferrara/i, code: 'it', name: 'Italian' },
  { pattern: /deutschland|germany|berlin|hamburg|munchen|munich|koln|cologne|frankfurt|stuttgart|dusseldorf|dortmund|essen|leipzig|bremen|dresden|hannover|nurnberg|duisburg|bochum|wuppertal|bielefeld|bonn|mannheim/i, code: 'de', name: 'German' },
  { pattern: /united kingdom|england|london|manchester|birmingham|leeds|glasgow|liverpool|edinburgh|bristol|cardiff|belfast|sheffield|nottingham|newcastle|southampton|leicester|brighton|aberdeen|cambridge|oxford|york|bath|exeter|coventry/i, code: 'en', name: 'English' },
];

function detectLanguage(address) {
  if (!address) return { code: 'pt-BR', name: 'Brazilian Portuguese' };
  for (const { pattern, code, name } of LANGUAGE_PATTERNS) {
    if (pattern.test(address)) return { code, name };
  }
  return { code: 'pt-BR', name: 'Brazilian Portuguese' };
}

const FALLBACK_MESSAGES = {
  'pt-BR': (name) => `Ola! Vi que o ${name} tem um excelente trabalho. Gostaria de conversar sobre como podemos ajudar seu negocio a crescer. Posso te contar mais?`,
  'pt-PT': (name) => `Ola! Vi que o ${name} tem um excelente trabalho. Gostaria de conversar sobre como podemos ajudar o seu negocio a crescer. Posso contar-lhe mais?`,
  'es': (name) => `Hola! Vi que ${name} tiene un excelente trabajo. Me gustaria hablar sobre como podemos ayudar a su negocio a crecer. Puedo contarle mas?`,
  'fr': (name) => `Bonjour! J'ai vu que ${name} fait un excellent travail. J'aimerais discuter de la facon dont nous pouvons aider votre entreprise a se developper. Puis-je vous en dire plus?`,
  'it': (name) => `Ciao! Ho visto che ${name} fa un ottimo lavoro. Vorrei parlare di come possiamo aiutare la vostra attivita a crescere. Posso raccontarvi di piu?`,
  'de': (name) => `Hallo! Ich habe gesehen, dass ${name} hervorragende Arbeit leistet. Ich wurde gerne daruber sprechen, wie wir Ihrem Unternehmen beim Wachstum helfen konnen. Darf ich Ihnen mehr erzahlen?`,
  'en': (name) => `Hello! I saw that ${name} does excellent work. I'd like to talk about how we can help your business grow. Can I tell you more?`,
};

function getFallbackMessage(name, language) {
  const fn = FALLBACK_MESSAGES[language.code] || FALLBACK_MESSAGES['pt-BR'];
  return fn(name);
}

/**
 * Generate 4 WhatsApp copy variations for a lead using Gemini.
 * Variations: PAIN POINT, SOCIAL PROOF, URGENCY, VALUE.
 * Returns the parsed copies object and saves to copy_variations table.
 */
async function generateCopyVariations(lead, instagramData, competitors, score) {
  const competitorNames = (competitors || [])
    .slice(0, 5)
    .map((c) => c.name)
    .join(', ');

  const language = detectLanguage(lead.address);

  const prompt = `You are a copywriting expert for WhatsApp prospecting messages for local businesses.

Lead data:
- Business name: ${lead.name}
- Category: ${lead.category || 'Not provided'}
- Address: ${lead.address || 'Not provided'}
- Phone: ${lead.phone || 'Not provided'}
- Website: ${lead.website || 'None'}
- Google rating: ${lead.rating || 'N/A'} (${lead.user_rating_count || 0} reviews)
- Instagram: ${instagramData?.handle ? '@' + instagramData.handle : 'Not found'}
- Instagram followers: ${instagramData?.followers_count || 0}
- Instagram posts: ${instagramData?.posts_count || 0}
- Lead score: ${score?.totalScore || 0}/110 (${score?.temperature || 'cold'})
- Nearby competitors: ${competitors?.length || 0} (${competitorNames || 'none identified'})

Generate 4 WhatsApp message variations in ${language.name} (${language.code}), each with a different approach:

1. PAIN POINT - Identify a pain/problem the business may have and offer a solution
2. SOCIAL PROOF - Use real business data (reviews, followers) as social proof
3. URGENCY - Create urgency based on competition or market
4. VALUE - Highlight value and benefits directly

Each message must:
- Be at most 500 characters
- Be personalized with the business name
- Be professional but friendly
- Include a clear CTA
- Do NOT use any emojis at all

Reply ONLY with valid JSON in the following format, no markdown or additional text:
{
  "pain_point": "message here",
  "social_proof": "message here",
  "urgency": "message here",
  "value": "message here"
}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      // Try to find JSON object directly
      const objMatch = text.match(/\{[\s\S]*\}/);
      if (objMatch) {
        jsonStr = objMatch[0];
      }
    }

    const copies = JSON.parse(jsonStr);

    // Validate all 4 keys exist
    const requiredKeys = ['pain_point', 'social_proof', 'urgency', 'value'];
    for (const key of requiredKeys) {
      if (!copies[key]) {
        copies[key] = getFallbackMessage(lead.name, language);
      }
    }

    // Save to database
    const record = {
      lead_id: lead.id,
      pain_point: copies.pain_point,
      social_proof: copies.social_proof,
      urgency: copies.urgency,
      value: copies.value,
      model_used: 'gemini-2.0-flash',
      generated_at: new Date().toISOString(),
    };

    await supabase
      .from('copy_variations')
      .upsert(record, { onConflict: 'lead_id' });

    // Track Gemini completion usage
    await trackApiUsage('gemini_completion', 1);

    return copies;
  } catch (err) {
    console.error(`[CopyGenerator] Error generating copies for lead ${lead.id}:`, err.message);

    const fallbackCopy = getFallbackMessage(lead.name, language);
    const fallback = {
      pain_point: fallbackCopy,
      social_proof: fallbackCopy,
      urgency: fallbackCopy,
      value: fallbackCopy,
    };

    try {
      await supabase.from('copy_variations').upsert(
        {
          lead_id: lead.id,
          pain_point: fallback.pain_point,
          social_proof: fallback.social_proof,
          urgency: fallback.urgency,
          value: fallback.value,
          model_used: 'fallback',
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'lead_id' }
      );
    } catch {
      // Ignore save failure
    }

    return fallback;
  }
}

module.exports = {
  generateCopyVariations,
};
