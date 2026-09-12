const fs = require('fs');
const path = 'src/app/api/invitations/[token]/peek/route.ts';

let code = fs.readFileSync(path, 'utf8');

code = code.replace(/import { createClient } from "@\/lib\/supabase\/server";/, '');
code = code.replace(/const supabase = await createClient\(\);[\s\S]*?if \(error\) \{[\s\S]*?return NextResponse.json\([\s\S]*?\{ status: 500 \},[\s\S]*?\);[\s\S]*?\}/, '');

code = code.replace(/return NextResponse\.json\(data\);/, `
  const { InvitationService } = await import('@/lib/auth/invitation-service');
  const data = await InvitationService.peek(hashInviteToken(token));
  return NextResponse.json(data);
`);

fs.writeFileSync(path, code);
