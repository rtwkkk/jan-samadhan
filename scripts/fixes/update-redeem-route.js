const fs = require('fs');
const path = 'src/app/api/invitations/[token]/redeem/route.ts';

let code = fs.readFileSync(path, 'utf8');

code = code.replace(/import { createClient } from "@\/lib\/supabase\/server";/, '');

const newLogic = `
  const { InvitationService } = await import('@/lib/auth/invitation-service');
  let accountId;
  try {
    accountId = await InvitationService.redeem(userId, hashInviteToken(token));
  } catch (err: any) {
    const message = err.message || '';
    if (message.startsWith('42501:')) {
      return NextResponse.json({ error: message.split(':')[1] }, { status: 401 });
    }
    if (message.startsWith('22023:')) {
      return NextResponse.json({ error: message.split(':')[1] }, { status: 400 });
    }
    if (message.startsWith('23505:')) {
      return NextResponse.json({ error: message.split(':')[1] }, { status: 409 });
    }
    console.error("[redeem] unexpected error:", err);
    return NextResponse.json({ error: "Failed to redeem invitation" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, accountId });
`;

code = code.replace(/const supabase = await createClient\(\);[\s\S]*?return NextResponse\.json\(\{ ok: true, accountId \}\);/, newLogic);

// Remove the unused rpcErrorToResponse function and PostgrestError import
code = code.replace(/import type \{ PostgrestError \} from "@supabase\/supabase-js";/, '');
code = code.replace(/function rpcErrorToResponse[\s\S]*?\}\n/, '');

fs.writeFileSync(path, code);
