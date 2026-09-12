// ============================================================
// DELETE /api/pipelines/[id]/stages/[stageId]
//
// Authorization: admin+ only
//
// Guard: refuses to delete a stage that has deals assigned to it
// (replicates the PostgreSQL FK constraint — stage_id FK on deals
// prevents deletion when deals exist). The count check happens
// inside this route; PipelineRepository.removeStage() does the
// actual $pull.
// ============================================================

import { NextResponse }      from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { connectToDatabase }      from '@/lib/mongodb/client';
import { PipelineRepository } from '@/lib/mongodb/repositories/PipelineRepository';
import { DealRepository }    from '@/lib/mongodb/repositories/DealRepository';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; stageId: string }> },
) {
  try {
    const { id, stageId } = await params;
    const ctx = await requireRole('admin');
    await connectToDatabase();

    // Verify the pipeline exists and belongs to this account.
    const pipeline = await PipelineRepository.findById(ctx.accountId, id);
    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    // Verify the stage exists inside this pipeline.
    const stageExists = pipeline.stages.some((s) => s.id === stageId);
    if (!stageExists) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
    }

    // Refuse deletion if any deals are still assigned to this stage.
    // Mirrors the PostgreSQL FK constraint behavior that blocked stage deletes.
    const dealCount = await DealRepository.countByStageId(ctx.accountId, stageId);
    if (dealCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete stage: ${dealCount} deal${dealCount === 1 ? '' : 's'} must be moved or deleted first`,
          code: 'STAGE_HAS_DEALS',
          dealCount,
        },
        { status: 409 },
      );
    }

    // Safe to remove — no deals reference this stage.
    const updated = await PipelineRepository.removeStage(ctx.accountId, id, stageId);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to remove stage' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
