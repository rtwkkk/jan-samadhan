import {
  daysAgoStart,
  DOW_SHORT_MON_FIRST,
  lastNDayKeys,
  localDayKey,
  mondayIndex,
  startOfLocalDay,
} from './date-utils'
import type {
  ActivityItem,
  ConversationsSeriesPoint,
  MetricsBundle,
  PipelineDonutData,
  PipelineStageSlice,
  ResponseTimeBucket,
  ResponseTimeSummary,
} from './types'

// ------------------------------------------------------------
// All client-side aggregation. RLS scopes every query to the
// signed-in user automatically, so we never pass user_id explicitly
// here. Perf is acceptable for the current scale (low thousands of
// messages) — if a tenant's dataset outgrows this, we'd migrate the
// heavy aggregations to SQL RPCs. Noted in the PR.
// ------------------------------------------------------------


// --- 1. Metric cards ---------------------------------------------------

export async function loadMetrics(db: any): Promise<MetricsBundle> {
  const todayStart = startOfLocalDay().toISOString()
  const yesterdayStart = daysAgoStart(1).toISOString()

  const [analytics, contactsStatsRes] = await Promise.all([
    fetch(`/api/dashboard/analytics?action=metrics&todayStart=${encodeURIComponent(todayStart)}&yesterdayStart=${encodeURIComponent(yesterdayStart)}`)
      .then((res) => (res.ok ? res.json() : null)),
    fetch('/api/dashboard/contacts?action=stats').then((res) => (res.ok ? res.json() : null)),
  ])

  const openDealsValue = analytics?.openDealsValue ?? 0
  const openDealsCount = analytics?.openDealsCount ?? 0

  return {
    activeConversations: {
      current: analytics?.openConvCur ?? 0,
      previous: (analytics?.newConvToday ?? 0) - (analytics?.newConvYesterday ?? 0),
    },
    newContactsToday: {
      current: contactsStatsRes?.contactsToday ?? 0,
      previous: contactsStatsRes?.contactsYesterday ?? 0,
    },
    openDealsValue,
    openDealsCount,
    messagesSentToday: {
      current: analytics?.messagesToday ?? 0,
      previous: analytics?.messagesYesterday ?? 0,
    },
  }
}

// --- 2. Conversations series -------------------------------------------

export async function loadConversationsSeries(
  db: any,
  rangeDays: number,
): Promise<ConversationsSeriesPoint[]> {
  const start = daysAgoStart(rangeDays - 1).toISOString()
  
  const res = await fetch(`/api/dashboard/analytics?action=messagesSeries&gte=${encodeURIComponent(start)}`);
  if (!res.ok) throw new Error('Failed to load conversations series');
  const data = await res.json();

  const keys = lastNDayKeys(rangeDays)
  const buckets = new Map<string, { incoming: number; outgoing: number }>()
  for (const k of keys) buckets.set(k, { incoming: 0, outgoing: 0 })

  for (const row of (data ?? []) as { created_at: string; sender_type: string }[]) {
    const key = localDayKey(row.created_at)
    const bucket = buckets.get(key)
    if (!bucket) continue
    if (row.sender_type === 'customer') bucket.incoming += 1
    else bucket.outgoing += 1 // agent + bot both count as outgoing
  }

  return keys.map((day) => ({ day, ...(buckets.get(day) ?? { incoming: 0, outgoing: 0 }) }))
}

// --- 3. Pipeline donut -------------------------------------------------

export async function loadPipelineDonut(db: any): Promise<PipelineDonutData> {
  const res = await fetch('/api/dashboard/analytics?action=pipelineDonut');
  if (!res.ok) throw new Error('Failed to load pipeline donut');
  const data = await res.json();

  const stages = data.stages || [];
  const deals = data.deals || [];

  const byStage = new Map<string, { count: number; total: number }>()
  for (const d of deals) {
    const row = byStage.get(d.stage_id) ?? { count: 0, total: 0 }
    row.count += 1
    row.total += d.value ?? 0
    byStage.set(d.stage_id, row)
  }

  const slices: PipelineStageSlice[] = stages
    .map((s: any) => ({
      id: s.id,
      name: s.name,
      color: s.color || '#64748b',
      dealCount: byStage.get(s.id)?.count ?? 0,
      totalValue: byStage.get(s.id)?.total ?? 0,
    }))
    .filter((s: any) => s.totalValue > 0 || s.dealCount > 0)

  return {
    stages: slices,
    totalValue: slices.reduce((sum: number, s: any) => sum + s.totalValue, 0),
  }
}

// --- 4. Response time by day of week ----------------------------------

export async function loadResponseTime(db: any): Promise<ResponseTimeSummary> {
  const fourteenDaysAgo = daysAgoStart(13).toISOString()
  
  const res = await fetch(`/api/dashboard/analytics?action=messagesSeries&gte=${encodeURIComponent(fourteenDaysAgo)}`);
  if (!res.ok) throw new Error('Failed to load response time');
  const data = await res.json();

  const rows = (data ?? []) as {
    conversation_id: string
    sender_type: string
    created_at: string
  }[]

  // Group per conversation, pair unreplied customer messages with the
  // next outbound message from the agent/bot. A single customer message
  // can only count once (avoids inflating averages if the customer
  // double-messages while the agent takes time to reply).
  interface Sample {
    customerAt: Date
    responseAt: Date
  }
  const samples: Sample[] = []

  let currentConv = ''
  let pendingCustomer: Date | null = null
  for (const row of rows) {
    if (row.conversation_id !== currentConv) {
      currentConv = row.conversation_id
      pendingCustomer = null
    }
    const ts = new Date(row.created_at)
    if (row.sender_type === 'customer') {
      if (!pendingCustomer) pendingCustomer = ts
    } else if (pendingCustomer) {
      samples.push({ customerAt: pendingCustomer, responseAt: ts })
      pendingCustomer = null
    }
  }

  const now = new Date()
  const thisWeekStart = daysAgoStart(mondayIndex(now))
  const lastWeekStart = daysAgoStart(mondayIndex(now) + 7)

  const byDow = new Map<number, number[]>()
  for (let i = 0; i < 7; i++) byDow.set(i, [])
  const thisWeekMins: number[] = []
  const lastWeekMins: number[] = []

  for (const s of samples) {
    const diffMin = (s.responseAt.getTime() - s.customerAt.getTime()) / 60_000
    if (diffMin < 0) continue
    const dow = mondayIndex(s.customerAt)
    byDow.get(dow)!.push(diffMin)
    if (s.customerAt >= thisWeekStart) {
      thisWeekMins.push(diffMin)
    } else if (s.customerAt >= lastWeekStart && s.customerAt < thisWeekStart) {
      lastWeekMins.push(diffMin)
    }
  }

  const avg = (arr: number[]) =>
    arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length

  const buckets: ResponseTimeBucket[] = Array.from({ length: 7 }, (_, dow) => {
    const samples = byDow.get(dow) ?? []
    return {
      dow,
      avgMinutes: avg(samples),
      samples: samples.length,
    }
  })

  void DOW_SHORT_MON_FIRST

  return {
    buckets,
    thisWeekAvg: avg(thisWeekMins),
    lastWeekAvg: avg(lastWeekMins),
  }
}

// --- 5. Activity feed --------------------------------------------------

export async function loadActivity(db: any, limit = 20): Promise<ActivityItem[]> {
  const [msgs, contactsRes, dealsRes, broadcasts, autoLogs] = await Promise.all([
    fetch('/api/dashboard/analytics?action=recentMessages').then((res) => (res.ok ? res.json() : [])),
    fetch('/api/dashboard/contacts?action=recent').then((res) => (res.ok ? res.json() : [])),
    fetch('/api/dashboard/analytics?action=recentDeals').then((res) => (res.ok ? res.json() : [])),
    fetch('/api/dashboard/analytics?action=recentBroadcasts').then((res) => (res.ok ? res.json() : [])),
    fetch('/api/dashboard/analytics?action=recentAutomationLogs').then((res) => (res.ok ? res.json() : [])),
  ])

  const items: ActivityItem[] = []

  // PostgREST returns nested selections as arrays by default, even when
  // the foreign key is 1:1. We normalise by taking [0] on each level.
  for (const m of (msgs ?? []) as unknown as Array<{
    id: string
    content_text: string | null
    created_at: string
    conversation_id: string
    conversations:
      | { contact_id: string | null; contacts: { name: string | null; phone: string }[] | { name: string | null; phone: string } | null }[]
      | { contact_id: string | null; contacts: { name: string | null; phone: string }[] | { name: string | null; phone: string } | null }
      | null
  }>) {
    const conv = Array.isArray(m.conversations) ? m.conversations[0] : m.conversations
    const contact = Array.isArray(conv?.contacts) ? conv?.contacts[0] : conv?.contacts
    const who = contact?.name || contact?.phone || 'Unknown'
    items.push({
      id: `msg-${m.id}`,
      kind: 'message',
      text: `New message from ${who}`,
      at: m.created_at,
      href: `/inbox?c=${m.conversation_id}`,
    })
  }

  for (const c of (contactsRes ?? []) as Array<{ id: string; name: string | null; phone: string; created_at: string }>) {
    items.push({
      id: `contact-${c.id}`,
      kind: 'contact',
      text: `New contact: ${c.name || c.phone}`,
      at: c.created_at,
      href: '/contacts',
    })
  }

  for (const d of (dealsRes ?? []) as Array<{
    id: string
    title: string
    updated_at: string
    stage: { name: string } | null
  }>) {
    items.push({
      id: `deal-${d.id}`,
      kind: 'deal',
      text: d.stage?.name
        ? `Deal "${d.title}" in ${d.stage.name}`
        : `Deal "${d.title}" updated`,
      at: d.updated_at,
      href: '/pipelines',
    })
  }

  for (const b of (broadcasts.data ?? []) as Array<{
    id: string
    name: string
    status: string
    total_recipients: number
    created_at: string
  }>) {
    const label =
      b.status === 'sent'
        ? `sent to ${b.total_recipients} contacts`
        : `${b.status} (${b.total_recipients} recipients)`
    items.push({
      id: `broadcast-${b.id}`,
      kind: 'broadcast',
      text: `Broadcast "${b.name}" ${label}`,
      at: b.created_at,
      href: '/broadcasts',
    })
  }

  for (const l of (autoLogs.data ?? []) as unknown as Array<{
    id: string
    trigger_event: string
    status: string
    created_at: string
    automation: { name: string }[] | { name: string } | null
    contact: { name: string | null; phone: string }[] | { name: string | null; phone: string } | null
  }>) {
    const automation = Array.isArray(l.automation) ? l.automation[0] : l.automation
    const contact = Array.isArray(l.contact) ? l.contact[0] : l.contact
    const who = contact?.name || contact?.phone || 'a contact'
    const autoName = automation?.name || 'Automation'
    items.push({
      id: `auto-${l.id}`,
      kind: 'automation',
      text: `Automation "${autoName}" ${l.status === 'failed' ? 'failed for' : 'triggered for'} ${who}`,
      at: l.created_at,
    })
  }

  return items
    .sort((a, b) => (a.at > b.at ? -1 : a.at < b.at ? 1 : 0))
    .slice(0, limit)
}
