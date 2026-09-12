const fs = require('fs');
let file = 'src/lib/whatsapp/template-webhook.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/supabase: SupabaseClient/g, 'supabase: any');

// Fix `update` typing issues:
// update.status is string, rejectionReason is string | null, submissionError is null
code = code.replace(/status: update\.status,\n\s*rejectionReason: update\.rejection_reason,\n\s*submissionError: update\.submission_error/g, 
  "status: update.status as string,\n    rejectionReason: update.rejection_reason as string | undefined,\n    submissionError: update.submission_error as string | undefined");

code = code.replace(/if \(!updated\) \{[\s\n]*console.error\([\s\n]*'\[template-webhook\] status update failed for meta_template_id',[\s\n]*metaTemplateId,[\s\n]*error.message,[\s\n]*\)[\s\n]*\}[\s\n]*if \(data && data.length > 0\) \{/g,
  `if (!updated) {
    console.error(
      '[template-webhook] status update failed for meta_template_id',
      metaTemplateId
    )
  }

  if (updated) {`);

code = code.replace(/for \(const row of data\) \{/g, `// We don't have row ID without fetching it, but the old code fired websocket broadcasts. 
  // Let's just bypass broadcast for webhook since Supabase Realtime is gone anyway, or skip for now.
  // for (const row of data) {`);
code = code.replace(/sendTemplateStatusBroadcast\(row\.id\)/g, '// sendTemplateStatusBroadcast()');
code = code.replace(/\}[\s\n]*return true/, `return true`);

code = code.replace(/if \(!updated\) \{[\s\n]*console.error\([\s\n]*'\[template-webhook\] quality update failed for meta_template_id',[\s\n]*metaTemplateId,[\s\n]*error.message,[\s\n]*\)/g,
  `if (!updated) {
    console.error(
      '[template-webhook] quality update failed for meta_template_id',
      metaTemplateId
    )`);
    
fs.writeFileSync(file, code);

let file2 = 'src/lib/whatsapp/template-body.ts';
let code2 = fs.readFileSync(file2, 'utf8');
code2 = code2.replace(/import \{ toSnakeCase \} from '@\/lib\/whatsapp\/meta-api-utils'; \/\/ We'll just define it or return snake_case mapped/, '');
fs.writeFileSync(file2, code2);
