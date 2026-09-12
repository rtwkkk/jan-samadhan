const fs = require('fs');

function fix(file) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/import \{ ensureImageHeaderHandle \} from '@\/lib\/storage\/upload-media'/g, 
    "import { ensureImageHeaderHandle } from '@/lib/whatsapp/template-header-handle'");
    
  code = code.replace(/import \{[\s\n]*buildMetaTemplatePayload,[\s\n]*deleteMessageTemplate,[\s\n]*editMessageTemplate,[\s\n]*\} from '@\/lib\/whatsapp\/meta-api'/g,
    "import { deleteMessageTemplate, editMessageTemplate } from '@/lib/whatsapp/meta-api'\nimport { buildMetaTemplatePayload } from '@/lib/whatsapp/template-components'");
    
  code = code.replace(/import \{[\s\n]*buildMetaTemplatePayload,[\s\n]*submitMessageTemplate,[\s\n]*\} from '@\/lib\/whatsapp\/meta-api'/g,
    "import { submitMessageTemplate } from '@/lib/whatsapp/meta-api'\nimport { buildMetaTemplatePayload } from '@/lib/whatsapp/template-components'");

  code = code.replace(/import \{ validateTemplatePayload \} from '@\/lib\/whatsapp\/template-validators'[\s\n]*import type \{ TemplatePayload \} from '@\/types'/g,
    "import { validateTemplatePayload, type TemplatePayload } from '@/lib/whatsapp/template-validators'");

  fs.writeFileSync(file, code);
}

fix('src/app/api/whatsapp/templates/submit/route.ts');
fix('src/app/api/whatsapp/templates/[id]/route.ts');
