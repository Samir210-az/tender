import PDFDocument from 'pdfkit';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// DejaVu Sans — Azərbaycan hərflərini (ə,ğ,ı,ö,ü,ş,ç) düzgün göstərən az
// saylı əsl-TTF (npm-də woff/woff2 versiyaları fontkit ilə sınıq render olunur,
// test edilib doğrulanıb).
//
// require.resolve ilə paketin package.json-unu tapıb, ondan nisbi yol
// qururuq — bu, Vercel-in file tracing sisteminin faylı düzgün aşkar
// etməsini təmin edir (sabit string path Next.js build-zamanı font faylını
// bundle-a daxil etməyə bilər, require.resolve isə static analiz oluna bilir).
const dejavuPkgPath = require.resolve('dejavu-fonts-ttf/package.json');
const dejavuRoot = path.dirname(dejavuPkgPath);
const FONT_PATH = path.join(dejavuRoot, 'ttf', 'DejaVuSans.ttf');
const FONT_BOLD_PATH = path.join(dejavuRoot, 'ttf', 'DejaVuSans-Bold.ttf');

/**
 * Proposal məzmunundan (docx ilə eyni JSON strukturu) PDF buffer yaradır.
 */
export function generateProposalPdf({ tenderName, sections }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font(FONT_BOLD_PATH);
    doc.fontSize(10).fillColor('#C0392B')
      .text('AI TƏRƏFİNDƏN YARADILIB — TƏQDİM ETMƏZDƏN ƏVVƏL MÜTLƏQ YOXLAYIN VƏ TƏSDİQLƏYİN', { align: 'left' });
    doc.moveDown(1);

    doc.fillColor('#000000').fontSize(20).text('TEXNİKİ TƏKLİF');
    doc.font(FONT_PATH).fontSize(14).fillColor('#333333').text(tenderName);
    doc.moveDown(1.5);

    for (const section of sections) {
      doc.font(FONT_BOLD_PATH).fontSize(14).fillColor('#000000').text(section.heading);
      doc.moveDown(0.4);
      doc.font(FONT_PATH).fontSize(11).fillColor('#222222').text(section.text || '', {
        align: 'justify',
        lineGap: 3,
      });
      doc.moveDown(1.2);
    }

    doc.end();
  });
}
