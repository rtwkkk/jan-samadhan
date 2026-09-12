const fs = require('fs');

const files = [
  'src/app/api/whatsapp/config/route.ts',
  'src/app/api/whatsapp/media/[mediaId]/route.ts',
  'src/app/api/whatsapp/templates/[id]/route.ts',
  'src/app/api/invitations/[token]/redeem/route.ts'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');

  // If there's `const accountId = await resolveAccountId(supabase, userId)` we just replace it with `const accountId = myCtxAccountId;`
  code = code.replace(/let accountId: string;/g, 'let accountId_ctx: string;');
  code = code.replace(/accountId = ctx\.accountId;/g, 'accountId_ctx = ctx.accountId;');
  
  // replace the old `const accountId = await resolveAccountId...`
  code = code.replace(/const accountId = await resolveAccountId[^\n]*\n/g, 'const accountId = accountId_ctx;\n');
  code = code.replace(/const accountId = await getAccountId[^\n]*\n/g, 'const accountId = accountId_ctx;\n');

  // Also in invitations, `const { data: profile } = await supabase.from...` might still be there for accountId?
  code = code.replace(/const accountId = profile\?\.account_id as string \| undefined/g, 'const accountId = accountId_ctx');
  
  fs.writeFileSync(file, code);
}
