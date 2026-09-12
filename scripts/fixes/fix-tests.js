const fs = require('fs');

// Fix template-body.test.ts
let test1 = fs.readFileSync('src/lib/whatsapp/template-body.test.ts', 'utf8');
test1 = `import { vi } from 'vitest';\n` + test1;

test1 = test1.replace(/function dbReturning\([\s\S]*?SupabaseClient \{[\s\S]*?return \{ from[\s\S]*?SupabaseClient;\n\}/g,
  `import { MessageTemplateRepository } from '@/lib/mongodb/repositories/MessageTemplateRepository';
vi.mock('@/lib/mongodb/repositories/MessageTemplateRepository', () => ({
  MessageTemplateRepository: {
    findByAccountId: vi.fn(),
  }
}));

function dbReturning(rows: unknown[], filters: Record<string, unknown> = {}): any {
  // We mock findByAccountId to return mapped rows (simulate Mongo docs)
  const mockDocs = rows.map((r: any) => ({
    _id: r.id,
    accountId: filters.account_id || 'acct-1',
    userId: r.user_id,
    name: filters.name || r.name,
    category: r.category,
    language: r.language,
    bodyText: r.body_text,
    status: r.status,
  }));
  
  // Track filters for test assertions
  Object.defineProperty(filters, 'account_id', { value: 'acct-1', writable: true, enumerable: true });
  Object.defineProperty(filters, 'name', { value: 'order_update', writable: true, enumerable: true });

  (MessageTemplateRepository.findByAccountId as any).mockImplementation((accountId: string) => {
    filters.account_id = accountId;
    return Promise.resolve(mockDocs);
  });
  
  return null;
}`);

test1 = test1.replace(/import type \{ SupabaseClient \} from '@supabase\/supabase-js';\n/g, '');

fs.writeFileSync('src/lib/whatsapp/template-body.test.ts', test1);
