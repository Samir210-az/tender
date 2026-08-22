import { DEJAVU_SANS_BASE64 } from './fonts/dejavuSansBase64.js';
import { DEJAVU_SANS_BOLD_BASE64 } from './fonts/dejavuSansBoldBase64.js';

export async function generatePriceSchedulePdf({ tenderName, addresseeLines, signatureLines, preamble, rows, grandTotal, currency }) {
  const { default: PDFDocument } = await import('pdfkit');

  const fontRegular = Buffer.from(DEJAVU_SANS_BASE64, 'base64');
  const fontBold = Buffer.from(DEJAVU_SANS_BOLD_BASE64, 'base64');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font(fontBold).fontSize(9).fillColor('#C0392B')
      .text('TƏQDİM ETMƏZDƏN ƏVVƏL MÜTLƏQ YOXLAYIN — QİYMƏTLƏR ŞİRKƏTİN ÖZ MƏLUMAT BAZASINDAN GƏLİR');
    doc.moveDown(0.8);
    doc.fontSize(16).fillColor('#000000').text('FORMA 2 — İŞ HƏCMLƏRİ CƏDVƏLİ (QİYMƏT CƏDVƏLİ)');
    doc.font(fontRegular).fontSize(12).fillColor('#333333').text(tenderName);
    doc.moveDown(0.6);

    if (addresseeLines?.length) {
      doc.fontSize(9).fillColor('#444444');
      for (const line of addresseeLines) doc.text(line);
      doc.moveDown(0.6);
    }

    if (preamble?.length) {
      doc.font(fontBold).fontSize(10).fillColor('#000000').text('A. Preambula');
      doc.font(fontRegular).fontSize(8).fillColor('#333333');
      preamble.forEach((line, i) => {
        doc.text(`${i + 1}. ${line}`, { width: 750, align: 'justify' });
        doc.moveDown(0.2);
      });
      doc.moveDown(0.5);
    }

    doc.font(fontBold).fontSize(10).fillColor('#000000').text('B. İş həcmləri üzrə maddələr');
    doc.moveDown(0.3);

    // Cədvəl
    const startX = doc.x;
    let y = doc.y;
    const colWidths = [50, 290, 60, 60, 100, 110];
    const headers = ['Maddə №', 'Təsvir', 'Ölçü', 'Miqdar', 'Vahid qiyməti', 'Cəm'];

    doc.font(fontBold).fontSize(9).fillColor('#000000');
    let x = startX;
    headers.forEach((h, i) => { doc.text(h, x, y, { width: colWidths[i] }); x += colWidths[i]; });
    y += 18;
    doc.moveTo(startX, y).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y).stroke();
    y += 5;

    doc.font(fontRegular).fontSize(9);
    for (const r of rows) {
      x = startX;
      const cells = [
        String(r.item_no), r.description, r.unit, String(r.quantity),
        `${Number(r.unit_price).toFixed(2)} ${r.currency}`,
        `${r.lineTotal.toFixed(2)} ${r.currency}`,
      ];
      const rowHeight = Math.max(14, Math.ceil(r.description.length / 60) * 12);
      cells.forEach((v, i) => { doc.text(v, x, y, { width: colWidths[i] }); x += colWidths[i]; });
      y += rowHeight + 4;
      if (y > 480) { doc.addPage({ size: 'A4', layout: 'landscape' }); y = 40; }
    }

    y += 10;
    doc.moveTo(startX, y).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y).stroke();
    y += 10;
    doc.font(fontBold).fontSize(13).text(`YEKUN CƏM: ${grandTotal.toFixed(2)} ${currency}`, startX, y);
    y += 40;

    if (signatureLines?.length) {
      doc.font(fontRegular).fontSize(10).fillColor('#333333');
      for (const line of signatureLines) { doc.text(line, startX, y); y += 16; }
    }

    doc.end();
  });
}
