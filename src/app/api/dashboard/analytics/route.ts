import { NextResponse } from 'next/server';
import { requireRole, toErrorResponse } from '@/lib/auth/account';
import { connectToDatabase } from '@/lib/mongodb/client';
import { Conversation } from '@/lib/mongodb/models/Conversation';
import { Message } from '@/lib/mongodb/models/Message';
import { DealRepository } from '@/lib/mongodb/repositories/DealRepository';
import { PipelineRepository } from '@/lib/mongodb/repositories/PipelineRepository';

export async function GET(request: Request) {
  try {
    const ctx = await requireRole('viewer');
    await connectToDatabase();

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'metrics') {
      const todayStart = new Date(url.searchParams.get('todayStart')!);
      const yesterdayStart = new Date(url.searchParams.get('yesterdayStart')!);

      const [openConvCur, newConvToday, newConvYesterday, messagesToday, messagesYesterday, openDeals] = await Promise.all([
        Conversation.countDocuments({ accountId: ctx.accountId, status: 'open' }),
        Conversation.countDocuments({ accountId: ctx.accountId, status: 'open', createdAt: { $gte: todayStart } }),
        Conversation.countDocuments({ accountId: ctx.accountId, status: 'open', createdAt: { $gte: yesterdayStart, $lt: todayStart } }),
        Message.countDocuments({ accountId: ctx.accountId, senderType: 'agent', createdAt: { $gte: todayStart } }),
        Message.countDocuments({ accountId: ctx.accountId, senderType: 'agent', createdAt: { $gte: yesterdayStart, $lt: todayStart } }),
        DealRepository.findOpenDeals(ctx.accountId)
      ]);

      const openDealsValue = openDeals.reduce((sum, d) => sum + (d.value ?? 0), 0);

      return NextResponse.json({
        openConvCur,
        newConvToday,
        newConvYesterday,
        messagesToday,
        messagesYesterday,
        openDealsValue,
        openDealsCount: openDeals.length
      });
    }

    if (action === 'messagesSeries') {
      const gte = new Date(url.searchParams.get('gte')!);
      const messages = await Message.find({
        accountId: ctx.accountId,
        createdAt: { $gte: gte }
      }).select('conversationId senderType createdAt').sort({ conversationId: 1, createdAt: 1 }).lean();

      return NextResponse.json(messages.map(m => ({
        id: m._id,
        conversation_id: m.conversationId,
        sender_type: m.senderType,
        created_at: m.createdAt.toISOString()
      })));
    }

    if (action === 'recentMessages') {
      const messages = await Message.find({
        accountId: ctx.accountId,
        senderType: 'customer'
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({
        path: 'conversationId',
        select: 'contactId',
        populate: {
          path: 'contactId',
          model: 'Contact',
          select: 'name phone'
        }
      }).lean();

      return NextResponse.json(messages.map((m: any) => ({
        id: m._id,
        content_text: m.contentText,
        sender_type: m.senderType,
        created_at: m.createdAt.toISOString(),
        conversation_id: m.conversationId?._id,
        conversations: m.conversationId ? {
          contact_id: m.conversationId.contactId?._id,
          contacts: m.conversationId.contactId ? {
            name: m.conversationId.contactId.name,
            phone: m.conversationId.contactId.phone
          } : null
        } : null
      })));
    }

    if (action === 'pipelineDonut') {
      const [pipelines, deals] = await Promise.all([
        PipelineRepository.findMany(ctx.accountId),
        DealRepository.findOpenDeals(ctx.accountId)
      ]);
      const stages: any[] = [];
      for (const p of pipelines) {
        for (const s of p.stages) {
          stages.push({
            id: s.id,
            name: s.name,
            color: s.color,
            pipeline_id: p._id.toString(),
            position: s.position
          });
        }
      }
      stages.sort((a, b) => a.position - b.position);
      return NextResponse.json({
        stages,
        deals: deals.map((d: any) => ({
          stage_id: d.stageId,
          value: d.value,
          status: d.status
        }))
      });
    }

    if (action === 'recentDeals') {
      const deals = await DealRepository.findRecentUpdated(ctx.accountId, 10);
      const pipelines = await PipelineRepository.findMany(ctx.accountId);
      
      const mapped = deals.map((d: any) => {
        let stageName = '';
        for (const p of pipelines) {
          const s = p.stages.find((st: any) => st._id.toString() === d.stageId);
          if (s) {
            stageName = s.name;
            break;
          }
        }
        return {
          id: d._id.toString(),
          title: d.title,
          updated_at: d.updatedAt.toISOString(),
          stage: stageName ? { name: stageName } : null
        };
      });
      return NextResponse.json(mapped);
    }

    if (action === 'recentBroadcasts') {
      const { BroadcastRepository } = await import('@/lib/mongodb/repositories/BroadcastRepository');
      const broadcasts = await BroadcastRepository.findRecentByAccountId(ctx.accountId, 5);
      return NextResponse.json({
        data: broadcasts.map(b => ({
          id: b._id,
          name: b.name,
          status: b.status,
          total_recipients: b.totalRecipients,
          created_at: b.createdAt.toISOString()
        }))
      });
    }

    if (action === 'recentAutomationLogs') {
      const { AutomationLogRepository } = await import('@/lib/mongodb/repositories/AutomationLogRepository');
      const logs = await AutomationLogRepository.findRecentByAccountId(ctx.accountId, 10);
      return NextResponse.json({
        data: logs.map((l: any) => ({
          id: l._id,
          trigger_event: l.triggerEvent,
          status: l.status,
          created_at: l.createdAt.toISOString(),
          automation: l.automationName ? { name: l.automationName } : null,
          contact: l.contact ? { name: l.contact.name, phone: l.contact.phone } : null
        }))
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
