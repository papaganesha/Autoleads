const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/env');
const supabase = require('../db/supabase');

const genAI = new GoogleGenerativeAI(config.geminiApiKey || '');

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

  const prompt = `Você é um copywriter especialista em mensagens de prospecção via WhatsApp para negócios locais no Brasil.

Dados do lead:
- Nome do negócio: ${lead.name}
- Categoria: ${lead.category || 'Não informada'}
- Endereço: ${lead.address || 'Não informado'}
- Telefone: ${lead.phone || 'Não informado'}
- Website: ${lead.website || 'Não possui'}
- Nota no Google: ${lead.rating || 'N/A'} (${lead.user_rating_count || 0} avaliações)
- Instagram: ${instagramData?.handle ? '@' + instagramData.handle : 'Não encontrado'}
- Seguidores Instagram: ${instagramData?.followers_count || 0}
- Posts Instagram: ${instagramData?.posts_count || 0}
- Score do lead: ${score?.totalScore || 0}/110 (${score?.temperature || 'cold'})
- Concorrentes próximos: ${competitors?.length || 0} (${competitorNames || 'nenhum identificado'})

Gere 4 variações de mensagem de WhatsApp em português brasileiro, cada uma com abordagem diferente:

1. PAIN POINT - Identifique uma dor/problema que o negócio pode ter e ofereça solução
2. SOCIAL PROOF - Use dados reais do negócio (avaliações, seguidores) como prova social
3. URGENCY - Crie senso de urgência baseado na concorrência ou mercado
4. VALUE - Destaque o valor e benefícios de forma direta

Cada mensagem deve:
- Ter no máximo 500 caracteres
- Ser personalizada com o nome do negócio
- Ser profissional mas amigável
- Incluir um CTA claro
- Não usar emojis em excesso (máximo 3 por mensagem)

Responda APENAS com um JSON válido no seguinte formato, sem markdown ou texto adicional:
{
  "pain_point": "mensagem aqui",
  "social_proof": "mensagem aqui",
  "urgency": "mensagem aqui",
  "value": "mensagem aqui"
}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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
        copies[key] = `Olá! Vi que o ${lead.name} tem um excelente trabalho. Gostaria de conversar sobre como podemos ajudar seu negócio a crescer ainda mais. Posso te contar mais?`;
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

    return copies;
  } catch (err) {
    console.error(`[CopyGenerator] Error generating copies for lead ${lead.id}:`, err.message);

    // Save fallback copies
    const fallbackCopy = `Olá! Vi que o ${lead.name} tem um excelente trabalho. Gostaria de conversar sobre como podemos ajudar seu negócio a crescer. Posso te contar mais?`;
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
