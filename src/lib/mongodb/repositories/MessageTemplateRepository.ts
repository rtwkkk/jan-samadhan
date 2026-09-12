import { randomUUID } from 'crypto';
import { connectToDatabase } from '../client';
import { MessageTemplate, IMessageTemplate } from '../models/MessageTemplate';

export class MessageTemplateRepository {
  /**
   * Find templates by accountId.
   */
  static async findByAccountId(accountId: string): Promise<IMessageTemplate[]> {
    await connectToDatabase();
    return MessageTemplate.find({ accountId }).sort({ createdAt: -1 }).lean();
  }

  /**
   * Find a specific template by accountId and id.
   */
  static async findByIdAndAccountId(id: string, accountId: string): Promise<IMessageTemplate | null> {
    await connectToDatabase();
    return MessageTemplate.findOne({ _id: id, accountId }).lean();
  }

  /**
   * Insert a new template.
   */
  static async insert(data: Omit<Partial<IMessageTemplate>, '_id' | 'createdAt' | 'updatedAt'>): Promise<IMessageTemplate> {
    await connectToDatabase();
    const doc = new MessageTemplate({
      _id: randomUUID(),
      ...data
    });
    await doc.save();
    return doc.toObject();
  }

  /**
   * Update a template by id and accountId.
   */
  static async updateByIdAndAccountId(
    id: string,
    accountId: string,
    data: Omit<Partial<IMessageTemplate>, '_id' | 'accountId' | 'createdAt'>
  ): Promise<IMessageTemplate | null> {
    await connectToDatabase();
    return MessageTemplate.findOneAndUpdate(
      { _id: id, accountId },
      { $set: data },
      { new: true }
    ).lean();
  }

  /**
   * Delete a template by id and accountId.
   */
  static async deleteByIdAndAccountId(id: string, accountId: string): Promise<boolean> {
    await connectToDatabase();
    const result = await MessageTemplate.deleteOne({ _id: id, accountId });
    return result.deletedCount > 0;
  }

  /**
   * Upsert a template during Meta sync, keyed by accountId, name, and language.
   */
  static async upsertByNameAndLanguage(
    accountId: string,
    name: string,
    language: string,
    data: Omit<Partial<IMessageTemplate>, 'accountId' | 'name' | 'language' | '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ template: IMessageTemplate, isNew: boolean }> {
    await connectToDatabase();
    const existing = await MessageTemplate.findOne({ accountId, name, language }).lean();
    if (existing) {
      const updated = await MessageTemplate.findOneAndUpdate(
        { _id: existing._id },
        { $set: data },
        { new: true }
      ).lean();
      return { template: updated as IMessageTemplate, isNew: false };
    } else {
      const _id = randomUUID();
      const created = await MessageTemplate.findOneAndUpdate(
        { accountId, name, language },
        { 
          $set: data,
          $setOnInsert: { accountId, name, language, _id }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).lean();
      return { template: created as IMessageTemplate, isNew: true };
    }
  }

  /**
   * Update templates globally by metaTemplateId.
   * Used by webhook which receives updates from Meta independent of account.
   */
  static async updateByMetaTemplateId(
    metaTemplateId: string,
    data: Omit<Partial<IMessageTemplate>, '_id' | 'accountId' | 'createdAt' | 'name' | 'language'>
  ): Promise<boolean> {
    await connectToDatabase();
    const result = await MessageTemplate.updateMany(
      { metaTemplateId },
      { $set: data }
    );
    return result.modifiedCount > 0;
  }
}
