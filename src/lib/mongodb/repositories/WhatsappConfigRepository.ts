import { randomUUID } from 'crypto';
import { connectToDatabase } from '../client';
import { WhatsappConfig, IWhatsappConfig } from '../models/WhatsappConfig';

export class WhatsappConfigRepository {
  /**
   * Find a WhatsApp configuration by accountId (tenant-scoped).
   * Returns the raw MongoDB document or null.
   */
  static async findByAccountId(accountId: string): Promise<IWhatsappConfig | null> {
    await connectToDatabase();
    return WhatsappConfig.findOne({ accountId }).lean();
  }

  /**
   * Find by phoneNumberId — used to check for cross-account conflicts.
   * MUST be called with the caller's accountId excluded, so only conflict
   * rows from OTHER accounts come back.
   */
  static async findByPhoneNumberIdExcludingAccount(
    phoneNumberId: string,
    excludeAccountId: string
  ): Promise<IWhatsappConfig | null> {
    await connectToDatabase();
    return WhatsappConfig.findOne({
      phoneNumberId,
      accountId: { $ne: excludeAccountId },
    }).lean();
  }

  /**
   * Upsert the WhatsApp configuration for an account.
   * The _id is derived from the accountId to ensure stable identity.
   * accountId is always the upsert key — never trusted from the data payload.
   */
  static async upsert(
    accountId: string,
    data: Omit<Partial<IWhatsappConfig>, 'accountId' | '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<IWhatsappConfig> {
    await connectToDatabase();

    const doc = await WhatsappConfig.findOneAndUpdate(
      { accountId },
      {
        $set: data,
        $setOnInsert: { accountId, _id: randomUUID() },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return doc as IWhatsappConfig;
  }

  /**
   * Partial update — for lightweight field changes like mirrorInboundMedia
   * or registeredAt without requiring a full upsert.
   * Always scoped by accountId — never by _id alone.
   */
  static async updateByAccountId(
    accountId: string,
    data: Omit<Partial<IWhatsappConfig>, 'accountId' | '_id' | 'createdAt'>
  ): Promise<boolean> {
    await connectToDatabase();
    const result = await WhatsappConfig.updateOne(
      { accountId },
      { $set: data }
    );
    return result.modifiedCount > 0;
  }

  /**
   * Delete the config for an account. Always scoped to accountId.
   */
  static async deleteByAccountId(accountId: string): Promise<boolean> {
    await connectToDatabase();
    const result = await WhatsappConfig.deleteOne({ accountId });
    return result.deletedCount > 0;
  }
}
