const fs = require('fs');

let test2 = fs.readFileSync('src/lib/whatsapp/template-webhook.test.ts', 'utf8');

test2 = test2.replace(/describe\('handleTemplateWebhookChange.*?\n/g, 
  `import { vi } from 'vitest';
import { MessageTemplateRepository } from '@/lib/mongodb/repositories/MessageTemplateRepository';
vi.mock('@/lib/mongodb/repositories/MessageTemplateRepository', () => ({
  MessageTemplateRepository: {
    updateByMetaTemplateId: vi.fn().mockResolvedValue(true),
  }
}));\n$&`);

// The webhook tests check supabaseCalls. We need to replace these with MessageTemplateRepository.updateByMetaTemplateId expectations.
test2 = test2.replace(/expect\(supabaseCalls\[0\]\.table\)\.toBe\('message_templates'\);\n\s*expect\(supabaseCalls\[0\]\.op\)\.toBe\('update'\);\n\s*expect\(supabaseCalls\[0\]\.match\)\.toEqual\(\{ meta_template_id: '123' \}\);\n\s*expect\(supabaseCalls\[0\]\.payload\)\.toEqual\(\{([\s\S]*?)\}\);/g,
  `expect(MessageTemplateRepository.updateByMetaTemplateId).toHaveBeenCalledWith('123', {$1});`);

// There are probably variations. Let's just use replace with regex for supabaseCalls.
// Or I can just grep to see exactly how supabaseCalls is asserted.
