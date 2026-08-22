/**
 * Mətni [SƏHİFƏ N] markerləri üzrə (varsa) və ya sadəcə ölçüyə görə hissələrə
 * bölür. Hər hissə Groq-un TPM limitinə uyğun ölçüdə olur.
 */
export function chunkText(text, maxChars) {
  if (text.length <= maxChars) return [text];

  const pageMarkerRegex = /\n\n\[SƏHİFƏ \d+\]/;
  if (pageMarkerRegex.test(text)) {
    return chunkByPages(text, maxChars);
  }

  // Səhifə markeri yoxdursa, paraqraf sərhədlərinə görə böl
  const chunks = [];
  let current = '';
  const paragraphs = text.split(/\n\n+/);
  for (const para of paragraphs) {
    if ((current + para).length > maxChars && current) {
      chunks.push(current);
      current = para;
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function chunkByPages(text, maxChars) {
  const parts = text.split(/(?=\n\n\[SƏHİFƏ \d+\])/);
  const chunks = [];
  let current = '';
  for (const part of parts) {
    if ((current + part).length > maxChars && current) {
      chunks.push(current);
      current = part;
    } else {
      current += part;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
