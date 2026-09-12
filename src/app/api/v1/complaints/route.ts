import { requireApiAuth } from '@/lib/auth/api-context';
import { ok, okList, fail, toApiErrorResponse } from '@/lib/api/v1/respond';
import { parseListParams, buildPage } from '@/lib/api/v1/pagination';
import { ComplaintRepository } from '@/lib/mongodb/repositories/ComplaintRepository';
import { serializeComplaintFromMongo } from '@/lib/api/v1/complaints';
import { connectToDatabase } from '@/lib/mongodb/client';

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request, 'contacts:read', 'viewer');
    await connectToDatabase();
    
    const { limit, cursor } = parseListParams(request);
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const status = url.searchParams.get('status');

    const filter: Record<string, any> = { accountId: ctx.accountId };

    if (search) {
      const like = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { citizenName: like },
        { phone: like },
        { complaintId: like },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (cursor) {
      filter.$or = [
        { createdAt: { $lt: new Date(cursor.createdAt) } },
        { 
          createdAt: new Date(cursor.createdAt),
          _id: { $lt: cursor.id }
        }
      ];
    }

    const data = await ComplaintRepository.findMany(
      ctx.accountId,
      filter,
      limit + 1
    );

    const mappedForPagination = data.map(doc => ({
      ...doc,
      created_at: doc.createdAt.toISOString(),
      id: doc._id
    }));

    const { items, nextCursor } = buildPage(
      mappedForPagination as any,
      limit
    );

    const serializedItems = items.map(r => serializeComplaintFromMongo(r as any));

    return okList(serializedItems, nextCursor);
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request, 'contacts:write', 'agent');
    await connectToDatabase();

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return fail('bad_request', 'Request body must be a JSON object', 400);
    }

    const requiredFields = ['citizenName', 'phone', 'complaintType', 'description', 'district', 'villageCityBlock'];
    for (const field of requiredFields) {
      if (!body[field] || typeof body[field] !== 'string') {
        return fail('bad_request', `Field '${field}' is required and must be a string`, 400);
      }
    }

    const newComplaint = await ComplaintRepository.create(ctx.accountId, {
      citizenName: body.citizenName as string,
      phone: body.phone as string,
      email: typeof body.email === 'string' ? body.email : undefined,
      complaintType: body.complaintType as string,
      description: body.description as string,
      district: body.district as string,
      villageCityBlock: body.villageCityBlock as string,
      location: typeof body.location === 'string' ? body.location : undefined,
      peopleAffected: typeof body.peopleAffected === 'number' ? body.peopleAffected : undefined,
      priority: (body.priority as any) || 'medium',
      evidence: Array.isArray(body.evidence) ? body.evidence : undefined,
      status: 'open'
    });

    return ok(serializeComplaintFromMongo(newComplaint as any), 201);
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
