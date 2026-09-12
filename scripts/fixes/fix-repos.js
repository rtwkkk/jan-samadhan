const fs = require('fs');

// Fix ContactRepository.ts
let contactCode = fs.readFileSync('src/lib/mongodb/repositories/ContactRepository.ts', 'utf8');
contactCode = contactCode.replace(/session\(session \|\| null\)/g, "session(arguments[arguments.length-1] && typeof arguments[arguments.length-1] === 'object' && 'inTransaction' in arguments[arguments.length-1] ? arguments[arguments.length-1] : null)");
contactCode = contactCode.replace(/session\?/g, 'session?: any'); // lazy fix for TS
// Actually, let's just properly fix ContactRepository
contactCode = `import type { ClientSession } from "mongoose";\nimport { Contact, IContact } from '../models/Contact';\nimport { stripProtectedFields } from './BaseRepository';\n\nexport class ContactRepository {\n  static async findById(accountId: string, id: string, session?: ClientSession): Promise<IContact | null> {\n    return Contact.findOne({ _id: id, accountId }).session(session || null).lean();\n  }\n\n  static async findByPhone(accountId: string, phone: string, session?: ClientSession): Promise<IContact | null> {\n    return Contact.findOne({ accountId, phone }).session(session || null).lean();\n  }\n\n  static async findMany(accountId: string, filters: Record<string, any> = {}, limit: number = 50, skip: number = 0, session?: ClientSession): Promise<IContact[]> {\n    return Contact.find({ ...filters, accountId }).limit(limit).skip(skip).session(session || null).lean();\n  }\n\n  static async create(data: Partial<IContact>, session?: ClientSession): Promise<IContact> {\n    const contact = new Contact(data);\n    return contact.save({ session });\n  }\n\n  static async updateById(accountId: string, id: string, update: Partial<IContact>, session?: ClientSession): Promise<IContact | null> {\n    const safeUpdate = stripProtectedFields(update);\n    return Contact.findOneAndUpdate({ _id: id, accountId }, { $set: safeUpdate }, { new: true, session }).lean();\n  }\n\n  static async deleteById(accountId: string, id: string): Promise<boolean> {\n    const result = await Contact.deleteOne({ _id: id, accountId });\n    return result.deletedCount === 1;\n  }\n\n  static async addTag(accountId: string, id: string, tagId: string): Promise<IContact | null> {\n    return Contact.findOneAndUpdate({ _id: id, accountId }, { $addToSet: { tagIds: tagId } }, { new: true }).lean();\n  }\n\n  static async addTags(accountId: string, id: string, tagIds: string[]): Promise<IContact | null> {\n    return Contact.findOneAndUpdate({ _id: id, accountId }, { $addToSet: { tagIds: { $each: tagIds } } }, { new: true }).lean();\n  }\n\n  static async removeTag(accountId: string, id: string, tagId: string): Promise<IContact | null> {\n    return Contact.findOneAndUpdate({ _id: id, accountId }, { $pull: { tagIds: tagId } }, { new: true }).lean();\n  }\n\n  static async replaceTags(accountId: string, id: string, tagIds: string[]): Promise<IContact | null> {\n    const uniqueTagIds = Array.from(new Set(tagIds));\n    return Contact.findOneAndUpdate({ _id: id, accountId }, { $set: { tagIds: uniqueTagIds } }, { new: true }).lean();\n  }\n}`;
fs.writeFileSync('src/lib/mongodb/repositories/ContactRepository.ts', contactCode);

// Fix MessageRepository.ts
let msgCode = fs.readFileSync('src/lib/mongodb/repositories/MessageRepository.ts', 'utf8');
msgCode = msgCode.replace(/const created = !doc\.lastErrorObject\?\.updatedExisting;\n    return { message: doc\.value as IMessage, created };/g, 
`const lastError = (doc as any).lastErrorObject;
    const created = lastError ? !lastError.updatedExisting : true;
    return { message: (doc as any).value as IMessage, created };`);

// Re-add upsertByMessageId for tests
if (!msgCode.includes("upsertByMessageId")) {
  msgCode = msgCode.replace(/static async upsertWebhookMessage/g, 
  `static async upsertByMessageId(accountId: string, conversationId: string, messageId: string, data: Partial<IMessage>): Promise<IMessage> {
    const { message } = await this.upsertWebhookMessage(accountId, conversationId, messageId, data);
    return message;
  }
  
  static async upsertWebhookMessage`);
}
fs.writeFileSync('src/lib/mongodb/repositories/MessageRepository.ts', msgCode);

// Fix WebhookRepository.ts null checks
let webCode = fs.readFileSync('src/lib/mongodb/repositories/WebhookRepository.ts', 'utf8');
webCode = webCode.replace(/accountId,\n          conversation\._id,\n/g, 
`accountId,
          conversation!._id,
`);
webCode = webCode.replace(/conversation = await ConversationRepository\.processInbound\(\n          accountId,\n          conversation\._id,\n          lastMsgText,\n          session\n        \);/g,
`conversation = await ConversationRepository.processInbound(
          accountId,
          conversation!._id,
          lastMsgText,
          session
        );`);
fs.writeFileSync('src/lib/mongodb/repositories/WebhookRepository.ts', webCode);

