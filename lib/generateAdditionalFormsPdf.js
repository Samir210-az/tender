import { DEJAVU_SANS_BASE64 } from './fonts/dejavuSansBase64.js';
import { DEJAVU_SANS_BOLD_BASE64 } from './fonts/dejavuSansBoldBase64.js';

export async function generateAdditionalFormsPdf({ forma5Lines, forma7Rows, forma3Rows, forma4Sections }) {
  const { default: PDFDocument } = await import('pdfkit');

  const fontRegular = Buffer.from(DEJAVU_SANS_BASE64, 'base64');
  const fontBold = Buffer.from(DEJAVU_SANS_BOLD_BASE64, 'base64');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font(fontBold).fontSize(16).fillColor('#000000').text('FORMA 5 — Təchizatçı haqqında');
    doc.moveDown(0.5);
    doc.font(fontRegular).fontSize(10).fillColor('#222222');
    for (const line of forma5Lines) doc.text(line);
    doc.moveDown(1.2);

    if (forma3Rows?.length !== undefined) {
      doc.addPage({ size: 'A4', layout: 'landscape' });
      doc.font(fontBold).fontSize(16).fillColor('#000000').text('FORMA 3 — Texniki baza');
      doc.moveDown(0.5);
      if (forma3Rows.length === 0) {
        doc.font(fontRegular).fontSize(10).fillColor('#666666').text('Şirkət profilində avadanlıq əlavə edilməyib.');
      } else {
        drawTable(doc, fontBold, fontRegular, {
          headers: ['№', 'Avadanlıq', 'İl', 'Yeri', 'Mülkiyyət', 'Detallar'],
          colWidths: [25, 220, 45, 90, 90, 260],
          rows: forma3Rows.map((r) => [String(r.no), r.name, String(r.year), r.location, r.ownership, r.ownerDetails]),
        });
      }
      doc.moveDown(1.2);
    }

    if (forma4Sections?.length !== undefined) {
      doc.addPage({ size: 'A4', layout: 'landscape' });
      doc.font(fontBold).fontSize(16).fillColor('#000000').text('FORMA 4 — Əsas heyətin tərcümeyi-halı və bəyannaməsi');
      doc.moveDown(0.5);
      if (forma4Sections.length === 0) {
        doc.font(fontRegular).fontSize(10).fillColor('#666666').text('Şirkət profilində işçi əlavə edilməyib.');
      } else {
        forma4Sections.forEach((s, idx) => {
          if (idx > 0) doc.addPage({ size: 'A4', layout: 'landscape' });
          doc.font(fontBold).fontSize(11).fillColor('#000000').text(`${s.fullName} — ${s.position}`);
          doc.font(fontRegular).fontSize(8).fillColor('#B45309').text(s.tenderSpecificNote, { width: 750 });
          doc.moveDown(0.3);

          doc.font(fontBold).fontSize(9).fillColor('#000000').text('Heyət barədə məlumat');
          doc.font(fontRegular).fontSize(9).fillColor('#333333');
          for (const line of s.personLines) doc.text(line);
          doc.moveDown(0.3);

          doc.font(fontBold).fontSize(9).fillColor('#000000').text('İş yeri barədə məlumat');
          doc.font(fontRegular).fontSize(9).fillColor('#333333');
          for (const line of s.employerLines) doc.text(line);
          doc.moveDown(0.3);

          doc.font(fontBold).fontSize(9).fillColor('#000000').text('Peşəkar təcrübə');
          doc.font(fontRegular).fontSize(9).fillColor('#333333').text(s.experienceText, { width: 750 });
          doc.moveDown(0.3);

          doc.font(fontBold).fontSize(9).fillColor('#000000').text('İltizam');
          doc.font(fontRegular).fontSize(8).fillColor('#333333');
          for (const line of s.declaration) doc.text(line, { width: 750 });
          doc.moveDown(0.2);
          doc.text('Namizədin adı: _______________  İmza: _______________  Tarix: _________');
          doc.text('Təchizatçının nümayəndəsi: _______________  İmza: _______________  Tarix: _________');
        });
      }
      doc.x = doc.page.margins.left;
      doc.moveDown(0.6);
    }

    doc.addPage({ size: 'A4', layout: 'landscape' });
    doc.font(fontBold).fontSize(16).fillColor('#000000').text('FORMA 7 — Oxşar işlər üzrə təcrübə');
    doc.moveDown(0.5);

    if (forma7Rows.length === 0) {
      doc.font(fontRegular).fontSize(10).fillColor('#666666').text('Şirkət profilində analoji layihə əlavə edilməyib.');
    } else {
      drawTable(doc, fontBold, fontRegular, {
        headers: ['№', 'Tarix', 'Satınalan təşkilat', 'Predmet', 'Bənzərlik', 'Məbləğ', 'Vəziyyət', 'Rol'],
        colWidths: [25, 90, 140, 130, 180, 90, 65, 80],
        rows: forma7Rows.map((r) => [String(r.no), r.period, r.client, r.subject, r.similarity, r.value, r.status, r.role]),
      });
    }

    doc.end();
  });
}

function drawTable(doc, fontBold, fontRegular, { headers, colWidths, rows }) {
  const startX = doc.x;
  let y = doc.y;

  doc.font(fontBold).fontSize(8).fillColor('#000000');
  let x = startX;
  headers.forEach((h, i) => { doc.text(h, x, y, { width: colWidths[i] }); x += colWidths[i]; });
  y += 14;
  doc.moveTo(startX, y).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y).stroke();
  y += 4;

  doc.font(fontRegular).fontSize(8);
  for (const row of rows) {
    x = startX;
    row.forEach((v, i) => { doc.text(v, x, y, { width: colWidths[i] }); x += colWidths[i]; });
    y += 24;
    if (y > 480) { doc.addPage({ size: 'A4', layout: 'landscape' }); y = 40; }
  }
  // Kursoru sol kənara və cədvəldən sonrakı sətrə sıfırla — əks halda
  // sonrakı doc.text() çağırışları cədvəlin son sütununun x-indən başlayır.
  doc.x = doc.page.margins.left;
  doc.y = y;
}
