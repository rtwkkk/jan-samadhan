const fs = require('fs');
let code = fs.readFileSync('src/lib/currency.test.ts', 'utf8');
code = code.replace(
  /formatCurrencyShort,\n\} from "\.\/currency";/,
  'formatCurrencyShort,\n  resolveDisplayCurrency,\n} from "./currency";'
);
fs.writeFileSync('src/lib/currency.test.ts', code);
