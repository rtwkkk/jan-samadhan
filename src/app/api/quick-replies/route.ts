import { NextResponse } from 'next/server'
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account'
import { connectToDatabase } from '@/lib/mongodb/client'
import { QuickReplyRepository } from '@/lib/mongodb/repositories/QuickReplyRepository'
import { validateInteractivePayload } from '@/lib/whatsapp/interactive'

export async function GET() {
  try {
    const ctx = await getCurrentAccount()
    await connectToDatabase()

    const docs = await QuickReplyRepository.findByAccountId(ctx.accountId)
    
    const quick_replies = docs.map(d => ({
      id: d._id,
      account_id: d.accountId,
      user_id: d.userId,
      title: d.title,
      kind: d.kind,
      content_text: d.contentText,
      interactive_payload: d.interactivePayload,
      created_at: d.createdAt.toISOString(),
      updated_at: d.updatedAt.toISOString(),
    }))

    return NextResponse.json({ quick_replies })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(request: Request) {
  let ctx
  try {
    ctx = await requireRole('agent')
  } catch (err) {
    return toErrorResponse(err)
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const kind = body.kind === 'interactive' ? 'interactive' : 'text'
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  let contentText: string | null = null
  let interactivePayload: unknown = null

  if (kind === 'interactive') {
    const result = validateInteractivePayload(body.interactive_payload)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    interactivePayload = body.interactive_payload
  } else {
    const text = typeof body.content_text === 'string' ? body.content_text : ''
    if (!text.trim()) {
      return NextResponse.json(
        { error: 'content_text is required for text quick replies' },
        { status: 400 },
      )
    }
    contentText = text
  }

  try {
    await connectToDatabase()
    const doc = await QuickReplyRepository.create(ctx.accountId, ctx.userId, {
      title,
      kind,
      contentText,
      interactivePayload,
    })

    const quick_reply = {
      id: doc._id,
      account_id: doc.accountId,
      user_id: doc.userId,
      title: doc.title,
      kind: doc.kind,
      content_text: doc.contentText,
      interactive_payload: doc.interactivePayload,
      created_at: doc.createdAt.toISOString(),
      updated_at: doc.updatedAt.toISOString(),
    }

    return NextResponse.json({ quick_reply }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
