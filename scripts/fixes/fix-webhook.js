const fs = require('fs');

// Add updateByMetaTemplateId to MessageTemplateRepository
let repo = fs.readFileSync('src/lib/mongodb/repositories/MessageTemplateRepository.ts', 'utf8');
const newMethod = `
  /**
   * Update templates globally by metaTemplateId.
   * Used by webhook which receives updates from Meta independent of account.
   */
  static async updateByMetaTemplateId(
    metaTemplateId: string,
    data: Omit<Partial<IMessageTemplate>, '_id' | 'accountId' | 'createdAt' | 'name' | 'language'>
  ): Promise<boolean> {
    await connectToDatabase();
    const result = await MessageTemplate.updateMany(
      { metaTemplateId },
      { $set: data }
    );
    return result.modifiedCount > 0;
  }
}
`;
repo = repo.replace(/}\n$/, newMethod);
fs.writeFileSync('src/lib/mongodb/repositories/MessageTemplateRepository.ts', repo);

// Fix template-webhook.ts
let webhook = fs.readFileSync('src/lib/whatsapp/template-webhook.ts', 'utf8');
webhook = webhook.replace(/import type \{ SupabaseClient \} from '@supabase\/supabase-js'\n/g, '');
const imports = `import { MessageTemplateRepository } from '@/lib/mongodb/repositories/MessageTemplateRepository'\n`;
webhook = imports + webhook;

const oldStatusUpdate = `const { data, error } = await supabase
    .from('message_templates')
    .update(update)
    .eq('meta_template_id', metaTemplateId)
    .select('id')

  if (error) {`;
const newStatusUpdate = `const updated = await MessageTemplateRepository.updateByMetaTemplateId(metaTemplateId, {
    status: update.status,
    rejectionReason: update.rejection_reason,
    submissionError: update.submission_error
  })

  if (!updated) {`;
webhook = webhook.replace(oldStatusUpdate, newStatusUpdate);

const oldQualityUpdate = `const { error } = await supabase
    .from('message_templates')
    .update({ quality_score: score })
    .eq('meta_template_id', metaTemplateId)

  if (error) {`;
const newQualityUpdate = `const updated = await MessageTemplateRepository.updateByMetaTemplateId(metaTemplateId, { qualityScore: score || undefined })

  if (!updated) {`;
webhook = webhook.replace(oldQualityUpdate, newQualityUpdate);
fs.writeFileSync('src/lib/whatsapp/template-webhook.ts', webhook);
