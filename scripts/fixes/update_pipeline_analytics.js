const fs = require('fs');
let code = fs.readFileSync('src/components/pipelines/pipeline-analytics.tsx', 'utf8');

code = code.replace(
  /import \{ formatCurrency \} from "@\/lib\/currency";/,
  'import { formatCurrency, resolveDisplayCurrency } from "@/lib/currency";'
);

code = code.replace(
  /const avgValue = totalCount > 0 \? totalValue \/ totalCount : 0;/,
  `const avgValue = totalCount > 0 ? totalValue / totalCount : 0;
    const displayCurrency = resolveDisplayCurrency(active, defaultCurrency);`
);

code = code.replace(
  /return \{\n\s*totalCount,/,
  `return {\n      displayCurrency,\n      totalCount,`
);

code = code.replace(/formatCurrency\(stats\.totalValue, defaultCurrency\)/g, 'formatCurrency(stats.totalValue, stats.displayCurrency)');
code = code.replace(/formatCurrency\(stats\.avgValue, defaultCurrency\)/g, 'formatCurrency(stats.avgValue, stats.displayCurrency)');
code = code.replace(/formatCurrency\(stats\.weightedValue, defaultCurrency\)/g, 'formatCurrency(stats.weightedValue, stats.displayCurrency)');

fs.writeFileSync('src/components/pipelines/pipeline-analytics.tsx', code);
