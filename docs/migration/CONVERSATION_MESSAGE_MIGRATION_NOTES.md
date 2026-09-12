# Conversation & Message Migration Notes

## Classification of Operations

| File | Entity | Operation | Classification | Notes |
|------|--------|-----------|----------------|-------|
| `src/app/api/v1/conversations/route.ts` | Conversations | READ | A. SAFE READ | List conversations server-side API |
| `src/app/api/v1/conversations/[id]/messages/route.ts` | Conversations | READ | A. SAFE READ | Verify conversation exists |
| `src/app/api/v1/conversations/[id]/messages/route.ts` | Messages | READ | A. SAFE READ | List messages for conversation |
| `src/app/api/v1/conversations/[id]/route.ts` | Conversations | READ | A. SAFE READ | Get conversation by ID |
| `src/app/api/ai/draft/route.ts` | Conversations | READ | A. SAFE READ | AI Draft lookup |
| `src/app/api/ai/autoreply/[conversationId]/route.ts` | Conversations | READ/WRITE | E. COMPLEX | Server-side AI flow |
| `src/app/api/whatsapp/webhook/route.ts` | Both | READ/WRITE | C. WEBHOOK WRITE | Webhook inbound processing |
| `src/app/api/whatsapp/send/route.ts` | Both | READ/WRITE | C. WEBHOOK WRITE | WhatsApp outbound sending |
| `src/app/api/whatsapp/react/route.ts` | Both | READ/WRITE | C. WEBHOOK WRITE | WhatsApp reactions |
| `src/app/(dashboard)/inbox/page.tsx` | Conversations | READ | A. SAFE READ | Server-side page fetch |
| `src/components/inbox/conversation-list.tsx` | Conversations | READ | CLIENT-SIDE | UI Component |
| `src/components/inbox/message-thread.tsx` | Both | READ/WRITE | CLIENT-SIDE | UI Component |
| `src/components/pipelines/deal-form.tsx` | Conversations | READ | CLIENT-SIDE | UI Component |
| `src/hooks/use-total-unread.ts` | Conversations | READ | D. REALTIME DEPENDENT | Client-side hook |
| `src/lib/dashboard/queries.ts` | Both | READ | E. COMPLEX | Dashboard aggregations/complex logic |
| `src/lib/conversations/reopen.ts` | Conversations | WRITE | B. SAFE NON-WEBHOOK WRITE | Non-webhook status change |
| `src/lib/ai/auto-reply.ts` | Conversations | READ/WRITE | E. COMPLEX | AI logic |
| `src/lib/automations/engine.ts` | Both | READ/WRITE | E. COMPLEX | Automation execution |
| `src/lib/automations/meta-send.ts` | Both | WRITE | E. COMPLEX | Meta automation sending |
| `src/lib/flows/engine.ts` | Both | READ/WRITE | E. COMPLEX | Flows execution |
| `src/lib/flows/meta-send.ts` | Both | WRITE | E. COMPLEX | Flow Meta sending |
| `src/lib/whatsapp/resolve-conversation.ts`| Conversations | READ/WRITE | C. WEBHOOK WRITE | Webhook context resolution |
| `src/lib/whatsapp/send-message.ts` | Both | WRITE | C. WEBHOOK WRITE | Webhook/Meta send logic |
| `src/lib/ai/context.ts` | Messages | READ | A. SAFE READ | Fetch context for AI |

## Schema Compatibility
- **Conversations**: Mongoose schema contains `accountId`, `contactId`, `status`, `unreadCount`, `lastMessageText`, `lastMessageAt`, `assigneeId`, `labels`, `channel`, etc. This aligns with Postgres `conversations`.
- **Messages**: Mongoose schema contains `accountId`, `conversationId`, `messageId` (Meta ID), `senderType`, `contentType`, `contentText`, `mediaUrl`, `status`, `deliveryTimestamp`, `readTimestamp`, etc. This aligns exactly with Postgres `messages`.

## Safe Reads Targeted for Migration
The only safe server-side operations we can migrate without touching client-side queries, Realtime, Auth, Webhooks, or RPC are:
1. API Route: `GET /api/v1/conversations` (List scoped conversations)
2. API Route: `GET /api/v1/conversations/[id]` (Get single conversation)
3. API Route: `GET /api/v1/conversations/[id]/messages` (List conversation messages)
4. AI context fetching in `src/lib/ai/context.ts`
5. Page data fetch in `src/app/(dashboard)/inbox/page.tsx`

We will only migrate a highly targeted subset of these safe reads.

