/**
 * Proposal məzmunundan (docx ilə eyni JSON strukturu) PDF buffer yaradır.
 *
 * DİQQƏT — bütün fs/require.resolve/path əməliyyatları FUNKSİYA DAXİLİNDƏ
 * olmalıdır, modulun top-level-də DEYİL:
 *  1. pdfkit fs-ə bağlı init kodu ilə build zamanı ("Collecting page data")
 *     xəta verir — dinamik import() bunu yalnız runtime-da yükləyir.
 *  2. require.resolve() webpack tərəfindən bundle zamanı əvəz olunur və
 *     path string əvəzinə RƏQƏM (module ID) qaytarır — buna görə font yolu
 *     hesablaması da funksiya daxilində, runtime-da edilməlidir, modulun
 *     yuxarı səviyyəsində YOX (əks halda "path arg must be string,
 *     received number" xətası yaranır).
 */
export async function generateProposalPdf({ tenderName, sections }) {
  const { default: PDFDocument } = await import('pdfkit');
  const path = await import('path');
  const { createRequire } = await import('module');

  const require = createRequire(import.meta.url);
  const dejavuPkgPath = require.resolve('dejavu-fonts-ttf/package.json');
  const dejavuRoot = path.dirname(dejavuPkgPath);
  const FONT_PATH = path.join(dejavuRoot, 'ttf', 'DejaVuSans.ttf');
  const FONT_BOLD_PATH = path.join(dejavuRoot, 'ttf', 'DejaVuSans-Bold.ttf');

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
