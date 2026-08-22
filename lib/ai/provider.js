/**
 * AI Provider Abstraction Layer
 *
 * Tətbiqin qalan hissəsi birbaşa Groq/Anthropic SDK-larını çağırmır —
 * yalnız bu modulun ixrac etdiyi `completeJSON()` funksiyasını istifadə edir.
 * Beləliklə provider dəyişikliyi (Groq → Anthropic) YALNIZ bu faylda edilir,
 * kodun qalan hissəsinə toxunmadan.
 *
 * Aktiv provider: Groq (llama-3.3-70b-versatile)
 * Keçid üçün: CURRENT_PROVIDER = 'anthropic' et və ANTHROPIC_API_KEY əlavə et.
 */

const CURRENT_PROVIDER = 'groq'; // 'groq' | 'anthropic'

const GROQ_MODEL = 'openai/gpt-oss-120b'; // llama-3.3-70b-versatile 2026-06-17-də deprecated edildi
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

/**
 * Strukturlaşdırılmış (JSON) cavab qaytaran universal funksiya.
 * @param {string} systemPrompt - Sistem təlimatı (hallucination qadağaları daxil)
 * @param {string} userPrompt - Əsas sorğu/kontekst
 * @returns {Promise<object>} - Parse edilmiş JSON obyekt
 */
export async function completeJSON(systemPrompt, userPrompt) {
  if (CURRENT_PROVIDER === 'groq') {
    return completeJSONGroq(systemPrompt, userPrompt);
  }
  if (CURRENT_PROVIDER === 'anthropic') {
    return completeJSONAnthropic(systemPrompt, userPrompt);
  }
  throw new Error(`Naməlum AI provider: ${CURRENT_PROVIDER}`);
}

async function completeJSONGroq(systemPrompt, userPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY tapılmadı (Vercel env vars)');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Faktual dəqiqlik üçün aşağı temperature
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API xətası (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq boş cavab qaytardı');

  return safeParseJSON(content);
}

async function completeJSONAnthropic(systemPrompt, userPrompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY tapılmadı (Vercel env vars)');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API xətası (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error('Anthropic boş cavab qaytardı');

  return safeParseJSON(content);
}

/**
 * Retry/fallback: model bəzən JSON ətrafına mətn əlavə edir (```json bloklar və s.)
 * Bu, həmin halları təmizləyir və parse edir.
 */
function safeParseJSON(raw) {
  let cleaned = raw.trim();
  // ```json ... ``` bloklarını təmizlə
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  cleaned = cleaned.replace(/^```\s*/, '');

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // İlk { ... son } arasını çıxarmağa cəhd et (əlavə mətn varsa)
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch (e2) {
        throw new Error(`AI cavabı düzgün JSON deyil: ${e2.message}. Raw: ${cleaned.slice(0, 200)}`);
      }
    }
    throw new Error(`AI cavabı düzgün JSON deyil: ${e.message}. Raw: ${cleaned.slice(0, 200)}`);
  }
}

export const AI_META = {
  provider: CURRENT_PROVIDER,
  model: CURRENT_PROVIDER === 'groq' ? GROQ_MODEL : ANTHROPIC_MODEL,
};
