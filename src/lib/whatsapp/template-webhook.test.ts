import { MessageTemplateRepository } from '@/lib/mongodb/repositories/MessageTemplateRepository';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleTemplateWebhookChange,
  isTemplateWebhookField,
} from './template-webhook';

// Tiny mock that records the .update payload and the .eq filter for
// inspection. Mirrors the surface this module actually uses on the
// Supabase client (.from().update().eq().select()) — anything beyond
// throws, so unintended calls fail loudly.
function makeSupabaseStub(
  selectResult: { data: { id: string }[] | null; error: { message: string } | null } = {
    data: [{ id: 'row-1' }],
    error: null,
  },
) {
  const calls: {
    table: string;
    update?: Record<string, unknown>;
    filter?: { column: string; value: unknown };
  }[] = [];

  const stub = {
    from(table: string) {
      const entry: (typeof calls)[number] = { table };
      calls.push(entry);
      return {
        update(payload: Record<string, unknown>) {
          entry.update = payload;
          return {
            eq(column: string, value: unknown) {
              entry.filter = { column, value };
              return {
                select() {
                  return Promise.resolve(selectResult);
                },
                then(
                  onFulfilled: (
                    v: { error: { message: string } | null },
                  ) => unknown,
                ) {
                  // Allow `await supabase.update().eq()` (no .select()).
                  return Promise.resolve({ error: selectResult.error }).then(
                    onFulfilled,
                  );
                },
              };
            },
          };
        },
      };
    },
  };

  return { stub: stub as unknown as any, calls };
}

describe('isTemplateWebhookField', () => {
  it('recognises the three template fields', () => {
    expect(isTemplateWebhookField('message_template_status_update')).toBe(true);
    expect(isTemplateWebhookField('message_template_quality_update')).toBe(true);
    expect(isTemplateWebhookField('message_template_components_update')).toBe(
      true,
    );
  });
  it('rejects messaging fields', () => {
    expect(isTemplateWebhookField('messages')).toBe(false);
    expect(isTemplateWebhookField('message_status')).toBe(false);
  });
});

vi.mock('@/lib/mongodb/repositories/MessageTemplateRepository', () => ({
  MessageTemplateRepository: {
    updateByMetaTemplateId: vi.fn().mockResolvedValue(true),
  }
}));

describe('handleTemplateWebhookChange — status update', () => {
  let supabaseCalls: ReturnType<typeof makeSupabaseStub>['calls'];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('flips status to APPROVED and clears any rejection_reason', async () => {
    const stub = null;
    
    await handleTemplateWebhookChange(
      {
        field: 'message_template_status_update',
        value: {
          event: 'APPROVED',
          message_template_id: 12345,
          message_template_name: 'order_confirmation',
          message_template_language: 'en_US',
        },
      },
    );
    expect(MessageTemplateRepository.updateByMetaTemplateId).toHaveBeenCalledTimes(1);
    expect(MessageTemplateRepository.updateByMetaTemplateId).toHaveBeenCalledWith(expect.any(String), { 
      status: 'APPROVED',
      rejectionReason: undefined,
      submissionError: undefined,
     });
  });

  it('persists the reason field on REJECTED', async () => {
    const stub = null;
    await handleTemplateWebhookChange(
      {
        field: 'message_template_status_update',
        value: {
          event: 'REJECTED',
          message_template_id: 'TMPL_99',
          reason: 'Template uses non-compliant language.',
        },
      },
    );
    expect(MessageTemplateRepository.updateByMetaTemplateId).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ status: 'REJECTED' }));
    expect(MessageTemplateRepository.updateByMetaTemplateId).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ rejectionReason: 'Template uses non-compliant language.' }));
  });

  it('falls back to a generic reason when REJECTED has no `reason`', async () => {
    const stub = null;
    await handleTemplateWebhookChange(
      {
        field: 'message_template_status_update',
        value: { event: 'REJECTED', message_template_id: '7' },
      },
    );
    expect(MessageTemplateRepository.updateByMetaTemplateId).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ rejectionReason: 'Rejected by Meta' }));
  });

  it('normalises PENDING_REVIEW → PENDING (via shared normalizeStatus)', async () => {
    const stub = null;
    await handleTemplateWebhookChange(
      {
        field: 'message_template_status_update',
        value: { event: 'PENDING_REVIEW', message_template_id: '1' },
      },
    );
    expect(MessageTemplateRepository.updateByMetaTemplateId).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ status: 'PENDING' }));
  });

  it('logs and exits when meta_template_id is missing (no UPDATE issued)', async () => {
    const stub = null;
    await handleTemplateWebhookChange(
      {
        field: 'message_template_status_update',
        value: { event: 'APPROVED' },
      },
    );
    expect(MessageTemplateRepository.updateByMetaTemplateId).not.toHaveBeenCalled();
  });

  it('logs a warning when the row is unknown locally (zero matches)', async () => {
    const warn = vi.spyOn(console, 'warn');
    const stub = null; (MessageTemplateRepository.updateByMetaTemplateId as any).mockResolvedValueOnce(false);
    await handleTemplateWebhookChange(
      {
        field: 'message_template_status_update',
        value: {
          event: 'APPROVED',
          message_template_id: 'NEVER_SEEN',
          message_template_name: 'mystery',
        },
      },
    );
    expect(warn).toHaveBeenCalled();
  });
});

vi.mock('@/lib/mongodb/repositories/MessageTemplateRepository', () => ({
  MessageTemplateRepository: {
    updateByMetaTemplateId: vi.fn().mockResolvedValue(true),
  }
}));

describe('handleTemplateWebhookChange — quality update', () => {
  it('sets qualityScore from new_qualityScore', async () => {
    const stub = null;
    await handleTemplateWebhookChange(
      {
        field: 'message_template_quality_update',
        value: {
          message_template_id: '99',
          previous_quality_score: 'GREEN',
          new_quality_score: 'YELLOW',
        },
      },
    );
    expect(MessageTemplateRepository.updateByMetaTemplateId).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ qualityScore: 'YELLOW' }));
    
  });

  it('stores null for unrecognised quality scores', async () => {
    const stub = null;
    await handleTemplateWebhookChange(
      {
        field: 'message_template_quality_update',
        value: {
          message_template_id: '99',
          new_quality_score: 'PURPLE', // not a real Meta value
        },
      },
    );
    expect(MessageTemplateRepository.updateByMetaTemplateId).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ qualityScore: undefined }));
  });
});

vi.mock('@/lib/mongodb/repositories/MessageTemplateRepository', () => ({
  MessageTemplateRepository: {
    updateByMetaTemplateId: vi.fn().mockResolvedValue(true),
  }
}));

describe('handleTemplateWebhookChange — components update', () => {
  it('is an info-log no-op (does not write to DB)', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const stub = null;
    await handleTemplateWebhookChange(
      {
        field: 'message_template_components_update',
        value: {
          message_template_id: '5',
          message_template_name: 'x',
        },
      },
    );
    expect(MessageTemplateRepository.updateByMetaTemplateId).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalled();
  });
});

vi.mock('@/lib/mongodb/repositories/MessageTemplateRepository', () => ({
  MessageTemplateRepository: {
    updateByMetaTemplateId: vi.fn().mockResolvedValue(true),
  }
}));

describe('handleTemplateWebhookChange — unknown field', () => {
  it('is a defensive no-op', async () => {
    const stub = null;
    await handleTemplateWebhookChange(
      // Pretend Meta added a new template_* field we don't know about.
      // The route handler pre-filters via isTemplateWebhookField, but
      // the dispatch should still be safe if the filter is bypassed.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { field: 'message_template_future_field' as any, value: {} },
    );
    expect(MessageTemplateRepository.updateByMetaTemplateId).not.toHaveBeenCalled();
  });
});
