import { DEJAVU_SANS_BASE64 } from './fonts/dejavuSansBase64.js';
import { DEJAVU_SANS_BOLD_BASE64 } from './fonts/dejavuSansBoldBase64.js';

/**
 * Proposal məzmunundan (docx ilə eyni JSON strukturu) PDF buffer yaradır.
 *
 * DİQQƏT — pdfkit MÜTLƏQ dinamik import() ilə yüklənməlidir (top-level YOX):
 * fs-ə bağlı init kodu Next.js build zamanı ("Collecting page data")
 * icra olunanda xəta verir.
 *
 * Font: fayl yolu (path) İSTİFADƏ EDİLMİR — /public Vercel-in serverless
 * funksiya bundle-ına daxil edilmir (yalnız statik CDN paylanması üçündür,
 * bu, "ENOENT: no such file" xətasının səbəbi idi). Bunun əvəzinə font
 * birbaşa base64 kimi kod daxilinə salınıb, Buffer-ə çevrilib pdfkit-ə
 * ötürülür — heç bir fayl sistemi asılılığı yoxdur, bundle-a avtomatik daxil olur.
 */
export async function generateProposalPdf({ tenderName, sections }) {
  const { default: PDFDocument } = await import('pdfkit');

  const fontRegular = Buffer.from(DEJAVU_SANS_BASE64, 'base64');
  const fontBold = Buffer.from(DEJAVU_SANS_BOLD_BASE64, 'base64');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font(fontBold);
    doc.fontSize(10).fillColor('#C0392B')
      .text('AI TƏRƏFİNDƏN YARADILIB — TƏQDİM ETMƏZDƏN ƏVVƏL MÜTLƏQ YOXLAYIN VƏ TƏSDİQLƏYİN', { align: 'left' });
    doc.moveDown(1);

    doc.fillColor('#000000').fontSize(20).text('TEXNİKİ TƏKLİF');
    doc.font(fontRegular).fontSize(14).fillColor('#333333').text(tenderName);
    doc.moveDown(1.5);

    for (const section of sections) {
      doc.font(fontBold).fontSize(14).fillColor('#000000').text(section.heading);
      doc.moveDown(0.4);
      doc.font(fontRegular).fontSize(11).fillColor('#222222').text(section.text || '', {
        align: 'justify',
        lineGap: 3,
      });
      doc.moveDown(1.2);
    }

    doc.end();
  });
}
