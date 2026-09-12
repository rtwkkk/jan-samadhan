const fs = require('fs');
let code = fs.readFileSync('src/lib/currency.test.ts', 'utf8');

code = code.replace(
  /import \{ formatCurrency, formatCompactNumber \} from "\.\/currency";/,
  'import { formatCurrency, formatCompactNumber, resolveDisplayCurrency } from "./currency";'
);

code = code.replace(/const \{ resolveDisplayCurrency \} = require\('\.\/currency'\);\n/g, '');

fs.writeFileSync('src/lib/currency.test.ts', code);
