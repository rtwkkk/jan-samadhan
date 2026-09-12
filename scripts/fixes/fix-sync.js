const fs = require('fs');
const file = 'src/app/api/whatsapp/templates/sync/route.ts';
let code = fs.readFileSync(file, 'utf8');

// We will just rewrite the POST handler of sync/route.ts
const newPost = `export async function POST() {
  try {
    let accountId;
    let userId;
    try {
      const ctx = await getCurrentAccount();
      accountId = ctx.accountId;
      userId = ctx.userId;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await WhatsappConfigRepository.findByAccountId(accountId);
    if (!config || !config.wabaId) {
      return NextResponse.json(
        { error: 'WhatsApp not configured or missing WABA ID.' },
        { status: 400 },
      );
    }

    const accessToken = decrypt(config.accessToken);
    const metaTemplates = [];
    let nextUrl = \`\${META_API_BASE}/\${config.wabaId}/message_templates?limit=100\`;
    let pageCount = 0;
    const PAGE_CAP = 10;

    while (nextUrl && pageCount < PAGE_CAP) {
      pageCount++;
      const metaRes = await fetch(nextUrl, {
        headers: { Authorization: \`Bearer \${accessToken}\` },
      });
      if (!metaRes.ok) {
        const errorText = await metaRes.text();
        console.error('Meta API error fetching templates:', errorText);
        throw new Error('Failed to fetch templates from Meta API.');
      }
      const metaBody = await metaRes.json();
      if (metaBody.data) metaTemplates.push(...metaBody.data);
      nextUrl = metaBody.paging?.next ?? null;
    }

    let inserted = 0;
    let updated = 0;
    const errors = [];

    for (const t of metaTemplates) {
      const body = (t.components ?? []).find((c) => c.type === 'BODY');
      const header = (t.components ?? []).find((c) => c.type === 'HEADER');
      const footer = (t.components ?? []).find((c) => c.type === 'FOOTER');
      const buttons = (t.components ?? []).find((c) => c.type === 'BUTTONS');

      const parsedButtons = parseButtons(buttons?.buttons);
      const sampleValues = extractSampleValues(body, header);

      const headerFormat = header?.format?.toUpperCase();
      const headerType =
        headerFormat === 'TEXT' ||
        headerFormat === 'IMAGE' ||
        headerFormat === 'VIDEO' ||
        headerFormat === 'DOCUMENT'
          ? headerFormat.toLowerCase()
          : null;

      const data = {
        userId,
        category: normalizeCategory(t.category),
        headerType: headerType ?? null,
        headerContent: header?.text ?? null,
        headerHandle: header?.example?.header_handle?.[0] ?? null,
        bodyText: body?.text ?? '',
        footerText: footer?.text ?? null,
        buttons: parsedButtons.length ? parsedButtons : null,
        sampleValues: sampleValues,
        status: normalizeStatus(t.status),
        metaTemplateId: t.id,
        qualityScore: normalizeQualityScore(t.quality_score)
      };

      try {
        const { isNew } = await MessageTemplateRepository.upsertByNameAndLanguage(accountId, t.name, t.language, data);
        if (isNew) inserted++; else updated++;
      } catch (err) {
        errors.push({ name: t.name, language: t.language, message: err.message });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      total: metaTemplates.length,
      inserted,
      updated,
      errors,
      truncated: pageCount >= PAGE_CAP && nextUrl !== null,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return toErrorResponse(error);
    }
    console.error('Error syncing WhatsApp templates:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync templates' },
      { status: 500 },
    );
  }
}`;

code = code.replace(/export async function POST\(\) \{[\s\S]*$/, newPost);
code = code.replace(/import \{ createClient \} from '@\/lib\/supabase\/server'\n/g, '');
const imports = `import { WhatsappConfigRepository } from '@/lib/mongodb/repositories/WhatsappConfigRepository'
import { MessageTemplateRepository } from '@/lib/mongodb/repositories/MessageTemplateRepository'
import { getCurrentAccount } from '@/lib/auth/account'
`;
code = code.replace(/import \{[\s\S]*?\} from '@\/lib\/auth\/account'/, imports + `import { ForbiddenError, UnauthorizedError, requireRole, toErrorResponse } from '@/lib/auth/account'`);

fs.writeFileSync(file, code);
