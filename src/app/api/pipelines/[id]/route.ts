// ============================================================
// PATCH  /api/pipelines/[id]  — rename / update pipeline
// DELETE /api/pipelines/[id]  — delete pipeline + cascade deals
//
// Authorization:
//   PATCH/DELETE — admin+ only
//
// DELETE is transactional: all Deal documents for the pipeline are
// deleted in the same MongoDB session as the Pipeline document so
// the database never ends up with orphaned deals.
// ============================================================

import { NextResponse }      from 'next/server';
import mongoose               from 'mongoose';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { connectToDatabase } from '@/lib/mongodb/client';
import { PipelineRepository } from '@/lib/mongodb/repositories/PipelineRepository';
import { DealRepository }     from '@/lib/mongodb/repositories/DealRepository';
import { toApiPipeline }      from '../_pipeline-helpers';

// ── PATCH /api/pipelines/[id] ────────────────────────────────
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole('admin');
    await connectToDatabase();

    const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Pipeline name is required' }, { status: 400 });
    }

    const updated = await PipelineRepository.updateById(ctx.accountId, (await params).id, { name } as any);
    if (!updated) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    return NextResponse.json(toApiPipeline(updated));
  } catch (err) {
    return toErrorResponse(err);
  }
}

// ── DELETE /api/pipelines/[id] ───────────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole('admin');
    await connectToDatabase();

    // Verify pipeline exists and belongs to this account before opening a session.
    const pipeline = await PipelineRepository.findById(ctx.accountId, (await params).id);
    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    // Atomic: delete all deals for this pipeline, then delete the pipeline.
    // Replicates PostgreSQL ON DELETE CASCADE (deals → pipeline).
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Delete all deals belonging to this pipeline in the same account.
        await DealRepository.deleteByPipelineId(ctx.accountId, (await params).id);
        // Delete the pipeline document (embedded stages disappear with it).
        const deleted = await PipelineRepository.deleteById(ctx.accountId, (await params).id);
        if (!deleted) throw new Error('Pipeline delete failed');
      });
    } finally {
      await session.endSession();
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
