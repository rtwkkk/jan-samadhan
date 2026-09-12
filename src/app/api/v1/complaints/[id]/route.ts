import { requireApiAuth } from '@/lib/auth/api-context';
import { ok, fail, toApiErrorResponse } from '@/lib/api/v1/respond';
import { ComplaintRepository } from '@/lib/mongodb/repositories/ComplaintRepository';
import { serializeComplaintFromMongo } from '@/lib/api/v1/complaints';
import { connectToDatabase } from '@/lib/mongodb/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireApiAuth(request, 'contacts:read', 'viewer');
    await connectToDatabase();
    
    const { id } = await params;
    const doc = await ComplaintRepository.findById(ctx.accountId, id);
    
    if (!doc) {
      return fail('not_found', 'Complaint not found', 404);
    }
    
    return ok(serializeComplaintFromMongo(doc));
  } catch (err) {
    return toApiErrorResponse(err);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireApiAuth(request, 'contacts:write', 'agent');
    await connectToDatabase();
    
    const { id } = await params;
    
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return fail('bad_request', 'Request body must be a JSON object', 400);
    }

    const doc = await ComplaintRepository.updateById(ctx.accountId, id, body);
    
    if (!doc) {
      return fail('not_found', 'Complaint not found', 404);
    }
    
    return ok(serializeComplaintFromMongo(doc));
  } catch (err) {
    return toApiErrorResponse(err);
  }
}
