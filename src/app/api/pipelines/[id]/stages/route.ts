// ============================================================
// POST /api/pipelines/[id]/stages  — add a stage
// PUT  /api/pipelines/[id]/stages  — batch save/reorder stages
//
// Authorization: admin+ only
//
// Stages are embedded inside the Pipeline document — no separate
// pipeline_stages collection. Both operations are single-document
// writes (no multi-document transaction needed).
// ============================================================

import { NextResponse }      from 'next/server';
import { randomUUID }        from 'node:crypto';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { connectToDatabase } from '@/lib/mongodb/client';
import { PipelineRepository } from '@/lib/mongodb/repositories/PipelineRepository';
import type { IPipelineStage } from '@/lib/mongodb/models/Pipeline';
import { toApiPipeline, toApiStage } from '../../_pipeline-helpers';

// ── POST /api/pipelines/[id]/stages ──────────────────────────
// Add a single new stage to the pipeline.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole('admin');
    await connectToDatabase();

    const body = (await request.json().catch(() => null)) as {
      name?: unknown;
      color?: unknown;
      position?: unknown;
    } | null;

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Stage name is required' }, { status: 400 });
    }

    const color = typeof body?.color === 'string' ? body.color : '#3b82f6';
    const position = typeof body?.position === 'number' ? body.position : 0;

    const updated = await PipelineRepository.addStage(ctx.accountId, (await params).id, {
      id: randomUUID(),
      name,
      color,
      position,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    // Return the newly added stage in the public API shape.
    const newStage = updated.stages.find((s) => s.name === name && s.color === color);
    if (!newStage) {
      return NextResponse.json(toApiPipeline(updated), { status: 201 });
    }

    return NextResponse.json(toApiStage((await params).id, newStage), { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// ── PUT /api/pipelines/[id]/stages ───────────────────────────
// Batch upsert/reorder/rename — replaces the entire stages array.
// Stage IDs must be preserved; the frontend sends existing IDs for
// reorders/renames so they match existing Deal.stageId values.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireRole('admin');
    await connectToDatabase();

    const body = (await request.json().catch(() => null)) as { stages?: unknown } | null;
    if (!Array.isArray(body?.stages)) {
      return NextResponse.json({ error: '`stages` array is required' }, { status: 400 });
    }

    const stages: IPipelineStage[] = (body.stages as unknown[]).map((s: any, i: number) => ({
      id: typeof s.id === 'string' && s.id ? s.id : randomUUID(),
      name: typeof s.name === 'string' ? s.name.trim() : '',
      color: typeof s.color === 'string' ? s.color : '#3b82f6',
      position: typeof s.position === 'number' ? s.position : i,
    }));

    const invalid = stages.find((s) => !s.name);
    if (invalid) {
      return NextResponse.json({ error: 'All stages must have a name' }, { status: 400 });
    }

    const updated = await PipelineRepository.updateStagesBatch(ctx.accountId, (await params).id, stages);
    if (!updated) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    return NextResponse.json(toApiPipeline(updated));
  } catch (err) {
    return toErrorResponse(err);
  }
}
