import { NextResponse } from 'next/server'
import {
  ForbiddenError,
  UnauthorizedError,
  requireRole,
  toErrorResponse,
} from '@/lib/auth/account'
import { decrypt } from '@/lib/whatsapp/encryption'
import { ensureImageHeaderHandle } from '@/lib/whatsapp/template-header-handle'
import { submitMessageTemplate } from '@/lib/whatsapp/meta-api'
import { buildMetaTemplatePayload } from '@/lib/whatsapp/template-components'
import { validateTemplatePayload, type TemplatePayload } from '@/lib/whatsapp/template-validators'
import { normalizeStatus } from '@/lib/whatsapp/template-status-normalize'

import { WhatsappConfigRepository } from '@/lib/mongodb/repositories/WhatsappConfigRepository'
import { MessageTemplateRepository } from '@/lib/mongodb/repositories/MessageTemplateRepository'

function buildUpsertRow(
  userId: string,
  payload: TemplatePayload,
  extras: {
    status: 'DRAFT' | string
    metaTemplateId: string | null
    submissionError: string | null
  },
) {
  return {
    userId,
    name: payload.name,
    category: payload.category as any,
    language: payload.language,
    headerType: payload.header_type ?? undefined,
    headerContent: payload.header_content ?? undefined,
    headerMediaUrl: payload.header_media_url ?? undefined,
    headerHandle: payload.header_handle ?? undefined,
    bodyText: payload.body_text,
    footerText: payload.footer_text ?? undefined,
    buttons: payload.buttons ?? undefined,
    sampleValues: payload.sample_values ?? undefined,
    status: extras.status,
    metaTemplateId: extras.metaTemplateId ?? undefined,
    submissionError: extras.submissionError ?? undefined,
    rejectionReason: extras.submissionError ? undefined : undefined,
    lastSubmittedAt: new Date(),
  }
}

function toSnakeCase(doc: any) {
  if (!doc) return null;
  return {
    id: doc._id,
    account_id: doc.accountId,
    user_id: doc.userId,
    name: doc.name,
    category: doc.category,
    language: doc.language,
    header_type: doc.headerType,
    header_content: doc.headerContent,
    header_handle: doc.headerHandle,
    header_media_url: doc.headerMediaUrl,
    body_text: doc.bodyText,
    footer_text: doc.footerText,
    buttons: doc.buttons,
    sample_values: doc.sampleValues,
    status: doc.status,
    meta_template_id: doc.metaTemplateId,
    rejection_reason: doc.rejectionReason,
    quality_score: doc.qualityScore,
    submission_error: doc.submissionError,
    last_submitted_at: doc.lastSubmittedAt,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
  }
}

export async function POST(request: Request) {
  try {
    const { accountId, userId } = await requireRole('admin')

    let payload: TemplatePayload
    try {
      payload = (await request.json()) as TemplatePayload
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    if (payload.category === 'Authentication') {
      return NextResponse.json(
        {
          error:
            'AUTHENTICATION templates are not yet supported here — create them in Meta WhatsApp Manager and use "Sync from Meta".',
        },
        { status: 400 },
      )
    }

    try {
      validateTemplatePayload(payload)
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Validation failed.' },
        { status: 400 },
      )
    }

    const dryRun =
      process.env.WHATSAPP_TEMPLATES_DRY_RUN === 'true' ||
      process.env.WHATSAPP_TEMPLATES_DRY_RUN === '1'

    let metaTemplateId: string
    let metaStatus: string

    if (dryRun) {
      metaTemplateId = `dry-run-${crypto.randomUUID()}`
      metaStatus = 'PENDING'
    } else {
      const config = await WhatsappConfigRepository.findByAccountId(accountId)
      if (!config) {
        return NextResponse.json(
          {
            error:
              'WhatsApp not configured. Connect your WhatsApp Business account in Settings first.',
          },
          { status: 400 },
        )
      }
      if (!config.wabaId) {
        return NextResponse.json(
          {
            error:
              'WABA (WhatsApp Business Account) ID missing. Re-connect your account in Settings.',
          },
          { status: 400 },
        )
      }

      const accessToken = decrypt(config.accessToken)

      try {
        await ensureImageHeaderHandle(payload, accessToken)
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : 'Header image upload failed.' },
          { status: 400 },
        )
      }

      const metaPayload = buildMetaTemplatePayload(payload)
      try {
        const meta = await submitMessageTemplate({
          wabaId: config.wabaId,
          accessToken,
          payload: metaPayload,
        })
        metaTemplateId = meta.id
        metaStatus = meta.status
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Meta submit failed.'
        await MessageTemplateRepository.upsertByNameAndLanguage(
          accountId,
          payload.name,
          payload.language,
          buildUpsertRow(userId, payload, {
            status: 'DRAFT',
            metaTemplateId: null,
            submissionError: message,
          })
        )
        const isRateLimit = /\b429\b/.test(message)
        return NextResponse.json(
          {
            error: isRateLimit
              ? 'Meta rate limit hit (100 template creates per hour). Try again later.'
              : message,
          },
          { status: isRateLimit ? 429 : 502 },
        )
      }
    }

    const { template: row } = await MessageTemplateRepository.upsertByNameAndLanguage(
      accountId,
      payload.name,
      payload.language,
      buildUpsertRow(userId, payload, {
        status: normalizeStatus(metaStatus),
        metaTemplateId,
        submissionError: null,
      })
    )

    if (!row) {
      return NextResponse.json(
        {
          error: `Submitted to Meta but failed to save locally. Run "Sync from Meta" to recover.`,
          meta_template_id: metaTemplateId,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      template: toSnakeCase(row),
      dry_run: dryRun,
    })
  } catch (error) {
    if (
      error instanceof UnauthorizedError ||
      error instanceof ForbiddenError
    ) {
      return toErrorResponse(error)
    }
    console.error('Error submitting template:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to submit template.',
      },
      { status: 500 },
    )
  }
}
