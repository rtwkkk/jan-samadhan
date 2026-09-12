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
