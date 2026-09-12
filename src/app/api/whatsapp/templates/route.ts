import { NextResponse } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { MessageTemplateRepository } from '@/lib/mongodb/repositories/MessageTemplateRepository'

function toSnakeCase(doc: any) {
  // convert mongo doc to snake_case structure for the UI
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

export async function GET() {
  try {
    let accountId: string
    try {
      const ctx = await getCurrentAccount()
      accountId = ctx.accountId
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const templates = await MessageTemplateRepository.findByAccountId(accountId)

    return NextResponse.json(templates.map(toSnakeCase))
  } catch (error) {
    console.error('Error in GET /api/whatsapp/templates:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
