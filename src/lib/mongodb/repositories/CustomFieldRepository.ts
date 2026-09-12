import { CustomFieldDefinition, ICustomFieldDefinition } from '../models/CustomFieldDefinition';
import { stripProtectedFields } from './BaseRepository';

export class CustomFieldRepository {
  static async findMany(accountId: string): Promise<ICustomFieldDefinition[]> {
    return CustomFieldDefinition.find({ accountId }).sort({ fieldName: 1 }).lean();
  }

  static async findById(accountId: string, id: string): Promise<ICustomFieldDefinition | null> {
    return CustomFieldDefinition.findOne({ _id: id, accountId }).lean();
  }

  static async create(data: Partial<ICustomFieldDefinition>): Promise<ICustomFieldDefinition> {
    const field = new CustomFieldDefinition(data);
    return field.save();
  }

  static async updateById(accountId: string, id: string, update: Partial<ICustomFieldDefinition>): Promise<ICustomFieldDefinition | null> {
    const safeUpdate = stripProtectedFields(update);
    return CustomFieldDefinition.findOneAndUpdate(
      { _id: id, accountId },
      { $set: safeUpdate },
      { new: true }
    ).lean();
  }

  static async deleteById(accountId: string, id: string): Promise<boolean> {
    const result = await CustomFieldDefinition.deleteOne({ _id: id, accountId });
    return result.deletedCount === 1;
  }

  static async count(accountId: string): Promise<number> {
    return CustomFieldDefinition.countDocuments({ accountId });
  }
}
