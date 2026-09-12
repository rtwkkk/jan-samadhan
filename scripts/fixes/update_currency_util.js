const fs = require('fs');
let code = fs.readFileSync('src/lib/currency.ts', 'utf8');

const newFn = `
/**
 * Resolves the dominant currency from a list of deals for pipeline-level display.
 * If mixed currencies exist, returns the most common one.
 * Falls back to defaultCurrency if no deals have a currency.
 */
export function resolveDisplayCurrency(deals: { currency?: string }[], defaultCurrency: string = DEFAULT_CURRENCY): string {
  const counts = new Map<string, number>();
  for (const d of deals) {
    const c = d.currency || defaultCurrency;
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  let maxCount = -1;
  let dominant = defaultCurrency;
  for (const [c, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      dominant = c;
    }
  }
  return dominant;
}
`;

code = code + '\n' + newFn;
fs.writeFileSync('src/lib/currency.ts', code);
