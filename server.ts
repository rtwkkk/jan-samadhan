import { createServer } from 'node:http';
import { parse } from 'node:url';
import next from 'next';
// @ts-ignore
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { connectToDatabase } from './src/lib/mongodb/client';
import { Message } from './src/lib/mongodb/models/Message';
import { Conversation } from './src/lib/mongodb/models/Conversation';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Use the public Anon key so it works without service roles in dev

app.prepare().then(async () => {
  const httpServer = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });

  
  io.use(async (socket: any, next: any) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) return next(new Error('Authentication error: No cookie'));
      
      const cookie = await import('cookie');
      const parse = (cookie as any).parse || (cookie as any).default?.parse || (cookie as any).default;
      const cookies = parse(cookieHeader);
      const token = cookies['wacrm_session'];
      if (!token) return next(new Error('Authentication error: No token'));

      const { createHash } = await import('crypto');
      const tokenHash = createHash('sha256').update(token).digest('hex');

      const { connectToDatabase } = await import('./src/lib/mongodb/client');
      await connectToDatabase();
      const mongoose = (await import('mongoose')).default;
      const Session = mongoose.models.Session || mongoose.model('Session', new mongoose.Schema({ userId: String, expiresAt: Date, revokedAt: Date }, { strict: false }));
      const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ accountId: String, accountRole: String }, { strict: false }));
      
      const session = await Session.findById(tokenHash).lean() as any;
      if (!session || session.revokedAt || new Date(session.expiresAt).getTime() <= Date.now()) {
        return next(new Error('Authentication error: Invalid session'));
      }
      
      const user = await User.findById(session.userId).lean() as any;
      if (!user || !user.accountId) {
        return next(new Error('Authentication error: No account'));
      }

      socket.data.userId = user._id;
      socket.data.accountId = user.accountId;
      socket.data.role = user.accountRole;

      next();
    } catch (err) {
      console.error('Socket.IO auth error:', err);
      next(new Error('Authentication error'));
    }
  });

  const presenceStore = new Map<string, Map<string, { status: string, last_seen_at: string }>>();

  io.on('connection', (socket: any) => {
    const accountId = socket.data.accountId;
    const userId = socket.data.userId;
    console.log(`[realtime] Socket connected for account ${accountId}`);
    socket.join(`account:${accountId}`);

    if (!presenceStore.has(accountId)) {
      presenceStore.set(accountId, new Map());
    }

    socket.on('presence.heartbeat', (payload: { status: string }) => {
      const accountPresence = presenceStore.get(accountId)!;
      const now = new Date().toISOString();
      accountPresence.set(userId, { status: payload.status, last_seen_at: now });
      
      io.to(`account:${accountId}`).emit('presence.update', {
        user_id: userId,
        status: payload.status,
        last_seen_at: now
      });
    });

    socket.on('presence.sync', (callback: (data: any[]) => void) => {
      const accountPresence = presenceStore.get(accountId);
      const data: any[] = [];
      if (accountPresence) {
        for (const [uid, info] of accountPresence.entries()) {
          data.push({
            user_id: uid,
            status: info.status,
            last_seen_at: info.last_seen_at
          });
        }
      }
      callback(data);
    });

    socket.on('disconnect', () => {
      console.log(`[realtime] Socket disconnected for account ${accountId}`);
    });
  });

  try {
    await connectToDatabase();
    console.log('[realtime] Connected to MongoDB');

    const mapMessage = (m: any) => ({
      id: m._id.toString(),
      conversation_id: m.conversationId,
      direction: m.senderType === 'customer' ? 'inbound' : 'outbound',
      sender_type: m.senderType,
      content_type: m.contentType,
      content_text: m.contentText ?? null,
      media_url: m.mediaUrl ?? m.media?.url ?? null,
      template_name: m.templateName ?? null,
      whatsapp_message_id: m.messageId ?? null,
      status: m.status,
      reply_to_message_id: m.replyToMessageId ?? null,
      interactive_reply_id: m.interactiveReplyId ?? null,
      created_at: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
      reactions: (m.reactions || []).map((r: any) => ({
        id: r.id || r._id?.toString() || '',
        message_id: m._id.toString(),
        conversation_id: m.conversationId,
        actor_type: r.actorType,
        actor_id: r.actorId,
        emoji: r.emoji,
        created_at: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString()
      }))
    });

    const mapConversation = (c: any) => ({
      id: c._id.toString(),
      contact_id: c.contactId,
      status: c.status,
      assigned_agent_id: c.assignedAgentId ?? null,
      last_message_text: c.lastMessageText ?? null,
      last_message_at: c.lastMessageAt ? new Date(c.lastMessageAt).toISOString() : null,
      unread_count: c.unreadCount ?? 0,
      created_at: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
      updated_at: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
      contact: null
    });

    const messageStream = Message.watch([], { fullDocument: 'updateLookup' });
    const conversationStream = Conversation.watch([], { fullDocument: 'updateLookup' });

    messageStream.on('change', (change) => {
      if (change.operationType === 'insert' || change.operationType === 'update') {
        const doc = change.fullDocument;
        if (doc && doc.accountId) {
          io.to(`account:${doc.accountId}`).emit('message.event', {
            eventType: change.operationType === 'insert' ? 'INSERT' : 'UPDATE',
            new: mapMessage(doc),
            old: { id: doc._id.toString() }
          });
        }
      } else if (change.operationType === 'delete') {
        const id = change.documentKey?._id?.toString();
        if (id) {
          io.emit('message.event', { eventType: 'DELETE', new: { id }, old: { id } });
        }
      }
    });

    conversationStream.on('change', (change) => {
      if (change.operationType === 'insert' || change.operationType === 'update') {
        const doc = change.fullDocument;
        if (doc && doc.accountId) {
          io.to(`account:${doc.accountId}`).emit('conversation.event', {
            eventType: change.operationType === 'insert' ? 'INSERT' : 'UPDATE',
            new: mapConversation(doc),
            old: { id: doc._id.toString() }
          });
        }
      } else if (change.operationType === 'delete') {
        const id = change.documentKey?._id?.toString();
        if (id) {
          io.emit('conversation.event', { eventType: 'DELETE', new: { id }, old: { id } });
        }
      }
    });

    messageStream.on('error', (err) => console.error('[realtime] Message ChangeStream error:', err));
    conversationStream.on('error', (err) => console.error('[realtime] Conversation ChangeStream error:', err));
  } catch (err) {
    console.error('[realtime] Failed to initialize MongoDB Change Streams:', err);
  }

  const shutdown = () => {
    console.log('[realtime] Shutting down server...');
    io.close();
    httpServer.close(() => {
      mongoose.disconnect().then(() => process.exit(0));
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  httpServer.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
