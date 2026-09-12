import mongoose, { ClientSession } from "mongoose";
type FilterQuery<T> = any;
import { Contact, IContact } from '../models/Contact';
import { stripProtectedFields } from './BaseRepository';

export class ContactRepository {
  static async findById(accountId: string, id: string, session?: ClientSession): Promise<IContact | null> {
    return Contact.findOne({ _id: id, accountId }).session(session || null).lean();
  }

  static async findByPhone(accountId: string, phone: string, session?: ClientSession): Promise<IContact | null> {
    return Contact.findOne({ accountId, phone }).session(session || null).lean();
  }

  static async findByPhoneSuffix(accountId: string, suffix: string): Promise<IContact[]> {
    return Contact.find({ accountId, phone: { $regex: suffix + '$' } }).lean();
  }

  static async findMany(accountId: string, filters: Record<string, unknown> = {}, limit: number = 50, skip: number = 0, session?: ClientSession): Promise<IContact[]> {
    return Contact.find({ ...filters, accountId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .session(session || null)
      .lean();
  }

  static async search(
    accountId: string,
    options: {
      search?: string;
      tagIds?: string[];
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<{ contacts: IContact[]; total: number }> {
    const { search, tagIds, limit = 50, skip = 0 } = options;
    const filter: Record<string, any> = { accountId };

    if (search) {
      const like = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: like },
        { phone: like },
        { email: like },
      ];
    }

    if (tagIds && tagIds.length > 0) {
      filter.tagIds = { $in: tagIds };
    }

    const [contacts, total] = await Promise.all([
      Contact.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Contact.countDocuments(filter),
    ]);

    return { contacts, total };
  }

  static async count(accountId: string, filter: Record<string, any> = {}): Promise<number> {
    return Contact.countDocuments({ ...filter, accountId });
  }

  static async countSince(accountId: string, since: string): Promise<number> {
    return Contact.countDocuments({ accountId, createdAt: { $gte: new Date(since) } });
  }

  static async create(data: Partial<IContact>, session?: ClientSession): Promise<IContact> {
    const contact = new Contact(data);
    return contact.save({ session });
  }

  static async updateById(accountId: string, id: string, update: Partial<IContact>, session?: ClientSession): Promise<IContact | null> {
    const safeUpdate = stripProtectedFields(update);
    return Contact.findOneAndUpdate({ _id: id, accountId }, { $set: safeUpdate }, { new: true, session }).lean();
  }

  static async deleteById(accountId: string, id: string): Promise<boolean> {
    const result = await Contact.deleteOne({ _id: id, accountId });
    return result.deletedCount === 1;
  }

  static async bulkDelete(accountId: string, ids: string[]): Promise<number> {
    const result = await Contact.deleteMany({ _id: { $in: ids }, accountId });
    return result.deletedCount;
  }

  static async addTag(accountId: string, id: string, tagId: string): Promise<IContact | null> {
    return Contact.findOneAndUpdate({ _id: id, accountId }, { $addToSet: { tagIds: tagId } }, { new: true }).lean();
  }

  static async addTags(accountId: string, id: string, tagIds: string[]): Promise<IContact | null> {
    return Contact.findOneAndUpdate({ _id: id, accountId }, { $addToSet: { tagIds: { $each: tagIds } } }, { new: true }).lean();
  }

  static async removeTag(accountId: string, id: string, tagId: string): Promise<IContact | null> {
    return Contact.findOneAndUpdate({ _id: id, accountId }, { $pull: { tagIds: tagId } }, { new: true }).lean();
  }

  static async replaceTags(accountId: string, id: string, tagIds: string[]): Promise<IContact | null> {
    const uniqueTagIds = Array.from(new Set(tagIds));
    return Contact.findOneAndUpdate({ _id: id, accountId }, { $set: { tagIds: uniqueTagIds } }, { new: true }).lean();
  }

  static async removeTagFromAllContacts(accountId: string, tagId: string): Promise<number> {
    const result = await Contact.updateMany(
      { accountId, tagIds: tagId },
      { $pull: { tagIds: tagId } }
    );
    return result.modifiedCount;
  }

  static async recentContacts(accountId: string, limit: number = 10): Promise<IContact[]> {
    return Contact.find({ accountId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('_id name phone createdAt')
      .lean();
  }
}