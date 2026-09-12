import { NextResponse } from 'next/server'
import { WhatsappConfigRepository } from '@/lib/mongodb/repositories/WhatsappConfigRepository'
import { MessageTemplateRepository } from '@/lib/mongodb/repositories/MessageTemplateRepository'
import { getCurrentAccount } from '@/lib/auth/account'
import { ForbiddenError, UnauthorizedError, requireRole, toErrorResponse } from '@/lib/auth/account'
import { decrypt } from '@/lib/whatsapp/encryption'
import { normalizeStatus } from '@/lib/whatsapp/template-status-normalize'
import type { TemplateButton, TemplateSampleValues } from '@/types'

/**
 * Sync message templates from Meta → local message_templates table.
 *
 * The local catalog stores Meta's status enum verbatim (APPROVED /
 * PENDING / REJECTED / PAUSED / DISABLED / IN_APPEAL / PENDING_DELETION)
 * so the edit / resubmit / delete flows can distinguish recoverable
 * states (PAUSED) from terminal ones (DISABLED) and so webhook events
 * land 1:1 without a translation table.
 *
 * Locally-created templates (no Meta counterpart) are NOT deleted —
 * they remain visible so the user can notice drift and clean up.
 */

const META_API_VERSION = 'v21.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

interface MetaButton {
  type: string
  text: string
  url?: string
  phone_number?: string
  example?: string[] | string
}

interface MetaTemplateComponent {
  type: string
  text?: string
  format?: string
  buttons?: MetaButton[]
  example?: {
    header_text?: string[]
    header_handle?: string[]
    body_text?: string[][]
  }
}

interface MetaTemplate {
  id: string
  name: string
  language: string
  status: string
  category: string
  components?: MetaTemplateComponent[]
  quality_score?: { score?: string } | string
}

function normalizeCategory(
  meta: string,
): 'Marketing' | 'Utility' | 'Authentication' {
  const upper = meta.toUpperCase()
  if (upper === 'UTILITY') return 'Utility'
  if (upper === 'AUTHENTICATION') return 'Authentication'
  return 'Marketing'
}

function normalizeQualityScore(
  raw: MetaTemplate['quality_score'],
): 'GREEN' | 'YELLOW' | 'RED' | null {
  const score =
    typeof raw === 'string' ? raw : raw?.score ? String(raw.score) : null
  if (!score) return null
  const upper = score.toUpperCase()
  return upper === 'GREEN' || upper === 'YELLOW' || upper === 'RED'
    ? (upper as 'GREEN' | 'YELLOW' | 'RED')
    : null
}

function parseButtons(metaButtons: MetaButton[] | undefined): TemplateButton[] {
  if (!metaButtons?.length) return []
  const out: TemplateButton[] = []
  for (const b of metaButtons) {
    switch (b.type?.toUpperCase()) {
      case 'QUICK_REPLY':
        out.push({ type: 'QUICK_REPLY', text: b.text })
        break
      case 'URL':
        out.push({
          type: 'URL',
          text: b.text,
          url: b.url ?? '',
          example: Array.isArray(b.example) ? b.example[0] : b.example,
        })
        break
      case 'PHONE_NUMBER':
        out.push({
          type: 'PHONE_NUMBER',
          text: b.text,
          phone_number: b.phone_number ?? '',
        })
        break
      case 'COPY_CODE':
        out.push({
          type: 'COPY_CODE',
          text: b.text,
          example: Array.isArray(b.example) ? b.example[0] ?? '' : b.example ?? '',
        })
        break
      // OTP, FLOW, etc — out of scope for v1; drop silently.
    }
  }
  return out
}

function extractSampleValues(
  body: MetaTemplateComponent | undefined,
  header: MetaTemplateComponent | undefined,
): TemplateSampleValues | null {
  // Meta returns body_text as a 2D array — one row per example set.
  // We take the first row (most templates have exactly one).
  const bodySample = body?.example?.body_text?.[0]
  const headerSample = header?.example?.header_text
  if (!bodySample?.length && !headerSample?.length) return null
  const sv: TemplateSampleValues = {}
  if (bodySample?.length) sv.body = bodySample
  if (headerSample?.length) sv.header = headerSample
  return sv
}

export async function POST() {
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
    let nextUrl = `${META_API_BASE}/${config.wabaId}/message_templates?limit=100`;
    let pageCount = 0;
    const PAGE_CAP = 10;

    while (nextUrl && pageCount < PAGE_CAP) {
      pageCount++;
      const metaRes = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
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
      const body = (t.components ?? []).find((c: any) => c.type === 'BODY');
      const header = (t.components ?? []).find((c: any) => c.type === 'HEADER');
      const footer = (t.components ?? []).find((c: any) => c.type === 'FOOTER');
      const buttons = (t.components ?? []).find((c: any) => c.type === 'BUTTONS');

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
        buttons: parsedButtons.length ? parsedButtons : undefined,
        sampleValues: sampleValues || undefined,
        status: normalizeStatus(t.status),
        metaTemplateId: t.id,
        qualityScore: normalizeQualityScore(t.quality_score) || undefined
      };

      try {
        const { isNew } = await MessageTemplateRepository.upsertByNameAndLanguage(accountId, t.name, t.language, data);
        if (isNew) inserted++; else updated++;
      } catch (err: any) {
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
}