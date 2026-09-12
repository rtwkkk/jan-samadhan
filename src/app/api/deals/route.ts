import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getCurrentAccount, requireRole, toErrorResponse } from '@/lib/auth/account';
import { connectToDatabase } from '@/lib/mongodb/client';
import { DealRepository } from '@/lib/mongodb/repositories/DealRepository';
import { PipelineRepository } from '@/lib/mongodb/repositories/PipelineRepository';
import { User } from '@/lib/mongodb/models/User';
import { Contact } from '@/lib/mongodb/models/Contact';
import { toApiDeal, populateDeals } from './_deal-helpers';
import type { IDeal, DealStatus } from '@/lib/mongodb/models/Deal';

export async function GET(request: Request) {
  try {
    const ctx = await getCurrentAccount();
    await connectToDatabase();

    const url = new URL(request.url);
    const pipelineId = url.searchParams.get('pipelineId');
    const contactId = url.searchParams.get('contactId');

    let deals: IDeal[] = [];
    if (pipelineId) {
      deals = await DealRepository.findByPipelineId(ctx.accountId, pipelineId);
    } else if (contactId) {
      deals = await DealRepository.findByContactId(ctx.accountId, contactId);
    }

    const populated = await populateDeals(ctx.accountId, deals);
    
    // Maintain postgres original ordering (sort is already applied inside repository, but we need ascending for pipelines)
    // Pipeline page expected oldest first for pipeline columns
    if (pipelineId) {
       populated.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    // Contact view expected newest first (which is repo default)

    return NextResponse.json(populated);
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireRole('agent');
    await connectToDatabase();

    const body = await request.json().catch(() => ({}));
    
    // Validate basic fields
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    if (!body.pipeline_id || !body.stage_id) {
      return NextResponse.json({ error: 'Pipeline and stage are required' }, { status: 400 });
    }

    const value = typeof body.value === 'number' ? body.value : 0;
    const currency = typeof body.currency === 'string' ? body.currency : 'USD';
    const status = (['open', 'won', 'lost'].includes(body.status) ? body.status : 'open') as DealStatus;
    
    // Verify Pipeline and Stage
    const pipeline = await PipelineRepository.findById(ctx.accountId, body.pipeline_id);
    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }
    const stage = pipeline.stages.find(s => s.id === body.stage_id);
    if (!stage) {
      return NextResponse.json({ error: 'Stage not found in pipeline' }, { status: 404 });
    }

    // Verify Contact if provided
    let contactId: string | null = null;
    if (body.contact_id) {
      const contact = await Contact.findOne({ _id: body.contact_id, accountId: ctx.accountId }).lean();
      if (!contact) {
        return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
      }
      contactId = contact._id;
    }

    // Verify Assignee if provided
    let assignedTo: string | undefined = undefined;
    if (body.assigned_to) {
      const user = await User.findOne({ _id: body.assigned_to, accountId: ctx.accountId }).lean();
      if (!user) {
        return NextResponse.json({ error: 'Assignee not found' }, { status: 404 });
      }
      assignedTo = user._id;
    }

    // Create the deal
    const dealId = randomUUID();
    const dealData: Partial<IDeal> = {
      _id: dealId,
      accountId: ctx.accountId,
      pipelineId: pipeline._id,
      stageId: stage.id,
      title,
      value,
      currency,
      status,
    };
    
    if (contactId) dealData.contactId = contactId;
    if (assignedTo) dealData.assignedTo = assignedTo;
    if (body.notes) dealData.notes = String(body.notes);
    if (body.expected_close_date) dealData.expectedCloseDate = new Date(body.expected_close_date);
    if (body.conversation_id) dealData.conversationId = String(body.conversation_id);

    const created = await DealRepository.create(dealData);
    if (!created) {
      return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
    }

    // Populate and return
    const [populated] = await populateDeals(ctx.accountId, [created as any]);
    return NextResponse.json(populated, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
