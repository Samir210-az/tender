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
 * @param {object} options - { temperature } — extraction/compliance üçün aşağı (defolt 0.1,
 *   dəqiqlik üçün), yaradıcı yazı (proposal) üçün daha yüksək (0.4-0.6, təbii üslub üçün)
 * @returns {Promise<object>} - Parse edilmiş JSON obyekt
 */
export async function completeJSON(systemPrompt, userPrompt, options = {}) {
  const temperature = options.temperature ?? 0.1;
  try {
    if (CURRENT_PROVIDER === 'groq') {
      return await completeJSONGroq(systemPrompt, userPrompt, true, temperature);
    }
    if (CURRENT_PROVIDER === 'anthropic') {
      return await completeJSONAnthropic(systemPrompt, userPrompt);
    }
    throw new Error(`Naməlum AI provider: ${CURRENT_PROVIDER}`);
  } catch (err) {
    // Retry 1: strict JSON mode uğursuz olsa, bu rejim olmadan bir dəfə də cəhd et
    // (bəzən model strict validator-u keçə bilmir, amma sərbəst yazanda
    // safeParseJSON onu yenə də parse edə bilir)
    if (
      CURRENT_PROVIDER === 'groq' &&
      (err.message.includes('json_validate_failed') || err.message.includes('boş cavab'))
    ) {
      console.warn('Groq strict JSON mode uğursuz oldu, retry (strict mode olmadan)...');
      return completeJSONGroq(systemPrompt, userPrompt, false, temperature);
    }

    // Retry 2: TPM rate limit (429) — Groq dəqiq gözləmə vaxtını mesajda
    // göstərir ("Please try again in 29.8s"), onu oxuyub avtomatik gözləyib
    // bir dəfə də cəhd edirik. İstifadəçi əl ilə təkrar sınamağa məcbur qalmır.
    if (CURRENT_PROVIDER === 'groq' && err.message.includes('rate_limit_exceeded')) {
      const waitMatch = err.message.match(/try again in ([\d.]+)s/i);
      const waitSeconds = waitMatch ? parseFloat(waitMatch[1]) : 15;
      const waitMs = Math.ceil(waitSeconds * 1000) + 500; // 500ms ehtiyat
      console.warn(`Groq TPM limiti — ${(waitMs / 1000).toFixed(1)}s gözlənilir, sonra retry...`);
      await new Promise((r) => setTimeout(r, waitMs));
      return completeJSONGroq(systemPrompt, userPrompt, true, temperature);
    }

    throw err;
  }
}

async function completeJSONGroq(systemPrompt, userPrompt, strictJsonMode, temperature = 0.1) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY tapılmadı (Vercel env vars)');

  const body = {
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    max_tokens: 2000, // Groq-un 8000 TPM limitinə uyğunlaşdırılıb (input+output cəmi)
    // openai/gpt-oss-120b reasoning modelidir — defolt "medium" effort bəzən
    // bütün max_tokens büdcəsini daxili düşünməyə sərf edib boş cavab qaytarır.
    // "low" effort + reasoning-i cavabdan çıxarmaq bunun qarşısını alır.
    reasoning_effort: 'low',
    include_reasoning: false,
  };
  if (strictJsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    let detail = errBody;
    try {
      const parsed = JSON.parse(errBody);
      // Groq bəzən "failed_generation" sahəsində qismən (kəsilmiş) JSON-u göstərir —
      // bu, debug üçün faydalıdır
      if (parsed.error?.failed_generation) {
        detail = `${parsed.error.message} [${parsed.error.code || ''}] | Qismən nəticə: ${parsed.error.failed_generation.slice(0, 300)}`;
      } else if (parsed.error?.message) {
        detail = `${parsed.error.message} [${parsed.error.code || ''}]`;
      }
    } catch {
      // errBody artıq JSON deyil, olduğu kimi saxla
    }
    throw new Error(`Groq API xətası (${res.status}): ${detail}`);
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
export function safeParseJSON(raw) {
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
