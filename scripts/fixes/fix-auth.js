const fs = require('fs');

function replaceFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  
  const p1 = /const\s+\{\s*data:\s*\{\s*user\s*\},\s*error:\s*authError,?\s*\}\s*=\s*await\s+supabase\.auth\.getUser\(\);?/g;
  const p2 = /const\s+\{\s*data:\s*\{\s*user\s*\}\s*\}\s*=\s*await\s+supabase\.auth\.getUser\(\);?/g;
  
  const replacement = `let accountId: string;
  let userId: string;
  try {
    const { getCurrentAccount } = await import('@/lib/auth/account');
    const ctx = await getCurrentAccount();
    accountId = ctx.accountId;
    userId = ctx.userId;
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const authError = null;
  const user = { id: userId };`;

  code = code.replace(p1, replacement);
  code = code.replace(p2, replacement);
  
  // also handle profile fetch
  const p3 = /const\s+\{\s*data:\s*profile\s*\}\s*=\s*await\s+supabase\s*\n\s*\.from\('profiles'\)\s*\n\s*\.select\('account_id'\)\s*\n\s*\.eq\('user_id',\s*user\.id\)\s*\n\s*\.maybeSingle\(\);?\s*\n\s*const\s+accountId\s*=\s*profile\?\.account_id\s*as\s*string\s*\|\s*undefined/g;
  
  const p4 = /const\s+\{\s*data:\s*profile\s*\}\s*=\s*await\s+supabase\s*\n\s*\.from\('profiles'\)\s*\n\s*\.select\('account_id'\)\s*\n\s*\.eq\('user_id',\s*user\.id\)\s*\n\s*\.maybeSingle\(\);?/g;

  code = code.replace(p3, '');
  code = code.replace(p4, '');
  
  fs.writeFileSync(file, code);
}

replaceFile('src/app/api/whatsapp/config/route.ts');
replaceFile('src/app/api/whatsapp/templates/[id]/route.ts');
replaceFile('src/app/api/whatsapp/media/[mediaId]/route.ts');
replaceFile('src/app/api/invitations/[token]/redeem/route.ts');
replaceFile('src/lib/storage/upload-media.ts');
