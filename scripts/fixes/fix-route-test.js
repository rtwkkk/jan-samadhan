const fs = require('fs');

let routeTest = fs.readFileSync('src/app/api/whatsapp/send/route.test.ts', 'utf8');

// The route uses requireRole. If we just mock requireRole to return a fake ctx, the tests will pass.
// Find where it mocks stuff.
const mockAccount = `
vi.mock('@/lib/auth/account', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    requireRole: vi.fn().mockImplementation((role) => {
      if (role === 'agent') {
        if (global.testRole === 'viewer') throw new Error('Forbidden');
        return {
          supabase: global.testSupabaseClient,
          userId: 'user-1',
          accountId: 'acct-1',
          role: global.testRole || 'agent'
        };
      }
      return {
        supabase: global.testSupabaseClient,
        userId: 'user-1',
        accountId: 'acct-1',
        role: global.testRole || 'admin'
      };
    })
  };
});
`;

routeTest = routeTest.replace("vi.mock('@/lib/whatsapp/send-message')", mockAccount + "\nvi.mock('@/lib/whatsapp/send-message')");
fs.writeFileSync('src/app/api/whatsapp/send/route.test.ts', routeTest);
