import type { IDeal } from '@/lib/mongodb/models/Deal';
import type { IUser } from '@/lib/mongodb/models/User';
import type { IContact } from '@/lib/mongodb/models/Contact';
import type { IPipelineStage } from '@/lib/mongodb/models/Pipeline';
import { User } from '@/lib/mongodb/models/User';
import { Contact } from '@/lib/mongodb/models/Contact';
import { PipelineRepository } from '@/lib/mongodb/repositories/PipelineRepository';
import { DealRepository } from '@/lib/mongodb/repositories/DealRepository';

export function toApiDeal(
  d: IDeal,
  populated?: { contact?: IContact | null; assignee?: IUser | null; stage?: IPipelineStage | null }
) {
  const createdAt = (d as any).createdAt ?? new Date();
  const updatedAt = (d as any).updatedAt ?? new Date();
  
  const deal: any = {
    id: d._id,
    user_id: d.accountId, // legacy
    account_id: d.accountId,
    pipeline_id: d.pipelineId,
    stage_id: d.stageId,
    contact_id: d.contactId || null,
    conversation_id: d.conversationId || undefined,
    assigned_to: d.assignedTo || undefined,
    title: d.title,
    value: d.value,
    currency: d.currency,
    notes: d.notes || undefined,
    expected_close_date: d.expectedCloseDate ? new Date(d.expectedCloseDate).toISOString().split('T')[0] : undefined,
    status: d.status,
    created_at: new Date(createdAt).toISOString(),
    updated_at: new Date(updatedAt).toISOString(),
  };

  if (populated?.contact) {
    deal.contact = {
      id: populated.contact._id,
      user_id: populated.contact.accountId,
      account_id: populated.contact.accountId,
      phone: populated.contact.phone,
      name: populated.contact.name,
      email: populated.contact.email,
      company: populated.contact.company,
      avatar_url: populated.contact.avatarUrl,
    };
  }

  if (populated?.assignee) {
    deal.assignee = {
      id: populated.assignee._id,
      user_id: populated.assignee.accountId || '',
      full_name: populated.assignee.fullName,
      email: populated.assignee.email,
      avatar_url: populated.assignee.avatarUrl,
    };
  }

  if (populated?.stage) {
    deal.stage = {
      id: populated.stage.id,
      pipeline_id: d.pipelineId,
      name: populated.stage.name,
      position: populated.stage.position,
      color: populated.stage.color,
      created_at: new Date(createdAt).toISOString(), // stages don't have separate createdAt in Mongo
    };
  }

  return deal;
}

export async function populateDeals(accountId: string, deals: IDeal[]) {
  if (deals.length === 0) return [];
  
  const pipelineIds = [...new Set(deals.map((d) => d.pipelineId))];
  const pipelines = await Promise.all(pipelineIds.map((id) => PipelineRepository.findById(accountId, id)));
  const pipelineMap = new Map(pipelines.filter(Boolean).map((p) => [p!._id, p]));

  const contactIds = [...new Set(deals.map((d) => d.contactId).filter((id): id is string => typeof id === 'string'))];
  const contacts = await Contact.find({ _id: { $in: contactIds }, accountId }).lean();
  const contactMap = new Map(contacts.map((c) => [c._id, c]));

  const assigneeIds = [...new Set(deals.map((d) => d.assignedTo).filter((id): id is string => typeof id === 'string'))];
  const users = await User.find({ _id: { $in: assigneeIds }, accountId }).lean();
  const userMap = new Map(users.map((u) => [u._id, u]));

  return deals.map((d) => {
    const pipeline = pipelineMap.get(d.pipelineId);
    const stage = pipeline?.stages?.find((s) => s.id === d.stageId);
    const contact = d.contactId ? contactMap.get(d.contactId) : null;
    const assignee = d.assignedTo ? userMap.get(d.assignedTo) : null;

    return toApiDeal(d, {
      contact: contact as unknown as IContact,
      assignee: assignee as unknown as IUser,
      stage: stage as unknown as IPipelineStage,
    });
  });
}
