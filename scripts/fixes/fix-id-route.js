const fs = require('fs');
const file = 'src/app/api/whatsapp/templates/[id]/route.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/import \{ createClient \} from '@\/lib\/supabase\/server'\n/g, '');
const imports = `import { WhatsappConfigRepository } from '@/lib/mongodb/repositories/WhatsappConfigRepository'
import { MessageTemplateRepository } from '@/lib/mongodb/repositories/MessageTemplateRepository'
`;
code = code.replace(/import \{[\s\S]*?\} from '@\/lib\/auth\/account'/, imports + `import { getCurrentAccount } from '@/lib/auth/account'`);

// Replace GET
code = code.replace(/const \{ data: existing, error: lookupErr \} = await supabase[\s\S]*?if \(lookupErr \|\| !existing\)/, `const existing = await MessageTemplateRepository.findByIdAndAccountId(id, accountId)
    if (!existing)`);

// Replace PATCH config lookup
code = code.replace(/const \{ data: config, error: configError \} = await supabase[\s\S]*?if \(configError \|\| !config\)/, `const config = await WhatsappConfigRepository.findByAccountId(accountId)
      if (!config)`);
      
// Replace PATCH config access token
code = code.replace(/config\.access_token/g, `config.accessToken`);
code = code.replace(/config\.waba_id/g, `config.wabaId`);

// Replace PATCH update fallback
code = code.replace(/await supabase[\s\S]*?\.from\('message_templates'\)[\s\S]*?\.update\(\{[\s\S]*?submission_error: message,[\s\S]*?last_submitted_at: new Date\(\)\.toISOString\(\),[\s\S]*?\}\)[\s\S]*?\.eq\('id', id\)/, `await MessageTemplateRepository.updateByIdAndAccountId(id, accountId, {
          submissionError: message,
          lastSubmittedAt: new Date()
        })`);

// Replace PATCH final update
code = code.replace(/const \{ data: row, error: updErr \} = await supabase[\s\S]*?\.from\('message_templates'\)[\s\S]*?\.update\(\{([\s\S]*?)\}\)[\s\S]*?\.eq\('id', id\)[\s\S]*?\.select\(\)[\s\S]*?\.single\(\)/, `const row = await MessageTemplateRepository.updateByIdAndAccountId(id, accountId, {
        category: payload.category,
        headerType: payload.header_type ?? null,
        headerContent: payload.header_content ?? null,
        headerMediaUrl: payload.header_media_url ?? null,
        headerHandle: payload.header_handle ?? null,
        bodyText: payload.body_text,
        footerText: payload.footer_text ?? null,
        buttons: payload.buttons ?? null,
        sampleValues: payload.sample_values ?? null,
        status: 'PENDING',
        submissionError: null,
        rejectionReason: null,
        lastSubmittedAt: new Date()
      })
      const updErr = row ? null : new Error("Failed to update template")`);

// Delete route replacements
code = code.replace(/const \{ data: existing, error: lookupErr \} = await supabase[\s\S]*?if \(lookupErr \|\| !existing\)/, `const existing = await MessageTemplateRepository.findByIdAndAccountId(id, accountId)
    if (!existing)`);
code = code.replace(/const \{ data: config, error: configError \} = await supabase[\s\S]*?if \(configError \|\| !config \|\| !config\.wabaId\)/, `const config = await WhatsappConfigRepository.findByAccountId(accountId)
      if (!config || !config.wabaId)`);
code = code.replace(/const \{ error: delErr \} = await supabase[\s\S]*?\.from\('message_templates'\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\('id', id\)/, `const deleted = await MessageTemplateRepository.deleteByIdAndAccountId(id, accountId)
    const delErr = deleted ? null : new Error("Failed to delete template locally")`);

code = code.replace(/const \{ data: profile \} = await supabase[\s\S]*?\.maybeSingle\(\)/g, '');
code = code.replace(/const supabase = await createClient\(\)\n/g, '');

fs.writeFileSync(file, code);
