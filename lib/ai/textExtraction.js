import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

/**
 * Verilmiş fayldan (buffer + mime type) mətn çıxarır.
 * PDF üçün səhifə markerləri əlavə edilir ([SƏHİFƏ N]) ki, AI evidence
 * göstərəndə səhifə nömrəsinə istinad edə bilsin.
 *
 * @returns {Promise<{text: string, pageCount: number|null, supported: boolean}>}
 */
export async function extractText(buffer, mimeType, fileName) {
  try {
    if (mimeType === 'application/pdf') {
      return await extractFromPDF(buffer);
    }
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await extractFromDocx(buffer);
    }
    if (
      mimeType === 'application/vnd.ms-excel' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      return extractFromXlsx(buffer);
    }
    if (mimeType === 'text/plain' || mimeType === 'text/csv') {
      return { text: buffer.toString('utf-8'), pageCount: null, supported: true };
    }

    // application/msword (köhnə .doc), image/*, application/zip — hələ dəstəklənmir
    return { text: '', pageCount: null, supported: false };
  } catch (err) {
    throw new Error(`Mətn çıxarma xətası (${fileName}): ${err.message}`);
  }
}

async function extractFromPDF(buffer) {
  // Dynamic import — pdf-parse Next.js build zamanı test faylları axtarır,
  // yalnız runtime-da lazım olduğu üçün belə import edilir.
  const pdfParse = (await import('pdf-parse')).default;

  let pageTexts = [];
  const options = {
    pagerender: async (pageData) => {
      const textContent = await pageData.getTextContent();
      const text = textContent.items.map((item) => item.str).join(' ');
      pageTexts.push(text);
      return text;
    },
  };

  const result = await pdfParse(buffer, options);

  const markedText = pageTexts
    .map((text, i) => `\n\n[SƏHİFƏ ${i + 1}]\n${text}`)
    .join('');

  return {
    text: markedText || result.text,
    pageCount: result.numpages,
    supported: true,
  };
}

async function extractFromDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return { text: result.value, pageCount: null, supported: true };
}

function extractFromXlsx(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const parts = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return `\n\n[VƏRƏQ: ${sheetName}]\n${csv}`;
  });
  return { text: parts.join(''), pageCount: workbook.SheetNames.length, supported: true };
}
