// ============================================================
// Pipeline shape helpers
//
// The frontend consumes the PostgreSQL snake_case shape defined in
// src/types/index.ts (Pipeline, PipelineStage). We map Mongo
// camelCase documents to that public contract here so the UI never
// needs to change.
// ============================================================

import type { IPipeline, IPipelineStage } from '@/lib/mongodb/models/Pipeline';

/** Public API stage shape — mirrors PipelineStage in src/types/index.ts */
export interface ApiStage {
  id: string;
  pipeline_id: string;
  name: string;
  position: number;
  color: string;
  created_at: string;
}

/** Public API pipeline shape — mirrors Pipeline in src/types/index.ts */
export interface ApiPipeline {
  id: string;
  user_id: string;   // kept for frontend compat; populated from accountId
  account_id: string;
  name: string;
  created_at: string;
  stages: ApiStage[];
}

export function toApiStage(pipelineId: string, s: IPipelineStage, createdAt?: Date): ApiStage {
  return {
    id: s.id,
    pipeline_id: pipelineId,
    name: s.name,
    position: s.position,
    color: s.color,
    created_at: (createdAt ?? new Date()).toISOString(),
  };
}

export function toApiPipeline(p: IPipeline): ApiPipeline {
  const createdAt = (p as any).createdAt ?? new Date();
  return {
    id: p._id,
    user_id: p.accountId,   // legacy field; server no longer tracks per-user ownership
    account_id: p.accountId,
    name: p.name,
    created_at: new Date(createdAt).toISOString(),
    stages: (p.stages ?? []).map((s) => toApiStage(p._id, s, createdAt)),
  };
}

/** Spec-defined default stages — must match SPEC_DEFAULT_STAGES in pipelines/page.tsx */
export const SPEC_DEFAULT_STAGES = [
  { name: 'New Lead',       color: '#3b82f6', position: 0 },
  { name: 'Qualified',      color: '#eab308', position: 1 },
  { name: 'Proposal Sent',  color: '#f97316', position: 2 },
  { name: 'Negotiation',    color: '#8b5cf6', position: 3 },
  { name: 'Won',            color: '#22c55e', position: 4 },
] as const;
