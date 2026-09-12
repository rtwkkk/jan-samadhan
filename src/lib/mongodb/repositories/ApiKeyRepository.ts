import { ApiKey, IApiKey } from '../models/ApiKey';
import { stripProtectedFields } from './BaseRepository';

export class ApiKeyRepository {
  static async findById(accountId: string, id: string): Promise<IApiKey | null> {
    return ApiKey.findOne({ _id: id, accountId }).lean();
  }

  static async findByHash(keyHash: string): Promise<IApiKey | null> {
    // Return all fields including keyHash since the lookup explicitly requests it
    return ApiKey.findOne({ keyHash }).lean();
  }

  static async listByAccountId(accountId: string): Promise<IApiKey[]> {
    return ApiKey.find({ accountId }).sort({ createdAt: -1 }).lean();
  }

  static async create(data: Partial<IApiKey>): Promise<IApiKey> {
    const key = new ApiKey(data);
    return key.save();
  }

  static async updateById(accountId: string, id: string, update: Partial<IApiKey>): Promise<IApiKey | null> {
    const safeUpdate = stripProtectedFields(update, ['_id', 'accountId', 'keyHash', 'createdAt']);
    return ApiKey.findOneAndUpdate(
      { _id: id, accountId },
      { $set: safeUpdate },
      { new: true }
    ).lean();
  }

  static async revokeById(accountId: string, id: string): Promise<IApiKey | null> {
    return ApiKey.findOneAndUpdate(
      { _id: id, accountId },
      { $set: { revokedAt: new Date() } },
      { new: true }
    ).lean();
  }

  static async touchLastUsed(id: string): Promise<void> {
    await ApiKey.updateOne({ _id: id }, { $set: { lastUsedAt: new Date() } });
  }
}
