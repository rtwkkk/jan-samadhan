// ============================================================
// GET  /api/pipelines  — list all pipelines (with embedded stages)
// POST /api/pipelines  — create a pipeline + seed default stages
//
// Authorization:
//   GET  — any authenticated account member (requireAuth)
//   POST — admin+ only (requireRole('admin'))
//
// Pipeline creation is transactional: the Pipeline document and its
// embedded default stages are written atomically so the UI never
// sees an empty-stage pipeline.
// ============================================================

import { NextResponse }      from 'next/server';
import mongoose               from 'mongoose';
import { randomUUID }         from 'node:crypto';
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account';
import { connectToDatabase } from '@/lib/mongodb/client';
import { PipelineRepository } from '@/lib/mongodb/repositories/PipelineRepository';
import { toApiPipeline, SPEC_DEFAULT_STAGES } from './_pipeline-helpers';

// ── GET /api/pipelines ────────────────────────────────────────
export async function GET() {
  try {
    const ctx = await getCurrentAccount();
    await connectToDatabase();

    const pipelines = await PipelineRepository.findMany(ctx.accountId);
    // Sort by createdAt ascending to preserve existing UI order.
    const sorted = [...pipelines].sort(
      (a, b) => new Date((a as any).createdAt ?? 0).getTime()
                - new Date((b as any).createdAt ?? 0).getTime(),
    );

    return NextResponse.json(sorted.map(toApiPipeline));
  } catch (err) {
    return toErrorResponse(err);
  }
}

// ── POST /api/pipelines ───────────────────────────────────────
export async function POST(request: Request) {
  try {
    const ctx = await requireRole('admin');
    await connectToDatabase();

    const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Pipeline name is required' }, { status: 400 });
    }

    const pipelineId = randomUUID();
    const defaultStages = SPEC_DEFAULT_STAGES.map((s) => ({
      id: randomUUID(),
      name: s.name,
      color: s.color,
      position: s.position,
    }));

    // Atomic: create pipeline with embedded default stages in one document write.
    // A MongoDB multi-document transaction is not required here because the pipeline
    // and its stages are one document (embedded). We do wrap the save in a session
    // so callers get a clean rollback boundary if the save itself fails mid-write.
    const session = await mongoose.startSession();
    let created;
    try {
      await session.withTransaction(async () => {
        created = await PipelineRepository.create({
          _id: pipelineId,
          accountId: ctx.accountId,
          name,
          stages: defaultStages,
        });
      });
    } finally {
      await session.endSession();
    }

    if (!created) {
      return NextResponse.json({ error: 'Failed to create pipeline' }, { status: 500 });
    }

    return NextResponse.json(toApiPipeline(created as any), { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
