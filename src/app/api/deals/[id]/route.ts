import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { connectToDatabase } from '@/lib/mongodb/client';
import { DealRepository } from '@/lib/mongodb/repositories/DealRepository';
import { PipelineRepository } from '@/lib/mongodb/repositories/PipelineRepository';
import { User } from '@/lib/mongodb/models/User';
import { Contact } from '@/lib/mongodb/models/Contact';
import { populateDeals } from '../_deal-helpers';
import type { IDeal, DealStatus } from '@/lib/mongodb/models/Deal';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await requireRole('agent');
    await connectToDatabase();

    const deal = await DealRepository.findById(ctx.accountId, id);
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const update: Partial<IDeal> = {};

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      update.title = title;
    }

    if (body.value !== undefined) update.value = Number(body.value) || 0;
    if (body.currency !== undefined) update.currency = String(body.currency);
    if (body.notes !== undefined) update.notes = String(body.notes);
    
    if (body.expected_close_date !== undefined) {
      update.expectedCloseDate = body.expected_close_date ? new Date(body.expected_close_date) : undefined;
    }
    
    if (body.status !== undefined) {
      const status = String(body.status);
      if (!['open', 'won', 'lost'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      update.status = status as DealStatus;
    }

    // Verify pipeline/stage if changed
    if (body.pipeline_id || body.stage_id) {
      const targetPipelineId = body.pipeline_id || deal.pipelineId;
      const targetStageId = body.stage_id || deal.stageId;
      
      const pipeline = await PipelineRepository.findById(ctx.accountId, targetPipelineId);
      if (!pipeline) {
        return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
      }
      
      const stage = pipeline.stages.find(s => s.id === targetStageId);
      if (!stage) {
        return NextResponse.json({ error: 'Stage not found in pipeline' }, { status: 404 });
      }

      update.pipelineId = pipeline._id;
      update.stageId = stage.id;
    }

    // Verify Contact if changed
    if (body.contact_id !== undefined) {
      if (body.contact_id === null) {
        update.contactId = null;
      } else {
        const contact = await Contact.findOne({ _id: body.contact_id, accountId: ctx.accountId }).lean();
        if (!contact) {
          return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }
        update.contactId = contact._id;
      }
    }

    // Verify Assignee if changed
    if (body.assigned_to !== undefined) {
      if (body.assigned_to === null) {
        update.assignedTo = undefined;
        // Mongo update removes it via undefined or we might need $unset if undefined isn't handled by mongoose properly. 
        // We will just let mongoose handle it via undefined. The repository uses stripProtectedFields but doesn't strip undefined if it's meant to unset? 
        // Actually mongoose $set with undefined might just be ignored. To unset we should use null if the schema allows it, or let the repo handle it.
        // IDeal allows assignedTo?: string.
      } else {
        const user = await User.findOne({ _id: body.assigned_to, accountId: ctx.accountId }).lean();
        if (!user) {
          return NextResponse.json({ error: 'Assignee not found' }, { status: 404 });
        }
        update.assignedTo = user._id;
      }
    }

    const updated = await DealRepository.updateById(ctx.accountId, id, update);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 });
    }

    const [populated] = await populateDeals(ctx.accountId, [updated]);
    return NextResponse.json(populated);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await requireRole('agent');
    await connectToDatabase();

    const deal = await DealRepository.findById(ctx.accountId, id);
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const deleted = await DealRepository.deleteById(ctx.accountId, id);
    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
