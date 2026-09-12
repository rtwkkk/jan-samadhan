const fs = require('fs');
let code = fs.readFileSync('src/components/pipelines/pipeline-board.tsx', 'utf8');

code = code.replace(
  /import \{ formatCurrency \} from "@\/lib\/currency";/,
  'import { formatCurrency, resolveDisplayCurrency } from "@/lib/currency";'
);

code = code.replace(
  /const sortedStages = useMemo\(/,
  `const displayCurrency = useMemo(() => resolveDisplayCurrency(deals, defaultCurrency), [deals, defaultCurrency]);\n\n  const sortedStages = useMemo(`
);

code = code.replace(
  /currency=\{defaultCurrency\}/,
  'currency={displayCurrency}'
);

fs.writeFileSync('src/components/pipelines/pipeline-board.tsx', code);
