import { IComplaint } from '@/lib/mongodb/models/Complaint';

export function serializeComplaintFromMongo(doc: IComplaint) {
  return {
    id: doc._id,
    complaint_id: doc.complaintId,
    citizen_name: doc.citizenName,
    phone: doc.phone,
    email: doc.email || null,
    complaint_type: doc.complaintType,
    description: doc.description,
    district: doc.district,
    village_city_block: doc.villageCityBlock,
    location: doc.location || null,
    people_affected: doc.peopleAffected ?? null,
    priority: doc.priority,
    evidence: doc.evidence || [],
    status: doc.status,
    created_at: doc.createdAt.toISOString(),
    updated_at: doc.updatedAt.toISOString(),
  };
}
