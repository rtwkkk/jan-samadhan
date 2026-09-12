const fs = require('fs');

let submit = fs.readFileSync('src/app/api/whatsapp/templates/submit/route.ts', 'utf8');
submit = submit.replace(/import \{ validateTemplatePayload \} from '@\/lib\/whatsapp\/template-validators'/g, "import { validateTemplatePayload, type TemplatePayload } from '@/lib/whatsapp/template-validators'");
fs.writeFileSync('src/app/api/whatsapp/templates/submit/route.ts', submit);

let sync = fs.readFileSync('src/app/api/whatsapp/templates/sync/route.ts', 'utf8');
sync = sync.replace(/qualityScore: normalizeQualityScore\(t\.quality_score\)/g, "qualityScore: normalizeQualityScore(t.quality_score) || undefined");
fs.writeFileSync('src/app/api/whatsapp/templates/sync/route.ts', sync);
