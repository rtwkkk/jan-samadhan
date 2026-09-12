import { Tag, ITag } from '../models/Tag';
import { Contact } from '../models/Contact';
import { stripProtectedFields } from './BaseRepository';

export class TagRepository {
  static async findById(accountId: string, id: string): Promise<ITag | null> {
    return Tag.findOne({ _id: id, accountId }).lean();
  }

  static async findMany(accountId: string, filters: Record<string, unknown> = {}): Promise<ITag[]> {
    return Tag.find({ ...filters, accountId }).sort({ name: 1 }).lean();
  }

  static async findByName(accountId: string, name: string): Promise<ITag | null> {
    return Tag.findOne({ accountId, name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }).lean();
  }

  static async create(data: Partial<ITag>): Promise<ITag> {
    const tag = new Tag(data);
    return tag.save();
  }

  static async createMany(data: Partial<ITag>[]): Promise<ITag[]> {
    return Tag.insertMany(data) as unknown as Promise<ITag[]>;
  }

  static async updateById(accountId: string, id: string, update: Partial<ITag>): Promise<ITag | null> {
    const safeUpdate = stripProtectedFields(update);
    return Tag.findOneAndUpdate({ _id: id, accountId }, { $set: safeUpdate }, { new: true }).lean();
  }

  static async deleteById(accountId: string, id: string): Promise<boolean> {
    const result = await Tag.deleteOne({ _id: id, accountId });
    if (result.deletedCount === 1) {
      // Remove tag reference from all contacts in this account
      await Contact.updateMany(
        { accountId, tagIds: id },
        { $pull: { tagIds: id } }
      );
      return true;
    }
    return false;
  }

  static async count(accountId: string): Promise<number> {
    return Tag.countDocuments({ accountId });
  }
}
