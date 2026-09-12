I have successfully resolved the currency display issue in the Pipelines dashboard.

## Root Cause
The Pipeline analytics (`pipeline-analytics.tsx`) and the Kanban board UI (`pipeline-board.tsx`) were strictly rendering monetary totals using the account's fallback `defaultCurrency` configuration (usually USD), instead of checking the actual currencies attached to the deals currently in the pipeline.

## Files Changed
- `src/lib/currency.ts`
- `src/lib/currency.test.ts`
- `src/components/pipelines/pipeline-analytics.tsx`
- `src/components/pipelines/pipeline-board.tsx`

## Exact Behavior Implemented
- I introduced a new `resolveDisplayCurrency` helper to dynamically compute the most appropriate display currency based on the pipeline's *actual active deals*.
- **For single-currency pipelines (e.g. only INR):** The UI will automatically detect INR as the dominant currency. The pipeline's total value, average deal size, weighted value, and per-stage column totals will correctly display with `₹` without performing any destructive or misleading exchange rate calculations.
- **For mixed-currency pipelines (e.g. USD + INR):** The UI will dynamically detect and display the symbol of the *most common currency* among the active deals, summing the raw numerical values without attempting unsupported real-time exchange rates (preserving the existing numerical aggregation).
- **Fallback (No Deals):** Falls back seamlessly to the account's configured `defaultCurrency`.

## Verification Results
- **Typecheck Result:** Clean (`npm run typecheck` passed with 0 errors).
- **Test Result:** Clean (`npm test` passed with 557 successful tests and 0 failures). Added 4 new focused tests inside `src/lib/currency.test.ts` explicitly covering the `resolveDisplayCurrency` logic.
