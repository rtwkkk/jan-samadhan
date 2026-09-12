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
