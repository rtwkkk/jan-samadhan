import { AutomationLog, IAutomationLog } from '../models/AutomationLog';

export class AutomationLogRepository {
  static async findRecentByAccountId(accountId: string, limit = 10): Promise<any[]> {
    const logs = await AutomationLog.find({ accountId })
      .populate('contactId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
      
    // Transform to the shape the dashboard expects
    return logs.map((log: any) => ({
      _id: log._id,
      triggerEvent: log.triggerEvent,
      status: log.status,
      createdAt: log.createdAt,
      automationName: log.automationName,
      contact: log.contactId ? { name: log.contactId.name, phone: log.contactId.phone } : null
    }));
  }
}
