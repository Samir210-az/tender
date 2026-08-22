import { safeParseJSON } from './provider';

const GEMINI_MODEL = 'gemini-2.5-flash';

export const GEMINI_META = { provider: 'gemini', model: GEMINI_MODEL };

/**
 * Faylı (base64) birbaşa Gemini-yə göndərir — OCR + analiz bir addımda.
 * Skan olunmuş PDF-lər və şəkil sənədlər üçün istifadə olunur (Groq mətn-yalnız
 * olduğu üçün bunları emal edə bilmir).
 */
export async function completeJSONWithFile(systemPrompt, userPromptText, fileBase64, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY tapılmadı (Vercel env vars) — skan olunmuş sənədlər/şəkillər üçün Gemini lazımdır'
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPromptText }, { inline_data: { mime_type: mimeType, data: fileBase64 } }],
      },
    ],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      maxOutputTokens: 8000,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API xətası (${res.status}): ${errText.slice(0, 400)}`);
  }

  const data = await res.json();

  // Gemini bəzən content-i safety/finish_reason görə bloklaya bilər
  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error('Gemini heç bir nəticə qaytarmadı');
  if (candidate.finishReason === 'SAFETY') {
    throw new Error('Gemini sənədi safety filter səbəbindən emal etmədi');
  }

  const content = candidate.content?.parts?.[0]?.text;
  if (!content) throw new Error('Gemini boş cavab qaytardı');

  return safeParseJSON(content);
}
