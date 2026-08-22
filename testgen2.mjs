import { generateProposalPdf } from './lib/generatePdf.js';
import fs from 'fs';

const buf = await generateProposalPdf({
  tenderName: 'Test Tender - əğıöüşç',
  sections: [
    { heading: 'Örtük Məktubu', text: 'Bu bir test mətnidir: VÖEN, şirkət, dövriyyə əğıöüşç ƏĞIÖÜŞÇ İ' },
  ],
});
fs.writeFileSync('/tmp/testgen2.pdf', buf);
console.log('OK, size:', buf.length);
