import { Notification, INotification } from '../models/Notification';

export class NotificationRepository {
  static async findByUser(accountId: string, userId: string, limit = 100): Promise<INotification[]> {
    return Notification.find({ accountId, userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  static async countUnread(accountId: string, userId: string): Promise<number> {
    return Notification.countDocuments({ accountId, userId, readAt: null });
  }

  static async markAsRead(accountId: string, userId: string, notificationId: string): Promise<boolean> {
    const result = await Notification.updateOne(
      { _id: notificationId, accountId, userId, readAt: null },
      { $set: { readAt: new Date() } }
    );
    return result.modifiedCount > 0;
  }

  static async markAllAsRead(accountId: string, userId: string): Promise<number> {
    const result = await Notification.updateMany(
      { accountId, userId, readAt: null },
      { $set: { readAt: new Date() } }
    );
    return result.modifiedCount;
  }
}
