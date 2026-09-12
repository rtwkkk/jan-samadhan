import { NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { WhatsappConfigRepository } from '@/lib/mongodb/repositories/WhatsappConfigRepository'
import { MessageTemplateRepository } from '@/lib/mongodb/repositories/MessageTemplateRepository'
import { decrypt } from '@/lib/whatsapp/encryption'
import { ensureImageHeaderHandle } from '@/lib/whatsapp/template-header-handle'
import { deleteMessageTemplate, editMessageTemplate } from '@/lib/whatsapp/meta-api'
import { buildMetaTemplatePayload } from '@/lib/whatsapp/template-components'
import { validateTemplatePayload, type TemplatePayload } from '@/lib/whatsapp/template-validators'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const EDITABLE_STATUSES = new Set(['APPROVED', 'REJECTED', 'PAUSED'])

function isDryRun() {
  return (
    process.env.WHATSAPP_TEMPLATES_DRY_RUN === 'true' ||
    process.env.WHATSAPP_TEMPLATES_DRY_RUN === '1'
  )
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    if (!UUID_RE.test(id)) {
      return NextResponse.json(
        { error: 'Invalid template id.' },
        { status: 400 },
      )
    }

    let accountId: string
    try {
      const ctx = await getCurrentAccount()
      accountId = ctx.accountId
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let payload: TemplatePayload
    try {
      payload = (await request.json()) as TemplatePayload
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const existing = await MessageTemplateRepository.findByIdAndAccountId(id, accountId)
    if (!existing) {
      return NextResponse.json({ error: 'Template not found.' }, { status: 404 })
    }

    if (!existing.metaTemplateId) {
      return NextResponse.json(
        {
          error:
            'This template was never submitted to Meta — use New Template to submit it instead.',
        },
        { status: 400 },
      )
    }

    if (existing.status && !EDITABLE_STATUSES.has(existing.status)) {
      return NextResponse.json(
        {
          error: `Templates in status ${existing.status} cannot be edited. Allowed: APPROVED, REJECTED, PAUSED.`,
        },
        { status: 400 },
      )
    }

    if (payload.category === 'Authentication') {
      return NextResponse.json(
        {
          error:
            'AUTHENTICATION templates are not editable here — manage them in Meta WhatsApp Manager.',
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

    if (!isDryRun()) {
      const config = await WhatsappConfigRepository.findByAccountId(accountId)
      if (!config) {
        return NextResponse.json(
          { error: 'WhatsApp not configured.' },
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
        await editMessageTemplate({
          metaTemplateId: existing.metaTemplateId,
          accessToken,
          components: metaPayload.components,
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Meta edit failed.'
        await MessageTemplateRepository.updateByIdAndAccountId(id, accountId, {
          submissionError: message,
          lastSubmittedAt: new Date(),
        })
        return NextResponse.json({ error: message }, { status: 502 })
      }
    }

    const row = await MessageTemplateRepository.updateByIdAndAccountId(id, accountId, {
      category: payload.category as any,
      headerType: payload.header_type ?? undefined,
      headerContent: payload.header_content ?? undefined,
      headerMediaUrl: payload.header_media_url ?? undefined,
      headerHandle: payload.header_handle ?? undefined,
      bodyText: payload.body_text,
      footerText: payload.footer_text ?? undefined,
      buttons: payload.buttons ?? undefined,
      sampleValues: payload.sample_values ?? undefined,
      status: 'PENDING',
      submissionError: undefined,
      rejectionReason: undefined,
      lastSubmittedAt: new Date(),
    })

    if (!row) {
      return NextResponse.json(
        {
          error: `Edited on Meta but failed to save locally. Run "Sync from Meta" to recover.`,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      template: toSnakeCase(row),
      dry_run: isDryRun(),
    })
  } catch (error) {
    console.error('Error editing template:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to edit template.',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params
    if (!UUID_RE.test(id)) {
      return NextResponse.json(
        { error: 'Invalid template id.' },
        { status: 400 },
      )
    }
    let accountId: string
    try {
      const ctx = await getCurrentAccount()
      accountId = ctx.accountId
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await MessageTemplateRepository.findByIdAndAccountId(id, accountId)
    if (!existing) {
      return NextResponse.json({ error: 'Template not found.' }, { status: 404 })
    }

    if (existing.metaTemplateId && !isDryRun()) {
      const config = await WhatsappConfigRepository.findByAccountId(accountId)
      if (!config || !config.wabaId) {
        return NextResponse.json(
          { error: 'WhatsApp not configured — cannot delete on Meta.' },
          { status: 400 },
        )
      }
      const accessToken = decrypt(config.accessToken)
      try {
        await deleteMessageTemplate({
          wabaId: config.wabaId,
          accessToken,
          name: existing.name,
          metaTemplateId: existing.metaTemplateId,
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Meta delete failed.'
        return NextResponse.json({ error: message }, { status: 502 })
      }
    }

    const deleted = await MessageTemplateRepository.deleteByIdAndAccountId(id, accountId)
    if (!deleted) {
      return NextResponse.json(
        {
          error: `Deleted on Meta but failed to delete locally.`,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, dry_run: isDryRun() })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to delete template.',
      },
      { status: 500 },
    )
  }
}
