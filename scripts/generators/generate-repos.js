const fs = require('fs');
const path = require('path');

const repoDir = path.join(__dirname, 'src', 'lib', 'mongodb', 'repositories');

const repos = {
  'BaseRepository.ts': `
// We provide a simple base utility to strip protected fields, but each repo explicitly defines its methods.
export function stripProtectedFields(update: Record<string, any>, protectedFields: string[] = ['accountId', '_id', 'createdAt', 'updatedAt']) {
  const safeUpdate = { ...update };
  for (const field of protectedFields) {
    delete safeUpdate[field];
  }
  return safeUpdate;
}
`,
  'AccountRepository.ts': `
import { Account, IAccount } from '../models/Account';

export class AccountRepository {
  static async findById(id: string): Promise<IAccount | null> {
    return Account.findById(id).lean();
  }
  
  static async create(data: Partial<IAccount>): Promise<IAccount> {
    const account = new Account(data);
    return account.save();
  }
  
  static async updateById(id: string, update: Partial<IAccount>): Promise<IAccount | null> {
    const safeUpdate = { ...update };
    delete safeUpdate._id;
    return Account.findByIdAndUpdate(id, { $set: safeUpdate }, { new: true }).lean();
  }
}
`,
  'UserRepository.ts': `
import { User, IUser } from '../models/User';
import { stripProtectedFields } from './BaseRepository';

export class UserRepository {
  static async findById(accountId: string, id: string): Promise<IUser | null> {
    return User.findOne({ _id: id, accountId }).lean();
  }

  static async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email }).lean();
  }

  static async create(data: Partial<IUser>): Promise<IUser> {
    const user = new User(data);
    return user.save();
  }

  static async updateById(accountId: string, id: string, update: Partial<IUser>): Promise<IUser | null> {
    const safeUpdate = stripProtectedFields(update);
    return User.findOneAndUpdate({ _id: id, accountId }, { $set: safeUpdate }, { new: true }).lean();
  }
}
`,
  'ContactRepository.ts': `
import { Contact, IContact } from '../models/Contact';
import { stripProtectedFields } from './BaseRepository';

export class ContactRepository {
  static async findById(accountId: string, id: string): Promise<IContact | null> {
    return Contact.findOne({ _id: id, accountId }).lean();
  }

  static async findByPhone(accountId: string, phone: string): Promise<IContact | null> {
    return Contact.findOne({ accountId, phone }).lean();
  }

  static async findMany(accountId: string, filters: Record<string, any> = {}, limit: number = 50, skip: number = 0): Promise<IContact[]> {
    return Contact.find({ ...filters, accountId }).limit(limit).skip(skip).lean();
  }

  static async create(data: Partial<IContact>): Promise<IContact> {
    const contact = new Contact(data);
    return contact.save();
  }

  static async updateById(accountId: string, id: string, update: Partial<IContact>): Promise<IContact | null> {
    const safeUpdate = stripProtectedFields(update);
    return Contact.findOneAndUpdate({ _id: id, accountId }, { $set: safeUpdate }, { new: true }).lean();
  }

  static async deleteById(accountId: string, id: string): Promise<boolean> {
    const result = await Contact.deleteOne({ _id: id, accountId });
    return result.deletedCount === 1;
  }
}
`,
  'ConversationRepository.ts': `
import { Conversation, IConversation } from '../models/Conversation';
import { stripProtectedFields } from './BaseRepository';

export class ConversationRepository {
  static async findById(accountId: string, id: string): Promise<IConversation | null> {
    return Conversation.findOne({ _id: id, accountId }).lean();
  }

  static async findByContactId(accountId: string, contactId: string): Promise<IConversation | null> {
    return Conversation.findOne({ accountId, contactId }).lean();
  }

  static async findMany(accountId: string, filters: Record<string, any> = {}, limit: number = 50): Promise<IConversation[]> {
    // Usually sorted by last updated for inbox
    return Conversation.find({ ...filters, accountId }).sort({ updatedAt: -1 }).limit(limit).lean();
  }

  static async create(data: Partial<IConversation>): Promise<IConversation> {
    const conv = new Conversation(data);
    return conv.save();
  }

  static async updateById(accountId: string, id: string, update: Partial<IConversation>): Promise<IConversation | null> {
    const safeUpdate = stripProtectedFields(update);
    return Conversation.findOneAndUpdate({ _id: id, accountId }, { $set: safeUpdate }, { new: true }).lean();
  }

  static async updateMetadata(accountId: string, id: string, lastMessageText: string, lastMessageAt: Date, incrementUnread: boolean): Promise<IConversation | null> {
    const update: any = {
      $set: { lastMessageText, lastMessageAt }
    };
    if (incrementUnread) {
      update.$inc = { unreadCount: 1 };
    }
    return Conversation.findOneAndUpdate({ _id: id, accountId }, update, { new: true }).lean();
  }
  
  static async resetUnread(accountId: string, id: string): Promise<IConversation | null> {
    return Conversation.findOneAndUpdate({ _id: id, accountId }, { $set: { unreadCount: 0 } }, { new: true }).lean();
  }
}
`,
  'MessageRepository.ts': `
import { Message, IMessage } from '../models/Message';
import { stripProtectedFields } from './BaseRepository';

export class MessageRepository {
  static async findById(accountId: string, id: string): Promise<IMessage | null> {
    return Message.findOne({ _id: id, accountId }).lean();
  }

  static async findByConversationId(accountId: string, conversationId: string, limit: number = 50, skip: number = 0): Promise<IMessage[]> {
    return Message.find({ accountId, conversationId }).sort({ createdAt: 1 }).skip(skip).limit(limit).lean();
  }

  static async create(data: Partial<IMessage>): Promise<IMessage> {
    const msg = new Message(data);
    return msg.save();
  }

  /**
   * Safe idempotency handling for webhooks.
   * Uses messageId (Meta WhatsApp ID) as the idempotency key.
   * Prevents duplicates by using findOneAndUpdate with upsert.
   */
  static async upsertByMessageId(accountId: string, messageId: string, data: Partial<IMessage>): Promise<IMessage> {
    const safeData = stripProtectedFields(data);
    // ensure accountId and messageId are set correctly on insert
    const setOnInsert = { accountId, messageId };
    
    if (!data._id) {
       // if it's a new insert, mongoose might require _id if we defined it as required string.
       // we rely on the caller passing _id in data if required, or we generate one.
       // assuming caller passes _id for new messages.
    }

    const doc = await Message.findOneAndUpdate(
      { accountId, messageId }, // find by account and meta ID
      { $set: safeData, $setOnInsert: { accountId, messageId, _id: data._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return doc as IMessage;
  }

  static async updateStatus(accountId: string, id: string, status: IMessage['status']): Promise<IMessage | null> {
    return Message.findOneAndUpdate({ _id: id, accountId }, { $set: { status } }, { new: true }).lean();
  }
}
`,
  'PipelineRepository.ts': `
import { Pipeline, IPipeline } from '../models/Pipeline';
import { stripProtectedFields } from './BaseRepository';

export class PipelineRepository {
  static async findById(accountId: string, id: string): Promise<IPipeline | null> {
    return Pipeline.findOne({ _id: id, accountId }).lean();
  }

  static async findMany(accountId: string): Promise<IPipeline[]> {
    return Pipeline.find({ accountId }).lean();
  }

  static async create(data: Partial<IPipeline>): Promise<IPipeline> {
    const pipeline = new Pipeline(data);
    return pipeline.save();
  }

  static async updateById(accountId: string, id: string, update: Partial<IPipeline>): Promise<IPipeline | null> {
    const safeUpdate = stripProtectedFields(update);
    return Pipeline.findOneAndUpdate({ _id: id, accountId }, { $set: safeUpdate }, { new: true }).lean();
  }

  static async deleteById(accountId: string, id: string): Promise<boolean> {
    const result = await Pipeline.deleteOne({ _id: id, accountId });
    return result.deletedCount === 1;
  }
}
`,
  'DealRepository.ts': `
import { Deal, IDeal } from '../models/Deal';
import { stripProtectedFields } from './BaseRepository';

export class DealRepository {
  static async findById(accountId: string, id: string): Promise<IDeal | null> {
    return Deal.findOne({ _id: id, accountId }).lean();
  }

  static async findByPipelineId(accountId: string, pipelineId: string): Promise<IDeal[]> {
    return Deal.find({ accountId, pipelineId }).lean();
  }

  static async create(data: Partial<IDeal>): Promise<IDeal> {
    const deal = new Deal(data);
    return deal.save();
  }

  static async updateById(accountId: string, id: string, update: Partial<IDeal>): Promise<IDeal | null> {
    const safeUpdate = stripProtectedFields(update);
    return Deal.findOneAndUpdate({ _id: id, accountId }, { $set: safeUpdate }, { new: true }).lean();
  }

  static async deleteById(accountId: string, id: string): Promise<boolean> {
    const result = await Deal.deleteOne({ _id: id, accountId });
    return result.deletedCount === 1;
  }
}
`,
  'WhatsappConfigRepository.ts': `
import { WhatsappConfig, IWhatsappConfig } from '../models/WhatsappConfig';
import { stripProtectedFields } from './BaseRepository';

export class WhatsappConfigRepository {
  static async findByAccountId(accountId: string): Promise<IWhatsappConfig | null> {
    return WhatsappConfig.findOne({ accountId }).lean();
  }

  static async upsert(accountId: string, data: Partial<IWhatsappConfig>): Promise<IWhatsappConfig> {
    const safeData = stripProtectedFields(data);
    const doc = await WhatsappConfig.findOneAndUpdate(
      { accountId },
      { $set: safeData, $setOnInsert: { accountId, _id: data._id } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return doc as IWhatsappConfig;
  }
}
`,
  'AutomationRepository.ts': `
import { Automation, IAutomation } from '../models/Automation';
import { stripProtectedFields } from './BaseRepository';

export class AutomationRepository {
  static async findById(accountId: string, id: string): Promise<IAutomation | null> {
    return Automation.findOne({ _id: id, accountId }).lean();
  }

  static async findMany(accountId: string): Promise<IAutomation[]> {
    return Automation.find({ accountId }).lean();
  }

  static async create(data: Partial<IAutomation>): Promise<IAutomation> {
    const auto = new Automation(data);
    return auto.save();
  }

  static async updateById(accountId: string, id: string, update: Partial<IAutomation>): Promise<IAutomation | null> {
    const safeUpdate = stripProtectedFields(update);
    return Automation.findOneAndUpdate({ _id: id, accountId }, { $set: safeUpdate }, { new: true }).lean();
  }
  
  static async deleteById(accountId: string, id: string): Promise<boolean> {
    const result = await Automation.deleteOne({ _id: id, accountId });
    return result.deletedCount === 1;
  }
}
`,
  'AutomationLogRepository.ts': `
import { AutomationLog, IAutomationLog } from '../models/AutomationLog';

export class AutomationLogRepository {
  static async findByAutomationId(accountId: string, automationId: string, limit: number = 100): Promise<IAutomationLog[]> {
    return AutomationLog.find({ accountId, automationId }).sort({ createdAt: -1 }).limit(limit).lean();
  }

  static async create(data: Partial<IAutomationLog>): Promise<IAutomationLog> {
    const log = new AutomationLog(data);
    return log.save();
  }
}
`,
  'AiKnowledgeChunkRepository.ts': `
import { AiKnowledgeChunk, IAiKnowledgeChunk } from '../models/AiKnowledgeChunk';

export class AiKnowledgeChunkRepository {
  static async findByDocumentId(accountId: string, documentId: string): Promise<IAiKnowledgeChunk[]> {
    return AiKnowledgeChunk.find({ accountId, documentId }).sort({ chunkIndex: 1 }).lean();
  }

  static async create(data: Partial<IAiKnowledgeChunk>): Promise<IAiKnowledgeChunk> {
    const chunk = new AiKnowledgeChunk(data);
    return chunk.save();
  }
  
  static async deleteByDocumentId(accountId: string, documentId: string): Promise<number> {
    const result = await AiKnowledgeChunk.deleteMany({ accountId, documentId });
    return result.deletedCount || 0;
  }
}
`,
  'index.ts': `
export * from './AccountRepository';
export * from './UserRepository';
export * from './ContactRepository';
export * from './ConversationRepository';
export * from './MessageRepository';
export * from './PipelineRepository';
export * from './DealRepository';
export * from './WhatsappConfigRepository';
export * from './AutomationRepository';
export * from './AutomationLogRepository';
export * from './AiKnowledgeChunkRepository';
`
};

for (const [filename, content] of Object.entries(repos)) {
  fs.writeFileSync(path.join(repoDir, filename), content.trim() + '\n');
}
console.log('Repositories generated.');
