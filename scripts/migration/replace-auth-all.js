const fs = require('fs');

const files = [
  'src/app/api/whatsapp/config/route.ts',
  'src/app/api/whatsapp/templates/[id]/route.ts',
  'src/app/api/whatsapp/media/[mediaId]/route.ts',
  'src/app/api/invitations/[token]/redeem/route.ts'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');

  // Replace any instance of `supabase.auth.getUser()` with our custom logic
  
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

  const pattern3 = `  const {
    data: { user },
  } = await supabase.auth.getUser();`;

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

  const replacement3 = `  let accountId: string;
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

  const profilePattern2 = `  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.account_id) {`;

  const profileReplacement = `  if (!accountId) {`;

  code = code.replace(pattern1, replacement).replace(pattern2, replacement).replace(pattern3, replacement3);
  code = code.replace(profilePattern, profileReplacement);
  code = code.replace(profilePattern2, profileReplacement);

  // We need to make sure we don't end up with `user.id` references!
  code = code.replace(/user\.id/g, 'userId');

  fs.writeFileSync(file, code);
}
