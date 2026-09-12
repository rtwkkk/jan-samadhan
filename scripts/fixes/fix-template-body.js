const fs = require('fs');
let code = fs.readFileSync('src/lib/whatsapp/template-body.ts', 'utf8');

code = code.replace(/import type \{ SupabaseClient \} from '@supabase\/supabase-js';/g, "import { MessageTemplateRepository } from '@/lib/mongodb/repositories/MessageTemplateRepository';\nimport { toSnakeCase } from '@/lib/whatsapp/meta-api-utils'; // We'll just define it or return snake_case mapped");

const oldFunc = `export async function resolveTemplateRow(
  db: SupabaseClient,
  accountId: string,
  templateName: string,
  requestedLanguage?: string | null
): Promise<ResolvedTemplate> {
  const { data } = await db
    .from('message_templates')
    .select('*')
    .eq('account_id', accountId)
    .eq('name', templateName);`;

const newFunc = `export async function resolveTemplateRow(
  db: any, // kept for backward compatibility signature with tests
  accountId: string,
  templateName: string,
  requestedLanguage?: string | null
): Promise<ResolvedTemplate> {
  const docs = await MessageTemplateRepository.findByAccountId(accountId);
  const data = docs.filter(d => d.name === templateName).map(doc => ({
    id: doc._id,
    account_id: doc.accountId,
    user_id: doc.userId,
    name: doc.name,
    category: doc.category,
    language: doc.language,
    header_type: doc.headerType,
    header_content: doc.headerContent,
    header_handle: doc.headerHandle,
    header_media_url: doc.headerMediaUrl,
    body_text: doc.bodyText,
    footer_text: doc.footerText,
    buttons: doc.buttons,
    sample_values: doc.sampleValues,
    status: doc.status,
    meta_template_id: doc.metaTemplateId,
    rejection_reason: doc.rejectionReason,
    quality_score: doc.qualityScore,
    submission_error: doc.submissionError,
    last_submitted_at: doc.lastSubmittedAt,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
  }));
`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync('src/lib/whatsapp/template-body.ts', code);
