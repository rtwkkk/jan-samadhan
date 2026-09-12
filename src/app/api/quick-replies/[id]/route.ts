import { NextResponse } from 'next/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { connectToDatabase } from '@/lib/mongodb/client'
import { QuickReplyRepository } from '@/lib/mongodb/repositories/QuickReplyRepository'
import { validateInteractivePayload } from '@/lib/whatsapp/interactive'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  let ctx
  try {
    ctx = await requireRole('agent')
  } catch (err) {
    return toErrorResponse(err)
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (typeof body.title === 'string') {
    const title = body.title.trim()
    if (!title) return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 })
    update.title = title
  }

  if ('kind' in body) {
    if (body.kind !== 'text' && body.kind !== 'interactive') {
      return NextResponse.json({ error: 'kind must be "text" or "interactive"' }, { status: 400 })
    }
    update.kind = body.kind
    if (body.kind === 'interactive') {
      const result = validateInteractivePayload(body.interactive_payload)
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
      update.interactivePayload = body.interactive_payload
      update.contentText = null
    } else {
      const text = typeof body.content_text === 'string' ? body.content_text : ''
      if (!text.trim()) {
        return NextResponse.json(
          { error: 'content_text is required for text quick replies' },
          { status: 400 },
        )
      }
      update.contentText = text
      update.interactivePayload = null
    }
  } else {
    if ('content_text' in body) update.contentText = body.content_text ?? null
    if ('interactive_payload' in body) {
      if (body.interactive_payload != null) {
        const result = validateInteractivePayload(body.interactive_payload)
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 400 })
        }
      }
      update.interactivePayload = body.interactive_payload ?? null
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true })
  }

  try {
    await connectToDatabase()
    const doc = await QuickReplyRepository.update(ctx.accountId, id, update)
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  let ctx
  try {
    ctx = await requireRole('agent')
  } catch (err) {
    return toErrorResponse(err)
  }

  try {
    await connectToDatabase()
    const success = await QuickReplyRepository.delete(ctx.accountId, id)
    if (!success) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
