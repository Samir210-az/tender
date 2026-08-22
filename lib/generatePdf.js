/**
 * Proposal məzmunundan (docx ilə eyni JSON strukturu) PDF buffer yaradır.
 *
 * DİQQƏT — pdfkit MÜTLƏQ dinamik import() ilə yüklənməlidir (top-level YOX):
 * fs-ə bağlı init kodu Next.js build zamanı ("Collecting page data")
 * icra olunanda xəta verir.
 *
 * Font faylları /public/fonts-də saxlanılır (node_modules-dən require.resolve
 * ilə tapmaq əvəzinə) — çünki:
 *  1. Next.js/Vercel /public qovluğunu HƏMİŞƏ deploy-a daxil edir, heç bir
 *     fayl-tracing riski yoxdur.
 *  2. require.resolve() webpack tərəfindən bundle zamanı əvəz olunur və
 *     path string əvəzinə rəqəm (module ID) qaytarır — buna görə əvvəlki
 *     versiya "path arg must be string" və sonra "f is not a function"
 *     (require.resolve özü sınmışdı) xətaları verdi. process.cwd() + sadə
 *     path.join() heç bir belə interop riski daşımır.
 */
export async function generateProposalPdf({ tenderName, sections }) {
  const { default: PDFDocument } = await import('pdfkit');
  const path = await import('path');

  const FONT_PATH = path.join(process.cwd(), 'public', 'fonts', 'DejaVuSans.ttf');
  const FONT_BOLD_PATH = path.join(process.cwd(), 'public', 'fonts', 'DejaVuSans-Bold.ttf');

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
