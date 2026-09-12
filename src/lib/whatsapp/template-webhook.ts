import { MessageTemplateRepository } from '@/lib/mongodb/repositories/MessageTemplateRepository'
import { normalizeStatus } from './template-status-normalize'

const TEMPLATE_WEBHOOK_FIELDS = new Set([
  'message_template_status_update',
  'message_template_quality_update',
  'message_template_components_update',
])

export function isTemplateWebhookField(field: string): boolean {
  return TEMPLATE_WEBHOOK_FIELDS.has(field)
}

interface TemplateStatusUpdateValue {
  event?: string
  message_template_id?: string | number
  message_template_name?: string
  message_template_language?: string
  reason?: string
}

interface TemplateQualityUpdateValue {
  message_template_id?: string | number
  message_template_name?: string
  message_template_language?: string
  previous_quality_score?: string
  new_quality_score?: string
}

interface TemplateComponentsUpdateValue {
  message_template_id?: string | number
  message_template_name?: string
  message_template_language?: string
}

export interface TemplateWebhookChange {
  field: string
  value: unknown
}

export async function handleTemplateWebhookChange(
  change: TemplateWebhookChange
): Promise<void> {
  switch (change.field) {
    case 'message_template_status_update':
      await handleStatusUpdate(
        change.value as TemplateStatusUpdateValue
      )
      return
    case 'message_template_quality_update':
      await handleQualityUpdate(
        change.value as TemplateQualityUpdateValue
      )
      return
    case 'message_template_components_update':
      handleComponentsUpdate(
        change.value as TemplateComponentsUpdateValue
      )
      return
  }
}

async function handleStatusUpdate(
  value: TemplateStatusUpdateValue
): Promise<void> {
  const metaTemplateId =
    value.message_template_id !== undefined
      ? String(value.message_template_id)
      : null
  if (!metaTemplateId || !value.event) {
    console.warn(
      '[template-webhook] status update missing message_template_id or event:',
      value,
    )
    return
  }

  const status = normalizeStatus(value.event)

  const updated = await MessageTemplateRepository.updateByMetaTemplateId(metaTemplateId, {
    status,
    rejectionReason: status === 'REJECTED' ? value.reason ?? 'Rejected by Meta' : undefined,
    submissionError: undefined
  })

  if (!updated) {
    console.warn(
      '[template-webhook] status update received for unknown template (or update failed):',
      metaTemplateId,
      value.message_template_name,
    )
  }
}

async function handleQualityUpdate(
  value: TemplateQualityUpdateValue
): Promise<void> {
  const metaTemplateId =
    value.message_template_id !== undefined
      ? String(value.message_template_id)
      : null
  if (!metaTemplateId) {
    console.warn(
      '[template-webhook] quality update missing message_template_id:',
      value,
    )
    return
  }

  const raw = value.new_quality_score
  const score =
    raw && ['GREEN', 'YELLOW', 'RED'].includes(raw.toUpperCase())
      ? (raw.toUpperCase() as 'GREEN' | 'YELLOW' | 'RED')
      : null

  const updated = await MessageTemplateRepository.updateByMetaTemplateId(metaTemplateId, { qualityScore: score || undefined })

  if (!updated) {
    console.warn(
      '[template-webhook] quality update failed or unknown template:',
      metaTemplateId
    )
  }
}

function handleComponentsUpdate(value: TemplateComponentsUpdateValue): void {
  console.info(
    '[template-webhook] components updated by Meta for template',
    value.message_template_id,
    value.message_template_name,
    '— run "Sync from Meta" in Settings to pull the new components.',
  )
}
