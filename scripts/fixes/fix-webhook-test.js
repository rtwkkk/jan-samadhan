const fs = require('fs');
let file = 'src/lib/whatsapp/template-webhook.test.ts';
let code = fs.readFileSync(file, 'utf8');

// Add imports
code = `import { MessageTemplateRepository } from '@/lib/mongodb/repositories/MessageTemplateRepository';\n` + code;
code = code.replace(/describe\('handleTemplateWebhookChange.*?\n/g, 
  `vi.mock('@/lib/mongodb/repositories/MessageTemplateRepository', () => ({
  MessageTemplateRepository: {
    updateByMetaTemplateId: vi.fn().mockResolvedValue(true),
  }
}));\n\n$&`);

// Reset mock in beforeEach
code = code.replace(/beforeEach\(\(\) => \{/g, `beforeEach(() => {
    vi.clearAllMocks();`);

// Convert `makeSupabaseStub()` to return null
code = code.replace(/const \{ stub, calls \} = makeSupabaseStub\(\);/g, `const stub = null;`);
code = code.replace(/supabaseCalls = calls;/g, ``);
code = code.replace(/expect\(supabaseCalls\)\.toHaveLength\(1\);/g, `expect(MessageTemplateRepository.updateByMetaTemplateId).toHaveBeenCalledTimes(1);`);
code = code.replace(/expect\(supabaseCalls\)\.toHaveLength\(0\);/g, `expect(MessageTemplateRepository.updateByMetaTemplateId).not.toHaveBeenCalled();`);

// Replace the expectations
code = code.replace(/expect\(supabaseCalls\[0\]\.table\)\.toBe\('message_templates'\);\n\s*expect\(supabaseCalls\[0\]\.filter\)\.toEqual\(\{[\s\n]*column: 'meta_template_id',[\s\n]*value: '(.*?)',[\s\n]*(\/\/.*?\n)?\s*\}\);\n\s*expect\(supabaseCalls\[0\]\.update\)\.toEqual\(\{([\s\S]*?)\}\);/g,
  `expect(MessageTemplateRepository.updateByMetaTemplateId).toHaveBeenCalledWith('$1', { $3 });`);
  
// Fix properties mapped differently to mongo model now:
// rejection_reason: null -> rejectionReason: undefined
// submission_error: null -> submissionError: undefined
// quality_score -> qualityScore

code = code.replace(/rejection_reason: null/g, 'rejectionReason: undefined');
code = code.replace(/submission_error: null/g, 'submissionError: undefined');
code = code.replace(/rejection_reason: (.*)/g, 'rejectionReason: $1');
code = code.replace(/submission_error: (.*)/g, 'submissionError: $1');
code = code.replace(/quality_score/g, 'qualityScore');

// Fix warning local mock test
code = code.replace(/makeSupabaseStub\(\{ empty: true \}\)/g, `null; (MessageTemplateRepository.updateByMetaTemplateId as any).mockResolvedValueOnce(false)`);
code = code.replace(/makeSupabaseStub\(\{ multiple: true \}\)/g, `null; (MessageTemplateRepository.updateByMetaTemplateId as any).mockResolvedValueOnce(false)`); // Mongo doesn't easily return count from updateMany natively mapped here, so we skip the "matched multiple" branch.

fs.writeFileSync(file, code);
