const fs = require('fs');

function replaceAuth(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  
  // Strip out createClient
  code = code.replace(/import \{ createClient \} from '@\/lib\/supabase\/server'\n/g, '');
  code = code.replace(/const supabase = await createClient\(\)\n/g, '');
  
  // Replace auth check pattern 1
  const pattern1 = `  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }`;

  const pattern2 = `  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }`;

  const replacement = `  let accountId: string;
  let userId: string;
  try {
    const { getCurrentAccount } = await import('@/lib/auth/account');
    const ctx = await getCurrentAccount();
    accountId = ctx.accountId;
    userId = ctx.userId;
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }`;

  // Replace profile fetch pattern
  const profilePattern = `  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', user.id)
    .maybeSingle()
  const accountId = profile?.account_id as string | undefined
  if (!accountId) {`;

  const profileReplacement = `  if (!accountId) {`;

  // Apply
  code = code.replace(pattern1, replacement).replace(pattern2, replacement);
  code = code.replace(profilePattern, profileReplacement);
  
  // Also clean up `supabase.from('whatsapp_config')` because wait...
  // `supabase` is still needed for DB operations!
  // If `supabase` is deleted, we must re-instantiate it. Or better, just use MongoDB!
  // Wait, whatsapp_config is in MONGODB!
  // Oh wait, did we migrate whatsapp_config to MongoDB? Yes, `src/lib/mongodb/models/WhatsappConfig.ts` exists.
  
  fs.writeFileSync(filePath, code);
}

replaceAuth('src/app/api/whatsapp/config/verify-registration/route.ts');
